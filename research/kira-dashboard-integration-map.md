# Kira Dashboard — Full Integration Architecture

**Date:** 2026-03-10
**Purpose:** Map how Paperclip (company engine) + Mission Control patterns + existing Kira App converge into the Kira Dashboard — the web interface for managing AI agent operations.

---

## The Insight

We already have 80% of this built at `~/kira/app/`. It's a full-stack app with:
- Task extraction from conversations (nlp-extract.ts — 420 lines)
- Task orchestrator with agent matching (orchestrator.ts — 557 lines)
- Task classifier (human vs agent, requires-input level)
- Gateway bridge (WebSocket → OpenClaw, real-time activity streaming)
- Board view (Kanban with drag-and-drop)
- Today view (time-blocked daily schedule)
- Chat interface (conversations with LLM)
- Agent monitor + agent work log
- XP/gamification engine
- Memory system (entities, relationships, facts, graph queries)
- NLP extraction pipeline (entities, facts, relations from messages)
- Drizzle ORM + PostgreSQL (30+ tables)
- React + Vite + TailwindCSS + TanStack Query

**What's missing:** Paperclip's multi-tenant company engine and Mission Control's provisioning layer.

---

## Architecture: Three Layers

```
┌─────────────────────────────────────────────────────┐
│                   KIRA DASHBOARD                     │
│              (existing ~/kira/app/ UI)               │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Today    │ │  Board   │ │  Chat    │ │ Agents │ │
│  │ View     │ │  View    │ │  Panel   │ │ Monitor│ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Memory   │ │ Inbox    │ │ Settings │ │ Dash-  │ │
│  │ Browser  │ │          │ │          │ │ boards │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└────────────────────┬────────────────────────────────┘
                     │ REST API + SSE
┌────────────────────┴────────────────────────────────┐
│               KIRA ENGINE (backend)                  │
│                                                      │
│  ┌──────────────────┐  ┌────────────────────────┐   │
│  │  NLP Extractor   │  │  Task Orchestrator     │   │
│  │  (nlp-extract.ts)│  │  (orchestrator.ts)     │   │
│  │                   │  │  - agent matching      │   │
│  │  Extracts tasks,  │  │  - priority scoring    │   │
│  │  goals, entities  │  │  - capacity check      │   │
│  │  from ALL convos  │  │  - auto-assignment     │   │
│  └────────┬──────────┘  └───────────┬────────────┘   │
│           │                         │                │
│  ┌────────┴──────────┐  ┌──────────┴─────────────┐  │
│  │  Classifier       │  │  State Machine         │  │
│  │  (classifier.ts)  │  │  (state-machine.ts)    │  │
│  │  human vs agent   │  │  task lifecycle        │  │
│  │  requires-input   │  │  status transitions    │  │
│  └───────────────────┘  └────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Gateway Bridge (gateway-bridge.ts)           │   │
│  │  WebSocket ↔ OpenClaw gateway                 │   │
│  │  Real-time: activity, chat events, tool calls │   │
│  └──────────────────────┬───────────────────────┘   │
└─────────────────────────┼───────────────────────────┘
                          │ WebSocket
┌─────────────────────────┴───────────────────────────┐
│              OPENCLAW GATEWAY (runtime)               │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Main    │ │  Nova    │ │  Cron    │            │
│  │  Agent   │ │  Agent   │ │  Jobs    │            │
│  │ (Opus)   │ │ (Opus)   │ │ (Kimi)   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐                          │
│  │ Sub-     │ │ Telegram │                          │
│  │ agents   │ │ Delivery │                          │
│  └──────────┘ └──────────┘                          │
└─────────────────────────────────────────────────────┘
```

---

## The Flow: Conversation → Tasks → Execution

This is the core loop. Everything feeds from it.

### 1. Otto talks to Kira (Telegram or Dashboard Chat)

```
Otto: "We need to close 2 more IAM deals this week and fix the blog page"
```

### 2. Gateway Bridge captures the conversation

`gateway-bridge.ts` subscribes to OpenClaw gateway via WebSocket. Every message (user + assistant) is captured and forwarded to:
- SSE clients (real-time dashboard updates)
- Chat.db (conversation history)
- **NLP Extractor** (task/goal extraction)

### 3. NLP Extractor pulls tasks and goals

