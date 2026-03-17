# Oopuo Ops Platform — Implementation Plan

*Created: 2026-03-14*

---

## Phasing Strategy

MVP = Oopuo dogfoods it with their own website. Get the Website Manager + Blog + Analytics + Forms working first. AI Support and Email are integrations that layer on after the core editing experience works.

---

## Phase 1: Foundation + Website Manager (Weeks 1–3)

**Goal:** Import oopuo.com static site, edit it in-platform, publish changes.

### 1.1 Project Scaffolding *(2 days, Low complexity)*
- [ ] Turborepo monorepo setup (`apps/web`, `server`, `packages/ui`, `packages/db`, `packages/shared`)
- [ ] Docker Compose: PostgreSQL, Redis, MinIO, Caddy
- [ ] Drizzle ORM setup + initial migration (core tables: tenants, users, tenant_members, audit_log)
- [ ] Hono server with health check + CORS + error handling
- [ ] Next.js app with Tailwind + shadcn/ui base install
- [ ] ESLint + Prettier + TypeScript strict mode
- **Dependency:** None

### 1.2 Auth & Tenancy *(2 days, Medium complexity)*
- [ ] Clerk integration: `@clerk/nextjs` in frontend, JWT middleware in Hono
- [ ] Clerk webhook handler: sync users + organizations to local DB
- [ ] Tenant middleware: extract orgId → tenant_id on every request
- [ ] Role-based access control middleware
- [ ] Organization switcher in UI header
- [ ] Sign-in / sign-up pages
- **Dependency:** 1.1

### 1.3 Dashboard Shell *(2 days, Low complexity)*
- [ ] Sidebar layout (collapsible, module-aware — hides disabled modules)
- [ ] Header with org switcher + user menu + notification bell
- [ ] Command palette (⌘K) — basic navigation
- [ ] Empty state pages for each module
- [ ] Dark mode default + light mode toggle
- [ ] Mobile responsive sidebar (slide-out)
- **Dependency:** 1.2

### 1.4 Media Library *(2 days, Low complexity)*
- [ ] MinIO integration service (upload, list, delete, presigned URLs)
- [ ] Media library UI: grid view, upload dropzone, file details
- [ ] Image optimization on upload (sharp: resize, compress, generate thumbnails)
- [ ] media_files table + API endpoints
- **Dependency:** 1.1

### 1.5 Website Manager Core *(5 days, High complexity)*
- [ ] Sites CRUD (create, list, detail, settings)
- [ ] Site import: upload ZIP of static files → parse pages → store in DB
- [ ] Import oopuo.com as first test site
- [ ] Site pages table + API
- [ ] GrapesJS integration as React component
  - [ ] Load page HTML into GrapesJS editor
  - [ ] Save GrapesJS project data to `site_pages.grapes_data`
  - [ ] Custom block library (hero, pricing table, FAQ, etc.)
  - [ ] Media library integration (select images from library)
  - [ ] Mobile/tablet/desktop preview toggle
- [ ] Auto-save (debounced 30s)
- [ ] SEO settings panel per page (title, description, OG image)
- **Dependency:** 1.2, 1.4

### 1.6 Publish Pipeline *(3 days, High complexity)*
- [ ] BullMQ setup + site-publish queue
- [ ] Publish job: render GrapesJS → static HTML, package assets, upload to MinIO serving bucket
- [ ] Caddy dynamic configuration: map custom domains → MinIO file_server
- [ ] Version history: snapshot on every publish, stored in MinIO
- [ ] Rollback endpoint: restore previous version
- [ ] Publish status indicator in UI (publishing... → success/failed)
- [ ] Notification on publish complete
- **Dependency:** 1.5

