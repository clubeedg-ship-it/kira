# Kira Design — Cross-Reference Review

> **Reviewer:** Product Architecture Review (Automated)
> **Date:** 2026-02-11
> **Documents Reviewed:** 40 markdown files across 11 directories + 1 deliverable
> **Readiness Score:** 5/10

---

## Critical Issues (must fix before build)

### C1. Database Technology Contradiction — SQLite vs PostgreSQL

- **File 1:** `architecture/system-overview.md` §1 — "SQLite only — no Postgres, no Redis, no external databases"
- **File 2:** `architecture/tech-stack.md` §4 — "SQLite (via better-sqlite3)" — confirms SQLite-only
- **File 3:** `dashboard/knowledge-graph.md` §5.1 — "Primary: PostgreSQL with graph extensions (Apache AGE)... Cache: Redis"
- **File 4:** `dashboard/tasks-goals.md` §6 — "All task/goal data lives in PostgreSQL... API Server ──Prisma──→ PostgreSQL"
- **File 5:** `dashboard/vdr.md` §1.1 — References "S3/R2" for document storage, `DocumentVersion.storageKey` as "S3/R2 key"
- **File 6:** `auth/multi-tenant.md` — "Shared PostgreSQL for auth, metadata" and references `UUID PRIMARY KEY`, `BYTEA`, `TIMESTAMPTZ` (PostgreSQL types)
- **File 7:** `auth/api-keys.md` — Uses PostgreSQL-specific types (`UUID`, `BYTEA`, `TIMESTAMPTZ`, `INET`)
- **File 8:** `cost/scalability.md` — Describes SQLite → PostgreSQL migration path, acknowledging both

**Issue:** The core architecture mandates SQLite-only, but at least 5 other documents assume PostgreSQL as the primary database. The API keys schema uses PostgreSQL-specific column types (BYTEA, INET, TIMESTAMPTZ) that don't exist in SQLite. Tasks/goals assumes Prisma ORM with PostgreSQL. Knowledge graph assumes Apache AGE (a PostgreSQL extension).

