# Paperclip & Mission Control — Architecture Analysis for Kira

**Date:** 2026-03-10
**Purpose:** Evaluate two open-source repos for patterns, code, and ideas applicable to Kira's evolution as an AI agent platform on OpenClaw.

---

## 1. Paperclip Architecture Summary

**Repo:** https://github.com/paperclipai/paperclip
**License:** MIT | **Language:** TypeScript | **Runtime:** Node.js

### What It Is

Paperclip is an **orchestration control plane** for multi-agent "companies." It doesn't run agents — it manages them. The metaphor is corporate: companies have CEOs, org charts, budgets, and governance. Agents are employees.

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 6 + Radix UI + Tailwind CSS 4 + TanStack Query |
| Backend | Express.js 5 (REST API) |
| Database | PostgreSQL 17 via Drizzle ORM (embedded PGlite for dev) |
| Auth | Better Auth (sessions + API keys) |
| Monorepo | pnpm workspaces |

### Key Abstractions

1. **Company** — Top-level tenant. All entities scoped to a company. Multi-company on one instance.
2. **Agent** — An employee with adapter type, config, role, reporting chain, budget. Status: active/idle/running/error/paused/terminated.
3. **Adapter** — Bridge between Paperclip and agent runtimes. Built-in: `claude_local`, `codex_local`, `cursor`, `opencode_local`, `openclaw_gateway`, `process`, `http`. Each implements `execute()`, `testEnvironment()`, optional `sessionCodec`.
4. **Issue (Task)** — Unit of work with atomic single-assignee checkout (409 on conflict). Status lifecycle: backlog → todo → in_progress → in_review → done.
5. **Heartbeat** — Scheduled execution cycle. Triggers: timer, assignment, comment, manual invoke, approval resolution. The heartbeat service is the core execution orchestrator (~2500 lines).
6. **Goal** — Hierarchical objective tracking. Tasks trace back to company goals.
7. **Approval** — Governance gates for hiring, strategy, config changes. Board (human) reviews.
8. **Cost Event** — Per-agent, per-task token/dollar tracking with budget ceilings and auto-pause.

### How Agents Execute

1. Wakeup request created (timer/assignment/manual)
2. Heartbeat service queues a run, respecting `maxConcurrentRuns` per agent
3. Run claimed atomically (prevents double-execution)
4. Workspace resolved (project workspace → task session → agent home fallback)
5. Adapter's `execute()` called with agent config, context snapshot, session params
6. Adapter spawns the actual agent (e.g., `claude` CLI, HTTP webhook)
7. stdout/stderr captured, streamed via WebSocket live events
8. Result: session state persisted, costs recorded, task status updated
9. Agent status finalized, next queued run started

### Session Persistence

Paperclip tracks **task-scoped sessions** (`agent_task_sessions` table). When an agent works on the same task across heartbeats, it can resume the previous session (e.g., same Claude Code session ID). Session codecs per adapter handle serialization.

### Database Schema (33 tables)

Core: companies, agents, agent_runtime_state, agent_task_sessions, agent_wakeup_requests, issues, projects, goals, heartbeat_runs, heartbeat_run_events, cost_events, approvals, activity_log, labels, assets, secrets, invites, auth tables.

### Strengths

- **Mature execution model**: Atomic task checkout, concurrent run limits, session persistence, workspace resolution — hard problems solved well
- **Adapter system**: Clean abstraction for heterogeneous agent runtimes. Adding a new adapter is straightforward (server/ui/cli modules)
- **Company-scoped multi-tenancy**: True data isolation per company
- **Cost tracking**: Per-agent budgets with auto-pause at ceiling
- **Governance**: Approval gates, config revisions, full audit trail
- **OpenClaw adapter**: Already has `openclaw_gateway` adapter — could invoke Kira agents

### Weaknesses

- **PostgreSQL requirement**: Heavier than needed for single-user/small-team setups. PGlite helps but adds complexity.
- **Corporate metaphor is rigid**: CEO/org-chart model assumes hierarchical agent relationships. Kira's flat agent model (main + sub-agents) doesn't fit neatly.
- **No messaging/memory system**: All communication is task comments. No equivalent of Kira's MEMORY.md, knowledge graph, or daily logs.
- **Heavy**: ~450 source files, 33 DB tables, 7 adapter packages. Significant operational overhead.
- **Single-tenant self-hosted**: No multi-user SaaS patterns. "Multi-company" is still one operator.

---

## 2. Mission Control UI Summary

**Repo:** https://github.com/builderz-labs/mission-control
**License:** MIT | **Language:** TypeScript | **Runtime:** Node.js (Next.js)

### What It Is