### 1.7 Custom Domains + SSL *(2 days, Medium complexity)*
- [ ] Domain connection UI: add domain, show required DNS records
- [ ] DNS verification poller (BullMQ scheduled job)
- [ ] Caddy auto-SSL via ACME (Let's Encrypt)
- [ ] SSL status tracking in DB
- **Dependency:** 1.6

**Phase 1 Total: ~18 days (3 weeks with buffer)**

---

## Phase 2: Blog + Forms & Leads (Weeks 4–5)

**Goal:** Write blog posts, capture form submissions, manage leads.

### 2.1 Blog Editor *(4 days, High complexity)*
- [ ] TipTap editor React component
  - [ ] Rich text formatting (bold, italic, headings, lists, quotes, code)
  - [ ] Image embedding (from media library)
  - [ ] Markdown shortcuts
  - [ ] Link insertion
- [ ] Blog posts CRUD + API
- [ ] Categories and tags management
- [ ] Draft / review / published / scheduled workflow
- [ ] Schedule publishing (BullMQ delayed job)
- [ ] Featured image selection
- [ ] SEO per post
- **Dependency:** Phase 1

### 2.2 Blog Static Generation *(2 days, Medium complexity)*
- [ ] Template: blog listing page + individual post pages
- [ ] Auto-generate into site's static files on blog publish
- [ ] RSS feed generation
- [ ] Rebuild blog pages on post create/update/delete
- [ ] Integrate into publish pipeline (blog pages included in site publish)
- **Dependency:** 2.1, 1.6

### 2.3 Forms Builder *(3 days, Medium complexity)*
- [ ] Form designer UI: add fields (text, email, textarea, select, checkbox), drag to reorder
- [ ] Form schema stored as JSONB
- [ ] Public submission endpoint (rate-limited, honeypot spam protection)
- [ ] Embeddable form HTML/JS snippet generated for each form
- [ ] Inject form handler into published static site
- **Dependency:** Phase 1

### 2.4 Leads Management *(2 days, Low complexity)*
- [ ] Leads list with status filter (new, contacted, qualified, converted, lost)
- [ ] Lead detail view: submission data, notes, assignment, status history
- [ ] Email notification on new submission
- [ ] CSV export
- [ ] Auto-create lead from form submission
- **Dependency:** 2.3

**Phase 2 Total: ~11 days (2 weeks with buffer)**

---

## Phase 3: Analytics + Notifications (Weeks 6–7)

### 3.1 Umami Integration *(3 days, Medium complexity)*
- [ ] Deploy Umami in Docker Compose (shared PostgreSQL)
- [ ] Auto-create Umami site when platform site is created
- [ ] Inject Umami tracking script into published sites
- [ ] API integration: pull pageviews, visitors, sources, top pages
- [ ] Cache analytics data in analytics_snapshots table (hourly BullMQ job)
- **Dependency:** 1.6

### 3.2 Analytics Dashboard *(2 days, Low complexity)*
- [ ] Overview cards: pageviews, visitors, bounce rate, avg session
- [ ] Line chart: traffic over time (7d, 30d, 90d)
- [ ] Top pages table
- [ ] Traffic sources breakdown
- [ ] Blog post performance (views per post)
- [ ] Form conversion rate
- **Dependency:** 3.1

### 3.3 Notification System *(3 days, Medium complexity)*
- [ ] Notification service: create, list, mark read
- [ ] WebSocket connection (via Hono upgrade or separate WS server)
- [ ] Real-time push to connected clients
- [ ] Email notification sender (BullMQ job)
- [ ] Notification preferences per user
- [ ] Notification center UI (bell icon → dropdown → full page)
- [ ] Hook into existing events: publish, form submission, SSL expiry
- **Dependency:** Phase 1

**Phase 3 Total: ~8 days (2 weeks with buffer)**

---

## Phase 4: AI Support Monitor (Weeks 8–9)

### 4.1 Retell Integration *(3 days, Medium complexity)*
- [ ] Webhook receiver for Retell events (call start, end, transfer, transcript)
- [ ] Conversation + message storage
- [ ] Periodic sync job: pull call history, recordings, metrics from Retell API
- [ ] Agent configuration storage (link Retell agent IDs to tenants)
- **Dependency:** Phase 1

### 4.2 Support Dashboard *(3 days, Medium complexity)*
- [ ] Conversations list with filters (channel, status, date range)
- [ ] Conversation detail: full transcript, audio player, metadata
- [ ] Escalation inbox: open escalations, assign, resolve
- [ ] Real-time escalation alerts via WebSocket
- [ ] Support metrics: resolution rate, avg handle time, volume charts
- **Dependency:** 4.1, 3.3

### 4.3 Admin View *(2 days, Low complexity)*
- [ ] Cross-client metrics (Oopuo internal admin view)
- [ ] Agent management per client
- [ ] Service activation per client
- [ ] Usage/billing tracking
- **Dependency:** 4.2

**Phase 4 Total: ~8 days (2 weeks with buffer)**

---

## Phase 5: Email + Settings + Polish (Weeks 10–12)

### 5.1 Email Module MVP *(4 days, Medium complexity)*
- [ ] Email accounts management (CRUD, forwarding rules)
- [ ] SMTP send via configured provider (Google Workspace initially)
- [ ] Simple inbox view: list received emails (pulled via IMAP or webhook)
- [ ] Reply from platform
- [ ] Email signatures management
- [ ] Thread grouping
- **Dependency:** Phase 1

### 5.2 Settings & Admin *(3 days, Low complexity)*
- [ ] Tenant settings page (timezone, language, branding/logo)
- [ ] Team management UI (invite via Clerk, change roles, remove)
- [ ] API key management (create, list, revoke)
- [ ] Audit log viewer with search and filters
- [ ] Module enable/disable toggles (admin only)
- **Dependency:** Phase 1

### 5.3 Polish & Hardening *(5 days, Medium complexity)*
- [ ] Rate limiting on all endpoints (Redis-backed)
- [ ] Input validation (Zod schemas on all API endpoints)
- [ ] Error boundary components (frontend)
- [ ] Loading states + skeleton screens
- [ ] Empty states with helpful CTAs
- [ ] Keyboard shortcuts
- [ ] Mobile responsiveness audit
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] Security audit: CSRF, XSS, SQL injection review
- [ ] Logging: structured JSON logs, request tracing
- **Dependency:** All phases

