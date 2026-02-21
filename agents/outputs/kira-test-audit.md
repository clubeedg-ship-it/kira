# Dimera (kira-test) — Comprehensive Code Audit

**Date:** 2026-02-21  
**Auditor:** Subagent (Claude Opus)  
**Codebase:** ~/kira-test (main branch)  
**Stack:** Express + Drizzle/Postgres + React + Vite + BullMQ + Docker sandboxes

---

## 1. Architecture Health — Score: 3/5

**Structure:**
```
src/
├── client/          # React SPA (Vite, TailwindCSS, React Query)
│   ├── components/  # UI primitives + feature components
│   ├── pages/       # Route-level pages
│   ├── hooks/       # Custom hooks (useAuth, useSSE, etc.)
│   └── lib/         # API client, auth, utils
├── server/          # Express API
│   ├── routes/      # 32 route files (REST + SSE)
│   ├── engine/      # Priority, state machine, cascade, XP
│   ├── memory/      # Short-term, working, procedural, context-builder
│   ├── agent/       # Context assembler, skills, identity, evolution
│   ├── jobs/        # BullMQ heartbeat + scheduler
│   ├── middleware/   # Auth, rate-limit
│   └── events/      # SSE emitter
├── db/              # Drizzle schema, migrations, seed
└── shared/          # Types, quick-add parser
```

**Patterns used:**
- Router-per-resource (Express)
- Drizzle ORM with typed schema (good)
- React Query for server state (good)
- SSE for real-time events (decent)
- BullMQ for background jobs (appropriate)
- Docker-based per-user sandboxes (ambitious)

**What's messy:**
- **`chat.ts` is 1,575 lines** — a god file containing tool definitions, tool execution, OpenClaw bridge, SSE streaming, history management, prompt building, and all chat routes. Should be 5+ files.
- **`require()` in ESM codebase** (chat.ts:41-43) — dynamic requires with silent catch blocks. Fragile and hides errors.
- **In-memory `agentRunCache`** (chat.ts:26) — won't survive restarts, won't work across multiple server instances.
- **Shared types** (`src/shared/types.ts`) exists but routes still cast with `as any` liberally.
- No test files anywhere. Zero tests.
- No error handling middleware — each route does its own try/catch via `asyncHandler`.

---

## 2. Backend Routes — Score: 3/5

| File | Lines | Purpose | Quality |
|------|-------|---------|---------|
| `chat.ts` | 1575 | Conversations, messages, AI chat w/ tool loop, OpenClaw bridge | 2/5 — monolith |
| `tasks.ts` | 822 | CRUD tasks w/ validation, priority scoring, state machine | 4/5 — solid |
| `views.ts` | 691 | Aggregated dashboard views (today, command center) | 3/5 — large but focused |
| `projects.ts` | 662 | CRUD projects + milestones + cascade logic | 4/5 |
| `agents.ts` | 629 | Agent CRUD + orchestrator integration + work assignment | 3/5 |
| `objectives.ts` | 567 | OKR management (objectives + key results) | 4/5 |
| `principles.ts` | 433 | Principles + decisions CRUD | 3/5 |
| `input-queue.ts` | 409 | Human-in-the-loop approval queue | 3/5 |
| `time-blocks.ts` | 333 | Time block scheduling | 3/5 |
| `areas.ts` | 319 | Life areas CRUD | 4/5 |
| `knowledge.ts` | 289 | Knowledge graph entities/relationships/facts | 3/5 — raw SQL in places |
| `memory.ts` | 68 | Short-term memory CRUD | 3/5 |
| `reviews.ts` | 256 | Periodic review system | 3/5 |
| `dashboards.ts` | 169 | Dashboard widget config | 3/5 |
| `user-agents.ts` | 197 | User-created automation agents | 3/5 |
| `skills-discovery.ts` | 158 | Skill store browsing | 3/5 |
| `utils.ts` | 144 | Shared route utilities (validation, response helpers) | 4/5 — well done |
| `documents.ts` | 131 | Document CRUD | 3/5 |
| `dependencies.ts` | 128 | Task dependency management | 3/5 |
| `canvas.ts` | 118 | Live canvas state management | 3/5 |
| `sandbox.ts` | 114 | Container sandbox API endpoints | 2/5 |
| `vision.ts` | 109 | Vision statement CRUD | 3/5 |
| `identity.ts` | 103 | Soul/identity file management | 3/5 |
| `skills.ts` | 103 | User skill install/uninstall | 3/5 |
| `panels.ts` | 100 | Chat panel management | 3/5 |
| `chat-files.ts` | 92 | File upload/serve for chat | 2/5 — security issues |
| `settings.ts` | 89 | User settings CRUD | 3/5 |
| `transcribe.ts` | 84 | Audio transcription proxy | 3/5 |
| `xp.ts` | 84 | XP/gamification endpoints | 3/5 |
| `suggestions.ts` | 76 | Extracted suggestion management | 3/5 |
| `index.ts` | 73 | Route registration | 4/5 |
| `agent-work-log.ts` | 49 | Agent work log queries | 3/5 |

