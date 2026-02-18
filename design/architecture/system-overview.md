# Kira — System Architecture Overview

> **Version:** 0.1.0-draft
> **Date:** 2026-02-11
> **Status:** Design Phase
> **Audience:** Coding agents, system architects, contributors

---

## Table of Contents

1. [Vision & Constraints](#1-vision--constraints)
2. [System Components](#2-system-components)
3. [Component Interaction Diagram](#3-component-interaction-diagram)
4. [Deployment Models](#4-deployment-models)
5. [Current State vs Target State](#5-current-state-vs-target-state)
6. [Security Boundaries](#6-security-boundaries)
7. [Failure Modes & Recovery](#7-failure-modes--recovery)
8. [Open Questions](#8-open-questions)

---

> **Terminology:** OpenClaw is the runtime platform (gateway, session management, cron). Kira is the product built on top of it — the agent personality, memory system, dashboard, and user experience. Think of OpenClaw as the engine, Kira as the car.

---

## 1. Vision & Constraints

**Kira** is an installable AI partner — a personal agent that lives on your infrastructure (laptop, VPS, or cloud), communicates through messaging platforms, maintains long-term memory, and performs autonomous work on schedules.

### Design Principles

| Principle | Implication |
|-----------|-------------|
| **Single-user first** | No multi-tenant complexity until v2. One user, one agent. |
| **Installable** | Ships as Docker image or native installer. No SaaS dependency beyond LLM API. |
| **Always-on capable** | Runs on VPS with persistent sessions, or laptop with graceful sleep/wake. |
| **Platform-agnostic chat** | Telegram today, but architecture supports any chat platform. |
| **Local-first data** | All user data stays on the host. SQLite, not cloud databases. |
| **AI-native UI** | Dashboard is agent-driven. Widgets are generated, not hand-coded. |
| **Autonomous but supervised** | Cron enables proactive work; user maintains oversight. |

### Hard Constraints

- **Single process model preferred** — minimize orchestration complexity
- **No mandatory cloud services** — LLM API is the only external dependency
- **SQLite only** — no Postgres, no Redis, no external databases
- **Minimal resource footprint** — must run on a 2-core, 2GB RAM VPS
- **Sub-second message routing** — chat responses must not lag due to infrastructure

---

## 2. System Components

### 2.1 Gateway (OpenClaw)

**Role:** Central nervous system. Routes messages between chat platforms, agent runtime, dashboard, and cron scheduler.

**Responsibilities:**
- Receive inbound messages from all chat bridges (Telegram, Discord, Signal, WhatsApp)
- Maintain session state (conversation ID, channel metadata, user identity)
- Route messages to the correct agent session (main, sub-agent, cron)
- Deliver agent responses back to the originating channel AND the dashboard
- Manage cron schedules — fire agent turns at configured times
- Serve as the single entry point for all external I/O
- Heartbeat polling — periodic agent wake-ups for background checks
- Tool proxying — provide browser, file, exec, and other tools to the agent runtime

**Technology:** Node.js (OpenClaw existing codebase)

**Interfaces:**
| Interface | Protocol | Direction | Description |
|-----------|----------|-----------|-------------|
| Chat Bridges | HTTP webhooks / long-poll | Inbound | Receives messages from platforms |
| Agent Runtime | IPC / HTTP | Bidirectional | Sends prompts, receives responses |
| Dashboard Server | HTTP + SSE | Outbound | Pushes events for real-time UI |
| Cron Scheduler | Internal | Trigger | Fires scheduled agent sessions |
| File System | Direct | Read/Write | Workspace access for agent tools |
| LLM API | HTTPS | Outbound | Proxied through agent runtime |

**State:**
- Session registry (in-memory + persisted to SQLite)
- Cron schedule table (SQLite)
- Message queue (in-memory, bounded)
- Channel configuration (config files)

**Criticality:** **REQUIRED** — nothing works without the gateway.

---

### 2.2 Agent Runtime

**Role:** Executes LLM-powered agent turns. Manages the main agent session and spawns sub-agents for parallel/isolated work.

**Responsibilities:**
- Construct prompts from system instructions, memory context, and user messages
- Call the LLM API (Anthropic Claude, configurable model)
- Parse and execute tool calls (file read/write, exec, browser, web search, etc.)
- Spawn sub-agents with isolated context for delegated tasks
- Manage context window — track token usage, trigger memory curation when approaching limits
- Inject workspace files (AGENTS.md, SOUL.md, USER.md, memory files) into system prompt
- Handle streaming responses for real-time output

**Sub-Agent Model:**
```
┌─────────────────────────────────────────────┐
│                 MAIN AGENT                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │Sub-Agent│  │Sub-Agent│  │Sub-Agent│    │
│  │ (task1) │  │ (task2) │  │ (task3) │    │
│  └────┬────┘  └────┬────┘  └────┬────┘    │
│       │             │             │          │
│       └─────────────┴─────────────┘          │
│              Results merged                   │
└─────────────────────────────────────────────┘
```

**Sub-agent properties:**
- Isolated context (own system prompt, limited memory injection)
- Cannot access main agent's conversation history
- Cannot send messages to user directly (returns result to main agent)
- Can access filesystem (same workspace, same permissions)
- Can use all tools except `message` (unless explicitly granted)
- Labeled sessions for tracking (e.g., `subagent:design-architecture`)
- Terminated after task completion

**Technology:** Node.js, Anthropic SDK

**Interfaces:**
| Interface | Protocol | Direction | Description |
|-----------|----------|-----------|-------------|
| Gateway | IPC / HTTP | Bidirectional | Receives prompts, returns responses |
| LLM API | HTTPS | Outbound | Claude API calls |
| Tool Layer | Function calls | Internal | File, exec, browser, web, etc. |
| Memory Engine | SQLite + FS | Read/Write | Context injection and storage |
| Sub-Agents | IPC | Parent→Child | Task delegation and result collection |

**Criticality:** **REQUIRED** — core intelligence layer.

---

### 2.3 Memory Engine

**Role:** Provides persistent, queryable memory across sessions. Four-layer system that gives the agent continuity.

**Architecture — Four Layers:**

```
┌──────────────────────────────────────────────────┐
│               MEMORY ENGINE                       │
│                                                    │
│  Layer 1: WORKING MEMORY (Context Window)         │
│  ├── Current conversation messages                │
│  ├── Injected system files (AGENTS.md, etc.)     │
│  └── Token budget: ~180K (Claude model dependent) │
│                                                    │
│  Layer 2: SESSION MEMORY (Daily Files)            │
│  ├── memory/YYYY-MM-DD.md — raw daily logs       │
│  ├── memory/context-buffer.md — auto-summary      │
│  ├── Written by agent during conversation         │
│  └── Read at session start for recent context     │
│                                                    │
│  Layer 3: LONG-TERM MEMORY (Curated)              │
│  ├── MEMORY.md — distilled insights & knowledge   │
│  ├── Manually curated by agent during heartbeats  │
│  ├── Personal context, preferences, lessons       │
│  └── Only loaded in main session (security)       │
│                                                    │
│  Layer 4: KNOWLEDGE GRAPH (SQLite)                │
│  ├── graph.db — entities, relations, facts        │
│  ├── memory/summaries/ — curated summaries        │
│  ├── memory/retrieved-context.md — query results  │
│  ├── Queried on compaction recovery               │
│  └── Updated by memory-manager.js                 │
│                                                    │
└──────────────────────────────────────────────────┘
```

> **Note:** The practical file-based layers below map to the cognitive 4-layer model in `memory/4-layer-system.md`:
> - Working Memory (Context Window) → Working Memory layer
> - Session Memory (Daily Files) → Episodic Memory layer
> - Long-Term Memory (Curated MEMORY.md) → Semantic + Procedural Memory layers
> - Knowledge Graph (SQLite) → Semantic Memory (entities/facts store)
> See `memory/4-layer-system.md` for the canonical architecture.

**Memory Lifecycle:**

1. **Ingestion:** Agent writes observations to daily files and MEMORY.md
2. **Compaction:** When context window reaches ~75%, curator agent summarizes oldest messages
3. **Extraction:** Facts extracted from summaries → stored in SQLite knowledge graph
4. **Retrieval:** On next session (or post-compaction), relevant facts injected into context
5. **Maintenance:** During heartbeats, agent reviews daily files → updates MEMORY.md

**Scripts:**
| Script | Purpose |
|--------|---------|
| `context-monitor.js` | Check token usage, warn at thresholds |
| `memory-manager.js` | Full pipeline: summarize → extract → store |
| `context-summary.js` | Generate context buffer from recent messages |

**Storage:**
- `~/kira/memory/*.md` — Markdown files (Layer 2)
- `~/kira/MEMORY.md` — Curated long-term (Layer 3)
- `~/kira/memory/graph.db` — SQLite knowledge graph (Layer 4)
- `~/kira/memory/summaries/` — Curator output

**Criticality:** **REQUIRED** (Layer 1-2), **RECOMMENDED** (Layer 3-4). Agent functions without graph but loses long-term recall.

---

### 2.4 Dashboard Server

**Role:** HTTP server that serves the dashboard frontend and provides real-time APIs for conversation display, widget rendering, and file browsing.

**Responsibilities:**
- Serve static React PWA assets
- Provide REST API for:
  - Conversation history (paginated)
  - Memory file browsing
  - File/deliverable listing (Virtual Data Room)
  - Widget state management
  - System health status
  - Agent session info
- Push real-time events via SSE:
  - New messages (user and agent)
  - Agent status changes (thinking, executing tool, idle)
  - Widget updates
  - Health alerts
- Authentication (single-user token or passphrase)

**API Design:**
```
GET  /api/conversations              — List conversations
GET  /api/conversations/:id/messages — Messages in conversation
GET  /api/memory                     — Memory file tree
GET  /api/memory/:path               — Read memory file
GET  /api/files                      — VDR file listing
GET  /api/files/:path                — Download/preview file
GET  /api/widgets                    — Active widgets
GET  /api/widgets/:id                — Widget state
POST /api/widgets/:id/interact       — Widget interaction
GET  /api/health                     — System health
GET  /api/sessions                   — Active agent sessions

SSE  /api/events                     — Real-time event stream
  Events: message, status, widget-update, health-alert, 
          file-change, memory-update
```

**Technology:** Node.js (Express or Fastify), serves from same process as Gateway or as separate process.

**Deployment options:**
- **Embedded:** Runs inside Gateway process (simpler, single port)
- **Standalone:** Separate process, communicates with Gateway via HTTP (more isolation)

**Criticality:** **OPTIONAL** — Kira works fully via chat alone. Dashboard is enhancement.

---

### 2.5 Dashboard Frontend

**Role:** React Progressive Web App that provides a visual interface to Kira.

**Responsibilities:**
- Display real-time conversation stream (like a chat UI)
- Render AI-generated widgets (interactive components in sandboxed iframes)
- Browse the Virtual Data Room (files, deliverables)
- View and search memory (daily logs, MEMORY.md, knowledge graph)
- Show system health and agent status
- Support dark/light theme
- Work offline (PWA with service worker caching)
- Mobile-responsive layout

**Key Views:**
```
┌─────────────────────────────────────────┐
│  KIRA DASHBOARD                    [≡]  │
├─────────┬───────────────────────────────┤
│         │                               │
│ 💬 Chat │  [Active Conversation]        │
│ 📁 Files│  Agent: thinking...           │
│ 🧠 Memory│                              │
│ 🔧 Widgets│ User: "Can you analyze..."  │
│ ❤️ Health│  Agent: "Here's what I..."   │
│         │                               │
│         │  ┌─────────────────────┐      │
│         │  │  [Widget: Chart]    │      │
│         │  │  Interactive embed  │      │
│         │  └─────────────────────┘      │
│         │                               │
│         │  [Message Input]        [Send] │
├─────────┴───────────────────────────────┤
│  Status: Connected │ Memory: 45% │ ⚡   │
└─────────────────────────────────────────┘
```

**Technology:** React 18+, Vite, TailwindCSS, SSE client

**Criticality:** **OPTIONAL** — Enhancement layer.

---

### 2.6 Chat Bridge

**Role:** Adapters that connect Kira to messaging platforms.

**Per-Platform Adapters:**

| Platform | Protocol | Status | Auth Method |
|----------|----------|--------|-------------|
| **Telegram** | Bot API (HTTPS long-poll) | ✅ Active | Bot token |
| **Discord** | Gateway WebSocket + REST | 🔜 Planned | Bot token |
| **Signal** | signal-cli / signald | 🔜 Planned | Phone number + profile |
| **WhatsApp** | Baileys / WhatsApp Web API | 🔜 Planned | QR code pairing |

**Each adapter must implement:**
```
interface ChatBridge {
  // Lifecycle
  connect(): Promise<void>
  disconnect(): Promise<void>
  
  // Inbound
  onMessage(handler: (msg: InboundMessage) => void): void
  
  // Outbound
  sendText(chatId: string, text: string, opts?: SendOpts): Promise<void>
  sendMedia(chatId: string, media: MediaPayload): Promise<void>
  sendReaction(chatId: string, messageId: string, emoji: string): Promise<void>
  
  // Capabilities
  capabilities(): ChannelCapabilities  // markdown, reactions, inline buttons, etc.
}
```

**Message normalization:**
All inbound messages are normalized to a common format before reaching the Gateway:
```typescript
interface InboundMessage {
  id: string
  channel: 'telegram' | 'discord' | 'signal' | 'whatsapp'
  chatId: string
  userId: string
  username?: string
  text: string
  replyTo?: string
  media?: { type: string; url: string; caption?: string }
  timestamp: number
}
```

**Criticality:** **At least one bridge REQUIRED** — Telegram is the primary bridge.

---

### 2.7 Cron Scheduler

**Role:** Triggers autonomous agent sessions on configured schedules.

**Responsibilities:**
- Parse and store cron expressions (standard 5-field cron)
- Fire agent turns at scheduled times in isolated sessions
- Pass cron-specific context (task description, target channel for output)
- Support one-shot timers ("remind me in 20 minutes")
- Deliver cron output to specified channel or silently to memory
- Prevent overlapping runs of the same job

**Cron Job Definition:**
```typescript
interface CronJob {
  id: string
  name: string
  schedule: string          // "0 9 * * 1" (Monday 9 AM)
  task: string              // Natural language task description
  model?: string            // Override model for this job
  thinkingLevel?: string    // Override thinking level
  outputChannel?: string    // Where to deliver results (chat ID or 'silent')
  enabled: boolean
  lastRun?: number
  nextRun?: number
  maxDurationMs?: number    // Kill if exceeds
}
```

**Storage:** SQLite table `cron_jobs` (or config file in workspace)

**Execution model:**
```
Timer fires
  → Gateway creates isolated agent session
  → System prompt: "You are executing cron job: {name}. Task: {task}"
  → Agent runs with full tool access
  → Response delivered to outputChannel
  → Session terminated
```

**Criticality:** **OPTIONAL** — Kira works without cron, just loses proactive capability.

---

### 2.8 Widget Engine

**Role:** Enables the agent to generate interactive UI components that render in the dashboard.

**How it works:**
1. Agent (or Widget Sub-Agent) generates a widget definition (JSON schema)
2. Widget definition pushed to Dashboard via SSE
3. Dashboard renders widget in a sandboxed iframe
4. User interactions sent back to agent via Dashboard Server API
5. Agent processes interaction and optionally updates widget state

**Widget Definition:**
```typescript
interface WidgetDefinition {
  id: string
  type: 'chart' | 'form' | 'table' | 'kanban' | 'custom'
  title: string
  schema: object           // Component-specific schema
  data: object             // Initial data
  interactable: boolean    // Can user interact?
  persistent: boolean      // Survives session restart?
  sandboxed: boolean       // Render in iframe? (always true for custom)
}
```

**Built-in widget types:**
- **Chart** — Line, bar, pie (using lightweight chart library)
- **Form** — Dynamic forms with validation
- **Table** — Sortable, filterable data tables
- **Kanban** — Board with draggable cards
- **Custom** — Arbitrary HTML/JS in sandboxed iframe

**Security:** All widgets render in sandboxed iframes with:
- `sandbox="allow-scripts"` (no `allow-same-origin`)
- `postMessage` for communication only
- No access to parent DOM, cookies, or localStorage
- Content Security Policy restricting external loads

**Criticality:** **OPTIONAL** — Advanced feature for dashboard users.

---

### 2.9 Health Monitor

**Role:** Process watchdog that ensures all Kira components stay running and recoverable.

**Responsibilities:**
- Monitor all component processes (Gateway, Dashboard, bridges)
- Restart crashed processes with exponential backoff
- Track system metrics (CPU, memory, disk)
- Detect agent stuck states (tool call timeout, infinite loop)
- Alert user via chat if critical failures occur
- Provide health API for dashboard

**Health Checks:**
| Check | Interval | Action on Failure |
|-------|----------|-------------------|
| Gateway process alive | 10s | Restart |
| LLM API reachable | 60s | Warn user, retry |
| SQLite DB accessible | 30s | Warn, attempt repair |
| Disk space > 500MB | 300s | Warn user |
| Memory usage < 80% | 60s | Log, consider GC |
| Chat bridge connected | 30s | Reconnect |
| Cron scheduler running | 60s | Restart |

**Implementation options:**
- **Embedded:** Health check loop inside Gateway process
- **Systemd:** Use systemd watchdog for process management (VPS)
- **Docker:** Use Docker healthcheck + restart policy (container)

**Criticality:** **RECOMMENDED** — System works without it but loses auto-recovery.

---

### 2.10 Packaging Layer

**Role:** Makes Kira installable with minimal technical knowledge.

**Packaging Targets:**

| Target | Format | Status |
|--------|--------|--------|
| **Docker** | `docker-compose.yml` | Primary target |
| **Linux installer** | Shell script + systemd | Secondary |
| **macOS** | DMG with launchd | Future |
| **Windows** | MSI/NSIS installer | Future |

**Docker Compose Architecture:**
```yaml
services:
  kira-gateway:
    # OpenClaw gateway — routes messages, manages sessions
    # Includes: Agent Runtime, Cron Scheduler, Chat Bridges
    # Single container for simplicity
    
  kira-dashboard:
    # Dashboard Server + Frontend
    # Optional — can be disabled
    
  # No database container — SQLite is file-based
```

**Why single container for core:**
- Minimizes inter-process communication overhead
- SQLite doesn't support concurrent writers well across processes
- Simpler deployment and debugging
- Memory engine needs filesystem access from agent runtime

**Volume mounts:**
```
./workspace/     → /home/user/kira/          (agent workspace, memory, files)
./config/        → /etc/kira/                 (configuration)
./data/          → /var/lib/kira/             (SQLite databases, internal state)
```

**Configuration:**
```
# .env file
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=123456:ABC...
KIRA_USER_NAME=Otto
KIRA_DASHBOARD_PORT=3001
KIRA_DASHBOARD_PASSWORD=...
```

**Criticality:** **REQUIRED** for distribution. Currently manual setup.

---

## 3. Component Interaction Diagram

### 3.1 Full System Topology

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    KIRA SYSTEM                           │
                    │                                                          │
   ┌──────────┐    │  ┌──────────────────────────────────────────────────┐   │
   │ Telegram │◄───┼──┤              GATEWAY (OpenClaw)                  │   │
   └──────────┘    │  │                                                    │   │
   ┌──────────┐    │  │  ┌────────────┐  ┌───────────┐  ┌────────────┐ │   │
   │ Discord  │◄───┼──┤  │Chat Bridge │  │  Session   │  │   Cron     │ │   │
   └──────────┘    │  │  │  Manager   │  │  Manager   │  │ Scheduler  │ │   │
   ┌──────────┐    │  │  └─────┬──────┘  └─────┬─────┘  └─────┬──────┘ │   │
   │ Signal   │◄───┼──┤        │                │               │        │   │
   └──────────┘    │  │        └────────┬───────┴───────┬───────┘        │   │
   ┌──────────┐    │  │                 │               │                │   │
   │ WhatsApp │◄───┼──┤                 ▼               ▼                │   │
   └──────────┘    │  │        ┌────────────────────────────────┐       │   │
                    │  │        │       AGENT RUNTIME             │       │   │
                    │  │        │                                  │       │   │
                    │  │        │  ┌──────────┐  ┌────────────┐  │       │   │
                    │  │        │  │   Main   │  │  Tool Layer │  │       │   │
                    │  │        │  │  Agent   │  │ (exec,file, │  │       │   │
                    │  │        │  │          │  │  browser,..)│  │       │   │
                    │  │        │  └────┬─────┘  └────────────┘  │       │   │
                    │  │        │       │                          │       │   │
                    │  │        │  ┌────┴─────────────────────┐  │       │   │
                    │  │        │  │     Sub-Agent Pool        │  │       │   │
                    │  │        │  │  ┌─────┐ ┌─────┐ ┌─────┐│  │       │   │
                    │  │        │  │  │ SA1 │ │ SA2 │ │ SA3 ││  │       │   │
                    │  │        │  │  └─────┘ └─────┘ └─────┘│  │       │   │
                    │  │        │  └───────────────────────────┘  │       │   │
                    │  │        └───────────────┬────────────────┘       │   │
                    │  │                        │                         │   │
                    │  └────────────────────────┼─────────────────────────┘   │
                    │                           │                              │
                    │              ┌─────────────┼──────────────┐              │
                    │              │             │              │              │
                    │              ▼             ▼              ▼              │
                    │  ┌───────────────┐ ┌────────────┐ ┌──────────────┐     │
                    │  │ Memory Engine │ │  Workspace  │ │  Dashboard   │     │
                    │  │              │ │  (Files)    │ │   Server     │     │
                    │  │ ┌──────────┐│ │             │ │              │     │
                    │  │ │ graph.db ││ │ ~/kira/     │ │  REST + SSE  │     │
                    │  │ │ (SQLite) ││ │             │ │      │       │     │
                    │  │ ├──────────┤│ └────────────┘ │      │       │     │
                    │  │ │memory/*.md││                │      ▼       │     │
                    │  │ ├──────────┤│                │ ┌──────────┐ │     │
                    │  │ │MEMORY.md ││                │ │ React    │ │     │
                    │  │ └──────────┘│                │ │ Frontend │ │     │
                    │  └───────────────┘                │ │  (PWA)   │ │     │
                    │                                    │ └──────────┘ │     │
                    │                                    └──────┬───────┘     │
                    │                                           │              │
                    └───────────────────────────────────────────┼──────────────┘
                                                                │
                                                                ▼
                                                         ┌──────────┐
                                                         │  Browser  │
                                                         │  (User)   │
                                                         └──────────┘
```

### 3.2 Protocol Map

```
Component A          ──Protocol──►        Component B
─────────────────────────────────────────────────────────
Telegram API         ──HTTPS────►         Chat Bridge (Telegram)
Discord Gateway      ──WSS──────►         Chat Bridge (Discord)
Chat Bridge          ──IPC/Event─►        Gateway Session Manager
Gateway              ──IPC──────►         Agent Runtime
Agent Runtime        ──HTTPS────►         Anthropic API (Claude)
Agent Runtime        ──SQLite───►         Memory Engine (graph.db)
Agent Runtime        ──FS───────►         Memory Engine (*.md files)
Agent Runtime        ──FS───────►         Workspace (read/write files)
Agent Runtime        ──IPC──────►         Sub-Agents
Gateway              ──HTTP+SSE─►         Dashboard Server
Dashboard Server     ──HTTP─────►         Dashboard Frontend (static)
Dashboard Server     ──SSE──────►         Dashboard Frontend (events)
Dashboard Frontend   ──HTTP POST►         Dashboard Server (interactions)
Dashboard Frontend   ──postMsg──►         Widget Iframes
Health Monitor       ──IPC/HTTP─►         All Components (health checks)
Cron Scheduler       ──Internal─►         Gateway (trigger session)
```

### 3.3 Required vs Optional Components

```
REQUIRED (Kira cannot function without these):
  ✅ Gateway (OpenClaw)
  ✅ Agent Runtime
  ✅ Memory Engine (Layer 1-2 minimum)
  ✅ At least one Chat Bridge

RECOMMENDED (significantly better experience):
  ⭐ Memory Engine Layer 3-4 (long-term recall)
  ⭐ Health Monitor (auto-recovery)
  ⭐ Cron Scheduler (proactive behavior)

OPTIONAL (enhancement layer):
  ○ Dashboard Server
  ○ Dashboard Frontend
  ○ Widget Engine
  ○ Additional Chat Bridges
```

---

## 4. Deployment Models

### 4.1 Single-User Local (Laptop/Desktop)

```
┌─────────────────────────────────────────┐
│            USER'S LAPTOP                 │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │     Docker / Native Process        │ │
│  │                                      │ │
│  │  Gateway + Agent Runtime             │ │
│  │  + Telegram Bridge                   │ │
│  │  + Memory Engine                     │ │
│  │  + Cron Scheduler                    │ │
│  │  + Dashboard (localhost:3001)        │ │
│  └──────────┬─────────────────────────┘ │
│             │                            │
│             │ HTTPS                       │
│             ▼                            │
│     Anthropic API                        │
└─────────────────────────────────────────┘
```

**Characteristics:**
- Runs when laptop is open / Docker is running
- Dashboard accessible at `localhost:3001`
- Cron jobs only fire when system is awake
- Telegram bot webhook requires ngrok or polling mode
- All data on local disk
- **Best for:** Development, testing, casual use

**Configuration:**
```env
KIRA_MODE=local
KIRA_TELEGRAM_MODE=polling    # No webhook needed
KIRA_DASHBOARD_HOST=127.0.0.1
KIRA_DASHBOARD_PORT=3001
```

### 4.2 Single-User VPS (Always-On)

```
┌─────────────────────────────────────────┐
│              VPS (2+ cores, 2GB+ RAM)    │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │      Docker Compose                 │ │
│  │                                      │ │
│  │  kira-core:                          │ │
│  │    Gateway + Agent + Bridges         │ │
│  │    + Memory + Cron + Health          │ │
│  │                                      │ │
│  │  kira-dashboard:                     │ │
│  │    Server + Frontend                 │ │
│  │    (port 3000, behind reverse proxy)│ │
│  └──────────┬─────────────────────────┘ │
│             │                            │
│  ┌──────────┴──────────┐                │
│  │  Caddy / nginx      │                │
│  │  (reverse proxy +   │                │
│  │   TLS termination)  │                │
│  └──────────┬──────────┘                │
│             │                            │
└─────────────┼────────────────────────────┘
              │ HTTPS
              ▼
    ┌─────────────────┐
    │  Internet        │
    │  - Telegram API  │
    │  - Anthropic API │
    │  - Dashboard     │
    │    (kira.domain) │
    └─────────────────┘
```

**Characteristics:**
- Always-on — cron jobs fire reliably, instant message response
- Dashboard accessible via domain with TLS
- Telegram webhook mode (more efficient than polling)
- Automated backups via cron to external storage
- Systemd or Docker restart policies for auto-recovery
- **Best for:** Daily use, full Kira experience

**Configuration:**
```env
KIRA_MODE=vps
KIRA_TELEGRAM_MODE=webhook
KIRA_TELEGRAM_WEBHOOK_URL=https://kira.example.com/webhook/telegram
KIRA_DASHBOARD_HOST=0.0.0.0
KIRA_DASHBOARD_PORT=3001
KIRA_DASHBOARD_DOMAIN=kira.example.com
```

### 4.3 Multi-Tenant Cloud (Future)

```
┌─────────────────────────────────────────────────┐
│               CLOUD INFRASTRUCTURE                │
│                                                    │
│  ┌──────────────────────────────────────────────┐│
│  │              Load Balancer / API Gateway       ││
│  └──────────┬───────────────┬───────────────────┘│
│             │               │                      │
│  ┌──────────▼─────┐ ┌──────▼──────────┐          │
│  │  Kira Instance │ │  Kira Instance  │  ...     │
│  │  (User A)      │ │  (User B)       │          │
│  │  Own workspace │ │  Own workspace  │          │
│  │  Own memory    │ │  Own memory     │          │
│  │  Own config    │ │  Own config     │          │
│  └────────────────┘ └─────────────────┘          │
│                                                    │
│  ┌──────────────────────────────────────────────┐│
│  │           Shared Services                      ││
│  │  - User authentication (OAuth)                ││
│  │  - Billing / usage tracking                   ││
│  │  - Instance orchestration (K8s)               ││
│  │  - Centralized logging                        ││
│  └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

**Characteristics:**
- Each user gets isolated Kira instance (container)
- Shared infrastructure for auth, billing, orchestration
- User data strictly isolated (separate volumes, separate SQLite DBs)
- Horizontal scaling — spin up instances on demand
- **NOT in scope for v1** — design for it, don't build it yet

**Key differences from single-user:**
- Need user authentication layer
- Need instance lifecycle management
- Need usage metering (API costs)
- Need tenant isolation guarantees
- SQLite still works (one DB per tenant, not shared)

---

## 5. Current State vs Target State

### 5.1 What Exists Today

| Component | Status | Details |
|-----------|--------|---------|
| Gateway (OpenClaw) | ✅ Running | Message routing, session management, cron, tool proxying |
| Agent Runtime | ✅ Running | Main agent + sub-agent spawning via OpenClaw |
| Telegram Bridge | ✅ Running | Bot API, polling mode |
| Memory Layer 1-2 | ✅ Working | Context window + daily files + context buffer |
| Memory Layer 3 | ✅ Working | MEMORY.md, manually curated |
| Memory Layer 4 | ⚠️ Partial | graph.db exists, scripts exist, not fully integrated |
| Cron Scheduler | ✅ Working | Via OpenClaw cron system |
| Workspace/Files | ✅ Working | ~/kira/ workspace with full agent access |
| Health Monitor | ❌ Missing | No automated process watchdog |
| Dashboard Server | ❌ Missing | No HTTP API for dashboard |
| Dashboard Frontend | ❌ Missing | No web UI |
| Widget Engine | ❌ Missing | No widget system |
| Docker Packaging | ❌ Missing | Manual installation only |
| Installer | ❌ Missing | No automated setup |
| Discord Bridge | ❌ Missing | Not implemented |
| Signal Bridge | ❌ Missing | Not implemented |
| WhatsApp Bridge | ❌ Missing | Not implemented |

### 5.2 What Needs to Be Built

**Phase 1 — Foundation (Weeks 1-4):**
1. Dashboard Server — REST API + SSE event stream
2. Dashboard Frontend — React PWA, conversation view, basic layout
3. Docker packaging — `docker-compose.yml` with documented setup
4. Health Monitor — Basic process watchdog with restart

**Phase 2 — Enhancement (Weeks 5-8):**
5. Widget Engine — JSON schema rendering, iframe sandbox
6. Virtual Data Room — File browsing in dashboard
7. Memory viewer — Browse/search memory in dashboard
8. Memory Layer 4 integration — Automated graph queries on session start

**Phase 3 — Expansion (Weeks 9-12):**
9. Discord Bridge
10. Signal Bridge
11. Installer scripts (Linux, macOS)
12. Multi-user auth preparation

**Phase 4 — Polish (Weeks 13-16):**
13. WhatsApp Bridge
14. Widget marketplace / templates
15. Backup/restore tooling
16. Performance optimization

### 5.3 Migration Path

The system is already running. Migration must be **zero-downtime** and **incremental**:

1. **Dashboard is additive** — it reads existing data, doesn't change it
2. **Docker wraps existing** — containerize current setup, don't restructure
3. **New bridges are independent** — adding Discord doesn't affect Telegram
4. **Widget Engine is isolated** — new subsystem, no coupling to existing
5. **Health Monitor is passive** — observes and restarts, doesn't modify

**Key constraint:** The agent's workspace (`~/kira/`) is the source of truth. Every component reads from it. No migrations needed for data — only new readers.

---

## 6. Security Boundaries

### 6.1 Access Matrix

```
                    API Keys  User Data  Filesystem  Network  Exec Shell
                    ────────  ─────────  ──────────  ───────  ──────────
Gateway             READ      READ       READ        FULL     NO
Agent Runtime       PROXY     FULL       FULL        FULL     YES
Main Agent          via proxy FULL       FULL        via tool YES
Sub-Agents          via proxy LIMITED    FULL*       via tool YES
Dashboard Server    NO        READ       READ        LOCAL    NO
Dashboard Frontend  NO        via API    NO          via API  NO
Chat Bridges        OWN TOKEN MESSAGES   NO          PLATFORM NO
Widget Iframes      NO        NO         NO          NO**     NO
Health Monitor      NO        HEALTH     READ        LOCAL    LIMITED
Cron Jobs           via proxy FULL       FULL        via tool YES
```

`*` Sub-agents share the workspace filesystem — same permissions as main agent.
`**` Widgets in iframes have no network access unless explicitly granted via CSP.

### 6.2 API Key Protection

```
┌─────────────────────────────────────────┐
│            SECRET STORAGE                │
│                                          │
│  .env file (root of installation)        │
│  ├── ANTHROPIC_API_KEY                   │
│  ├── TELEGRAM_BOT_TOKEN                  │
│  ├── DISCORD_BOT_TOKEN                   │
│  ├── DASHBOARD_AUTH_TOKEN                │
│  └── ... other secrets                   │
│                                          │
│  Access:                                 │
│  ├── Gateway process: reads at startup   │
│  ├── Agent Runtime: receives via env     │
│  ├── Dashboard: only its own auth token  │
│  └── Nothing else touches secrets        │
│                                          │
│  NOT in:                                 │
│  ├── workspace files (agent can read)    │
│  ├── git repositories                    │
│  ├── memory files                        │
│  └── dashboard API responses             │
└─────────────────────────────────────────┘
```

### 6.3 Sub-Agent Sandboxing

Sub-agents run with the same OS-level permissions as the main agent (same process/container). Isolation is **logical**, not physical:

- **Context isolation:** Sub-agents don't see main conversation history
- **Tool restriction:** `message` tool blocked unless explicitly granted
- **No direct channel access:** Results flow back through main agent
- **Labeled sessions:** All actions traceable to specific sub-agent
- **Timeout enforcement:** Max duration prevents runaway sub-agents

**Future hardening (multi-tenant):**
- Run sub-agents in separate containers
- Use seccomp profiles to restrict syscalls
- Mount workspace read-only where possible
- Network namespace isolation

### 6.4 Widget Iframe Isolation

```
┌─────────────────────────────────────┐
│  Dashboard (Parent Window)           │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  <iframe                       │ │
│  │    sandbox="allow-scripts"     │ │
│  │    csp="default-src 'none';   │ │
│  │         script-src 'unsafe-   │ │
│  │         inline'"              │ │
│  │  >                             │ │
│  │    [Widget Content]            │ │
│  │    - Cannot access parent DOM  │ │
│  │    - Cannot make network calls │ │
│  │    - Cannot read cookies       │ │
│  │    - Can only postMessage()    │ │
│  │      to parent                 │ │
│  │  </iframe>                     │ │
│  └────────────────────────────────┘ │
│                                      │
│  Parent listens for postMessage     │
│  validates origin + structure       │
│  forwards interactions to API       │
└─────────────────────────────────────┘
```

### 6.5 Dashboard Authentication

Single-user model — simple but secure:

- **Token-based:** Dashboard requires auth token in header or cookie
- **Setup flow:** On first run, generate random token, display to user
- **Session:** HttpOnly, Secure, SameSite=Strict cookie after initial auth
- **No user/password complexity** — single user, single token
- **Future:** OAuth for multi-tenant, passkey support

---

## 7. Failure Modes & Recovery

| Failure | Detection | Recovery | Data Loss? |
|---------|-----------|----------|------------|
| Gateway crash | Health monitor / systemd | Auto-restart, sessions resume | No (stateless routing) |
| Agent stuck (infinite tool loop) | Timeout (configurable, default 5min) | Kill session, notify user | Current turn lost |
| LLM API down | HTTP 5xx / timeout | Retry with backoff, notify user after 3 failures | No |
| SQLite corruption | Health check read test | Restore from auto-backup, rebuild from .md files | Possible graph data loss |
| Telegram API down | Connection timeout | Retry with backoff, queue outbound messages | Messages queued |
| Disk full | Health check (>95%) | Alert user, pause non-critical writes | No if alerted in time |
| OOM kill | Process exit code 137 | Auto-restart with lower memory config | Current turn lost |
| Dashboard crash | Health check / Docker restart | Auto-restart, no state lost (stateless server) | No |

---

## 8. Open Questions

1. **Gateway-Dashboard coupling:** Should Dashboard Server run inside Gateway process (simpler) or as separate service (more isolated)?
   - **Recommendation:** Start embedded, extract later if needed.

2. **Real-time protocol:** SSE is simpler but unidirectional. Do we need WebSocket for widget interactions?
   - **Recommendation:** SSE for server→client events, POST for client→server. Avoid WebSocket complexity.

3. **Sub-agent filesystem isolation:** Should sub-agents have restricted workspace access?
   - **Recommendation:** Not for v1. Same workspace, logical isolation only.

4. **Widget persistence:** Should widgets survive server restarts?
   - **Recommendation:** Yes, store widget state in SQLite. Agent can recreate if lost.

5. **Multi-bridge message routing:** If user has Telegram AND Discord, how to handle duplicate messages?
   - **Recommendation:** Each bridge is independent channel. Agent sees channel metadata and responds appropriately.

---

*This document is the master reference for building Kira. All implementation should trace back to components and interfaces defined here.*