Mission Control is a **dashboard/admin UI** for managing AI agent fleets. It connects to OpenClaw gateways and provides monitoring, task management, and operational tools. It's a management layer, not an execution engine.

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 3.4 |
| State | Zustand 5 |
| Database | SQLite (better-sqlite3, WAL mode) |
| Charts | Recharts 3 |
| Real-time | WebSocket + SSE |
| Auth | scrypt hashing, session tokens, RBAC |
| Validation | Zod 4 |
| Testing | Vitest + Playwright (148 E2E tests) |

### Key Screens / Panels (28 total)

**Core Operations:**
- **Dashboard** — Stats grid, agent network visualization, session list
- **Task Board** — Kanban (inbox → backlog → todo → in-progress → review → done), drag-and-drop, priorities, assignments
- **Agent Squad** — Agent list with status, spawn, heartbeat, wake, retire lifecycle
- **Agent Detail Tabs** — History, cost, comms, diagnostics, SOUL editor, memory
- **Session Details** — Individual session inspector
- **Log Viewer** — Filterable log browser

**Monitoring:**
- **Activity Feed** — Real-time activity stream
- **Token Dashboard** — Per-model cost breakdowns with Recharts charts
- **Agent Cost Panel** — Per-agent spend visualization
- **Standup Panel** — Auto-generated daily standup reports

**Configuration:**
- **Cron Management** — View/edit cron jobs from OpenClaw config
- **Gateway Config** — OpenClaw gateway settings editor
- **Settings** — App-wide settings management
- **Alert Rules** — Configurable alert rules with cooldowns

**Advanced:**
- **Pipeline Tab** — Workflow orchestration with templates
- **Memory Browser** — Filesystem-based memory tree viewer
- **Webhook Panel** — CRUD + delivery history + retry
- **GitHub Sync** — Issue sync from GitHub repos
- **Super Admin** — Multi-tenant workspace provisioning
- **Office Panel** — Gamified isometric office visualization of agents (sprite-based!)
- **Documents Panel** — Knowledge base / docs browser
- **Agent Comms** — Inter-agent messaging panel

### Architecture Patterns

**SPA with catch-all routing:** Single page (`[[...panel]]/page.tsx`) routes all panels. Nav rail on the left, panel content in the center. URL-synced panel state.

**API routes (66 endpoints):** Next.js API routes handle all backend logic. No separate server. SQLite accessed directly via `better-sqlite3`.

**Event bus pattern:** Internal `eventBus` broadcasts DB changes → SSE clients + webhook delivery.

**Zustand store:** Single large store (~600 lines) manages all client state: tasks, agents, sessions, logs, notifications, chat, UI preferences.

**Agent sync from OpenClaw:** Reads `openclaw.json` config to auto-register agents. Syncs workspace SOUL files bidirectionally.

**Multi-gateway support:** Can connect to multiple OpenClaw gateway instances simultaneously.

**Super Admin / Multi-tenant:** Provisioning system for creating isolated tenant workspaces with dedicated gateways. Each tenant gets: Linux user, OpenClaw home, workspace root, gateway port.

### Strengths

- **OpenClaw-native**: Built specifically for OpenClaw. Reads openclaw.json, syncs agent configs, connects via WebSocket.
- **SQLite simplicity**: Zero external dependencies. Single `pnpm start`. Perfect for self-hosted.
- **Comprehensive monitoring**: 28 panels cover everything from task management to cost tracking to memory browsing.
- **Real-time**: WebSocket + SSE with smart polling that pauses when tab is unfocused.
- **Multi-tenant provisioning**: Super Admin panel for creating isolated workspaces — directly relevant to Kira Shell.
- **Quality gates**: Built-in review system blocking task completion without sign-off.
- **Well-tested**: 148 E2E tests, comprehensive unit tests.

### Weaknesses

- **Monolithic Next.js**: All 66 API routes in one process. No microservice split possible.
- **Raw SQL**: Direct `better-sqlite3` queries with manual migrations. No ORM. Harder to maintain schema changes.
- **Large Zustand store**: Single 600-line store will become unwieldy as features grow.
- **No agent execution**: Dashboard only. Doesn't spawn or manage agent processes directly (delegates to gateway).
- **CSP issues**: Still uses `unsafe-inline` for styles.

---

## 3. Alignment Plan — What Kira Should Adopt

### From Paperclip: STEAL these patterns