**Total:** ~9,400 lines across 32 route files.

---

## 3. Frontend Pages — Score: 3/5

| Page | Lines | Purpose | Completeness |
|------|-------|---------|-------------|
| `TodayView.tsx` | 1004 | Daily task view with scheduling, drag-drop | 85% — feature-rich |
| `Inbox.tsx` | 995 | Task inbox with filters, bulk actions | 80% |
| `AgentMonitor.tsx` | 922 | Agent activity dashboard | 70% — lots of UI, needs real data |
| `BoardView.tsx` | 702 | Kanban board for projects | 75% |
| `Agents.tsx` | 684 | Agent configuration | 70% |
| `Skills.tsx` | 557 | Skill store + installed skills | 65% |
| `Knowledge.tsx` | 468 | Knowledge graph viewer | 60% |
| `Settings.tsx` | 415 | User settings (API keys, theme, model) | 75% |
| `Dashboards.tsx` | 324 | Customizable dashboard | 60% |
| `Memory.tsx` | 280 | Memory viewer (short-term, identity) | 55% |
| `Documents.tsx` | 214 | Document editor | 50% — basic CRUD |
| `Chat.tsx` | 196 | Chat interface (thin wrapper) | 70% — delegates to ChatPanelManager |
| `CommandCenter.tsx` | 129 | Landing page with widgets | 60% |
| `Signup.tsx` | 97 | Registration form | 90% |
| `Login.tsx` | 89 | Login form | 90% |
| `PlaceholderPage.tsx` | 26 | Generic placeholder | N/A |
| `CanvasPage.tsx` | 15 | Canvas viewer shell | 30% — minimal |

---

## 4. Database Schema — Score: 4/5

**Tables (34 total):**

Core auth: `users`, `sessions`, `accounts`, `verification`  
Goal hierarchy: `vision` → `areas` → `objectives` → `key_results` → `projects` → `milestones` → `tasks`  
Task system: `tasks`, `dependencies`, `time_blocks`  
Agent system: `agents`, `agent_work_log`, `user_agents`, `agent_runs`  
Knowledge: `entities`, `relationships`, `facts`  
Chat: `conversations`, `messages`, `chat_panels`  
Memory: `memory_short_term`, `memory_staging`  
Content: `documents`, `canvas_states`  
Gamification: `user_xp`, `xp_events`  
AI: `prompt_patterns`, `prompt_log`, `user_preferences`, `extracted_suggestions`  
Config: `user_settings`, `user_identity`, `identity_changelog`  
Skills: `skills`, `user_skills`  
Infra: `user_containers`  
Meta: `input_queue`, `reviews`, `principles`, `decisions`

**Good:**
- Every table has `user_id` with FK to `users` ✓
- Comprehensive indexing on user_id, status, and join columns ✓
- Proper `uniqueIndex` where needed (email, user_settings, etc.) ✓
- Cascade delete on messages → conversations ✓
- Timestamps with timezone everywhere ✓

