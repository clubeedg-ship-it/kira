# IAM Website QA / Smoke Test / Code Quality Report

Date: 2026-03-11
Project: `/home/adminuser/iam-website`
Scope: site structure, key pages, frontend JS/CSS quality, Hostnet VM smoke test, obvious launch blockers only

## Current state summary

The site is broadly launch-shaped:
- Static HTML site with bilingual HTMX partial loading
- Main shell pages exist for homepage, solutions, legal pages, blog, and product pages
- Docker deployment exists with nginx + Ghost + MySQL
- Homepage has canonical / hreflang / OG tags already
- Cookie consent and HubSpot contact capture are present in code
- Prior critical fixes mentioned in memory (blog HTML, skip links, Instagram SVG, SEO/perf fixes) appear to be in place

What I verified directly:
- Main pages return 200 when served statically: `/index.html`, `/products/interactieve-vloer.html`, `/over-ons.html`, `/prijzen.html`, `/blog.html`
- `blog.html` no longer shows the previously reported duplicated script / malformed structure issue
- `robots.txt` and `sitemap.xml` exist
- nginx config includes security headers, gzip, static caching, Ghost proxy routes, `/contact` redirect, and file blocking rules
- Docker config now points Ghost to `${GHOST_PUBLIC_URL:-https://interactivemove.nl}` and includes `mail__from`

Limitations of this audit:
- Browser tool was unavailable, so this is terminal/code audit + HTTP smoke only, not a full visual pass
- Ghost/API/chat were not fully end-to-end tested behind the real nginx/docker stack in this session

## Practical Hostnet VM smoke test checklist

### 1) Infrastructure / deployment
- [ ] `docker compose up -d` starts nginx, ghost, mysql cleanly
- [ ] `docker compose ps` shows all 3 healthy / running
- [ ] No restart loops in `docker compose logs --tail=200`
- [ ] DNS points to Hostnet VM
- [ ] TLS certificate installed and auto-renewing
- [ ] Production domain resolves to the intended public URL

### 2) Public page reachability
- [ ] Homepage loads: `/`
- [ ] English homepage loads via `/?lang=en`
- [ ] Core pages load: `/over-ons`, `/prijzen`, `/onderwijs`, `/zorg`, `/parken`, `/bouw-een-park`, `/blog`
- [ ] Product pages load: `/products/2in1`, `/products/vloer`, `/products/muur`, `/products/zandbak`, `/products/klimwand`, `/products/mobiel`, `/products/software`, `/products/tekeningen`
- [ ] `/contact` redirects to homepage contact section as intended
- [ ] `robots.txt` and `sitemap.xml` are publicly reachable

### 3) Language / navigation behavior
- [ ] NL/EN toggle works on homepage and at least 2 product pages
- [ ] After language switch, links still point to valid pages
- [ ] Mobile menu opens/closes correctly
- [ ] Dropdown menus work on desktop and mobile
- [ ] Skip link jumps to the content area

### 4) Lead capture / conversion
- [ ] Homepage contact form submits successfully in production
- [ ] Submission creates/updates contact in HubSpot
- [ ] Form success/error states are visible and sane
- [ ] Privacy consent checkbox is required before submit
- [ ] Main CTA mailto/tel links work on mobile
- [ ] Partner page conversion path is intentional and not a dead end

### 5) Blog / Ghost
- [ ] `/ghost/` admin is reachable only for intended admins
- [ ] ` /ghost/api/content/... ` returns published posts
- [ ] Homepage blog carousel loads posts in NL and EN
- [ ] Blog detail page opens posts correctly from carousel / listing
- [ ] Ghost image uploads render through nginx proxy

### 6) Chat widget
- [ ] Chat bubble appears once only
- [ ] `/api/chat` returns working responses in production
- [ ] Failure mode is user-friendly if proxy/model is down
- [ ] Chat does not expose API keys client-side

### 7) Media / performance
- [ ] Hero video plays without layout breakage
- [ ] Product images and videos load on key product pages
- [ ] No obvious 404s in browser network tab for images/video/fonts/JS
- [ ] First load is acceptable on mobile 4G
- [ ] Compression/caching headers are present in production

### 8) Basic SEO / trust
- [ ] Homepage title/description/OG preview render correctly when shared
- [ ] Canonical domain matches final production domain exactly
- [ ] Sitemap includes all intended launch pages
- [ ] Footer company/contact details are consistent everywhere

## Code quality observations

Good:
- Frontend is simple and operable: plain HTML/CSS/JS, low framework risk
- Language switching logic is straightforward and easy to debug
- Cookie consent code is readable and clearly gates GTM loading
- Contact form JS includes basic sanitization, rate limiting, honeypot, and email validation
- nginx config is practical for this stack and already includes useful hardening

Watch-outs:
- `styles.css` is very large and monolithic (5k+ lines). Not a launch blocker, but future edits are brittle.
- `projector.js` and `site.js` overlap in responsibilities for reveal/scroll behavior. Not broken from code read, but there is duplication and higher risk of regressions.
- Heavy use of inline styles across pages makes consistency harder and QA slower.
- The site relies on many page copies + partial copies. That makes content drift and broken-path regressions more likely over time.
- English mode is still client-side swapped after initial NL shell render, so users can get a Dutch-to-English flash on first load.

## Remaining blockers / obvious misses

### Likely blockers before launch
1. **Missing referenced assets on product pages**
   - Missing from repo during this audit:
     - `media/hero_interactieve_klimwand.png`
     - `media/products/interactieve-tekeningen.png`
     - `media/video/interactive-wall.mp4`
   - These are referenced by live page files/partials, so affected pages can ship with broken media.

2. **Missing `algemene-voorwaarden.html`**
   - Legal/footer links reference `algemene-voorwaarden.html`, but the file is not present.
   - If this link is visible in production, it is an obvious broken-link trust issue.

3. **Ghost/blog is still a real dependency to verify, not assume**
   - Static-only test returned 404 for `/ghost/api/content/...`, which is expected outside nginx/docker.
   - Launch still depends on confirming Ghost content API works through the actual Hostnet docker/nginx setup.

4. **Chat widget depends on backend proxy availability**
   - Frontend points to `/api/chat`; server proxy exists in repo (`api/chat-proxy.js`) but was not verified live in this session.
   - If proxy is not running/reachable from nginx, the chat bubble becomes a soft broken feature on launch.

### Nice-to-haves, not blockers
- Bundle/minify frontend JS/CSS later
- Reduce inline styles and shared footer duplication
- Add a proper visual regression pass on mobile before go-live
- Add automated broken-link/media check in CI or pre-deploy script
- Consider server-side language handling later to avoid EN flash

## Bottom line

The site is close, but I would **not call it fully launch-safe yet** until these are checked/fixed:
- missing media files
- missing terms page link target
- Ghost content API working on the real stack
- chat proxy working on the real stack

Once those are confirmed, this is in reasonable shape for a Hostnet VM launch.