**Resolution:** Pick one for v1.0 and make ALL documents consistent. Recommendation: SQLite for v1.0 (as system-overview states). Rewrite all schemas in knowledge-graph.md, tasks-goals.md, vdr.md, auth/*.md to use SQLite-compatible types. Remove PostgreSQL, Redis, Prisma, and S3 references. Add a "Future: PostgreSQL migration" note in scalability.md only.

---

### C2. Frontend Framework Contradiction — React+Vite vs Next.js 15

- **File 1:** `architecture/tech-stack.md` §3 — "React 18+, Vite, TailwindCSS" as the stack
- **File 2:** `architecture/system-overview.md` §2.5 — "React 18+, Vite, TailwindCSS, SSE client"
- **File 3:** `dashboard/component-map.md` §5.3 — "Framework: Next.js 15 (App Router)"
- **File 4:** `deliverables/kira-dashboard-chat-ui-design.md` §11 — "React + Vite" (consistent with tech-stack)

**Issue:** component-map.md specifies Next.js 15 with App Router, while every other document specifies React + Vite. Next.js is a fundamentally different architecture (SSR, file-based routing, server components) that conflicts with the PWA/SPA approach described elsewhere.

**Resolution:** Standardize on React + Vite (as specified in tech-stack.md and the chat UI design). Update component-map.md §5.3 to use React + Vite + react-router. Remove Next.js reference.

---

### C3. Missing Design Files Referenced in README

- **File:** `README.md` — Lists these files in the directory structure:
  - `architecture/api-spec.md` — **DOES NOT EXIST**
  - `dashboard/chat-ui.md` — **DOES NOT EXIST** (exists in `deliverables/` instead)
  - `dashboard/interactive-widgets.md` — **DOES NOT EXIST**

**Issue:** Three files listed in the master README don't exist. The chat-ui design is in deliverables/ rather than dashboard/. interactive-widgets.md is completely missing — the widget system is split between agents/widget-agent.md and the chat UI deliverable.

**Resolution:**
1. Create `architecture/api-spec.md` or remove from README
2. Move/symlink `deliverables/kira-dashboard-chat-ui-design.md` → `dashboard/chat-ui.md`
3. Create `dashboard/interactive-widgets.md` as the canonical widget rendering spec (extracting from chat-ui deliverable §4), or remove from README

---

### C4. Tauri Desktop App — Inconsistent Integration

- **File 1:** `architecture/tech-stack.md` §10.4 — Detailed Tauri v2 spec: sidecar Node.js, system tray, auto-updater, GPU detection for Ollama
- **File 2:** `architecture/system-overview.md` §2.10 — Packaging targets: Docker (primary), Linux installer, macOS DMG, Windows MSI — **no mention of Tauri**
- **File 3:** `packaging/distribution.md` — Lists Tauri as option 3 "Pre-built Desktop App" with ~100MB download
- **File 4:** `packaging/docker.md` — No Tauri reference
- **File 5:** `packaging/pwa.md` — Describes PWA as mobile alternative, Capacitor wrapping — no Tauri reference
- **File 6:** `packaging/updates.md` — Mentions Tauri updater briefly
- **File 7:** `onboarding/setup-wizard.md` — No mention of Tauri-specific onboarding flow
- **File 8:** `dashboard/component-map.md` — No Tauri-specific UI considerations

**Issue:** tech-stack.md has a detailed Tauri architecture, but system-overview.md (the master architecture doc) doesn't mention Tauri at all. The packaging docs partially reference it. No onboarding or dashboard doc accounts for Tauri-specific flows (e.g., system tray, native notifications, sidecar management).

**Resolution:** If Tauri is a v1.0 target (distribution.md says it is), add it to system-overview.md §2.10 as a packaging target. Add Tauri-specific notes to onboarding (setup wizard within native app vs browser). If it's post-v1.0, mark it as "Future" consistently everywhere.

---

### C5. Mobile — Inconsistent Deferral

- **File 1:** `architecture/tech-stack.md` §10.4 — "Mobile: Explicitly out of scope for v1.0. Desktop (macOS + Windows) first."
- **File 2:** `ux-flows/mobile.md` — Full 500+ line mobile UX spec with bottom tab bar, swipe gestures, offline mode, home screen widgets, Siri integration
- **File 3:** `dashboard/component-map.md` §3 — Full responsive breakpoints including mobile (<768px) with "Bottom tab navigation, full-screen views, swipe gestures"
- **File 4:** `packaging/pwa.md` — Capacitor wrapping for iOS/Android app stores
- **File 5:** `onboarding/setup-wizard.md` — "Mobile-first — works on phone screens"
- **File 6:** `gamification/user-engagement.md` — Mobile-specific XP bar, mobile toast position
- **File 7:** `README.md` — Lists `ux-flows/mobile.md` as a design document

**Issue:** tech-stack.md explicitly says mobile is out of scope for v1.0, but at least 6 other documents have detailed mobile-specific designs. This creates confusion about what to build.

**Resolution:** Either:
- (A) Add "v2.0" or "Future" headers to all mobile-specific sections in other docs, or
- (B) Remove the "out of scope" statement from tech-stack.md and commit to responsive web (not native mobile)

Recommendation: (A) — keep mobile.md for future reference, but add a clear "DEFERRED: v2.0" banner to mobile.md and tag all mobile sections in other docs.

---

## Gaps (missing design coverage)

### G1. Settings/Preferences Screen — No Design Doc

- component-map.md lists Settings routes (`/settings`, `/settings/integrations`, `/settings/agents`) but provides no detailed spec
- Model routing UI is described in cost/model-routing.md but not integrated into a settings design
- Ollama management UI is described in tech-stack.md but not integrated into settings
- Autonomy level configuration is in agents/autonomy-levels.md but no UI spec
- Personality editing is in onboarding/personality-creation.md but no settings-mode spec

**Suggested resolution:** Create `dashboard/settings.md` consolidating all settings-related UIs.

### G2. API Specification — Missing

- README lists `architecture/api-spec.md` but it doesn't exist
- Various docs define partial API endpoints (system-overview.md §2.4, knowledge-graph.md §5.3, tasks-goals.md §6)
- These partial specs conflict (some assume REST, some tRPC, different endpoint naming)

**Suggested resolution:** Create the api-spec.md as the single canonical API reference.

### G3. Error Handling for Subscription OAuth Failures

- auth/api-keys.md describes OAuth flow for Claude Max / ChatGPT Plus
- No design for: token expiration mid-conversation, subscription downgrade/cancellation, rate limiting on subscription, graceful fallback to API keys

**Suggested resolution:** Add OAuth lifecycle section to auth/api-keys.md or error-handling.md.

### G4. Data Backup & Restore — Fragmented

- docker.md mentions backup via tar
- updates.md mentions rollback snapshots
- health-monitoring.md mentions daily DB backup
- No unified backup/restore design

**Suggested resolution:** Create `reliability/backup-restore.md` as canonical reference.

### G5. Accessibility (a11y) — Minimal Coverage

- setup-wizard.md mentions keyboard navigation and screen readers briefly
- component-map.md mentions Radix UI (accessible primitives)
- No dedicated accessibility design, no WCAG compliance targets, no a11y testing plan

**Suggested resolution:** Add accessibility section to component-map.md or create dedicated doc.

### G6. Search Architecture — Missing

- component-map.md describes a search screen (`/search`) with full-text + semantic search
- retrieval-pipeline.md describes memory search
- No unified search design covering: global search across tasks + docs + entities + memory + conversations

**Suggested resolution:** Create `dashboard/search.md` or add to component-map.md.

---

## Inconsistencies (terminology, naming)

### I1. Node.js Version

- `architecture/tech-stack.md` title: "Node.js 20+ (LTS)"
- `architecture/tech-stack.md` body: "Decision: Node.js 22+ for v1.0"
- `packaging/docker.md` Dockerfile: `FROM node:20-alpine`
- Runtime info: `node=v25.6.0`

**Resolution:** Pick Node.js 22+ LTS (as the body text says) and update all references.

### I2. Memory Layer Naming

| Document | Layer 1 | Layer 2 | Layer 3 | Layer 4 |
|----------|---------|---------|---------|---------|
| system-overview.md | Working Memory (Context Window) | Session Memory (Daily Files) | Long-Term Memory (Curated) | Knowledge Graph (SQLite) |
| memory/4-layer-system.md | Episodic Memory | Semantic Memory | Procedural Memory | Working Memory |

**Issue:** The two docs define completely different 4-layer systems. system-overview.md uses a practical file-based model (context window → daily files → MEMORY.md → graph.db). 4-layer-system.md uses a cognitive science model (episodic → semantic → procedural → working). These are different architectures.

**Resolution:** Reconcile. The 4-layer-system.md is more comprehensive and is the "target" architecture. system-overview.md describes the "current" simpler system. Add a mapping table showing how the current system maps to the target, and which parts are implemented vs planned.

### I3. Widget Invocation Protocol

- `agents/widget-agent.md` §4 — Uses `@widget` directive and auto-detection regex
- `deliverables/kira-dashboard-chat-ui-design.md` §4.4 — Uses `<!-- kira-widget:TYPE {...} -->` HTML comments
- `deliverables/kira-dashboard-chat-ui-design.md` §12.3 — Uses `@widget:decision-cards` with YAML-like context

**Resolution:** Pick one canonical invocation format. Recommendation: Use the `<!-- kira-widget:TYPE -->` HTML comment format for the wire protocol (it's parseable and platform-safe), and `@widget:TYPE` as the agent-facing directive that gets compiled to the HTML comment format.

### I4. Dashboard Port

- `architecture/system-overview.md` — `KIRA_DASHBOARD_PORT=3000`
- `packaging/docker.md` — `PORT=3001`, `-p 3001:3001`
- `packaging/distribution.md` — `http://localhost:3001`

**Resolution:** Pick 3001 (avoids common dev server conflicts on 3000) and update system-overview.md.

### I5. Agent Model Names — Outdated/Inconsistent

- Various docs reference: `claude-opus-4-6`, `claude-opus-4-20250514`, `claude-sonnet-4-20250514`, `claude-3-5-haiku-20241022`, `qwen3:14b`, `qwen2.5:14b`
- Inconsistent between full model IDs and short names

**Resolution:** Create a model alias table in tech-stack.md or model-routing.md. Use short aliases (opus, sonnet, haiku) in design docs, with a mapping to current full IDs.

### I6. Config File Format

- multi-agent-system.md uses YAML for specialist configs
- autonomy-levels.md uses YAML for autonomy config
- cron-system.md uses YAML for job definitions
- tech-stack.md mentions `kira.config.ts` (TypeScript)
- model-routing.md uses TypeScript for routing config
- docker.md uses `.env` for config

**Resolution:** Decide: YAML for user-facing config, TypeScript for developer config, .env for secrets. Document this convention.

### I7. "Kira" vs "OpenClaw" — Identity Confusion

- system-overview.md describes Gateway as "OpenClaw" — the existing codebase
- But Kira IS the product being built ON TOP of OpenClaw
- Some docs conflate them (e.g., cron-system.md: "Built on OpenClaw's native cron support")

**Resolution:** Clarify in system-overview.md: "OpenClaw is the runtime platform. Kira is the product built on it."

---

## Suggestions (improvements)

### S1. Consolidate Redundant Schema Definitions

The memory SQLite schema is defined in THREE places:
1. `memory/4-layer-system.md` — cognitive model with full table definitions
2. `memory/sqlite-schema.md` — complete DDL with FTS5 triggers
3. `architecture/data-flow.md` §2.4 — abbreviated schema

**Suggestion:** Make `memory/sqlite-schema.md` the ONLY canonical schema. Other docs should reference it, not duplicate it.

### S2. Consolidate Widget Specifications

Widget specs are split across:
1. `agents/widget-agent.md` — agent behavior + JSON schemas
2. `deliverables/kira-dashboard-chat-ui-design.md` §4 — rendering architecture + widget types
3. `architecture/system-overview.md` §2.8 — widget engine overview

**Suggestion:** Create `dashboard/interactive-widgets.md` (the missing file from README) as the canonical widget spec. Have widget-agent.md reference it for schemas. Have chat-ui reference it for rendering.

### S3. Add Dependency Graph

No document maps which components depend on which. A visual dependency graph would help prioritize build order and identify critical path.

### S4. Subscription Auth Should Flow Through Onboarding

`auth/api-keys.md` describes Claude Max / ChatGPT Plus OAuth as a major feature. But `onboarding/setup-wizard.md` Step 2 shows Claude Max as "Coming Soon (greyed out)". If subscriptions are a v1.0 feature, the wizard should support them. If not, the api-keys.md should mark them as future.

### S5. Ollama Integration in Onboarding

`tech-stack.md` §6 describes deep Ollama integration with GPU auto-discovery, model catalog browser, and management UI. None of this appears in the onboarding flow. If Ollama is a v1.0 feature, add a setup wizard step: "Use local AI models?" → Ollama detection → model recommendation.

### S6. Chat UI Design Doc Should Be Integrated

The `deliverables/kira-dashboard-chat-ui-design.md` is comprehensive and high-quality but lives outside the design directory structure. It should be the canonical `dashboard/chat-ui.md` and cross-referenced from component-map.md.

### S7. Reduce Document Count via Merging

Several thin documents could be merged:
- `gamification/agent-guidance.md` + `gamification/task-gathering.md` → both are about how agents interact with users proactively
- `reliability/error-handling.md` + `reliability/health-monitoring.md` — significant overlap in failure/recovery tables
- `auth/permissions.md` + `agents/autonomy-levels.md` — both define what agents can do; permissions.md §Agent Permissions duplicates autonomy-levels.md

### S8. Timeline Realism Check

`architecture/system-overview.md` §5.2 proposes:
- Phase 1 (Weeks 1-4): Dashboard Server + Frontend + Docker + Health Monitor
- Phase 2 (Weeks 5-8): Widget Engine + VDR + Memory viewer + Memory Layer 4
- Phase 3 (Weeks 9-12): Discord + Signal + Installers + Multi-user auth
- Phase 4 (Weeks 13-16): WhatsApp + Widget marketplace + Backup + Optimization

Given the scope described in the design docs (40+ documents, PostgreSQL-scale features in tasks/goals/knowledge-graph), 16 weeks is extremely aggressive. The dashboard alone (component-map.md describes 24 screens with complex interactions) would take 8-12 weeks for a small team.

**Suggestion:** Re-scope Phase 1 to: Chat UI only (from the deliverable), basic file API, Docker packaging. Defer the full Notion-killer dashboard to Phase 2-3.

---

## Summary

### Overall Assessment

The Kira design documentation is **impressively comprehensive** — 40 documents covering architecture, memory, agents, dashboard, onboarding, auth, reliability, packaging, gamification, UX flows, and cost. The depth of thought in areas like the 4-layer memory system, widget architecture, and agent autonomy levels is excellent.

However, the documents were clearly written at different times with different assumptions, creating **fundamental contradictions** that must be resolved before building:

1. **SQLite vs PostgreSQL** — The single biggest issue. Core architecture says SQLite; 5+ downstream docs assume PostgreSQL.
2. **React+Vite vs Next.js** — Must pick one.
3. **Mobile scope** — Detailed mobile designs exist despite being "out of scope."
4. **Memory system** — Two incompatible 4-layer models described.

### What's Working Well

- ✅ System overview is thorough and well-structured
- ✅ Memory system design (4-layer-system.md, retrieval-pipeline.md) is sophisticated
- ✅ Agent system (multi-agent, autonomy, cron) is well-thought-out
- ✅ Chat UI deliverable is implementation-ready
- ✅ Security model is defense-in-depth
- ✅ Cost analysis is realistic

### What Needs Work

- ❌ Database technology must be unified (SQLite for v1.0)
- ❌ Frontend framework must be unified (React+Vite)
- ❌ 3 missing files from README
- ❌ Mobile scope must be explicitly deferred
- ❌ Tauri must be integrated into all relevant docs or deferred
- ❌ Widget spec is fragmented across 3 documents
- ❌ Settings UI has no design doc
- ❌ Timeline is unrealistic for described scope

### Readiness Score: 5/10

**Rationale:** Individual documents are high quality (8/10), but cross-document consistency is low (3/10). The critical database and framework contradictions would cause immediate confusion for any developer starting implementation. Fix the 5 critical issues and this jumps to 7-8/10.

### Priority Fix Order

1. **C1** — Resolve SQLite vs PostgreSQL (affects all schemas)
2. **C2** — Resolve React+Vite vs Next.js (affects all frontend)
3. **C3** — Create missing files or update README
4. **I2** — Reconcile memory layer naming
5. **C5** — Add "DEFERRED" banners to mobile content
6. **C4** — Decide Tauri scope for v1.0
7. **G1** — Create settings design doc
8. **S1-S2** — Consolidate redundant specs
