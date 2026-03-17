# Oopuo Ops Platform — Open Questions

*Created: 2026-03-14*

---

## Decisions Needing Otto's Input

### 1. TypeScript Full-Stack vs Python Backend?

**Context:** Existing omiximo-inventory uses FastAPI (Python) + Preact. The ops platform needs heavy JS integration (GrapesJS, TipTap, Umami).

**Recommendation:** TypeScript full-stack (Hono + Next.js). The page builder and editor ecosystem is JS-native. Sharing types between frontend and backend eliminates a class of bugs. The Python pattern works well for data-heavy backends (inventory) but adds friction here.

**Trade-off:** Loses consistency with existing codebases. Team needs to be comfortable with TypeScript backend.

**Need from Otto:** Are you OK with TypeScript backend, or do you strongly want to keep the Python/FastAPI pattern?

---

### 2. Hosting Model: Single VPS vs Multi-VPS?

**Context:** Client sites are static files. The platform itself runs on Docker Compose.

**Options:**
- **A) Single VPS** — Platform + all client sites on one server. Simple. Works until ~50 clients.
- **B) Platform VPS + separate site hosting** — Platform on one VPS, client sites on Cloudflare Pages / S3+CloudFront. Scales better, but more complex.

**Recommendation:** Start with A (single VPS). When approaching limits, move client site serving to Cloudflare Pages (free tier handles unlimited sites). The publish pipeline just needs to push to a different target.

**Need from Otto:** What VPS are you planning to use? Hetzner? Current oopuopu-cloud machine? How many clients in the first 6 months?

---

### 3. Email Module Scope for MVP

**Context:** Full email (send/receive/shared inboxes) requires running Postal, managing MX records, handling deliverability. This is operationally heavy.

**Options:**
- **A) Skip email module for MVP** — Clients use their existing email (Google Workspace). Platform just shows AI support transcripts.
- **B) Send-only MVP** — Platform can send emails (via SMTP relay to existing provider), but no inbox.
- **C) Full Postal deployment** — Complete email solution. 2-3 weeks of extra work + ongoing ops burden.

**Recommendation:** Option A for MVP. Postal deployment in Phase 5 only if clients actively request it. Google Workspace at €6/mo per client domain is simpler and more reliable than self-hosted email.

**Need from Otto:** Do any current or near-term clients need email through the platform, or is this a "nice to have"?

---

### 4. Pricing / Billing Integration Timeline

**Context:** Functional spec mentions Stripe billing as "future." But if clients are onboarding soon, need to charge them somehow.

**Recommendation:** Manual invoicing (Moneybird/Stripe invoices) for first 10 clients. Build Stripe subscription management when it becomes painful (~10+ active clients).

**Need from Otto:** When do you expect the first paying client on the platform? Is manual invoicing OK until then?

---

### 5. White-Label Priority

**Context:** Spec mentions white-label as "future." But if enterprise clients want their own branding on the dashboard, this affects the architecture now (theming system, custom domains for the platform itself).

**Recommendation:** Build the theming hook now (CSS variables, logo slot, configurable brand colors in tenant settings), but don't build multi-domain platform hosting until a client requests it.

**Need from Otto:** Any enterprise client asking for white-label in the near term?

---

### 6. GrapesJS vs Building a Simpler Editor

**Context:** GrapesJS is powerful but complex. For MVP, if clients only need to edit text, images, and links on existing static sites — a simpler "click to edit" approach (contentEditable + save) might ship faster.

**Options:**
- **A) GrapesJS from day one** — Full page builder. More upfront work but more capable.
- **B) Simple click-to-edit first** — Load site in iframe, click elements to edit text/images. Upgrade to GrapesJS later.

**Recommendation:** GrapesJS from day one. The click-to-edit approach seems simpler but leads to architectural dead ends (how do you add new sections? how do you handle responsive?). GrapesJS solves these and the integration cost is front-loaded.

**Need from Otto:** Confirm: go with GrapesJS directly?

---

## Identified Risks

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Tenant data isolation failure** | Catastrophic — client sees another client's data | Row-level security tests, mandatory tenant_id in every query via ORM wrapper, no raw SQL |
| **Publish pipeline breaks client site** | Client's live website goes down | Version snapshots, automatic rollback on failure, staging preview before publish |
| **GrapesJS can't handle imported static sites** | Existing client sites don't load in editor | Spike test early (Week 1) — import oopuo.com into GrapesJS and verify editability |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Self-hosted email deliverability** | Emails land in spam | Use established SMTP relay (Postmark/Mailgun) for sending; self-host only for receiving |
| **Umami can't scale analytics** | Slow dashboards with many sites | Aggregate into local snapshots, don't query Umami in real-time for dashboard |
| **Caddy dynamic config complexity** | Custom domain setup fails | Integration tests for domain flow, fallback to manual Caddyfile updates |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Clerk pricing at scale** | Cost increases with users | Clerk free tier covers initial needs; evaluate alternatives only at 10K+ users |
| **GrapesJS maintenance** | Library abandoned | MIT licensed, fork-ready. Active community. Evaluate yearly. |

---

## Critical Spike: GrapesJS + Static Site Import

Before Phase 1 is complete, run a 2-day spike:

1. Take oopuo.com static files (index.html, css/main.css, js/*)
2. Load into GrapesJS programmatically
3. Verify: can you click and edit text? Change images? Add new sections?
4. Export back to static HTML — does it match?
5. If GrapesJS mangles the output → evaluate alternatives (Craft.js, custom editor)

**This spike de-risks the entire project.** If GrapesJS can't handle existing static sites gracefully, the architecture needs to change.

---

*Update this document as decisions are made. Strike through resolved questions.*
