# Kira — Data Flow Documentation

> **Version:** 0.1.0-draft
> **Date:** 2026-02-11
> **Parent:** [system-overview.md](./system-overview.md)

---

## Table of Contents

1. [Message Flow](#1-message-flow)
2. [Memory Flow](#2-memory-flow)
3. [Sub-Agent Flow](#3-sub-agent-flow)
4. [Widget Flow](#4-widget-flow)
5. [Cron Flow](#5-cron-flow)
6. [File Flow](#6-file-flow)
7. [Error & Retry Flows](#7-error--retry-flows)

---

## 1. Message Flow

### 1.1 Inbound: User → Agent

```
User types message in Telegram
         │
         ▼
┌─────────────────┐
│  Telegram API    │  (Telegram servers)
│  Bot long-poll   │
└────────┬────────┘
         │ JSON update via HTTPS
         ▼
┌─────────────────┐
│  Chat Bridge     │  (Telegram adapter in Gateway)
│  (normalize)     │
│                  │  Converts Telegram-specific format
│                  │  to InboundMessage:
│                  │  {id, channel:'telegram', chatId,
│                  │   userId, text, timestamp, ...}
└────────┬────────┘
         │ Normalized InboundMessage
         ▼
┌─────────────────┐
│  Gateway         │
│  Session Manager │
│                  │  1. Look up or create session for chatId
│                  │  2. Check if agent is already processing
│                  │     (queue if busy)
│                  │  3. Inject workspace context files:
│                  │     - AGENTS.md, SOUL.md, USER.md
│                  │     - memory/YYYY-MM-DD.md (today + yesterday)
│                  │     - MEMORY.md (if main session)
│                  │     - TOOLS.md
│                  │  4. Append user message to conversation
└────────┬────────┘
         │ Prompt (system + history + new message)
         ▼
┌─────────────────┐
│  Agent Runtime   │
│                  │  1. Construct full prompt
│                  │  2. Call Anthropic API
│                  │  3. Stream response tokens
│                  │  4. If tool_use: execute tool, append
│                  │     result, call API again (loop)
│                  │  5. Final text response ready
└────────┬────────┘
         │ Agent response (text + optional media)
         ▼
┌─────────────────┐
│  Gateway         │
│  Response Router │
│                  │  Fan-out to all subscribers:
│                  │
│                  ├──► Chat Bridge → Telegram API → User
│                  │    (formatted per platform capabilities)
│                  │
│                  ├──► Dashboard SSE → Frontend
│                  │    (real-time message event)
│                  │
│                  └──► Memory Engine (conversation log)
└─────────────────┘
```

### 1.2 Detailed Message Lifecycle

```
Time ─────────────────────────────────────────────────────►

User        Telegram     Gateway      Agent        Anthropic    Dashboard
 │            │            │            │              │            │
 │──message──►│            │            │              │            │
 │            │──webhook──►│            │              │            │
 │            │            │──prompt───►│              │            │
 │            │            │            │──API call───►│            │
 │            │            │──SSE: "agent thinking"───────────────►│
 │            │            │            │◄──stream─────│            │
 │            │            │            │              │            │
 │            │            │  (if tool call needed)    │            │
 │            │            │            │──exec tool   │            │
 │            │            │──SSE: "executing: read_file"────────►│
 │            │            │            │──API call───►│            │
 │            │            │            │◄──stream─────│            │
 │            │            │            │              │            │
 │            │            │◄─response──│              │            │
 │            │◄──send─────│            │              │            │
 │◄──message──│            │──SSE: message────────────────────────►│
 │            │            │            │              │            │
```

### 1.3 Message Format Through Pipeline

**Telegram raw:**
```json
{
  "update_id": 123456,
  "message": {
    "message_id": 789,
    "from": {"id": 7985502241, "first_name": "Otto", "username": "coringa_dfato"},
    "chat": {"id": 7985502241, "type": "private"},
    "text": "What's on my calendar today?"
  }
}
```

**Normalized (after Chat Bridge):**
```json
{
  "id": "tg-789",
  "channel": "telegram",
  "chatId": "7985502241",
  "userId": "7985502241",
  "username": "coringa_dfato",
  "displayName": "Otto",
  "text": "What's on my calendar today?",
  "timestamp": 1739267400000,
  "replyTo": null,
  "media": null
}
```

**Agent prompt (constructed by Gateway):**
```
[System prompt with AGENTS.md, SOUL.md, USER.md, etc.]
[Conversation history...]
[User]: What's on my calendar today?
```

**Agent response (from Anthropic API):**
```json
{
  "role": "assistant",
  "content": [
    {"type": "tool_use", "name": "exec", "input": {"command": "..."}},
    {"type": "text", "text": "You have 3 events today: ..."}
  ]
}
```

**Outbound to Telegram:**
```json
{
  "chat_id": 7985502241,
  "text": "You have 3 events today: ...",
  "parse_mode": "Markdown"
}
```

**SSE event to Dashboard:**
```json
{
  "event": "message",
  "data": {
    "id": "msg-abc123",
    "role": "assistant",
    "text": "You have 3 events today: ...",
    "timestamp": 1739267405000,
    "sessionId": "main",
    "toolCalls": [{"name": "exec", "status": "completed"}]
  }
}
```

---

## 2. Memory Flow

### 2.1 Session Start — Memory Loading

```
Agent session begins
         │
         ▼
┌─────────────────────────────────────────────┐
│  Context Assembly (Gateway)                  │
│                                              │
│  1. Load AGENTS.md              (~2K tokens) │
│  2. Load SOUL.md                (~1K tokens) │
│  3. Load USER.md                (~500 tokens)│
│  4. Load TOOLS.md               (~500 tokens)│
│  5. Load memory/2026-02-11.md   (variable)   │
│  6. Load memory/2026-02-10.md   (variable)   │
│  7. If main session:                         │
│     Load MEMORY.md              (~2K tokens) │
│  8. If post-compaction:                      │
│     Load memory/retrieved-context.md         │
│                                              │
│  Total system context: ~10-20K tokens        │
│  Remaining for conversation: ~160K tokens    │
└─────────────────────────────────────────────┘
```

### 2.2 During Conversation — Memory Writing

```
Agent processes messages
         │
         ├── Agent decides something noteworthy
         │   │
         │   ▼
         │   Write to memory/2026-02-11.md
         │   (raw observation, decision, event)
         │
         ├── Agent learns long-term insight
         │   │
         │   ▼
         │   Update MEMORY.md
         │   (curated knowledge, preference, lesson)
         │
         └── Every ~50 messages or at 75% context
             │
             ▼
     ┌───────────────────┐
     │  Context Monitor   │
     │  (check tokens)    │
     └────────┬──────────┘
              │ Context > 75%
              ▼
     ┌───────────────────┐
     │  Curator Agent     │
     │                    │
     │  1. Take oldest    │
     │     75% of msgs    │
     │  2. Summarize with │
     │     LLM            │
     │  3. Extract facts  │
     │  4. Store summary  │
     │     in summaries/  │
     │  5. Store facts in │
     │     graph.db       │
     │  6. Truncate       │
     │     conversation   │
     └────────┬──────────┘
              │
              ▼
     ┌───────────────────┐
     │  Memory Retriever  │
     │                    │
     │  Query graph.db    │
     │  for facts relevant│
     │  to remaining      │
     │  conversation      │
     │                    │
     │  Write results to  │
     │  retrieved-context  │
     │  .md               │
     └───────────────────┘
```

### 2.3 Memory Maintenance (Heartbeat)

```
Heartbeat fires (every ~30 min)
         │
         ▼
Agent checks: "Is it time for memory maintenance?"
         │
         ├── NO → other heartbeat tasks
         │
         └── YES (every few days)
             │
             ▼
     1. Read recent memory/YYYY-MM-DD.md files
     2. Identify significant events/lessons
     3. Update MEMORY.md with distilled insights
     4. Remove outdated entries from MEMORY.md
     5. Optionally run memory-manager.js for graph sync
```

### 2.4 Knowledge Graph Schema

```
┌──────────────────────────────────────────────┐
│  graph.db (SQLite)                            │
│                                                │
│  TABLE entities                                │
│  ├── id INTEGER PRIMARY KEY                   │
│  ├── name TEXT                                │
│  ├── type TEXT (person/place/project/concept) │
│  ├── properties JSON                          │
│  └── created_at, updated_at                   │
│                                                │
│  TABLE relations                               │
│  ├── id INTEGER PRIMARY KEY                   │
│  ├── source_id → entities.id                  │
│  ├── target_id → entities.id                  │
│  ├── type TEXT (knows/works_on/prefers/...)   │
│  ├── properties JSON                          │
│  └── created_at                               │
│                                                │
│  TABLE facts                                   │
│  ├── id INTEGER PRIMARY KEY                   │
│  ├── content TEXT                              │
│  ├── source TEXT (conversation/observation)    │
│  ├── confidence REAL (0-1)                    │
│  ├── entity_ids JSON (linked entities)        │
│  └── created_at, expires_at                   │
│                                                │
│  TABLE summaries                               │
│  ├── id INTEGER PRIMARY KEY                   │
│  ├── session_id TEXT                           │
│  ├── content TEXT                              │
│  ├── token_count INTEGER                      │
│  └── created_at                               │
└──────────────────────────────────────────────┘
```

---

## 3. Sub-Agent Flow

### 3.1 Spawning & Execution

```
Main Agent receives complex task
         │
         ▼
Main Agent decides to delegate
(e.g., "Write architecture docs")
         │
         ▼
┌─────────────────────────────────┐
│  Gateway: Create Sub-Agent      │
│                                  │
│  1. Generate session ID          │
│     (subagent:<uuid>)           │
│  2. Build sub-agent context:     │
│     - Task description           │
│     - Relevant files/context     │
│     - Tool permissions           │
│     - NO main conversation       │
│     - NO MEMORY.md (security)    │
│  3. Assign label for tracking    │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Sub-Agent Runtime               │
│                                  │
│  Runs independently:             │
│  - Own LLM API calls             │
│  - Own tool executions           │
│  - Can read/write workspace      │
│  - Cannot send messages          │
│  - Cannot see main chat          │
│                                  │
│  Continues until:                │
│  - Task complete (returns result)│
│  - Timeout exceeded (killed)     │
│  - Error (returns error)         │
└────────────┬────────────────────┘
             │ Result text
             ▼
┌─────────────────────────────────┐
│  Main Agent                      │
│                                  │
│  Receives sub-agent result       │
│  Incorporates into response      │
│  Delivers to user                │
└─────────────────────────────────┘
```

### 3.2 Concurrency Model

```
Main Agent
    │
    ├──spawn──► Sub-Agent A (design docs)     ─── runs ───► result A
    │                                                          │
    ├──spawn──► Sub-Agent B (code review)     ─── runs ───► result B
    │                                                          │
    └──spawn──► Sub-Agent C (web research)    ─── runs ───► result C
                                                               │
    Main Agent continues working...                            │
    Main Agent collects results ◄──────────────────────────────┘
```

**Important:** Sub-agents can run concurrently. Gateway manages the pool. Each sub-agent has its own LLM API calls (concurrent API usage). Filesystem access is shared — sub-agents must coordinate via file naming or directories to avoid conflicts.

---

## 4. Widget Flow

### 4.1 Widget Creation

```
Agent decides to create interactive UI
         │
         ▼
Agent (or Widget Sub-Agent) generates widget definition:
{
  "id": "budget-chart-001",
  "type": "chart",
  "title": "Monthly Budget Breakdown",
  "schema": {
    "chartType": "pie",
    "labels": ["Rent", "Food", "Transport", "Other"],
    "datasets": [{"data": [1200, 400, 200, 300]}]
  },
  "interactable": true,
  "persistent": true
}
         │
         ▼
┌─────────────────────────────────┐
│  Gateway                         │
│  1. Store widget in SQLite       │
│  2. Push SSE event:              │
│     {event: "widget-create",     │
│      data: <widget definition>}  │
└────────────┬────────────────────┘
             │ SSE
             ▼
┌─────────────────────────────────┐
│  Dashboard Frontend              │
│  1. Receive widget-create event  │
│  2. Render widget component      │
│     (chart/form/table/custom)    │
│  3. If custom: create sandboxed  │
│     iframe with widget HTML      │
│  4. Display in widget panel      │
└─────────────────────────────────┘
```

### 4.2 Widget Interaction

```
User clicks/interacts with widget in Dashboard
         │
         ▼
┌─────────────────────────────────┐
│  Widget (in iframe)              │
│  Calls: window.parent            │
│    .postMessage({                │
│      type: 'widget-interaction', │
│      widgetId: 'budget-001',     │
│      action: 'slice-click',      │
│      payload: {label: 'Food'}    │
│    }, '*')                       │
└────────────┬────────────────────┘
             │ postMessage
             ▼
┌─────────────────────────────────┐
│  Dashboard Frontend              │
│  1. Validate message origin      │
│  2. POST /api/widgets/           │
│     budget-001/interact          │
│     {action, payload}            │
└────────────┬────────────────────┘
             │ HTTP POST
             ▼
┌─────────────────────────────────┐
│  Dashboard Server                │
│  1. Store interaction event      │
│  2. Forward to Gateway           │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Gateway → Agent Runtime         │
│  Inject as system message:       │
│  "[Widget interaction:           │
│   budget-001 slice-click         │
│   payload: {label: 'Food'}]"    │
│                                  │
│  Agent processes and may:        │
│  - Update widget state           │
│  - Respond in chat               │
│  - Create new widget             │
└─────────────────────────────────┘
```

### 4.3 Widget Update

```
Agent wants to update existing widget
         │
         ▼
Agent outputs widget-update command:
{
  "action": "update-widget",
  "id": "budget-chart-001",
  "patch": {
    "schema.datasets[0].data": [1200, 350, 220, 280]
  }
}
         │
         ▼
Gateway stores update → pushes SSE
         │
         ▼
Dashboard applies patch → widget re-renders
```

---

## 5. Cron Flow

### 5.1 Scheduled Job Execution

```
┌───────────────────────────────────────────────────┐
│  Cron Scheduler (inside Gateway)                   │
│                                                     │
│  Every 60 seconds:                                  │
│  1. Check all enabled cron jobs                     │
│  2. Compare nextRun with current time               │
│  3. For each due job:                               │
│     a. Check not already running (prevent overlap)  │
│     b. Create isolated agent session                │
│     c. Fire job                                     │
│     d. Update lastRun, calculate nextRun            │
└──────────────────────┬────────────────────────────┘
                       │ Job fires
                       ▼
┌───────────────────────────────────────────────────┐
│  Isolated Cron Session                              │
│                                                     │
│  System prompt:                                     │
│  "You are Kira executing a scheduled task.          │
│   Task: {job.task}                                  │
│   Time: {now}                                       │
│   Output channel: {job.outputChannel}               │
│                                                     │
│   Complete the task. Be concise.                    │
│   You have access to all tools."                    │
│                                                     │
│  Context includes:                                  │
│  - AGENTS.md, SOUL.md, USER.md                     │
│  - Today's memory file                              │
│  - MEMORY.md (if main user's job)                  │
│  - Job-specific context (if configured)             │
└──────────────────────┬────────────────────────────┘
                       │ Agent completes task
                       ▼
┌───────────────────────────────────────────────────┐
│  Output Routing                                     │
│                                                     │
│  If outputChannel == 'telegram:7985502241':         │
│    → Send result as Telegram message                │
│                                                     │
│  If outputChannel == 'silent':                      │
│    → Write to memory only, no user notification     │
│                                                     │
│  If outputChannel == 'dashboard':                   │
│    → Push SSE event only                            │
│                                                     │
│  Always: Log to memory/YYYY-MM-DD.md               │
└───────────────────────────────────────────────────┘
```

### 5.2 Heartbeat Flow (Special Cron)

```
Heartbeat timer fires (every ~30 min)
         │
         ▼
Gateway sends heartbeat prompt to main session:
"Read HEARTBEAT.md if it exists. Follow it strictly.
 If nothing needs attention, reply HEARTBEAT_OK."
         │
         ▼
Agent checks:
├── HEARTBEAT.md checklist
├── Time since last checks (email, calendar, etc.)
├── Memory maintenance schedule
├── Pending background tasks
         │
         ├── Something needs attention
         │   → Execute check
         │   → Notify user if important
         │   → Update heartbeat-state.json
         │
         └── Nothing needed
             → Reply HEARTBEAT_OK
             → Gateway suppresses (no user notification)
```

### 5.3 One-Shot Timer Flow

```
User: "Remind me in 20 minutes to call the dentist"
         │
         ▼
Agent creates one-shot cron job:
{
  "id": "reminder-abc",
  "name": "Dentist call reminder",
  "schedule": "once:2026-02-11T10:10:00Z",
  "task": "Remind the user to call the dentist",
  "outputChannel": "telegram:7985502241",
  "enabled": true
}
         │
         ▼
20 minutes later, scheduler fires
         │
         ▼
Isolated session: "Remind the user to call the dentist"
         │
         ▼
Agent sends: "Hey! 🦷 Time to call the dentist!"
         │
         ▼
Job auto-disabled (one-shot)
```

---

## 6. File Flow

### 6.1 Agent Creates Deliverable

```
Agent writes a file during task execution
         │
         ▼
Agent uses file write tool:
  path: ~/kira/design/architecture/system-overview.md
  content: "# Kira System Architecture..."
         │
         ▼
┌─────────────────────────────────┐
│  Filesystem                      │
│  File written to workspace       │
│  ~/kira/design/architecture/     │
│        system-overview.md        │
└────────────┬────────────────────┘
             │
             ├──► Gateway detects file change
             │    (inotify / polling)
             │         │
             │         ▼
             │    SSE event to Dashboard:
             │    {event: "file-change",
             │     data: {path, action: "created",
             │            size, mtime}}
             │
             └──► VDR (Virtual Data Room) index
                  updated with new file metadata
                       │
                       ▼
                  Dashboard shows file in
                  file browser panel
```

### 6.2 Virtual Data Room (VDR) Structure

```
~/kira/                          ← Workspace root
├── design/                      ← Project deliverables
│   ├── architecture/            
│   │   ├── system-overview.md   
│   │   ├── data-flow.md         
│   │   └── tech-stack.md        
│   ├── product/                 
│   └── ux/                      
├── src/                         ← Source code
├── docs/                        ← Documentation
├── memory/                      ← Memory files (Layer 2)
│   ├── 2026-02-11.md           
│   ├── 2026-02-10.md           
│   ├── context-buffer.md       
│   ├── retrieved-context.md    
│   ├── graph.db                
│   └── summaries/              
├── AGENTS.md                    ← Agent instructions
├── SOUL.md                      ← Agent personality
├── USER.md                      ← User profile
├── MEMORY.md                    ← Long-term memory
├── TOOLS.md                     ← Tool configuration
└── HEARTBEAT.md                 ← Heartbeat checklist
```

### 6.3 File Access from Dashboard

```
User browses files in Dashboard
         │
         ▼
GET /api/files?path=/design/architecture/
         │
         ▼
Dashboard Server reads directory listing
Returns: [{name, type, size, mtime, preview?}]
         │
         ▼
User clicks on system-overview.md
         │
         ▼
GET /api/files/design/architecture/system-overview.md
         │
         ▼
Dashboard Server reads file, returns content
         │
         ▼
Dashboard renders markdown with syntax highlighting
```

---

## 7. Error & Retry Flows

### 7.1 LLM API Failure

```
Agent Runtime calls Anthropic API
         │
         ▼
HTTP 529 (Overloaded) or 500 or Timeout
         │
         ▼
Retry with exponential backoff:
  Attempt 1: wait 1s  → retry
  Attempt 2: wait 2s  → retry
  Attempt 3: wait 4s  → retry
  Attempt 4: FAIL
         │
         ▼
Gateway notifies user:
"⚠️ Anthropic API is temporarily unavailable.
 I'll keep trying. Your message is queued."
         │
         ▼
Background retry every 30s for up to 10 minutes
         │
         ├── API recovers → process message → deliver response
         └── Still down after 10 min → "Still can't reach the API. I'll try again later."
```

### 7.2 Chat Bridge Disconnection

```
Telegram long-poll connection drops
         │
         ▼
Chat Bridge detects: connection error / timeout
         │
         ▼
Reconnect with backoff: 1s, 2s, 5s, 10s, 30s, 60s
         │
         ├── Reconnected → resume polling, process queued updates
         │
         └── Failed for >5 min
             → Health Monitor logs warning
             → If other bridges available, route there
             → Queue outbound messages for retry
```

### 7.3 Sub-Agent Timeout

```
Sub-agent running for > maxDurationMs (default: 300000 = 5 min)
         │
         ▼
Gateway kills sub-agent session
         │
         ▼
Main agent receives:
"Sub-agent 'design-docs' timed out after 5 minutes.
 Partial work may be in the filesystem."
         │
         ▼
Main agent decides:
├── Retry with longer timeout
├── Break task into smaller pieces
└── Inform user of partial completion
```

---

*All data flows trace back to components defined in [system-overview.md](./system-overview.md). Implementation should follow these flows exactly.*
