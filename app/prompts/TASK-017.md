# TASK 017 — Conversational Task Extraction

## Agent Instructions

You are building **conversational task extraction** — the feature that makes Kira unique. When a user says something actionable in chat, Kira detects it and proposes creating a task with one-click confirmation.

**Read these files first (in order):**
1. `AGENTS.md` — project conventions, tech stack
2. `design/gamification/task-gathering.md` — full task gathering spec (detection patterns, proposal flow, batch detection, priority inference, document scanning)
3. `src/server/routes/tasks.ts` — existing task CRUD API
4. `src/server/routes/chat.ts` — chat routes (built in TASK 016)
5. `src/server/engine/classifier.ts` — existing task classifier
6. `src/server/engine/priority.ts` — existing priority algorithm
7. `src/db/schema.ts` — database schema

**What you're building:**

### Agent Tool: `propose_task`

Add a tool/function definition to the agent's Anthropic API call (in `src/server/jobs/chat-response.ts` or `src/server/engine/agent-runner.ts`):

```typescript
{
  name: "propose_task",
  description: "Propose creating a task detected from the user's message. Use when the user mentions something actionable (needs to do, wants to do, has a deadline, TODO, reminder).",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short task title" },
      description: { type: "string", description: "Optional context" },
      due_date: { type: "string", description: "ISO date if deadline mentioned, null otherwise" },
      priority: { type: "integer", description: "0=critical, 1=high, 2=medium, 3=low" },
      project_id: { type: "string", description: "UUID of suggested project, null if unknown" },
      executor_type: { type: "string", enum: ["human", "agent"], description: "Who should do this" },
      confidence: { type: "number", description: "0-1 confidence that this is a real task" }
    },
    required: ["title", "priority", "executor_type", "confidence"]
  }
}
```

When the agent calls `propose_task`, the backend:
1. Does NOT create the task yet
2. Stores the proposal in a new `task_proposals` table: `id, user_id, message_id, title, description, due_date, priority, project_id, executor_type, confidence, status (pending|accepted|rejected|expired), created_at`
3. Emits SSE event `chat.task_proposal` with the proposal data
4. Returns the proposal ID to the agent so it can reference it in its response text

### System Prompt Enhancement

Update the agent's system prompt (in `chat-response.ts`) to include:
```
When the user mentions something actionable — a task, todo, deadline, reminder, or something they need to do — use the propose_task tool. Detection patterns:
- "I need to...", "I have to...", "Don't forget to..."
- "TODO", "remind me to..."
- Deadline mentions: "by Friday", "due March 15"
- "We should...", "Let's..." (with concrete actions)

Only propose tasks you're confident about (>0.6). For vague or conditional plans, note them conversationally instead.

If multiple tasks are detected in one message, call propose_task for each one separately.

When proposing, also write a natural response acknowledging the tasks. Example:
"Got it! I detected 2 tasks from what you said: [task cards will appear here]. Click Add to create them or Skip if they're not needed."
```

### Frontend: Task Proposal Cards (`src/client/components/TaskProposalCard.tsx`)

Renders inline in the chat when `chat.task_proposal` SSE event fires or when loading a message that has associated proposals.

```
┌─────────────────────────────────────────────┐
│ 📌 Task detected                            │
│                                             │
│ Title: Update pitch deck                    │
│ Due: Friday, Feb 21                         │
│ Project: ZenithCred ▾   Priority: High ▾    │
│ Executor: 👤 Me                             │
│                                             │
│ [✅ Add]  [✏️ Edit]  [❌ Skip]              │
└─────────────────────────────────────────────┘
```

- **Add**: `POST /api/v1/tasks` with the proposal data → update proposal status to `accepted` → card turns green with ✓
- **Edit**: Expand fields to be editable inline (project dropdown, priority dropdown, due date picker, title text input) → then Add
- **Skip**: `PATCH /api/v1/chat/proposals/:id` with `status: 'rejected'` → card grays out
- Cards are non-intrusive: part of the message flow, not modal popups
- Batch: if 3+ proposals from one message, show a "Add all | Review each" header above the cards

### Backend Routes

- `POST /api/v1/chat/proposals/:id/accept` — creates the task from the proposal, links task_id to proposal, returns the created task
- `POST /api/v1/chat/proposals/:id/reject` — marks rejected
- `GET /api/v1/chat/proposals?status=pending` — list pending proposals (for a notification badge)

### Agent Context Enhancement

When building the agent's system prompt, include the user's existing projects (name + id) so the agent can suggest `project_id` accurately. Limit to 20 most recently active projects.

## Commit Format
```
build(TASK-017): Conversational task extraction with inline proposals
```

## Acceptance Test
```bash
# 1. Natural task detection
# User sends: "I need to call the accountant before Friday"
# → Agent calls propose_task tool
# → Task proposal card appears inline
# → Click "Add" → task created in DB

# 2. Batch detection
# User sends: "TODO: fix login bug, update docs, and deploy to staging"
# → 3 proposal cards appear

# 3. Skip works
# Click "Skip" → card grays out, no task created

# 4. Edit before add
# Click "Edit" → change priority → click "Add" → task created with edited priority

# 5. No false positives
# User sends: "How's the weather today?"
# → No task proposals

# 6. Multi-tenancy
# User B's proposals never visible to User A
```
