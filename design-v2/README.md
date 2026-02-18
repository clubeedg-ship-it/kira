# Kira v2.0 — Complete Product Design

**Date:** 2026-02-11  
**Status:** Design Phase — NO CODE UNTIL APPROVED

---

## What Is Kira?

A personal AI partner that remembers everything, takes action, and lives where you do. Delivered as a hosted platform (SaaS) with an optional self-hosted option.

## Product Surfaces

1. **Marketing Site** — `kira.ai` (or chosen domain) — public landing, pricing, signup
2. **Platform** — `app.kira.ai` — the actual dashboard (chat, tasks, documents, knowledge, settings)
3. **API** — `api.kira.ai` — REST + SSE backend

## Design Documents

| # | Document | What It Covers |
|---|----------|---------------|
| 01 | [marketing-site.md](./01-marketing-site.md) | Landing page, pricing, signup/login flow |
| 02 | [architecture.md](./02-architecture.md) | System architecture, tech stack, deployment |
| 03 | [multi-tenancy.md](./03-multi-tenancy.md) | User isolation, data boundaries, admin |
| 04 | [auth.md](./04-auth.md) | Registration, login, JWT, OAuth, sessions |
| 05 | [api-spec.md](./05-api-spec.md) | Complete REST API specification |
| 06 | [ai-providers.md](./06-ai-providers.md) | OpenRouter, Anthropic, OpenAI, Ollama integration |
| 07 | [dashboard.md](./07-dashboard.md) | Platform UI: all pages, components, routing |
| 08 | [chat.md](./08-chat.md) | Chat system: sessions, streaming, agent visibility |
| 09 | [memory.md](./09-memory.md) | 4-layer memory engine per user |
| 10 | [tasks-goals.md](./10-tasks-goals.md) | Task management, goals, kanban |
| 11 | [documents.md](./11-documents.md) | VDR / document browser per user |
| 12 | [knowledge-graph.md](./12-knowledge-graph.md) | Entity graph, relationships, search |
| 13 | [onboarding.md](./13-onboarding.md) | First-run wizard after signup |
| 14 | [settings.md](./14-settings.md) | User settings, provider config, account |
| 15 | [error-handling.md](./15-error-handling.md) | Error boundaries, fallbacks, logging |
| 16 | [testing.md](./16-testing.md) | Test strategy, what gets tested before deploy |
| 17 | [deployment.md](./17-deployment.md) | Docker, CI/CD, domain setup |
| 18 | [build-order.md](./18-build-order.md) | Implementation phases with verification gates |
| 19 | [billing.md](./19-billing.md) | Stripe payments, tiers, free-access accounts |

## Principles (Lessons from v1 Failures)

1. **No code without design approval** — Every feature has a spec before implementation
2. **Test before deploy** — Every endpoint tested, every page verified with real data
3. **Env vars for config** — No hardcoded keys, URLs, or secrets in source
4. **Error boundaries everywhere** — One component crash never kills the app
5. **API contract first** — Frontend and backend agree on shape before coding either
6. **Multi-tenant from day one** — user_id on every row, every query, every file path
7. **Auth on every request** — No endpoint without authentication (except public routes)
8. **Build from correct directory** — Verify build output before deploying
