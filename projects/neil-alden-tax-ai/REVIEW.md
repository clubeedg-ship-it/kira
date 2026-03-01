# MSTA Tax AI (ex-Stella) — Professional Code Review

Date: 2026-03-01  
Reviewer stance: CTO pre-deployment review for daily use in a 30-person law firm

## Executive Summary

Current status: **Not production-ready**.

The project has a strong prototype base (functional flow, multi-step intake, opinion generation, admin views), but it contains multiple **P0 blockers** in security and reliability that must be resolved before any real client deployment. The most critical issues are unauthenticated WhatsApp bridge access, path traversal/file exposure, XSS vectors, session/token weaknesses, and missing DB migrations for columns already used in runtime queries.

---

## Scope Reviewed

- Backend: `src/server.js`, all files in `src/`
- Frontend: all HTML/CSS in `ui/` (plus `ui/app.js` because it overlaps runtime behavior)
- Build/test/deployment surface: `package.json`, `playwright.config.js`, `tests/e2e.test.js`, absence of CI/CD config

---

## 1. Code Quality (Architecture, Errors, Security, Performance, Maintainability)

### Architecture & Maintainability

- **Monolithic server design**: `src/server.js` (1149 lines) combines routing, auth, LLM orchestration, storage, admin APIs, file serving, WebSocket proxying, and security controls. This makes testing and safe changes difficult.
- **Frontend logic is heavily inlined** in `ui/index.html:376-1023`, while `ui/app.js` duplicates older behavior (`ui/app.js:1-251`). This increases drift risk.
- **Branding/config drift in code** (suggests weak governance):  
  - `src/pdf-export.js:15,25-27` still references “Neil Alden”  
  - `scripts/security-monitor.js:3,17` still references “Stella Vic’s”  
  - `tests/e2e.test.js:526-533` expects old product/firm strings
- **No local `.gitignore`** in repo root (missing file), increasing accidental commit risk for DBs/logs/runtime artifacts.

### Error Handling

- **Global 500 leaks raw error messages to clients** (`src/server.js:1096-1102`), including parser and DB messages.
- **Body parsing has no size limit** (`src/server.js:460-466`), making memory exhaustion trivial with oversized requests.
- Multiple places swallow exceptions (`catch {}`) without structured logging/context (`src/server.js:94,271,1064-1071,1084-1087`), reducing observability in production.

### Performance

- `src/search.js` loads **all embeddings into memory on every query** (`src/search.js:43-54`) and performs JS-side cosine scoring for all rows.  
- `src/treaty-analyzer.js` performs three sequential semantic searches (`src/treaty-analyzer.js:150-157`), compounding latency.
- Blocking sync FS operations are used inside request path (`src/server.js:451`, plus log rotation at `87-95`), harming throughput under load.

### Functional Correctness

- **Schema mismatch likely breaks fresh deployments**:
  - `users` table creation does **not** include `last_ip`, `last_location`, `last_active` (`src/server.js:127-135`)
  - those columns are read/written at `src/server.js:260,687,940,957,967`  
  Result: runtime SQL errors in clean environments.
- **UI/API contract mismatch in treaty search**:
  - API returns array directly (`src/server.js:735-737`)
  - UI expects `{ results: [...] }` (`ui/index.html:878-879`)  
  Treaty search panel will appear empty.
- **Questionnaire enum drift breaks risk logic**:
  - UI now sends verbose values for `has_substance` (`src/server.js:309-315`)
  - Analyzer still checks old values (`src/treaty-analyzer.js:177,183,215,218,241,252`)  
  Risk/PPT/LOB evaluation can be wrong.

---

## 2. UI/UX Professionalism (HTML/CSS in `ui/`)

Verdict: **Good prototype aesthetics on main page, but not yet enterprise-polished for daily law-firm operations.**

### Strengths

- Main auth and workspace visual identity is coherent (`ui/index.html`, `ui/style.css`).
- Progress indicators, loading spinner, and post-generation actions exist.
- Admin and WhatsApp pages provide operational visibility.

### Gaps for Professional Daily Use

- **Inconsistent language/tone across UI** (Portuguese + English mixed in operational pages):
  - `ui/admin-wa.html:149,161,164,195-199,422,529` etc.
