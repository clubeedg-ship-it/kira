# KIRA — Agent Build Plan
## How to feed this repo to a loop agent and get working code

> **Created:** 2026-02-19
> **Purpose:** Turn 54 design specs into executable build tasks for a coding loop agent (Ralph Wiggum, Claude Code, Aider, Cursor, etc.)

---

## The Problem With Just Pointing at /design

Your design docs are ~200KB of markdown. No loop agent can hold all of that in context at once. If you say "build Kira from the design docs", the agent will either hallucinate, get lost, or build something that doesn't match the specs.

**What a loop agent actually needs:**
1. **One task at a time** — small enough to complete in a single session
2. **Exact file references** — "read THIS doc, build THIS thing"
3. **Testable acceptance criteria** — how to verify it worked
4. **Dependency awareness** — what must exist before this task starts
5. **A checkpoint file** — so it can resume after crashes/context limits

---

## Architecture Decision: Fresh Build vs Refactor

The existing codebase (`dashboard/server-v2.js` at 81KB, `dashboard/index.html` at 173KB) is a monolith prototype. The new design is fundamentally different in structure.

**Recommendation: Fresh build in `src/` directory.** Keep old code as reference. Don't try to refactor — it's faster to rebuild with the new schema and architecture.

### Tech Stack
- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Frontend:** React + Vite + Tailwind + Lucide icons
- **Real-time:** SSE (Server-Sent Events)
- **Auth:** JWT (simple, single-user for now)
- **AI:** Anthropic SDK (Claude API)

---

## How To Use This File

### Option A: Claude Code / Ralph Wiggum (CLI agent)
```bash
# In your repo directory, tell the agent:
cat AGENT-BUILD-PLAN.md  # Read this first
# Then: "Execute BUILD TASK 001"
# Agent reads the task, reads the referenced design doc, builds it, runs the test
# Then: "Execute BUILD TASK 002"
# ...repeat
```

### Option B: Automated loop script
```bash
#!/bin/bash
# auto-builder.sh — feeds tasks to agent one at a time
TASKS=(001 002 003 004 005 006 007 008 009 010 011 012 013 014 015)
for task in "${TASKS[@]}"; do
  echo "=== EXECUTING BUILD TASK $task ==="
  # Send to your agent:
  # "Read AGENT-BUILD-PLAN.md, execute BUILD TASK $task. 
  #  Read the referenced design docs. Build the code. Run the acceptance test.
  #  When done, update AGENT-BUILD-PLAN.md: change the task status to ✅ DONE."
done
```

### Option C: Claude Code with CLAUDE.md
Create a `.claude/CLAUDE.md` file that says:
```
You are building the Kira application.
- Read AGENT-BUILD-PLAN.md for the current task queue
- Find the first task with status 🔴 TODO
- Read the design docs referenced in that task
- Build it. Test it. Mark it ✅ DONE.
- Move to the next 🔴 TODO task.
- Commit after each task.
```

---

## CHECKPOINT FILE

The agent updates this section as it completes tasks. This is how it resumes after crashes.

```
LAST_COMPLETED_TASK: 000
CURRENT_TASK: 001
BLOCKERS: none
```

---

## BUILD TASKS

### 🔴 BUILD TASK 001 — Project Scaffold
**Status:** 🔴 TODO
**Read:** (none — standard setup)
**Depends on:** nothing
**Build:**
- Create `src/` directory with:
  - `src/server/` — Express backend
  - `src/client/` — React frontend (Vite)
  - `src/shared/` — Shared types/constants
  - `src/db/` — SQLite schema and migrations
- Initialize: `package.json`, `vite.config.js`, `tsconfig.json` (TypeScript)
- Install: express, better-sqlite3, cors, dotenv, @anthropic-ai/sdk, uuid
- Install (client): react, react-dom, react-router-dom, tailwindcss, lucide-react, @tanstack/react-query
- Create `src/server/index.ts` — basic Express server on port 3001
- Create `src/client/main.tsx` — basic React app with router
- Create `src/db/migrate.ts` — migration runner

**Test:**
```bash
cd src && npm run dev  # Both server and client start without errors
curl http://localhost:3001/api/health  # Returns { "status": "ok" }
```

---

