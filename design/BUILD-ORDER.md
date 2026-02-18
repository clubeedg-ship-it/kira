# Kira — Build Order

**45 design docs → working product**
**Strategy:** Phase-by-phase, each phase testable independently.
**Agent:** Claude Code (complex logic) + Codex (scaffolding/UI) on same GitHub repo.

---

## Phase 0: Project Scaffolding (Codex — ~30 min)

**Goal:** Empty project with all configs, folder structure, dependencies, dev scripts working.

**Deliverables:**
- Tauri v2 project with React frontend + Node.js sidecar
- Monorepo structure: `packages/core`, `packages/api`, `packages/dashboard`, `packages/desktop`
- package.json files with all dependencies
- TypeScript configs
- Vite config for dashboard
- Tailwind CSS config (dark theme)
- SQLite database initialization (better-sqlite3)
- ESLint + Prettier configs
- Basic dev scripts: `dev`, `build`, `test`
- GitHub Actions CI stub

**Design docs:** `architecture/tech-stack.md`, `architecture/system-overview.md`

**Verify:** `npm run dev` starts without errors. `npm test` runs (0 tests, 0 failures).

---

## Phase 1: Memory Layer (Claude Code — ~2 hours)

**Goal:** 4-layer SQLite memory system, fully tested.

**Deliverables:**
- `packages/core/src/memory/`
  - `schema.ts` — All CREATE TABLE statements from `memory/sqlite-schema.md`
  - `episodic.ts` — Episode CRUD, auto-summarization stubs
  - `semantic.ts` — Entity/fact/relationship CRUD, graph queries via recursive CTEs
  - `procedural.ts` — Procedure storage, preference tracking
  - `working.ts` — Context window management, token budgeting
  - `retrieval.ts` — Multi-strategy retrieval (FTS5 + embedding + graph), rank fusion
  - `learning.ts` — Post-interaction extraction, correction handling
  - `index.ts` — Unified MemoryEngine class
- `packages/core/tests/memory/` — Full test suite for each module
- Database migration runner

**Design docs:** `memory/4-layer-system.md`, `memory/sqlite-schema.md`, `memory/retrieval-pipeline.md`, `memory/learning-loop.md`

**Verify:** All memory tests pass. Can store/retrieve episodes, entities, facts, procedures. FTS5 search works.

---

## Phase 2: API Server (Claude Code — ~2 hours)

**Goal:** Node.js HTTP server with all API endpoints, SSE streaming.

**Deliverables:**
- `packages/api/src/`
  - `server.ts` — HTTP server (native http or fastify)
  - `routes/chat.ts` — JSONL transcript reading, SSE stream, message sending
  - `routes/memory.ts` — Memory search, entity browse, fact CRUD
  - `routes/tasks.ts` — Task/goal CRUD, list with filters
  - `routes/vdr.ts` — File tree, file content, upload, search
  - `routes/agents.ts` — Agent list, spawn, status
  - `routes/settings.ts` — Config read/write, model management
  - `routes/ollama.ts` — GPU detection, model catalog, pull, status
  - `routes/system.ts` — Health, metrics, info
  - `middleware/auth.ts` — JWT validation (stub for v1.0 single-user)
  - `middleware/sse.ts` — SSE helper with file watching
- `packages/api/tests/` — API integration tests
- OpenClaw JSONL transcript parser

**Design docs:** `architecture/api-spec.md`, `architecture/data-flow.md`

**Verify:** All API endpoints return correct responses. SSE streams JSONL changes. Tests pass.

---

## Phase 3: Dashboard Chat UI (Claude Code + Codex — ~3 hours)

**Goal:** Discord-style chat that shows ALL message types from JSONL transcripts.

**Deliverables:**
- `packages/dashboard/src/`
  - `components/chat/MessageList.tsx` — Scrollable message area, auto-scroll, gradient fade
  - `components/chat/UserMessage.tsx` — Avatar + name + content
  - `components/chat/AssistantMessage.tsx` — Kira avatar + markdown content
  - `components/chat/ThinkingBlock.tsx` — Collapsible, shimmer animation
  - `components/chat/ToolBlock.tsx` — Icon + preview + expand, per-tool-type rendering
  - `components/chat/SystemBanner.tsx` — Thin centered events
  - `components/chat/SubAgentDock.tsx` — Top bar with persistent agent cards
  - `components/chat/InputBar.tsx` — Message input + send
  - `components/layout/Sidebar.tsx` — Session navigator (thin icon rail)
  - `components/layout/StatusBar.tsx` — Connection, model, tokens
  - `components/layout/AppLayout.tsx` — Seamless full-page layout
  - `hooks/useSSE.ts` — SSE connection with reconnect
  - `hooks/useChat.ts` — Message state management
  - `lib/parseJSONL.ts` — Transcript parser (message types → components)
- Dark theme via Tailwind
- Markdown rendering (react-markdown + rehype)
- Syntax highlighting (shiki)

**Design docs:** `dashboard/chat-ui.md`, `dashboard/component-map.md`

**Verify:** Can view real JSONL transcripts. All message types render correctly. Thinking/tool blocks expand/collapse. SSE updates in real-time.

---

## Phase 4: Tasks & Goals (Codex — ~2 hours)

**Goal:** Notion-level task/goal management.

**Deliverables:**
- `components/tasks/TaskList.tsx` — List view with filters, sort, bulk actions
- `components/tasks/KanbanBoard.tsx` — Drag-and-drop columns
- `components/tasks/TaskDetail.tsx` — Full task view with subtasks, links
- `components/tasks/GoalTracker.tsx` — OKR-style goals with progress bars
- `components/tasks/ProjectView.tsx` — Project overview with linked tasks/goals
- Task/goal SQLite tables + API integration