**Issues:**
- **No cascade deletes on most FKs** — deleting a project won't cascade to tasks, milestones. Must be handled in app code (fragile).
- **`dependencies` table uses polymorphic FKs** (`blocker_type`/`blocker_id`) — can't enforce referential integrity at DB level.
- **`identityChangelog.userId`** has no FK reference (line ~1020 of schema.ts) — just `uuid('user_id').notNull()` without `.references()`.
- **Missing index:** `entities` table has no composite `(user_id, name)` index for name lookups within a user.
- **`jsonb` columns** (`tags`, `options`, `tools`, `config`, etc.) lack any validation — anything goes.
- **No `ON DELETE` behavior** specified for most foreign keys (defaults to RESTRICT, which will cause cascading delete failures).

---

## 5. Security — Score: 2/5

### Auth Implementation
- **Better-Auth** library with email/password. Cookie-based sessions. ✓
- Rate limiting on login (10/15min), signup (5/hr), API (200/min). ✓
- Auth middleware applied globally via `requireAuth`. ✓

### Critical Issues

**🔴 File serving without auth (chat-files.ts:79-91):**
```typescript
// Serve files (no auth needed for serving - allows embedding in messages)
chatFilesRouter.get('/files/:userId/:filename', (req, res) => {
```
Any user's uploaded files are accessible to anyone who knows the URL pattern. The userId is in the URL, and filenames are UUIDs — but this is still an **unauthenticated file access vulnerability**. An attacker can enumerate files.

**🔴 Hardcoded user ID check (chat.ts):**
```typescript
if (USE_OPENCLAW && req.userId === 'd5a11c42-b9fb-498b-bee3-152ad5d82d10') {
```
Hardcoded UUID for admin routing. If this user ID is compromised or the env var is misconfigured, all users could be routed through OpenClaw.

**🔴 Docker socket mounted (docker-compose.yml):**
```yaml
- /var/run/docker.sock:/var/run/docker.sock
```
The app container has full Docker daemon access. A sandbox escape = full host compromise.

**🔴 Code execution sandbox:**
- `container-manager.ts` uses `execSync` with user-derived container names. While `containerName()` truncates the UUID, the `sanitizePath()` function only strips `..` — doesn't prevent all traversal patterns.
- No resource limits visible on spawned containers (CPU, memory, network).

**🟡 CORS is wide open:**
```typescript
app.use(cors());
```
No origin restrictions. Should restrict to `trustedOrigins` from auth config.

**🟡 `OPENCLAW_BRIDGE_TOKEN` defaults to `'kira-bridge-2024'`** — hardcoded default credential.

**🟡 No CSRF protection** beyond SameSite cookies.

**🟡 No input sanitization** on text fields (XSS possible if content is rendered unsafely).

**🟡 SQL Injection:** All queries use Drizzle's parameterized queries. The raw SQL in `knowledge.ts:182-203` uses template literals with Drizzle's `sql` tag, which parameterizes correctly. **Low risk.**

---

## 6. Multi-tenancy — Score: 4/5

**Enforcement:** Every route uses `eq(table.userId, req.userId)` in WHERE clauses. Helper functions like `projectBelongsToUser()`, `areaBelongsToUser()`, `milestoneBelongsToUser()` add ownership checks before cross-entity operations. This is consistent.

**Leaks found:**

1. **`chat-files.ts:79`** — File serving endpoint takes userId from URL params, not session. **Anyone can access any user's files.**

2. **`identityChangelog` table** — No FK on userId, and no route currently checks ownership when reading changelog (if such a route exists).

3. **`agentRunCache` (in-memory Map)** — No userId scoping on the cache key. The `check_agent` tool looks up by runId globally, but falls through to DB which IS scoped. Edge case if two users have the same runId (UUID collision — practically impossible but architecturally wrong).

4. **SSE events (`events/sse.ts`)** — Would need to verify events are scoped to userId. Based on `emitEvent(req.userId, ...)` calls, this appears correct.

**Overall:** Multi-tenancy is well-enforced in the ORM layer. The file serving endpoint is the only real leak.

---

## 7. Agent Infrastructure — Score: 2/5