`nlp-extract.ts` runs on every message pair. Extracts:
- **Tasks:** "close 2 more IAM deals" → task(executor: human, priority: high, area: IAM)
- **Tasks:** "fix the blog page" → task(executor: agent, priority: medium, area: IAM Website)
- **Entities:** IAM, blog page
- **Facts:** "need 2 more deals to hit $700 MRR"
- **Relations:** IAM → has_goal → $700 MRR

### 4. Tasks land in the Board

Extracted tasks auto-populate the Kanban board:
- `todo` column: "Close 2 IAM deals" (human), "Fix blog page" (agent)
- Classifier determines: human task vs agent-executable
- Priority scorer ranks them based on area, deadline, revenue impact

### 5. Orchestrator assigns agent tasks

`orchestrator.ts` matches agent-executable tasks to available agents:
- Checks agent capabilities vs task requirements
- Checks concurrent run limits
- Queues work via BullMQ job queue
- Agent executes via OpenClaw gateway

### 6. Results flow back to Dashboard

- Agent completes "fix blog page" → status moves to `review`
- Otto sees it in Board View or Today View
- Reviews, approves → `done`
- XP awarded

---

## What Paperclip Adds (Company Engine Layer)

Paperclip's value isn't replacing what we have — it's adding the **multi-company orchestration** layer on top.

### Current (Single-tenant Kira)
```
Kira App → OpenClaw Gateway → Agents
```

### With Paperclip (Multi-tenant Kira Shell)
```
Kira Dashboard → Paperclip Company Engine → OpenClaw Gateway(s) → Agents
                         │
                 ┌───────┴────────┐
                 │  Company: Otto │ → Gateway A → Main Agent + Sub-agents
                 │  Company: Hannelore │ → Gateway B → Nova Agent
                 │  Company: Client X │ → Gateway C → Their agents
                 └────────────────┘
```

### What we steal from Paperclip:

| Pattern | Maps To | Implementation |
|---------|---------|----------------|
| Company | Tenant/Workspace | Each user gets a "company" with isolated data |
| Agent + Adapter | OpenClaw agent config | Paperclip's `openclaw_gateway` adapter already bridges this |
| Issue (Task) | Our existing tasks table | Atomic checkout prevents double-assignment |
| Heartbeat service | Our existing orchestrator | Add concurrency limits + session persistence |
| Cost Event | New: per-tenant token tracking | Budget ceilings with auto-pause |
| Approval | Our existing review system | Already have review gates in Board View |