### 🔴 BUILD TASK 002 — SOP Engine Database Schema
**Status:** 🔴 TODO
**Read:** `design/sop-engine/data-model.md`, `KIRA-SOP-ENGINE.md` (Section 3)
**Depends on:** TASK 001
**Build:**
- Create `src/db/migrations/001-sop-engine.sql` with ALL tables from the SOP Engine spec:
  - vision, areas, objectives, key_results, projects, milestones, tasks
  - dependencies, agents, agent_work_log, input_queue
  - time_blocks, reviews, principles, decisions
- Create ALL indexes from the spec
- Run migration on startup
- Create `src/db/index.ts` — database connection singleton

**Test:**
```bash
# Migration runs without errors
node -e "const db = require('./src/db'); console.log(db.pragma('table_list'))"
# Should list all 14+ tables
```

---

### 🔴 BUILD TASK 003 — SOP Engine CRUD API
**Status:** 🔴 TODO
**Read:** `design/api/v3-complete.md` (Sections 2, 3, 10), `design/sop-engine/api-endpoints.md`
**Depends on:** TASK 002
**Build:**
- Create route files in `src/server/routes/`:
  - `vision.ts` — CRUD for vision
  - `areas.ts` — CRUD for areas
  - `objectives.ts` — CRUD + key results
  - `projects.ts` — CRUD + milestones
  - `tasks.ts` — CRUD + classification + today/inbox views
  - `dependencies.ts` — DAG management
  - `input-queue.ts` — CRUD + resolve/dismiss/snooze
  - `reviews.ts` — CRUD + generate
  - `principles.ts` — CRUD + decisions
- Each route: validate input, query DB, return JSON
- Wire all routes into Express app

**Test:**
```bash
# Create an area, objective, project, task chain:
curl -X POST localhost:3001/api/v1/areas -H "Content-Type: application/json" \
  -d '{"name":"Health","description":"Physical and mental health"}'
# Returns 201 with area object
# Then create objective under that area, project under objective, task under project
# GET /api/v1/tasks/today returns empty array (no tasks scheduled today)
```

---

### 🔴 BUILD TASK 004 — State Machine & Cascade Logic
**Status:** 🔴 TODO
**Read:** `design/sop-engine/state-machines.md`, `design/sop-engine/cascade-rules.md`
**Depends on:** TASK 003
**Build:**
- Create `src/server/engine/state-machine.ts`:
  - Validate status transitions for tasks, projects, objectives
  - Reject invalid transitions (e.g., todo → done must go through in_progress)
- Create `src/server/engine/cascade.ts`:
  - When task completes: check if milestone/project is now complete
  - When project status changes: update objective progress
  - When dependency resolves: unblock downstream tasks
  - When parent archived: cascade to children
- Wire into PUT/POST handlers

**Test:**
```bash
# Create task, try to set status directly to "done" — should fail
# Create task, set to "in_progress", then "done" — should succeed
# Create two tasks, make one depend on other, complete blocker — blocked task should unblock
```

---

### 🔴 BUILD TASK 005 — Priority Algorithm & Task Classification
**Status:** 🔴 TODO
**Read:** `design/sop-engine/priority-algorithm.md`, `KIRA-SOP-ENGINE.md` (Section 4.2)
**Depends on:** TASK 003
**Build:**
- Create `src/server/engine/priority.ts`:
  - `calculatePriority(task)` using formula: `(deadline_urgency × 3) + (blocking_count × 2) + (explicit_priority × 1)`
  - Auto-recalculate on task create/update
- Create `src/server/engine/classifier.ts`:
  - `classifyTask(title, description)` — determines executor_type and requires_input
  - Pattern matching first (research → agent, call → human, etc.)
  - Returns classification + confidence

**Test:**
```bash
# Create task "Research email platforms" — should classify as executor_type: agent, requires_input: verify
# Create task "Call dentist lead" — should classify as executor_type: human, requires_input: create
# Create overdue task blocking 3 others — should have highest priority score
```

---

### 🔴 BUILD TASK 006 — SSE Event System
**Status:** 🔴 TODO
**Read:** `design/backend/event-system.md`
**Depends on:** TASK 003
**Build:**
- Create `src/server/events/sse.ts`:
  - SSE endpoint at `GET /api/v1/events/stream`
  - Client subscribes with optional `?channels=task,agent,inbox,message`
  - Event emitter: `emitEvent(type, data)` — broadcasts to all connected clients
