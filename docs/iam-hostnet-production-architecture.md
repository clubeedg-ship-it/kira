# IAM Hostnet Production Architecture

Date: 2026-03-11
Target: `interactivemove.nl` on Hostnet VPS (CentOS 8 + Plesk)
Chosen mode: **Plesk files + PM2 chatbot**
Not chosen: Docker website runtime

## 1. Final production shape

The simplest reliable setup is:

- **Plesk serves the public website files** from the domain document root
- **A Node chat proxy runs as a PM2 service** on the same VPS
- The chat proxy listens on **`127.0.0.1:3860` only**
- Public requests to **`https://interactivemove.nl/api/chat`** are reverse-proxied by the web server stack managed by Plesk to that local PM2 service
- **SSL terminates at Plesk/web server**, not inside Node

This keeps the website static and low-risk, while still allowing the chatbot to work under the same domain.

## 2. Domain flow

### Public website flow

1. Visitor opens `https://interactivemove.nl`
2. DNS points `interactivemove.nl` to the Hostnet VPS public IP
3. Plesk-managed nginx/apache receives the request on **443**
4. TLS/SSL is terminated there
5. Static files are served from the IAM domain docroot

### Chat flow

1. Browser on `https://interactivemove.nl` calls **`/api/chat`**
2. Request reaches Plesk-managed nginx/apache on **443**
3. Plesk reverse-proxies that path to **`http://127.0.0.1:3860/chat`**
4. The PM2-managed Node service handles the request
5. Node talks outbound to OpenRouter
6. Response streams back through the same reverse-proxy path to the browser

Result: from the browser’s point of view, everything stays same-origin under `interactivemove.nl`.

## 3. Public vs private components

### Must be public

- `interactivemove.nl` and `www.interactivemove.nl` on ports **80/443**
- Static website files in the Plesk docroot
- Reverse-proxy path: **`/api/chat`**

### Must NOT be public

- Node chatbot port **3860**
- PM2 internals
- `.env` files
- deployment scripts
- repo metadata
- any admin-only utilities
- shell/SSH access

### Recommended public exposure rule

Only expose:

- **80** for redirect to HTTPS
- **443** for the website and `/api/chat`

Everything else should stay closed from the internet unless explicitly required for administration.

## 4. Static website serving via Plesk docroot

Plesk should be the source of truth for the public site.

Recommended model:

- Domain in Plesk: `interactivemove.nl`
- Website root/docroot: the normal Plesk vhost document root for that domain
- Deploy the built/static site files there
- No Python `http.server`, no ad-hoc extra web server, no Docker container for the website

Operational rule:

- The public site should be served by **one web stack only**: Plesk’s nginx/apache
- Avoid parallel serving paths that caused confusion before

That means the old pattern of serving from a separate folder with `python3 -m http.server` should be considered deprecated and removed from the production plan.

## 5. Chatbot backend as localhost-only Node/PM2 service

The chatbot backend should run as a small Node service under PM2.

Recommended runtime shape:

- App path: separate from docroot, for example under `/var/www/vhosts/...` app area or another operator-owned app folder
- Bind address: **`127.0.0.1`**
- Port: **3860**
- Process manager: **PM2**
- Restart policy: PM2 startup + save enabled so it comes back after reboot
- Secrets: stored in local `.env` or Plesk environment config, never in the public docroot

Why this is the right tradeoff:

- PM2 is simple for a junior operator
- Static website stays independent from Node runtime issues
- If the chatbot fails, the main site still serves
- No container networking complexity

## 6. `/api/chat` reverse-proxy path

Target architecture for the reverse proxy:

- Public path: `https://interactivemove.nl/api/chat`
- Internal upstream: `http://127.0.0.1:3860/chat`

Important rule:

- The browser should never call `:3860` directly
- Only the web server should know the internal port

Reverse-proxy requirements:

- pass `POST /api/chat` to `127.0.0.1:3860/chat`
- support streaming responses if the chat proxy streams SSE/chunks
- keep buffering disabled for streamed responses if needed
- keep request body size modest
- optionally rate-limit `/api/chat` at the web layer in addition to app-layer limiting

This is simpler and safer than the older Docker bridge target like `172.17.0.1:3860`. On this production design, **use localhost, not container bridge networking**.

## 7. SSL termination

SSL should terminate at the Plesk-managed public web server.

So:

- Visitor ↔ Plesk web server: **HTTPS**
- Plesk web server ↔ Node chat proxy on same VPS: **HTTP over localhost**