### What's Built:
- **Agent CRUD** — Full management of "agents" (AI assistants assigned to areas)
- **Orchestrator** (`engine/orchestrator.ts`) — Assigns tasks to agents, manages capacity
- **Agent Executor** (`agent-executor.ts`) — Runs agent with tool loop via OpenRouter
- **Tool Executor** (`tool-executor.ts`) — Separate tool definitions for agent use
- **Heartbeat System** (`jobs/heartbeat.ts`) — BullMQ-based periodic checks (stale tasks, reviews, due dates)
- **User Agents** (`user-agents.ts`) — User-created cron/automation agents with scheduling
- **Agent Scheduler** (`agent-scheduler.ts`) — BullMQ repeatable jobs for user agents
- **Worker** (`worker.ts`) — Separate process for background job execution

### What's Placeholder/Incomplete:
- **Context Assembler** (`agent/context-assembler.ts`) — Assembles identity files into system prompt. Functional but basic.
- **Evolution** (`agent/evolution.ts`) — Self-evolution of identity/skills. Likely early-stage.
- **Memory System** — Five files (`short-term.ts`, `working.ts`, `procedural.ts`, `context-builder.ts`, `manager.ts`). Architecture is there but integration is spotty — chat.ts uses `require()` with catch blocks.
- **Prompt Engine** (`prompt-engine.ts`, `prompt-patterns.ts`) — Enhancement system exists but is optional/fragile.
- **NLP Extract/Store** (`nlp-extract.ts`, `nlp-store.ts`) — Entity extraction from conversations. Post-processing pipeline.
- **Sandbox/Container Manager** — Ambitious Docker-per-user system. Works but no resource limits, no cleanup policy, no scaling plan.

### Verdict:
The scaffolding is impressive. The tool loop, multi-round execution, and heartbeat system are real. But the memory system and prompt enhancement are wired in with `try/catch(require())` which means they silently fail. No monitoring, no metrics, no alerting on agent failures.

---

## 8. Dead Code — Score: 3/5