- Wire events into existing CRUD routes:
  - Task status change → `task.status_changed`
  - Input queue item added → `input_queue.item_added`
  - etc.

**Test:**
```bash
# Open SSE connection in one terminal:
curl -N localhost:3001/api/v1/events/stream
# In another terminal, create a task:
curl -X POST localhost:3001/api/v1/tasks ...
# First terminal should receive: event: task.created, data: {...}
```

---

### 🔴 BUILD TASK 007 — React App Shell & Design System
**Status:** 🔴 TODO
**Read:** `design/ui/design-system.md`, `design/ui/layout-system.md`, `design/ui/navigation.md`, `design/ui/component-library.md`
**Depends on:** TASK 001
**Build:**
- Configure Tailwind with design system tokens (colors, spacing, typography from design-system.md)
- Create layout components:
  - `AppShell.tsx` — sidebar + topbar + content area (Template from layout-system.md)
  - `Sidebar.tsx` — 240px expanded / 64px collapsed, all nav items from navigation.md
  - `TopBar.tsx` — 56px, breadcrumb, search trigger, user menu
- Create base components from component-library.md:
  - `Button.tsx` (5 variants, 3 sizes)
  - `Input.tsx`, `Select.tsx`, `Badge.tsx`, `Card.tsx`
  - `Modal.tsx`, `Drawer.tsx`, `Toast.tsx`
  - `EmptyState.tsx`, `Skeleton.tsx`
- Set up React Router with routes from navigation.md
- All routes render placeholder pages

**Test:**
```bash
npm run dev  # App loads at localhost:5173
# Sidebar renders with all nav items
# Clicking nav items changes route
# Sidebar collapses on tablet breakpoint
# Responsive: mobile shows bottom tab bar
```

---

### 🔴 BUILD TASK 008 — Command Center (Home Screen)
**Status:** 🔴 TODO
**Read:** `design/screens/command-center.md`
**Depends on:** TASKS 003, 007
**Build:**
- Create `src/client/pages/CommandCenter.tsx`
- Widgets (each a component):
  - `TodayHeader` — date, weather placeholder, next event
  - `TopPriorities` — top 3 tasks from priority algorithm
  - `InboxBadge` — pending input queue count
  - `ActiveAgents` — list of agents with status
  - `KeyResultProgress` — progress bars for current quarter KRs
  - `RecentCompletions` — last 5 completed tasks
  - `Blockers` — at-risk items
- Each widget fetches from API
- SSE: live updates when data changes

**Test:**
```bash
# Seed some test data (areas, objectives, tasks)
# Command center shows top 3 priorities
# Complete a task via API → command center updates in real-time
# Empty state renders correctly with no data
```

---

### 🔴 BUILD TASK 009 — Input Queue / Inbox Page
**Status:** 🔴 TODO
**Read:** `design/screens/inbox.md`, `design/unified-inbox/ui-spec.md`
**Depends on:** TASKS 003, 007
**Build:**
- Create `src/client/pages/Inbox.tsx`
- Two-column layout: list (left) + detail panel (right)
- Tab filters: All / Messages / Actions / Urgent
- Input queue cards with type badges (verify/decide/create/classify)
- Action buttons per type:
  - Verify: [Approve] [Redo] [Dismiss]
  - Decide: option buttons
  - Create: [Done] [Reschedule]
- Keyboard shortcuts: j/k navigation, a=approve, d=dismiss
- Real-time: new items slide in via SSE

**Test:**
```bash
# Create input queue items via API
# Page shows them with correct type badges
# Click Approve → item resolves, disappears from list
# Keyboard j/k navigates between items
```

---

### 🔴 BUILD TASK 010 — Operations: Today View
**Status:** 🔴 TODO
**Read:** `design/screens/operations/today-view.md`
**Depends on:** TASKS 003, 007
**Build:**
- Create `src/client/pages/operations/TodayView.tsx`
- Timeline layout: time blocks with tasks inside
- Overdue section at top (red)
- Scheduled tasks in time slots
- Unscheduled tasks at bottom
- Now indicator (red line)
- Quick complete: checkbox to mark done
- Drag to reschedule (stretch goal)

