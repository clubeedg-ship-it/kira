# TASK 016 — Chat Interface

## Agent Instructions

You are building the **Chat Interface** for Kira — the core conversational UI that connects users to their AI agent.

**Read these files first (in order):**
1. `AGENTS.md` — project conventions, tech stack, multi-tenancy rules
2. `design/dashboard/chat-ui.md` — full 1036-line chat UI spec
3. `design/backend/event-system.md` — SSE event catalog
4. `src/server/events/sse.ts` — existing SSE implementation
5. `src/server/engine/agent-runner.ts` — existing agent execution
6. `src/db/schema.ts` — current database schema

**What you're building:**

### Database
Add to `src/db/schema.ts`:
```
messages table:
  id: uuid (PK, default gen_random_uuid())
  user_id: uuid (FK → users, NOT NULL, indexed)
  conversation_id: uuid (indexed, for future multi-conversation support, default to a single conversation per user for now)
  role: text ('user' | 'assistant' | 'system')
  content: text (the rendered text content)
  content_blocks: jsonb (array of typed blocks: text, thinking, tool_call, tool_result)
  parent_id: uuid (nullable, FK → messages, for threading)
  model: text (nullable, which model generated this)
  tokens_in: integer (nullable)
  tokens_out: integer (nullable)
  created_at: timestamptz
```
Run `npx drizzle-kit generate` after schema change.

### Backend Routes (`src/server/routes/chat.ts`)
- `POST /api/v1/chat/send` — accepts `{ message: string }`. Creates user message row. Enqueues BullMQ job for agent processing. Returns `{ data: { messageId } }` immediately (202).
- `GET /api/v1/chat/messages?limit=50&before=<timestamp>` — paginated message history for the authenticated user. Returns `{ data: Message[] }`.
- `GET /api/v1/chat/messages/:id` — single message with full content_blocks.

### Agent Job (`src/server/jobs/chat-response.ts`)
- Receives `{ userId, messageId }`.
- Loads last 50 messages as conversation context.
- Builds system prompt: include user's name, current top 5 tasks, any overdue items, current date/time, personality config.
- Calls Anthropic API with streaming enabled.
- As tokens stream in: emit SSE events (`chat.token` with `{ messageId, delta }`) to the user's channel.
- On thinking blocks: emit `chat.thinking` events.
- On tool calls: emit `chat.tool_call` and `chat.tool_result` events.
- On completion: save full message to DB, emit `chat.message_complete`.
- Handle errors: emit `chat.error`, save error state.

### Frontend Page (`src/client/pages/Chat.tsx`)
- Route: `/chat`
- Layout: full-width message area + input bar at bottom
- Messages: Discord-style (full-width, alternating subtle backgrounds for user/assistant)
- User messages: right-aligned or left-aligned with different background. Keep it clean.
- Assistant messages: rendered as markdown (use a lightweight markdown renderer — install `react-markdown` or similar)
- Collapsible blocks: `<details>` style toggles for thinking and tool_call content. Collapsed by default on older messages, auto-open on the latest message.
- Input bar: `<textarea>` that grows up to 200px. Send button. Shift+Enter for newlines. Enter to send.
- Auto-scroll: scroll to bottom on new message UNLESS user has scrolled up (save scroll position, show "↓ New messages" button when not at bottom).
- Typing indicator: pulsing dots when agent is processing (between `chat.token` events or while waiting for first token).
- Skeleton loading on initial page load.
- SSE integration: use the existing `useSSE` hook. Listen for `chat.token`, `chat.message_complete`, `chat.thinking`, `chat.tool_call`, `chat.tool_result`, `chat.error`.
- TanStack Query for `GET /api/v1/chat/messages` with infinite scroll (load older messages on scroll up).

### Sidebar Update
- Add 💬 Chat to sidebar navigation (should be second item, after 🏠 Home)
- Show unread badge count (messages since last visit — track via localStorage timestamp)

### What NOT to build (yet):
- No voice input (TASK 023)
- No task extraction from messages (TASK 017)
- No file/image attachments
- No multi-conversation support (single thread per user for now)
- No message editing or deletion

## Commit Format
```
build(TASK-016): Chat interface with streaming + collapsible blocks
```

## Acceptance Test
```bash
# 1. Send a message
curl -X POST localhost:3008/api/v1/chat/send -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"message":"What are my top priorities today?"}'
# Returns 202 with messageId

# 2. SSE stream receives tokens
# Open /chat in browser → message appears → response streams in

# 3. History persists
# Refresh page → all messages load from DB

# 4. Collapsible blocks
# Agent uses a tool → tool_call block appears collapsed
# Click to expand → shows tool input/output

# 5. Different user isolation
# Login as user B → sees empty chat, not user A's messages
```