| Pattern | Why | How to Adapt |
|---------|-----|-------------|
| **Atomic task checkout** | Prevents double-work when multiple agents/heartbeats fire | Add to Kira's cron/sub-agent task system. Simple file lock or SQLite row lock. |
| **Adapter abstraction** | Clean way to support multiple agent runtimes | Not needed now (Kira is OpenClaw-only), but good pattern if Kira Shell supports other runtimes. |
| **Session persistence per task** | Agents can resume work across heartbeats | Kira already has session continuity via OpenClaw, but formalizing task→session mapping would help cron agents. |
| **Cost tracking with budget ceilings** | Prevent runaway spend | Add cost event logging to Kira cron jobs. OpenClaw already tracks tokens — pipe that into a budget system. |
| **Heartbeat concurrency limits** | Prevent agent from being invoked multiple times simultaneously | Add `maxConcurrentRuns` to Kira's cron config. Currently nothing prevents overlapping cron invocations. |
| **Config revisions** | Rollback bad agent config changes | Version SOUL.md and cron configs in git or a revisions table. |
| **Workspace resolution chain** | Project workspace → session workspace → agent home fallback | Useful if Kira agents work across multiple projects. |

### From Paperclip: SKIP

| Pattern | Why Skip |
|---------|----------|
| Corporate hierarchy (CEO/org chart) | Kira's agent model is flat: main + specialized sub-agents. No reporting chains needed. |
| PostgreSQL + Drizzle ORM | Over-engineered for Kira's scale. SQLite is the right choice. |
| Multi-company isolation | Kira is single-user. Multi-tenancy belongs in Kira Shell, not Kira core. |
| Approval gates / governance | Otto is the sole operator. Approval workflows add friction without value for single-user. |
| Goal hierarchy (Initiative → Project → Milestone → Issue) | Too much structure. Kira's cron jobs and ad-hoc tasks are simpler and more flexible. |

### From Mission Control: ADOPT these patterns