**Test:**
```bash
# Create time blocks and scheduled tasks
# Today view shows them in correct time slots
# Check off a task → status updates, XP toast shows
# Overdue tasks appear in red section at top
```

---

### 🔴 BUILD TASK 011 — Operations: Board View (Kanban)
**Status:** 🔴 TODO
**Read:** `design/screens/operations/board-view.md`
**Depends on:** TASKS 003, 007
**Build:**
- Create `src/client/pages/operations/BoardView.tsx`
- Columns by status: To Do, In Progress, Waiting, Review, Done
- Task cards with: title, priority badge, executor icon, due date
- Drag and drop between columns (updates task status)
- Filter bar: by area, project, agent, priority
- Scoped to current project (from URL param) or all tasks

**Test:**
```bash
# Create tasks in different statuses
# Board shows correct columns
# Drag task from "To Do" to "In Progress" → API call, status updates
# Filter by area → only matching tasks show
```

---

### 🔴 BUILD TASK 012 — Task Detail Panel
**Status:** 🔴 TODO
**Read:** `design/screens/operations/task-detail.md`
**Depends on:** TASKS 003, 007
**Build:**
- Create `src/client/components/TaskDetail.tsx` (side panel / drawer)
- Fields: title, description, status, priority, executor type/id, due date, scheduled date, context, energy, tags
- Breadcrumb: Area > Objective > Project > Task
- Dependencies section: blockers and blocked-by
- Activity log: status changes, agent work log entries
- Inline editing: click any field to edit
- Action buttons: complete, assign, schedule, delete

**Test:**
```bash
# Click task anywhere → detail panel opens
# Edit title → saves on blur
# Change status → state machine validates
# Shows dependency chain correctly
```

---

### 🔴 BUILD TASK 013 — Agent System Backend
**Status:** 🔴 TODO
**Read:** `design/backend/sop-agent-integration.md`, `design/api/v3-complete.md` (Section 4)
**Depends on:** TASKS 002, 006
**Build:**
- Create `src/server/routes/agents.ts` — CRUD + pause/resume
- Create `src/server/engine/orchestrator.ts`:
  - Assign tasks to agents based on capabilities and area
  - Agent work cycle: pick task → execute → log → create input queue item
  - Load balancing: respect max_concurrent per agent
- Create `src/server/engine/agent-runner.ts`:
  - Actually calls Claude API for agent work
  - Streams progress via SSE
  - Saves output to VDR path
  - Logs to agent_work_log

**Test:**
```bash
# Register a research agent via API
# Create task with executor_type: agent
# Orchestrator assigns task to agent
# Agent runner executes (calls Claude API)
# agent_work_log entry created
# If requires_input = verify → input_queue entry created
```

---

### 🔴 BUILD TASK 014 — Agent Monitor Page
**Status:** 🔴 TODO
**Read:** `design/screens/agent-monitor.md`
**Depends on:** TASKS 007, 013
**Build:**
- Create `src/client/pages/AgentMonitor.tsx`
- Agent cards: name, status, current task, model, cost
- Live progress via SSE
- Pause/cancel buttons
- Work history log (expandable)
- Cost summary per agent / per day

**Test:**
```bash
# Start an agent task
# Agent monitor shows live status
# Click pause → agent pauses
# Cost tracker shows running total
```

---

### 🔴 BUILD TASK 015 — Heartbeat Process
**Status:** 🔴 TODO
**Read:** `design/backend/heartbeat-process.md`
**Depends on:** TASKS 002, 006
**Build:**
- Create `src/server/heartbeat/index.ts` — separate process (spawned by main server or run via cron)
- Runs every 15 minutes during daytime, every hour at night
- Tasks:
  - Check input_queue for stale items
  - Check dependencies: unblock anything newly unblocked
  - Check schedule: upcoming deadlines → warning events
  - Check agent completions
  - Generate morning brief (if 06:00 window)
  - Generate evening summary (if 20:00 window)
- Writes to DB directly, emits SSE events

**Test:**
```bash
# Run heartbeat manually:
node src/server/heartbeat/index.ts --once
# Creates morning brief entry
# Detects overdue tasks, emits warnings
# Detects unblocked dependencies
```

