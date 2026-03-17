# IAM config / secrets audit report

Date: 2026-03-11 UTC
Repo audited: `/home/adminuser/iam-website`
Scope: env files, Docker/Ghost deploy config, nginx config, git hygiene, tracked secret exposure

## Current state

- Runtime secret files exist locally and are **not tracked**:
  - `/home/adminuser/iam-website/.env`
  - `/home/adminuser/iam-website/.env.docker`
  - `/home/adminuser/iam-website/api/.env`
- Tracked deploy/config files include:
  - `/home/adminuser/iam-website/docker-compose.yml`
  - `/home/adminuser/iam-website/docker/nginx/default.conf`
  - `/home/adminuser/iam-website/docker/nginx/nginx.conf`
  - `/home/adminuser/iam-website/.gitignore`
- Docker stack is:
  - `nginx` serving the static site and reverse-proxying Ghost/admin/content API
  - `ghost` with MySQL backend
  - `mysql` with credentials sourced from env vars
- Chat proxy reads `OPENROUTER_API_KEY` from `api/.env` and listens on `127.0.0.1:3860`.
- Nginx forwards `/api/chat` to host address `172.17.0.1:3860`.
- Git working tree already had unrelated modified files before/alongside this audit:
  - `blog.html`
  - `word-partner.html`
  - `partials/word-partner-en.html`
  - `partials/word-partner-nl.html`

## Tracked secret / config risks found

### 1) Real credentials were hardcoded in tracked helper scripts
Found in:
- `/home/adminuser/iam-website/tools/fix-blog-posts.py`
- `/home/adminuser/iam-website/tools/fix-blog-posts-v2.py`

Risk:
- Ghost Admin API credentials and Ghost content API key were embedded directly in git-tracked files.
- Even if these are only dev/helper scripts, they are still secret exposure and should be treated as compromised once committed.

### 2) Env file usage is safe locally but a bit ambiguous
- `.env` is the file Docker Compose will use by default.
- `.env.docker` exists but `docker-compose.yml` does **not** explicitly reference it.

Risk:
- Operators may update `.env.docker` and assume Compose is using it when it is not.
- This can lead to deploying with stale credentials or wrong settings.

### 3) Production URL/domain assumptions need explicit verification before Hostnet launch
In `docker-compose.yml`:
- Ghost `url` is set from a fixed value already present in the file.

Risk:
- If this does not exactly match the public production URL and final HTTPS setup, Ghost links/admin behavior/canonical URLs can be wrong.

### 4) Nginx is still using a local/default host name
In `docker/nginx/default.conf`:
- `server_name localhost;`

Risk:
- Functional behind a simple default vhost, but not production-clean for a public VM/domain.
- Better to set the actual hostname(s) used on Hostnet.

### 5) Ghost admin is exposed through nginx
In `docker/nginx/default.conf`:
- `/ghost/` is publicly proxied.

Risk:
- This may be intentional, but for production it increases attack surface.
- At minimum it should rely on strong Ghost credentials, patched images, and network/firewall hygiene.
- Better if access is restricted by IP, extra auth layer, or at least hidden behind strict operational controls.

### 6) CSP is usable but not hardened
In `docker/nginx/default.conf`:
- CSP still includes `'unsafe-inline'` and `'unsafe-eval'` for scripts.

Risk:
- This weakens XSS resistance.
- Not a launch blocker if the site depends on current inline scripts, but it is not ideal for production hardening.

### 7) Chat proxy dependency is host-coupled
In `docker/nginx/default.conf`:
- `/api/chat` proxies to `http://172.17.0.1:3860/chat`

Risk:
- This assumes a host-level Node process reachable from the container bridge.
- On a fresh Hostnet VM, chat will fail unless that process is installed, started, and bound correctly.
- It also creates one more moving part outside Compose.

## Changes made

### 1) Removed tracked hardcoded secrets from helper scripts
Updated:
- `/home/adminuser/iam-website/tools/fix-blog-posts.py`
- `/home/adminuser/iam-website/tools/fix-blog-posts-v2.py`

What changed:
- Scripts now read credentials from environment variables instead of embedding values.
- Added explicit startup failure if required vars are missing.

Variables now expected:
- `GHOST_URL` (optional, defaults to local URL)
- `GHOST_ADMIN_KEY_ID`
- `GHOST_ADMIN_KEY_SECRET`
- `GHOST_CONTENT_API_KEY` (only for `fix-blog-posts.py`)

### 2) Added safe example env files
Created:
- `/home/adminuser/iam-website/.env.example`
- `/home/adminuser/iam-website/.env.docker.example`
- `/home/adminuser/iam-website/api/.env.example`

Purpose:
- Makes required variables visible without exposing live values.
- Gives a clean handoff path for Hostnet/local setup.

### 3) Slightly tightened ignore rules for local env variants
Updated:
- `/home/adminuser/iam-website/.gitignore`

Added ignore coverage for:
- `.env.local`
- `.env.*.local`

## Exact follow-up actions needed before production deploy

1. **Rotate Ghost credentials that were previously committed**
   - Regenerate the Ghost Admin API key material.
   - Replace any Ghost content API key that was present in tracked history.
   - Update local secret files with the rotated values.

2. **Decide on one canonical Docker env file**
   - EITHER use `.env` for Compose and stop using `.env.docker`
   - OR update deployment commands/docs to explicitly pass `--env-file .env.docker`
   - Do not keep both in ambiguous use.

3. **Set the final production hostname everywhere relevant**
   - Verify Ghost `url` in `docker-compose.yml`
   - Replace nginx `server_name localhost;` with the real domain(s)
   - Confirm DNS and reverse-proxy/TLS setup match that hostname exactly

4. **Decide whether Ghost admin must be public**
   - If yes: use strong admin credentials, keep Ghost updated, and consider IP restriction or extra auth
   - If no: restrict `/ghost/` at nginx or network level before launch

5. **Verify chat proxy deployment path on the Hostnet VM**
   - Ensure the Node chat proxy is installed and running on the VM
   - Ensure it binds only to loopback or another non-public interface
   - Confirm nginx can reach it from the container via the chosen address
   - If you want simpler ops, consider moving the chat proxy into Compose instead of relying on `172.17.0.1`

6. **Review CSP after launch prep**
   - Remove `'unsafe-eval'` if not needed
   - Reduce `'unsafe-inline'` over time, ideally via nonce/hash-based policy

7. **Protect secret files on the VM**
   - Store only real values in:
     - `/home/adminuser/iam-website/.env` (or chosen compose env file)
     - `/home/adminuser/iam-website/api/.env`
   - File permissions should be restricted to the deploy user/root.

## Verification

Post-change checks performed:
- Confirmed `.env`, `.env.docker`, and `api/.env` remain untracked.
- Confirmed no hardcoded Ghost/OpenRouter credential assignments remain in tracked `tools/` or `api/` code from the patterns checked.
- Confirmed git now shows only these config-hygiene changes from this audit:
  - `.gitignore`
  - `tools/fix-blog-posts.py`
  - `tools/fix-blog-posts-v2.py`
  - `.env.example`
  - `.env.docker.example`
  - `api/.env.example`
- Also noted unrelated pre-existing modified content files remain in working tree and were not touched by this audit.