Why:

- simplest certificate management
- one place to renew and troubleshoot TLS
- no need for Node to hold certificates
- standard Plesk operating model

## 8. Security boundaries

### Boundary A: Internet → Plesk web server

Public entry boundary.

Controls:

- valid SSL certificate
- HTTP → HTTPS redirect
- serve only intended public files
- deny access to hidden files and secrets
- basic header hardening

### Boundary B: Plesk web server → local Node chat proxy

Private internal boundary.

Controls:

- chatbot binds only to `127.0.0.1`
- no firewall/public route to port 3860
- reverse proxy only for `/api/chat`

### Boundary C: Node chat proxy → OpenRouter

Outbound-only application boundary.

Controls:

- API key stored outside docroot
- server-side rate limiting and request validation
- strict payload size and message count limits
- logging without leaking secrets

## 9. Security decisions for launch

### Do this

- Keep website static and public via Plesk only
- Keep chatbot private on localhost only
- Keep secrets outside the docroot
- Use same-origin `/api/chat`
- Close all unnecessary inbound ports
- Make PM2 the only process manager for the chatbot
- Keep deployment paths explicit and documented

### Do not do this

- Do not expose port `3860` publicly
- Do not run the website through Docker for production
- Do not run a second ad-hoc web server like `python -m http.server`
- Do not mix multiple live folders without a clear release path
- Do not keep production values in tracked repo files
- Do not depend on Docker bridge addresses for a non-Docker website deployment

## 10. Operational flow for updates

Keep updates boring.

### Website content/code update flow

1. Update/test site files in the repo workspace
2. Prepare a release copy
3. Upload/sync release files into the Plesk docroot
4. Verify key pages:
   - home
   - product pages
   - contact section
   - blog page
   - legal pages
5. Verify browser console has no major errors
6. Verify `https://interactivemove.nl/api/chat` still works from the frontend

Because the website is static, most updates should not require a web stack restart.

### Chatbot update flow

1. Update chatbot code in its app directory
2. Confirm env/secrets still exist locally
3. Restart or reload with PM2
4. Test local health manually if available
5. Test public path through domain: `/api/chat`

Important operator rule:

- Always test the chatbot through the **public domain path**, not just by curling localhost. That verifies the full chain.

## 11. Rollback strategy

Rollback should be file-based and fast.

### Website rollback

Keep releases as timestamped directories or zipped release bundles.

Recommended pattern:

- `releases/2026-03-11-1/`
- `releases/2026-03-11-2/`
- `current/` or current docroot contents

Simplest Plesk-friendly rollback options:

- keep a copy of the previous known-good docroot before each deploy
- if a deploy breaks the site, restore the previous file set immediately

For a junior operator, the rule is:

- **never deploy without a restorable previous copy**

### Chatbot rollback

- Keep previous chatbot code version available locally
- If a new release fails, switch back to prior code and `pm2 restart`
- If the chatbot is broken but the website is fine, it is acceptable to temporarily disable chat while keeping the static site live

### Emergency degraded mode

If chat breaks in production:

- keep the website online
- either fix the PM2 service quickly or temporarily return a safe error/fallback on `/api/chat`
- do not take down the full site for a chatbot problem

## 12. Recommended production layout

A practical final layout is:

- **Plesk domain**: `interactivemove.nl`
- **Public docroot**: IAM static site files only
- **Private app folder**: chatbot Node app + PM2 ecosystem/env
- **Public web entry**: ports 80/443 only
- **Internal app port**: `127.0.0.1:3860`

## 13. Final recommendation

For IAM on Hostnet, the production architecture should be:

- **Plesk serves the static website directly**
- **PM2 runs the chatbot privately on localhost**
- **Plesk reverse-proxies `/api/chat` to `127.0.0.1:3860/chat`**
- **SSL terminates at Plesk**
- **Only 80/443 are public**
- **Website and chatbot are updated independently**
- **Rollback is based on previous file copy + previous chatbot code version**

This is the cleanest production setup for reliability, simplicity, and junior-operator safety.

## 14. Non-negotiables before go-live

- Remove any old ad-hoc website serving path from the live plan
- Ensure only one real public docroot is active in Plesk
- Ensure chat proxy binds to `127.0.0.1` only
- Ensure `/api/chat` reverse proxy is configured in Plesk, not via a separate shadow web server
- Ensure SSL is valid for `interactivemove.nl`
- Ensure a previous release copy exists before each deploy