---

### BUILD TASKS 016-025 (Later phases — queue for after MVP)

| # | Task | Design Doc | Phase |
|---|------|-----------|-------|
| 016 | Chat UI with SOP integration | `design/dashboard/chat-ui.md` | Chat |
| 017 | Documents / VDR redesign | `design/screens/documents/*` | Documents |
| 018 | Knowledge Graph Explorer | `design/dashboard/knowledge-graph.md` | Memory |
| 019 | Memory v2: temporal + confidence | `design/memory/v2/*` | Memory |
| 020 | Unified Inbox: Email bridge | `design/unified-inbox/bridges.md` | Inbox |
| 021 | Unified Inbox: Triage engine | `design/unified-inbox/triage-engine.md` | Inbox |
| 022 | Timeline / Gantt view | `design/screens/operations/timeline-view.md` | Views |
| 023 | Area & Objective detail views | `design/screens/operations/area-view.md` | Views |
| 024 | Review ceremony UI | `design/screens/operations/review-view.md` | Views |
| 025 | Gamification / XP system | `design/gamification/user-engagement.md` | Polish |

---

## AGENT INSTRUCTIONS

Paste this into your agent's system prompt or CLAUDE.md:

```
## BUILD RULES

1. ALWAYS read the referenced design doc BEFORE writing code.
   The design doc is the source of truth. If the doc says the table has 15 columns, your table has 15 columns.

2. ONE TASK PER SESSION. Don't try to do multiple tasks at once.
   Complete the task, run the test, commit, then stop.

3. COMMIT AFTER EACH TASK with message format:
   "build(TASK-XXX): <short description>"

4. UPDATE THE CHECKPOINT in AGENT-BUILD-PLAN.md after each task.

5. TEST BEFORE COMMITTING. Run the acceptance test. If it fails, fix it.

6. DON'T MODIFY DESIGN DOCS. They are read-only specs. If something seems wrong, flag it.

7. FILE STRUCTURE:
   src/
   ├── server/          # Express backend
   │   ├── index.ts     # Entry point
   │   ├── routes/      # API routes (one file per entity)
   │   ├── engine/      # Business logic (state machine, priority, classifier, orchestrator)
   │   ├── events/      # SSE event system
   │   ├── heartbeat/   # Background process
   │   └── middleware/   # Auth, validation, error handling
   ├── client/          # React frontend
   │   ├── main.tsx     # Entry point
   │   ├── pages/       # Page components (one per route)
   │   ├── components/  # Reusable components
   │   ├── hooks/       # Custom React hooks (useSSE, useAPI, etc.)
   │   ├── lib/         # Utilities, API client, types
   │   └── styles/      # Tailwind config, global styles
   ├── shared/          # Shared types between server and client
   └── db/              # Database schema, migrations, seed data

8. TECH CHOICES:
   - TypeScript everywhere
   - better-sqlite3 (sync, fast, no ORM — write raw SQL)
   - Express with express-validator for input validation
   - React with React Router, TanStack Query for data fetching
   - Tailwind CSS with design tokens from design/ui/design-system.md
   - Lucide React for icons (see design/ui/iconography.md)
   - SSE for real-time (no WebSocket needed)

9. WHEN IN DOUBT: The design docs answer your question. Search them first.
```

---

## SEED DATA

After TASK 002, create `src/db/seed.ts` with realistic test data:

```typescript
// Vision
{ statement: "Build a life of freedom, impact, and mastery", horizon: "10y" }

// Areas
{ name: "AI Receptionist Business", icon: "🤖" }
{ name: "Health & Fitness", icon: "💪" }
{ name: "Personal Development", icon: "📚" }
{ name: "Relationships", icon: "❤️" }

// Objectives (Q1 2026)
{ title: "Acquire 10 paying AI Receptionist clients", quarter: "2026-Q1", area: "AI Receptionist" }
{ title: "Run a half marathon under 2 hours", quarter: "2026-Q1", area: "Health" }

// Projects, tasks, etc. — enough to populate every view
```

---

*This file IS the build queue. The agent reads it, finds the next 🔴 TODO, builds it, marks it ✅ DONE, and moves on. That's the whole loop.*