### What we DON'T use from Paperclip:
- CEO/org-chart hierarchy (our agents are flat)
- Goal hierarchy (our OKR system is simpler and better)
- PostgreSQL requirement for Paperclip itself (keep our existing PG, don't add another)

---

## What Mission Control Adds (Provisioning + Admin)

### For Shell MVP:

| MC Pattern | Kira Shell Use |
|------------|---------------|
| Super Admin panel | Admin view to provision new tenants |
| Provisioning daemon | Auto-create: Linux user, OpenClaw home, workspace, gateway |
| Agent sync from openclaw.json | Auto-register agents when gateway config changes |
| Multi-gateway support | Connect to multiple tenant gateways from one dashboard |
| Token dashboard | Per-tenant cost monitoring |
| Memory browser | Let users browse their agent's memory files |
| SOUL editor | Let users customize their agent personality in the UI |

### For internal use:

| MC Pattern | Our Use |
|------------|---------|
| Smart polling (pause on unfocus) | Reduce API calls on dashboard |
| Event bus → SSE | We already have this in gateway-bridge.ts, but MC's pattern is cleaner |
| Alert rules with cooldowns | Add to our monitoring |

---

## Task Self-Assignment Flow (The Key Feature)

Otto talks to Kira. Tasks appear automatically. This is the magic.

### Current State (what exists in ~/kira/app/):

```
1. Message received via gateway-bridge.ts (WebSocket)
2. nlp-extract.ts extracts entities/facts/tasks (heuristic, <10ms)
3. Tasks inserted into DB with executor_type + requires_input
4. orchestrator.ts matches agent tasks to available agents
5. Jobs queued via BullMQ (agent-work queue)
6. Agent executes via OpenClaw gateway
7. Results streamed back via SSE
```

### What needs improvement:

**A. Extraction quality**
- Current: regex/heuristic only (classifier.ts has ~20 patterns)
- Needed: LLM-enhanced extraction for complex conversations
- Solution: Run extraction through Kimi K2.5 for ambiguous cases (keep heuristic for obvious ones)
- Cost: ~$0.001 per extraction call

**B. Goal tracking**
- Current: OKR tables exist (vision → areas → objectives → key_results → projects → tasks)
- Needed: Auto-extract goals from strategic conversations, link tasks to goals
- Solution: When Otto says "we need $700 MRR by March" → create/update objective + key result

**C. Cross-agent task routing**
- Current: Single-tenant, tasks assigned to agents in same gateway
- Needed: Route tasks to the right tenant/agent (e.g., "remind Hannelore about balansen" → Nova agent)
- Solution: Paperclip's adapter pattern — route to correct gateway

**D. Human task follow-up**
- Current: Human tasks sit in board, no reminders
- Needed: If human task is stale >24h, nudge via Telegram
- Solution: Cron job checks board for stale human tasks, sends reminder

---

## Database Integration

### Existing Kira App Schema (30+ tables):
```
users, sessions, accounts, verification
vision, areas, objectives, key_results
projects, milestones, tasks, dependencies, time_blocks
agents, agent_work_log
input_queue, reviews
principles, decisions
user_xp
conversations, messages
documents
user_settings
entities, relationships, facts, extracted_suggestions
user_agents
```

### What to add for Paperclip patterns:
```sql
-- Per-tenant cost tracking (from Paperclip cost_events)
CREATE TABLE cost_events (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES users(id),  -- or companies table
  agent_id UUID,
  task_id UUID REFERENCES tasks(id),
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd REAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Budget ceilings (from Paperclip)
CREATE TABLE tenant_budgets (
  tenant_id UUID PRIMARY KEY REFERENCES users(id),
  monthly_budget_usd REAL NOT NULL DEFAULT 50.0,
  current_spend_usd REAL NOT NULL DEFAULT 0.0,
  auto_pause BOOLEAN DEFAULT true,
  reset_day INTEGER DEFAULT 1
);

-- Agent task sessions (from Paperclip — resume work across heartbeats)
CREATE TABLE agent_task_sessions (
  id UUID PRIMARY KEY,
  agent_id UUID,
  task_id UUID REFERENCES tasks(id),
  session_key TEXT,  -- OpenClaw session identifier
  started_at TIMESTAMP,
  last_active_at TIMESTAMP,
  status TEXT DEFAULT 'active'
);
```

### What to add for Shell multi-tenancy:
```sql
-- Tenant/company table (from Paperclip companies)
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',  -- free, pro, enterprise
  gateway_port INTEGER,
  workspace_path TEXT,
  openclaw_config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'active'  -- active, paused, suspended
);
```

---

## UI Integration Map

### Existing Kira App pages → Dashboard role:

| Page | Current | Dashboard Role |
|------|---------|---------------|
| **TodayView** | Time-blocked daily schedule | ✅ Keep — primary daily view |
| **BoardView** | Kanban (todo/in_progress/waiting/review/done) | ✅ Keep — task management |
| **Chat** | Conversation with LLM | ✅ Keep — but connect to OpenClaw main agent instead of direct LLM |
| **AgentMonitor** | Agent status/activity | ✅ Keep — real-time agent monitoring |
| **Agents** | Agent list/config | ✅ Keep — add SOUL editor from MC |
| **Inbox** | Input queue | ✅ Keep — extracted suggestions land here |
| **Memory** | Memory browser | ✅ Keep — add MC's tree viewer pattern |
| **Knowledge** | Entity/fact browser | ✅ Keep — knowledge graph visualization |
| **Documents** | Doc browser | ✅ Keep |
| **CommandCenter** | Overview | ✅ Keep — make this the main dashboard |
| **Dashboards** | Analytics | ✅ Keep — add MC's token/cost charts |
| **Settings** | App settings | ✅ Keep — add tenant management for Shell |
| **Skills** | Skill browser | ✅ Keep |

### New pages to add:

| Page | Source | Purpose |
|------|--------|---------|
| **Tenant Admin** | Mission Control Super Admin | Provision/manage Shell tenants |
| **Cost Dashboard** | MC Token Dashboard + Paperclip cost_events | Per-tenant spend visualization |
| **Agent SOUL Editor** | MC SOUL editor panel | Edit agent personality files in-browser |
| **Cron Manager** | MC Cron panel | View/edit cron jobs from UI |

---

## Chat → Task Extraction Pipeline (Detailed)

The key integration point. When Otto chats with Kira (via Telegram OR Dashboard), tasks auto-appear on the board.

### Pipeline:

```
Message arrives (Telegram → OpenClaw → gateway-bridge.ts WebSocket)
                              OR
            (Dashboard Chat → API → OpenClaw → gateway-bridge.ts)
                              │
                              ▼
                    ┌─────────────────┐
                    │ Save to chat.db │
                    │ (messages table) │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ NLP Extract     │
                    │ (heuristic)     │──── Fast path: <10ms
                    └────────┬────────┘     Catches: "fix X", "call Y", "research Z"
                             │
                         confidence < 0.7?
                             │
                    ┌────────┴────────┐
                    │ LLM Extract     │
                    │ (Kimi K2.5)     │──── Slow path: ~2s
                    └────────┬────────┘     Catches: implicit tasks, goals, decisions
                             │
                             ▼
                    ┌─────────────────┐
                    │ Classify        │
                    │ (classifier.ts) │
                    │ human vs agent  │
                    │ requires-input  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Insert task     │
                    │ + link to goal  │
                    │ + link to area  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ If agent task:  │
                    │ Orchestrator    │
                    │ auto-assigns    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ SSE broadcast   │
                    │ → Dashboard     │
                    │ board updates   │
                    └─────────────────┘
```

### Goal extraction (new):

When conversation contains strategic intent:
```
Otto: "We need to hit $2K MRR by April"
       │
       ▼
  Extract: objective="$2K MRR", deadline="April 2026", area="Revenue"
       │
       ▼
  Upsert objective in DB, create/update key_result
       │
       ▼
  Link future tasks to this objective
       │
       ▼
  CommandCenter dashboard shows progress toward goal
```

---

## Shell MVP — What This Means

The Shell is literally the existing Kira App with:
1. **Multi-tenancy added** (tenants table, scoped queries, gateway-per-tenant)
2. **Chat connected to OpenClaw** instead of direct LLM calls
3. **Provisioning flow** from Mission Control
4. **Cost tracking** from Paperclip patterns
5. **Stripped features** for free tier (no custom agents, limited crons, Kimi only)

### Shell Tiers:

| Feature | Free | Pro (€97/mo) | Enterprise (€297/mo) |
|---------|------|-------------|---------------------|
| Dashboard | ✅ | ✅ | ✅ |
| Board/Today view | ✅ | ✅ | ✅ |
| Task extraction | Heuristic only | + LLM extraction | + custom extractors |
| Agents | 1 (main) | 3 | Unlimited |
| Cron jobs | 3 | 10 | Unlimited |
| Model | Kimi K2.5 | Sonnet | Opus |
| Memory | Daily logs only | + knowledge graph | + full graph + VDR |
| Telegram bot | ✅ | ✅ | ✅ + WhatsApp |
| SOUL customization | Template only | Full editor | + custom skills |
| Token budget | 100K/mo | 1M/mo | 10M/mo |
| Chat in dashboard | ✅ | ✅ | ✅ |

---

## Implementation Order

### Phase 0: Connect existing app to OpenClaw (1-2 days)
- [ ] Chat panel → route through OpenClaw gateway instead of direct Anthropic SDK
- [ ] Gateway bridge → capture ALL messages (Telegram + Dashboard)
- [ ] NLP extractor → run on captured messages
- [ ] Verify: talk to Kira on Telegram → task appears on Dashboard board

### Phase 1: Task extraction quality (3-5 days)
- [ ] Add LLM fallback extraction (Kimi K2.5 for low-confidence cases)
- [ ] Goal extraction from strategic conversations
- [ ] Link tasks to areas/objectives automatically
- [ ] Human task follow-up cron (nudge stale tasks via Telegram)

### Phase 2: Shell multi-tenancy (1-2 weeks)
- [ ] Add tenants table + scoped queries
- [ ] Provisioning flow (create tenant → Linux user → OpenClaw gateway → workspace)
- [ ] Per-tenant cost tracking + budget ceilings
- [ ] Tenant admin panel

### Phase 3: Polish for launch (1 week)
- [ ] Onboarding wizard (questionnaire → generate SOUL.md/USER.md)
- [ ] Template library (entrepreneur, executive, freelancer)
- [ ] Stripe billing integration
- [ ] Landing page on oopuo.com

---

*This is the canonical architecture document for Kira Dashboard. Update as decisions are made.*