**Phase 5 Total: ~12 days (3 weeks with buffer)**

---

## Phase Summary

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| 1: Foundation + Websites | 3 weeks | Edit & publish static sites |
| 2: Blog + Forms | 2 weeks | Content management + lead capture |
| 3: Analytics + Notifications | 2 weeks | Data visibility + real-time alerts |
| 4: AI Support | 2 weeks | Conversation monitoring + escalation |
| 5: Email + Settings + Polish | 3 weeks | Full platform, production-ready |
| **Total** | **~12 weeks** | **Full 8-module platform** |

---

## OSS Integration Strategy

| Component | Approach | Notes |
|-----------|----------|-------|
| **GrapesJS** | npm package, React wrapper | Don't fork — use plugin API for customization |
| **TipTap** | npm package, React component | Extend with custom extensions as needed |
| **Umami** | Docker container, API integration | Keep as separate service, don't embed |
| **Caddy** | Docker container, dynamic config via API | Caddy's API for route management |
| **MinIO** | Docker container, S3 SDK | Standard S3 API — swappable with AWS S3 later |
| **Postal** | Docker container (Phase 5+) | Complex to self-host — defer, use SMTP relay for MVP |
| **shadcn/ui** | Copied components | Full control, no version lock-in |

**Custom-build:** Module loader, tenant middleware, publish pipeline, form handler, notification system, analytics aggregation.

**Do NOT build:** Auth (Clerk), page editor (GrapesJS), text editor (TipTap), analytics collection (Umami), SSL provisioning (Caddy), object storage (MinIO).

---

## Testing Strategy

### Unit Tests (from Day 1)
- **Backend services:** Every service function has unit tests (mock DB)
- **Validation schemas:** Test Zod schemas with valid/invalid data
- **Module loader:** Test enable/disable, dependency resolution

### Integration Tests (from Phase 1)
- **API endpoints:** Test full request → response with test DB (Vitest + supertest)
- **Auth middleware:** Test JWT validation, role enforcement, tenant isolation
- **Publish pipeline:** Test full publish flow with test MinIO

### E2E Tests (from Phase 2)
- **Playwright:** Critical flows — sign in, create site, edit page, publish, view live site
- **Form submission:** Submit form on live site → appears in dashboard

### What to Test First
1. Tenant isolation (highest risk — data leak between tenants is catastrophic)
2. Auth middleware (wrong role shouldn't access endpoints)
3. Publish pipeline (broken publish = broken client sites)
4. Form submission (public endpoint — abuse vector)

### Test Infrastructure
- **Vitest** for unit + integration
- **Playwright** for E2E
- **Test database** via Docker (isolated per test run)
- **GitHub Actions** CI pipeline

---

*Estimates assume single senior developer with AI-assisted coding (Claude Code / Codex agents). Adjust ×1.5 for junior developers.*
