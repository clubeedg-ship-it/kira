# IAM Ghost/Blog Production Readiness Report

Date: 2026-03-11
Scope: Ghost + blog layer only (`/home/adminuser/iam-website`)

## Current state
- Docker stack exists and is running: `iam-nginx`, `iam-ghost`, `iam-mysql`.
- Nginx syntax is valid (`docker compose exec -T nginx nginx -t` passed).
- Ghost Content API is reachable through nginx and currently returns published posts: `GET /ghost/api/content/posts/?key=...` returns `HTTP 200`.
- Blog frontend is integrated in two places:
  - `blog.html` loads full post list + single-post view from Ghost Content API.
  - `js/blog-carousel.js` loads homepage carousel posts from Ghost Content API.
- Current live Ghost API responses still contain `https://iam.zenithcred.com/...` URLs, which confirms the running Ghost container is still using the old public URL.

## Exact files reviewed
- `/home/adminuser/iam-website/docker-compose.yml`
- `/home/adminuser/iam-website/docker/nginx/nginx.conf`
- `/home/adminuser/iam-website/docker/nginx/default.conf`
- `/home/adminuser/iam-website/.env`
- `/home/adminuser/iam-website/.env.docker`
- `/home/adminuser/iam-website/blog.html`
- `/home/adminuser/iam-website/js/blog-carousel.js`
- `/home/adminuser/iam-website/QA-REPORT.md`
- Repo-wide search for Ghost/blog references via `rg`

## Issues found
1. **Ghost public URL was wrong in repo config**
   - `docker-compose.yml` had `url: https://iam.zenithcred.com`.
   - This is inconsistent with site canonicals, robots, email addresses, and brand domain (`interactivemove.nl`).
   - Impact: Ghost-generated `post.url` values and some links in API payloads point to the wrong domain.

2. **Running Ghost still serves old-domain URLs**
   - Even after fixing the compose file, the live API still returns `https://iam.zenithcred.com/...` URLs.
   - This means the currently running Ghost container has not yet been recreated with the updated env.

3. **CSP allowlist still referenced old Ghost/domain host**
   - `docker/nginx/default.conf` allowed `https://iam.zenithcred.com` in `img-src`.
   - For launch, that should align with `https://interactivemove.nl`.

4. **Blog page history fallback used `blog.html` explicitly**
   - In `blog.html`, `showList()` pushed browser history back to `blog.html` even when the page was accessed via clean route `/blog`.
   - Low risk, but it breaks routing consistency and can cause ugly URL switching.

5. **Content API readiness: technically ready, operationally mixed**
   - Good: public Content API is live and returns posts.
   - Caveat: returned content still includes old-domain URLs in `url` fields and post body links, so launch quality is not clean yet.

6. **Mail from is already configured in repo**
   - `mail__from: noreply@interactivemove.nl` is present in `docker-compose.yml`.
   - The previously reported missing `mail.from` issue appears resolved at repo level.
   - I did not restart Ghost, so I did not verify whether the currently running container already picked this up.

7. **Admin rate limiting is already relaxed in repo**
   - Current nginx config uses `limit_req zone=ghost_admin burst=20 nodelay;`.
   - This is higher than the earlier audit concern (`burst=5`) and should be sufficient for Ghost Admin’s parallel requests.
   - Again: repo config is good; no live reload/recreate was performed by me.

## Changes made
1. **Parameterized Ghost public URL for production**
   - Updated `/home/adminuser/iam-website/docker-compose.yml`
   - Changed:
     - from: `url: https://iam.zenithcred.com`
     - to: `url: ${GHOST_PUBLIC_URL:-https://interactivemove.nl}`
   - Reason: Hostnet-VM-ready, lets deployment override cleanly without editing compose again.

2. **Added Ghost public URL to env files**
   - Updated `/home/adminuser/iam-website/.env`
   - Updated `/home/adminuser/iam-website/.env.docker`
   - Added:
     - `GHOST_PUBLIC_URL=https://interactivemove.nl`

3. **Aligned CSP image allowlist with production domain**
   - Updated `/home/adminuser/iam-website/docker/nginx/default.conf`
   - Replaced `https://iam.zenithcred.com` with `https://interactivemove.nl` in `img-src`.

4. **Fixed blog route history behavior**
   - Updated `/home/adminuser/iam-website/blog.html`
   - `showList()` now returns to `/blog` when the clean route is in use, instead of forcing `blog.html`.

## Verification performed
- `docker compose config` now renders Ghost env with:
  - `url: https://interactivemove.nl`
- `docker compose exec -T nginx nginx -t` passed.
- Live check still shows old Ghost URL in API output:
  - Example returned URL: `https://iam.zenithcred.com/i-dont-know-what-do-to-do-in-my-life/`
- Live Content API endpoint is reachable and returns `HTTP 200`.

## Remaining blockers
1. **Ghost container must be recreated/redeployed**
   - Required so the corrected `GHOST_PUBLIC_URL` actually applies.
   - Until then, Ghost API responses will continue to expose old-domain URLs.

2. **Nginx should be reloaded/redeployed**
   - Required for the updated CSP header to become active in the running container.

3. **Ghost content should be audited for hardcoded old links**
   - Some published post HTML already contains inline links pointing to `https://iam.zenithcred.com/...`.
   - Updating Ghost `url` fixes generated canonical/post URLs, but embedded body links inside post HTML may still need content edits in Ghost Admin or via script.

4. **Final launch check after recreate**
   - Re-test:
     - `/ghost/` admin loads without rate-limit errors
     - `/ghost/api/content/posts/?key=...` returns `https://interactivemove.nl/...` URLs
     - `/blog` and homepage carousel load posts correctly
     - Ghost-uploaded images render under the final domain

## Launch-ready implementation plan
1. Deploy updated repo files to Hostnet VM.
2. Recreate Ghost service so new env is applied.
3. Reload/recreate nginx so updated CSP is active.
4. Re-test Ghost Admin, Content API, `/blog`, and homepage carousel.
5. Audit published Ghost posts for hardcoded `iam.zenithcred.com` links in body HTML and replace them with `interactivemove.nl` where needed.
6. Only after that: treat blog layer as launch-ready.
