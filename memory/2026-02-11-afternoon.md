# 2026-02-11 Afternoon — Kira Product Sprint

## What Happened
Otto tested kira-app (React) at app.zenithcred.com and found it broken. Multiple rounds of fixes:
1. OpenRouter as default provider (was Claude OAuth) — model ID format wrong, fixed
2. Navigation missing — added NavShell sidebar with all pages
3. Onboarding loop trapping users — removed mandatory onboarding
4. useApi hook missing auth header → every page 401 → white screen crash
5. API envelope mismatch (.filter on object) → crash on tab switch
6. Tailwind CSS missing — Vite built from wrong directory, 0 utility classes generated
7. Page refresh losing content — related to CSS/auth issues above

## Otto's Frustration & Decision
- "We might have to begin it from zero" — app looks like a kid toy, everything broken
- Questioned why React instead of simpler HTMX approaches
- Pointed out existing open-source platforms could be forked
- "The hardest part is done" — memory, graph, chat sync, crons, sub-agents all work
- Just needs a skin and a door

## New Direction: Build on Existing Dashboard
- **Stop using kira-app (React monorepo)**
- **Build on ~/kira/dashboard/ (vanilla JS)** — the one that already looks professional
- Server-v2.js at port 3847 via PM2 (`kira-dashboard` process)
- Chat sync daemon at port 3848 via PM2 (`chat-sync` process)
- Public files served from `~/kira/dashboard/public/`
- Source HTML at `~/kira/dashboard/index.html` → must copy to `public/index.html`

## What Was Built (on existing dashboard)
1. **Auth system** — `~/kira/dashboard/auth.js`
   - SQLite system.db at `~/kira/dashboard/data/system.db`
   - Register, login, JWT (15min), refresh tokens (30 days), rate limiting
   - scrypt password hashing, no external deps
   - Otto's account: otto@oopuo.com / test1234 (admin, free-access tier)

2. **Splash page** — `~/kira/dashboard/public/splash.html`
   - Built by sub-agent, 19KB single HTML file
   - Login/signup modals wired to /api/auth/* endpoints
   - Auto-redirect to /dashboard if token exists

3. **Routing** — `/` serves splash (unauth) or dashboard (auth), `/dashboard` always serves dashboard

4. **VDR card grid** — replaced file list with gradient banner cards per file type

5. **Chat collapsible blocks** — thinking/tool_use/tool_result as expandable blocks
   - Updated chat-sync-daemon.js to preserve content blocks from JSONL

## Design v2 Docs
- 19 design docs at `~/kira/design-v2/` covering full product
- Key additions: splash as inline page (not separate site), Stripe billing, free-access tier, email verification

## PM2 Processes
- `kira-dashboard` (id:6) — server-v2.js on port 3847
- `chat-sync` (id:5) — chat-sync-daemon.js on port 3848
- `kira-copilot` (id:1) — Vite dev server on port 3849
- `kira-product` (id:7) — start.js

## Key Learnings
1. **ALWAYS test before telling Otto it works** — verify login→navigate→refresh→still works
2. **Copy index.html to public/index.html** — server serves from public/, not root
3. **Vanilla JS dashboard > React kira-app** — simpler, faster, already professional
4. **PM2 manages all processes** — use `pm2 restart` not manual kill
5. **API returns `items` with `isDir`** not `entries` with `type` — check actual API format
6. **Otto wants enterprise quality** — "more beautiful than Notion", not a toy