| Pattern | Why | How to Adapt |
|---------|-----|-------------|
| **Panel-based SPA architecture** | Clean way to organize 20+ admin views | Use for Kira admin dashboard. Nav rail + panel content + URL routing. |
| **SQLite + better-sqlite3 + WAL** | Zero-dependency, fast, reliable. Already proven at MC's scale. | Already aligned with Kira's SQLite knowledge graph. |
| **Event bus → SSE** | Real-time UI updates without WebSocket complexity | Add SSE endpoint to Kira dashboard for live activity feed. |
| **Agent sync from openclaw.json** | Auto-register agents from gateway config | Steal MC's `agent-sync.ts` pattern for Kira dashboard. |
| **Zustand state management** | Simple, performant, no boilerplate | Use for Kira dashboard frontend. But split into multiple stores (MC's single-store is too large). |
| **Kanban task board** | Visual task management for cron jobs and sub-agent work | Adapt for Kira's task/cron management. Six-column board is well-designed. |
| **Token dashboard with Recharts** | Cost visualization | Steal the chart patterns for Kira's cost monitoring. |
| **Memory browser panel** | Filesystem-based memory tree viewer | Perfect for browsing Kira's memory/ directory, MEMORY.md, and daily logs. |
| **Super Admin provisioning** | Multi-tenant workspace creation | Core pattern for Kira Shell MVP. Steal the provisioning job system. |
| **Background scheduler pattern** | In-process task scheduling with settings-driven enable/disable | Improve Kira's cron system with MC's tick-based scheduler pattern. |
| **Smart polling (pause when unfocused)** | Reduce unnecessary API calls | Use MC's `use-smart-poll.ts` hook in Kira dashboard. |
| **Quality review gates** | Ensure cron outputs are reviewed before acting | Adapt for Kira's automated review cron jobs. |

### From Mission Control: SKIP

| Pattern | Why Skip |
|---------|----------|
| Office visualization (sprite-based) | Fun but gimmicky. Not useful for Kira's use case. |
| Claude Code session scanning | Kira doesn't use local Claude Code. OpenClaw handles sessions. |
| GitHub Issues sync | Kira doesn't need external issue tracking integration (yet). |
| Direct CLI integration | Kira is OpenClaw-native. No need for generic CLI connections. |
| Google OAuth | Kira is single-user. Simple API key or session auth is sufficient. |

---

## 4. Kira Shell MVP Implications

Kira Shell = a lighter, multi-tenant public version of Kira. These repos inform its design:

### Architecture Decisions Informed by This Research

1. **Database: SQLite per tenant** (from Mission Control)
   - MC proves SQLite handles agent management at scale
   - Each Kira Shell tenant gets an isolated SQLite database
   - No PostgreSQL complexity until proven necessary

2. **Provisioning: Steal MC's Super Admin pattern**
   - Tenant creation: slug, display name, Linux user, gateway port, plan tier
   - Provisioning jobs with step-by-step progress tracking
   - Decommission with cleanup
   - Each tenant gets: dedicated OpenClaw gateway, state directory, workspace root

3. **Agent Execution: OpenClaw gateway per tenant** (not Paperclip)
   - Paperclip's adapter system is overkill for Kira Shell
   - Each tenant gets their own OpenClaw gateway instance
   - Kira Shell manages gateway lifecycle, not agent execution

4. **Task System: Simplified Kanban** (from both)
   - Steal MC's six-column board UI
   - Steal Paperclip's atomic checkout for task assignment
   - Skip Paperclip's goal hierarchy — flat task list with tags is enough

5. **Cost Control: Per-tenant budgets** (from Paperclip)
   - Monthly budget ceiling per tenant
   - Auto-pause gateway when budget hit
   - Token tracking piped from OpenClaw sessions

6. **Dashboard: Panel-based SPA** (from Mission Control)
   - Next.js App Router + Zustand (split stores) + Tailwind
   - Nav rail + panel content pattern
   - SSE for real-time updates
   - Recharts for cost visualization

7. **Memory: Filesystem-based** (from Kira, validated by MC)
   - MC's memory browser confirms the filesystem approach works
   - Each tenant gets a workspace directory with SOUL.md, memory/, etc.
   - No shared knowledge base (Paperclip anti-pattern confirmed)

### What Kira Shell Needs That Neither Repo Has

- **User onboarding flow**: Neither repo has a polished multi-tenant signup experience
- **Billing integration**: Neither handles real payments (Stripe, etc.)
- **Agent templates marketplace**: Paperclip's "ClipMart" is vaporware. Kira Shell needs curated templates.
- **Telegram integration dashboard**: Both repos are web-only. Kira Shell needs Telegram delivery config per tenant.

---

## 5. Build vs Fork vs Steal — Recommendations

### Paperclip: **STEAL patterns, don't fork or integrate**

| Option | Verdict |
|--------|---------|
| **Use as execution engine** | ❌ No. Paperclip is a control plane, not an engine. It would add PostgreSQL dependency, corporate hierarchy overhead, and ~450 files of code Kira doesn't need. OpenClaw IS Kira's execution engine. |
| **Fork and strip down** | ❌ No. Too much to remove. The corporate model (companies, org charts, CEO agents) is baked into the schema and services. Stripping it would leave you maintaining a gutted codebase. |
| **Steal patterns** | ✅ Yes. Cherry-pick: atomic task checkout, session persistence per task, heartbeat concurrency limits, cost budget ceilings, adapter interface design (for future Kira Shell multi-runtime support). |

**Specific files worth studying:**
- `server/src/services/heartbeat.ts` — Execution orchestration, session management
- `server/src/adapters/registry.ts` — Adapter abstraction pattern
- `packages/db/src/schema/` — Cost events, agent runtime state schemas
- `skills/paperclip/SKILL.md` — How to teach agents to interact with a control plane API

### Mission Control: **STEAL heavily, consider partial fork for Kira Shell**

| Option | Verdict |
|--------|---------|
| **Use as Kira's admin dashboard** | ⚠️ Maybe. MC is already OpenClaw-native and covers 80% of what a Kira dashboard needs. But it's a monolithic Next.js app — hard to embed or customize deeply. |
| **Fork for Kira Shell** | ✅ Viable. MC's Super Admin provisioning, task board, agent management, and cost tracking are directly applicable. Fork, strip the office sprites and Claude session scanning, add Kira-specific features (Telegram config, memory graph browser, agent templates). |
| **Steal components** | ✅ Yes, heavily. The panel architecture, SQLite patterns, event bus, Zustand store structure, scheduler, and UI components are all reusable. |

**Specific files worth stealing:**
- `src/components/panels/task-board-panel.tsx` — Kanban board implementation
- `src/components/panels/memory-browser-panel.tsx` — Memory filesystem viewer
- `src/components/panels/super-admin-panel.tsx` — Tenant provisioning UI
- `src/lib/scheduler.ts` — Background task scheduler
- `src/lib/agent-sync.ts` — OpenClaw config sync
- `src/lib/event-bus.ts` — SSE broadcast pattern
- `src/lib/db.ts` — SQLite initialization with WAL mode
- `src/store/index.ts` — Zustand store structure (but split it)
- `ops/mc-provisioner-daemon.js` — Tenant provisioning daemon

### Summary Matrix

| Repo | Build | Fork | Steal |
|------|-------|------|-------|
| **Paperclip** | ❌ | ❌ | ✅ Patterns only |
| **Mission Control** | — | ✅ For Kira Shell | ✅ Components + patterns |

---

## Appendix: File Counts & Scale

**Paperclip:**
- ~450 source files (excluding tests, configs, docs)
- 33 database tables
- 7 adapter packages
- 27 database migrations
- React UI: ~70 components, ~25 pages

**Mission Control:**
- ~120 source files
- SQLite with 21 migrations
- 66 API routes
- 28 UI panels
- 148 E2E tests
- Zustand store: ~600 lines

**Kira (current):**
- ~20 source files (scripts/)
- SQLite knowledge graph
- Cron-based agent scheduling
- File-based memory system
- Telegram delivery
- No web dashboard (yet)