- **Non-professional interaction patterns**: repeated `alert()` usage in primary flows (`ui/index.html:725,765,768,775`).
- **Accessibility issues**:
  - Auth inputs rely on placeholders without explicit labels (`ui/index.html:84-95`)
  - Icon-only buttons lack accessible names/ARIA (`ui/index.html:167,175,350`; `ui/admin.html:203`)
  - Streaming/result areas are not announced to screen readers (no `aria-live` around `ui/index.html:335` updates).
- **External links in new tabs missing `rel="noopener noreferrer"`** (`ui/index.html:257-261`).
- **Mobile admin usability is weak**:
  - wide tables with many columns and no dedicated responsive table strategy (`ui/admin.html:157-177`, CSS only shrinks font at `122-129`).
- **Malformed markup in main app section** around duplicate close tags (`ui/index.html:341-347`).
- **Feature navigation includes placeholders not implemented** (e.g., `saveConfig()` stub at `ui/index.html:898`).

### State Handling (Loading/Error/Empty)

- Main flow has basic loading/error/empty states.
- Admin pages mostly fail silently to console on API errors; user-facing error states are limited (`ui/admin.html` JS catches often without UI fallback).
- Support and WhatsApp flows provide some empty/error states, but operational failures are not consistently recoverable.

---

## 3. Production Readiness (Deployment Reality Check)

### Authentication / Authorization

- Basic user/auth exists with role-based admin checks on `/api/admin/*` (`src/server.js:925-926`).
- However, critical related surfaces are exposed (see P0 security findings below), so current auth boundary is incomplete.

### Rate Limiting / Logging / Monitoring

- In-memory rate limiting and brute-force blocking exists (`src/server.js:21-69`), but:
  - not shared across instances,
  - resets on restart,
  - no central metrics/alerts.
- Logging is local file append only (`src/server.js:71-95`), no structured logging stack, no retention policy, no SIEM integration.

### Data Backup / Recovery

- Core data (`auth.db`, opinions, usage) uses SQLite with WAL (`src/server.js:124-125`) but no backup/restore automation in this code path.
- No recovery runbooks, no migration versioning mechanism, no seed/bootstrap safeguards.

### Multi-User Support

- Per-user data partitioning exists in core opinion routes (`src/server.js:698-723`).
- No tenant/workspace model, no RBAC granularity beyond `user/admin`, no audit trail for privilege changes.

### Configuration Management

- Important values are hardcoded:
  - Port (`src/server.js:17`)
  - Ollama URL/model (`src/search.js:11-12`, `src/embed-corpus.js:13-14`)
- No `.env.example`, no config validation at startup.

### Deployment / CI/CD

- `package.json` has no runnable production scripts (`package.json:6-8` test only, and failing).
- `main` points to missing file (`package.json:5`, no `index.js` present).
- No CI workflows (`.github/workflows` absent).
- Playwright tests exist, but not wired into `npm test` (`tests/e2e.test.js`, `playwright.config.js`).

---

## 4. Security Review (Data Handling, Validation, Secrets, CORS, CSP)

## Critical Findings

1. **Unauthenticated WhatsApp bridge API proxy**
   - `src/server.js:621-637`
   - `/api/wa/*` is proxied before auth enforcement, allowing unauthenticated access to bridge actions/data.

2. **Unauthenticated WebSocket upgrade to WhatsApp bridge**
   - `src/server.js:1111-1143`
   - Any client can connect to `/ws/whatsapp` and interact with bridge lifecycle/events.

3. **Path traversal + arbitrary file read via media route**
   - Guard bypass context: `src/server.js:565-566`
   - Vulnerable path construction: `src/server.js:570-572`
   - File streaming: `src/server.js:576-600`  
   `decodeURIComponent` + `path.join` with no root enforcement allows `../` traversal under `/data/whatsapp/media/...`.

4. **XSS in opinion rendering**
   - Raw markdown-like transform without HTML escaping: `ui/index.html:729-763`
   - Rendered via `innerHTML`: `ui/index.html:714-715,719,838`  
   LLM output can inject executable HTML/JS.

5. **Potential admin-side DOM XSS via inline handlers + insufficient escaping**
   - Escaper does not make values safe for JS string contexts in attributes: `ui/admin.html:229`
   - Untrusted names interpolated in `onclick`: `ui/admin.html:332`
   - Similar pattern in WhatsApp admin session/chat rendering: `ui/admin-wa.html:284,424`

