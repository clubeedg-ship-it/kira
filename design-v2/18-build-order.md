# 18 — Build Order

> Each phase has a verification gate. Nothing proceeds until the gate passes.

---

## Phase 0: Project Setup
**Build:** Monorepo scaffold, package.json workspaces, TypeScript config, Tailwind config, Dockerfile, docker-compose.yml, .env.example
**Gate:** `npm install` succeeds, `vite build` produces valid output, Docker builds and starts

## Phase 1: Auth System
**Build:** System SQLite DB, user registration (email+password), email verification (stub: auto-verify in dev), login, JWT issuance, refresh tokens, auth middleware, rate limiting on auth endpoints
**Gate:** Register → verify → login → get token → /api/auth/me returns user → refresh token works → logout revokes session → old refresh token rejected

## Phase 2: Multi-Tenant Data Layer
**Build:** Per-user directory creation, per-user SQLite databases (kira.db, memory.db, settings.db), getUserDb() with path traversal protection, quota checking middleware
**Gate:** Two users registered, each has isolated /data/users/{id}/ directories, user A cannot access user B's data (tested via API)

## Phase 3: AI Provider Layer
**Build:** LLMProvider interface, OpenAICompatibleProvider (for OpenRouter + OpenAI), AnthropicProvider, OllamaProvider, provider resolution chain, usage tracking, cost estimation
**Gate:** Server default (OpenRouter) works, per-user provider config works, usage logged in system.db, rate limiting enforced

## Phase 4: Chat System
**Build:** Chat sessions, messages, SSE streaming, system prompt generation from user context, conversation history management
**Gate:** Create session → send message → get streamed AI response → messages persisted → reload page → history intact

## Phase 5: Dashboard Shell
**Build:** NavShell (sidebar), AuthGuard, ErrorBoundary per route, apiFetch helper, useAuth hook, routing for all pages, loading skeletons, empty states
**Gate:** Login → see sidebar → click every nav item → page loads (skeleton then content or empty state) → hard refresh on every route → still works → error boundary catches thrown error

## Phase 6: Overview Page
**Build:** Overview with aggregated stats, greeting, quick priorities, recent activity
**Gate:** Page loads with real data from user's DBs, shows proper empty state for new users

## Phase 7: Tasks Page
**Build:** Kanban board, drag & drop, CRUD, priority badges, filters
**Gate:** Create task → see in kanban → drag to another column → refresh → still there → delete → gone

## Phase 8: Documents Page
**Build:** File tree, upload, preview, download, folder management
**Gate:** Create folder → upload file → see in tree → preview → download → delete → refresh → consistent

## Phase 9: Knowledge Page
**Build:** Entity list, search, type filter, detail view
**Gate:** Entities from memory engine displayed → search works → filter by type → click shows detail

## Phase 10: Settings Page
**Build:** Account section, provider management (add/remove keys), usage display, preferences, data export, admin section
**Gate:** Change display name → persists. Add API key → encrypted in DB → used for next chat. View usage → shows real numbers.

## Phase 11: Marketing Site
**Build:** Landing page, pricing page, signup/login pages (redirect to API)
**Gate:** Visit kira.ai → see landing → click signup → create account → redirected to app.kira.ai → logged in

## Phase 12: Onboarding
**Build:** Post-signup wizard: welcome → connect AI → create agent personality → first conversation
**Gate:** New user → wizard starts → can skip or complete each step → ends at chat page → wizard doesn't appear again

## Phase 13: Integration Testing & Polish
**Build:** Run full manual checklist, fix all issues, CSS review, mobile viewport check, error state verification
**Gate:** Every item on the manual verification checklist (see 16-testing.md) passes

## Phase 14: Deployment
**Build:** Docker image, Cloudflare tunnel config, domain setup, SSL, monitoring
**Gate:** `app.zenithcred.com` (or final domain) serves the platform, new user can register and chat

---

## Rules

1. **No skipping phases.** Phase N+1 doesn't start until Phase N's gate passes.
2. **Gates are tested, not assumed.** Run the actual commands. Check the actual output.
3. **Fix forward, don't patch around.** If a gate fails, fix the root cause.
4. **Commit after each phase.** Every phase = one or more git commits with descriptive messages.