**Design docs:** `dashboard/tasks-goals.md`

**Verify:** Can create/edit/complete tasks. Kanban drag works. Goals track progress.

---

## Phase 5: VDR & Settings (Codex — ~2 hours)

**Goal:** Document management + all settings screens.

**Deliverables:**
- `components/vdr/FileTree.tsx` — Hierarchical folder view
- `components/vdr/FileViewer.tsx` — Markdown renderer, code viewer, image viewer
- `components/vdr/Search.tsx` — Full-text + semantic search
- `components/settings/` — All 9 settings screens from settings.md
- Ollama management UI (GPU info, model catalog, pull)
- Model assignment UI (per-task model config)

**Design docs:** `dashboard/vdr.md`, `dashboard/settings.md`, `cost/model-routing.md`

**Verify:** Can browse files, view documents. Settings save and apply. Ollama models discoverable.

---

## Phase 6: Knowledge Graph (Claude Code — ~2 hours)

**Goal:** Interactive entity/relationship explorer.

**Deliverables:**
- `components/knowledge/GraphCanvas.tsx` — Force-directed graph visualization
- `components/knowledge/EntityDetail.tsx` — Facts, relationships, timeline
- `components/knowledge/SearchBar.tsx` — Entity search with autocomplete
- Graph layout engine (d3-force or custom)

**Design docs:** `dashboard/knowledge-graph.md`

**Verify:** Can visualize entities and relationships. Click node → see details. Search works.

---

## Phase 7: Interactive Widgets (Claude Code — ~3 hours)

**Goal:** AI-generated visual components in chat.

**Deliverables:**
- `components/widgets/WidgetRenderer.tsx` — Sandboxed iframe renderer
- `components/widgets/templates/` — Pre-built templates for all 8 widget types
- `packages/core/src/widgets/` — Widget schema registry, JSON validation
- Widget Agent system prompt
- `@widget` directive parser
- postMessage callback → chat message flow
- Fallback rendering for non-widget platforms

**Design docs:** `dashboard/interactive-widgets.md`, `agents/widget-agent.md`

**Verify:** Can render all 8 widget types. Click interactions send messages. Fallback works.

---

## Phase 8: Tauri Desktop Shell (Codex — ~2 hours)

**Goal:** Standalone macOS + Windows app.

**Deliverables:**
- `packages/desktop/` — Tauri v2 config
- System tray with status indicator
- Native notifications
- Sidecar process management (start/stop Node.js backend)
- Auto-updater configuration
- Deep link handler (kira:// protocol)
- macOS DMG + Windows MSI build scripts

**Design docs:** `architecture/tech-stack.md` §10.4, `packaging/distribution.md`

**Verify:** `npm run tauri dev` launches native window. Tray icon works. Sidecar starts.

---

## Phase 9: Onboarding & Auth (Claude Code — ~2 hours)

**Goal:** First-run wizard + basic auth.

**Deliverables:**
- `components/onboarding/SetupWizard.tsx` — 9-step flow
- API key entry + validation
- OAuth flow stubs (Claude Max, ChatGPT Plus)
- Ollama auto-detection in setup
- Personality creation UI
- Channel connection guides
- Single-user auth (JWT, local)

**Design docs:** `onboarding/setup-wizard.md`, `onboarding/personality-creation.md`, `auth/api-keys.md`

**Verify:** Setup wizard completes. API key validates. Agent responds.

---

## Phase 10: Gamification & Polish (Codex — ~2 hours)

**Goal:** XP, streaks, achievements, agent guidance.

**Deliverables:**
- XP bar in status bar
- Level/streak tracking in SQLite
- Achievement system with toast notifications
- Agent proactive suggestions system
- Task extraction from conversations

**Design docs:** `gamification/user-engagement.md`, `gamification/agent-guidance.md`, `gamification/task-gathering.md`

**Verify:** XP accumulates. Streaks track. Achievements unlock.

---

## Phase 11: Reliability & Packaging (Claude Code — ~2 hours)

**Goal:** Production-ready, installable.

**Deliverables:**
- Health monitoring + auto-recovery
- Structured logging (pino)
- Error boundaries in frontend
- Docker packaging (Dockerfile + docker-compose)
- `npx create-kira` installer
- Self-update mechanism
- Database migration runner
- Backup/restore

**Design docs:** `reliability/*.md`, `packaging/*.md`

**Verify:** `docker compose up` works. Health endpoint responds. Logs are structured. Update check works.

---

## Total Estimated Time

| Phase | Agent | Est. Time | Dependency |
|-------|-------|-----------|------------|
| 0. Scaffolding | Codex | 30 min | None |
| 1. Memory | Claude | 2 hrs | Phase 0 |
| 2. API Server | Claude | 2 hrs | Phase 1 |
| 3. Chat UI | Both | 3 hrs | Phase 2 |
| 4. Tasks & Goals | Codex | 2 hrs | Phase 2 |
| 5. VDR & Settings | Codex | 2 hrs | Phase 2 |
| 6. Knowledge Graph | Claude | 2 hrs | Phase 1 |
| 7. Widgets | Claude | 3 hrs | Phase 3 |
| 8. Tauri Shell | Codex | 2 hrs | Phase 3 |
| 9. Onboarding | Claude | 2 hrs | Phase 5 |
| 10. Gamification | Codex | 2 hrs | Phase 4 |
| 11. Reliability | Claude | 2 hrs | All |

**Critical path:** 0 → 1 → 2 → 3 → 7 (10.5 hrs)
**With parallelism (Phases 4-6 parallel with 3):** ~12-15 hrs total
**Realistic with iteration/debugging:** 2-3 days

---

*Each phase has clear inputs (design docs), outputs (code + tests), and verification criteria. A coding agent can ralph-loop each phase independently.*