6. **Third-party QR generation leaks WhatsApp pairing data**
   - `ui/index.html:420,500`
   - `ui/connect.html:110`
   - `ui/admin-wa.html:614`  
   QR payloads are sent to external service (`api.qrserver.com`), creating account takeover/privacy risk.

7. **Session/token weaknesses**
   - Token returned in JSON and cookie (`src/server.js:650-653,661-664`)
   - Bearer token accepted (`src/server.js:239-249`)
   - Logout does not revoke server session (`src/server.js:671-674`)
   - Cookie missing `Secure` (`src/server.js:232`)  
   Increases impact of XSS/token leakage.

8. **Hardcoded admin bootstrap by email**
   - `src/server.js:193`  
   Backdoor-like behavior and environment coupling.

9. **No request-size limits**
   - `src/server.js:460-466`  
   Enables trivial DoS by oversized JSON bodies/images.

## Important Findings

- CORS set to wildcard origin (`src/server.js:527`) and permissive methods/headers (`528-529`).
- CSP allows inline script/style (`src/server.js:534`), reducing real XSS protection.
- Geolocation call uses plain HTTP to third-party IP service (`src/server.js:264`) and stores user location/IP without explicit governance.
- No explicit secret validation/fail-fast if `OPENROUTER_API_KEY` is missing (`src/server.js:18`, `src/audit-agent.js:6`).

---

## 5. Prioritized Recommendations

## P0 — Must Fix Before Shipping

1. Lock down WhatsApp surfaces:
   - Require auth + admin role on `/api/wa/*` proxy and `/ws/whatsapp` upgrade path.
   - Block direct public access until authorization is verified.
2. Fix media endpoint traversal:
   - Canonicalize/resolve path and enforce strict root prefix (`data/whatsapp/media`).
   - Reject any `..`, absolute-path escapes, and non-whitelisted extensions.
3. Eliminate XSS vectors:
   - Escape/sanitize model output before rendering (`ui/index.html`).
   - Replace inline `onclick` string interpolation with event listeners + data attributes.
   - Use robust sanitizer (DOMPurify or equivalent) for trusted rich rendering.
4. Remove third-party QR fallback:
   - Generate QR locally only; never send session payloads externally.
5. Fix session security model:
   - Stop returning bearer token to frontend if cookie auth is used.
   - Revoke session in DB on logout.
   - Set cookie flags: `HttpOnly; Secure; SameSite=Strict/Lax (explicit decision)`.
6. Add schema migrations for `users` columns used in runtime.
7. Remove hardcoded admin promotion and replace with controlled bootstrap process.
8. Add request body limits and reject oversized payloads early.

## P1 — Should Fix for Professional Impression

1. Split `src/server.js` into modules (`auth`, `opinions`, `admin`, `llm`, `wa-proxy`, `security`).
2. Fix API/UI contract mismatches (`/api/search` response shape) and questionnaire enum drift (`has_substance` values).
3. Harden headers:
   - strict CORS allowlist
   - CSP without `unsafe-inline` (nonce/hash strategy)
   - add HSTS and Permissions-Policy.
4. Add timeouts/retries/circuit-breakers for OpenRouter/Ollama/IP services.
5. Add startup config validation (`PORT`, API keys, bridge URL) and `.env.example`.
6. Professionalize UI for daily operations:
   - remove `alert()` flows
   - unify language and nomenclature
   - improve admin mobile table UX.
7. Accessibility pass:
   - proper labels, ARIA names, keyboard modal behavior, `aria-live` for streaming result.
8. Standardize branding text across code, PDFs, tests, and docs.

## P2 — Nice to Have (Improves Experience / Ops)

1. Add structured logging + request IDs + centralized monitoring.
2. Add backup/restore jobs for SQLite and retention policies for logs/reports.
3. Add health/readiness endpoints for orchestration.
4. Improve performance of treaty search:
   - pre-index/vector DB strategy or ANN
   - avoid full table scan per request.
5. Strengthen CI/CD:
   - make `npm test` run real tests
   - add lint/type checks
   - add GitHub Actions pipeline with deployment gates.

---

## Overall CTO Verdict

The system is a promising advanced prototype, but it currently carries **material security and operational risk** for law-firm daily production use. Resolve all P0 items first, then complete the P1 hardening pass before client go-live.