**Likely dead/unused:**
- **`PlaceholderPage.tsx`** (26 lines) — Generic placeholder, not referenced in routes (App.tsx doesn't import it for any active route, but it IS imported).
- **`skills-discovery.ts`** — Route exists but unclear if frontend consumes it (Skills.tsx may use it).
- **`memoryStaging` table** — Schema defined, no route writes to it.
- **`promptPatterns` and `promptLog` tables** — Used only by the optional prompt engine (which silently fails to load).
- **`seed-identity.ts`**, **`default-skills.ts`**, **`default-templates.ts`**, **`curated-skills.ts`** — Seed data files, used once at setup.
- **`coreTableNames` in index.ts** — Used only for health check, but the list is incomplete (only 16 of 34 tables).
- **`OPENCLAW_ALLOWED_USERS`** — Parsed but never actually used in the routing check (line hardcodes a specific UUID instead).

**Stale imports:**
- `chat.ts` imports `like` from drizzle-orm but never uses it.
- `chat.ts` imports `SQL` type but doesn't use it directly.

---

## 9. Dependencies — Score: 3/5

### package.json Analysis

**Misplaced dependencies:**
- `@tanstack/react-query`, `react`, `react-dom`, `react-router-dom`, `lucide-react`, `tailwindcss` are in **devDependencies** — they should be in dependencies (or it doesn't matter since Vite bundles them, but it's unconventional and confusing).
- `@types/multer` is in **dependencies** — should be devDependencies.

**Vulnerabilities:**
- `drizzle-kit` (via `@esbuild-kit/core-utils` → `esbuild`) has **moderate** severity vulnerabilities. Fix: upgrade to `drizzle-kit@0.31.9`.

**Missing dependencies:**
- No `helmet` for security headers.
- No `zod` or `joi` for input validation (hand-rolled validation in `utils.ts`).
- No logging library (uses `console.log/error` everywhere).
- No monitoring/APM.

**Versions:**
- All deps use `^` ranges — fine for dev, risky for production (needs lockfile discipline).
- Express 4.x — Express 5 is available but 4 is fine.
- React 18 — React 19 is out but 18 is stable.

---

## 10. Production Readiness — Score: 1/5

### Blockers (Must Fix):

1. **Zero tests.** No unit tests, no integration tests, no E2E tests.
2. **No security headers** (helmet, CSP, HSTS).
3. **CORS wide open** — `cors()` with no config.
4. **Unauthenticated file access** — anyone can read uploaded files.
5. **Docker socket exposure** — sandbox containers = privilege escalation vector.
6. **No logging infrastructure** — console.log only. No structured logging, no log aggregation.
7. **No error tracking** — no Sentry, no error boundaries on frontend.
8. **Hardcoded credentials** — bridge token defaults, hardcoded user UUID.
9. **No health check for dependencies** — health endpoint checks table count but not Redis, not S3, not Docker.
10. **No database backups** configured.
11. **No rate limiting on chat/AI endpoints** — the 200/min global limit is generous; AI calls should be much tighter.

### Should Fix:

12. **No request validation library** — hand-rolled validation works but doesn't scale.
13. **No API versioning strategy** beyond `/api/v1` prefix.
14. **No database connection pooling config** — using defaults.
15. **No graceful shutdown** handling.
16. **Frontend has no error boundaries.**
17. **No PWA/offline support** for a "life operating system."
18. **No email verification flow** (emailVerified column exists but no enforcement).
19. **No password reset flow.**
20. **`chat.ts` needs to be broken up** before anyone else can work on it.

---

## Priority Fixes (Ranked by Impact)

### P0 — Fix Before Any User Touches This

1. **Auth on file serving** (`chat-files.ts:79`) — Add `requireAuth` middleware and verify `req.userId === params.userId`. **30 min fix, eliminates data leak.**

2. **Lock down CORS** — Change `cors()` to `cors({ origin: trustedOrigins, credentials: true })`. **10 min fix.**

3. **Add security headers** — `npm install helmet` + `app.use(helmet())`. **15 min fix.**

4. **Remove hardcoded UUID** from chat.ts OpenClaw routing. Use `OPENCLAW_ALLOWED_USERS` env var that's already parsed but unused. **20 min fix.**

5. **Sandbox resource limits** — Add `--memory`, `--cpus`, `--network` flags to Docker container creation. **1 hour fix.**

### P1 — Fix Before Beta

6. **Break up chat.ts** — Extract tool definitions, tool executor, OpenClaw bridge, prompt builder into separate files. **Half day.**

7. **Add structured logging** — Replace console.log with pino/winston. **2 hours.**

8. **Add error tracking** — Sentry on both client and server. **1 hour.**

9. **Add basic test suite** — At minimum: auth flow, CRUD for tasks/projects, multi-tenancy isolation. **2-3 days.**

10. **AI endpoint rate limiting** — Separate rate limit for `/chat/conversations/:id/messages` (e.g., 20/min per user). **30 min.**

### P2 — Fix Before Production

11. **Cascade deletes** — Add `onDelete: 'cascade'` or implement soft-delete consistently.
12. **Input validation library** — Adopt zod for request body validation.
13. **Database connection pool tuning** + health checks.
14. **Graceful shutdown** handling for Express + BullMQ workers.
15. **Email verification enforcement.**
16. **Frontend error boundaries.**
17. **Replace `require()` calls** in chat.ts with proper ESM imports.
18. **Add API documentation** (OpenAPI/Swagger).

---

## Overall Score: 2.8/5

**Summary:** Dimera has an ambitious and well-thought-out data model (34 tables covering goal hierarchy, agents, knowledge graphs, memory systems, gamification). The route structure is consistent and multi-tenancy is enforced at the ORM layer. The agent infrastructure has real substance — tool loops, heartbeats, orchestration.

But it's not production-ready. The security holes (unauthenticated file access, open CORS, Docker socket, hardcoded creds) are disqualifying. Zero tests means any refactor is a gamble. The 1,575-line chat.ts is a maintenance nightmare. The optional integrations wired with `require()/catch` are fragile.

**The good news:** The architecture is sound. The schema is solid. The security fixes are mostly quick. With 2-3 focused weeks of hardening, this could be a legitimate beta.
