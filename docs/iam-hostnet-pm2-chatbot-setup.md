# IAM Hostnet + Plesk production setup: chatbot backend under PM2

This guide covers the **IAM chatbot backend** at:

- `/home/adminuser/projects/iam/website/api/chat-proxy.js`

Target environment:

- **Hostnet VPS**
- **CentOS 8**
- **Plesk-managed website**
- Deployment mode: **Plesk static site files + PM2 chatbot backend**
- **No Docker**

The frontend already expects the chatbot API at:

- `/api/chat`

So the clean production pattern is:

- Plesk serves the website files
- PM2 runs `api/chat-proxy.js`
- The Node process listens on **127.0.0.1:3860 only**
- Plesk/nginx reverse-proxies `/api/chat` to `http://127.0.0.1:3860/chat`

---

## 1) Expected working directory

Use this as the production backend directory:

- `/home/adminuser/projects/iam/website/api`

Why:

- `chat-proxy.js` is there
- `package.json` is there
- `node_modules` is already expected there
- `require('dotenv').config()` will load `.env` from that same folder

Recommended final layout:

- `/home/adminuser/projects/iam/website/` → static website files managed by Plesk
- `/home/adminuser/projects/iam/website/api/` → chatbot backend only
  - `chat-proxy.js`
  - `package.json`
  - `package-lock.json`
  - `node_modules/`
  - `.env` (**not public, not in git**)

---

## 2) Required env vars

The current backend reads these variables:

- `OPENROUTER_API_KEY` → **required**
- `CHAT_PROXY_PORT` → optional, defaults to `3860`
- `CHAT_MODEL` → optional, defaults to `qwen/qwen3.5-35b-a3b`

Recommended production `.env` file:

Path:

- `/home/adminuser/projects/iam/website/api/.env`

Contents:

```env
NODE_ENV=production
CHAT_PROXY_PORT=3860
CHAT_MODEL=qwen/qwen3.5-35b-a3b
OPENROUTER_API_KEY=sk-or-v1-REPLACE_WITH_REAL_KEY
```

Create it with:

```bash
cd /home/adminuser/projects/iam/website/api
nano .env
```

Then lock permissions down:

```bash
chmod 600 /home/adminuser/projects/iam/website/api/.env
```

Notes:

- Keep `OPENROUTER_API_KEY` **server-side only**.
- Do **not** place it in `js/chat-config.js`, HTML, or any frontend bundle.
- Do **not** commit `api/.env` to git.
- `NODE_ENV=production` is not currently required by the code, but it should still be set for production discipline.

---

## 3) Bind address and port strategy

Use:

- **bind address:** `127.0.0.1`
- **port:** `3860`

This is already aligned with the code:

```js
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Chat proxy on :${PORT}`);
});
```

Production rule:

- **Do not expose this service directly to the internet.**
- Let only the local web server talk to it.
- Public traffic should go through the site domain and the reverse proxy path `/api/chat`.

Why localhost-only is correct here:

- reduces attack surface
- keeps OpenRouter usage behind your own origin
- prevents people from hitting the raw port directly
- fits Plesk cleanly

If firewalld is active, there is **no need** to open port `3860` publicly.

Quick check:

```bash
ss -ltnp | grep 3860
```

Expected:

- listening on `127.0.0.1:3860`
- **not** on `0.0.0.0:3860`

---

## 4) Install/update Node dependencies

From the backend directory:

```bash
cd /home/adminuser/projects/iam/website/api
npm install --omit=dev
```

If `npm` is missing on the VPS, install Node first using your preferred supported method for CentOS 8, then verify:

```bash
node -v
npm -v
```

PM2 install:

```bash
npm install -g pm2
pm2 -v
```

---

## 5) PM2 start command

Use this exact start flow:

```bash
cd /home/adminuser/projects/iam/website/api
pm2 start chat-proxy.js \
  --name iam-chat-proxy \
  --cwd /home/adminuser/projects/iam/website/api \
  --time
```

Why this is the right command:

- `--name iam-chat-proxy` gives a stable process name
- `--cwd` ensures `.env` is loaded from the correct directory
- `--time` improves log readability

After start:

```bash
pm2 status
pm2 logs iam-chat-proxy --lines 50
```

Expected startup log line:

- `Chat proxy on :3860`

If you prefer a one-line restart-safe deploy command after code changes:

```bash
cd /home/adminuser/projects/iam/website/api
pm2 start chat-proxy.js --name iam-chat-proxy --cwd /home/adminuser/projects/iam/website/api --time || pm2 restart iam-chat-proxy
```

---

## 6) PM2 save + startup strategy

You want the process to come back after a reboot.

### Save the current PM2 process list

```bash
pm2 save
```

### Generate startup config

Run:

```bash
pm2 startup
```

PM2 will print a command to run as root, something like:

```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u adminuser --hp /home/adminuser
```

Run the exact command PM2 prints.

Then save again:

```bash
pm2 save
```

### Verify after reboot

After a reboot or service restart:

```bash
pm2 status
curl -I http://127.0.0.1:3860/
```

The second command may return `404` or another non-200 response because there is no `/` route. That is fine. The important part is that the process is listening.

Better socket check:

```bash
ss -ltnp | grep 3860
```

---

## 7) Plesk reverse proxy setup

The frontend uses:

- `/api/chat`

So Plesk/nginx should proxy that path to:

- `http://127.0.0.1:3860/chat`

### Recommended nginx additional directives

In Plesk for the IAM domain, add nginx directives equivalent to:

```nginx
location /api/chat {
    proxy_pass http://127.0.0.1:3860/chat;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding on;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
}
```

Why these matter:

- the backend streams SSE-style chunks back to the browser
- buffering should stay off
- longer read timeout avoids cutting off longer answers

After changing Plesk nginx settings, reload/reapply the web config from Plesk.

### Important path mapping detail

Do **not** proxy `/api/chat` to `http://127.0.0.1:3860/api/chat`.

The Node app route is:

- `/chat`

So the correct mapping is:

- public `/api/chat` → backend `/chat`

---

## 8) Logging and monitoring basics

### View live logs

```bash
pm2 logs iam-chat-proxy
```

### View recent logs

```bash
pm2 logs iam-chat-proxy --lines 100
```

### Check process health

```bash
pm2 status
pm2 show iam-chat-proxy
```

### Basic resource monitoring

```bash
pm2 monit
```

What to watch:

- process status stays `online`
- memory use does not climb endlessly
- repeated `Proxy error:` messages
- repeated upstream `502` patterns caused by OpenRouter/API issues

### Log rotation

Install PM2 log rotation:

```bash
pm2 install pm2-logrotate
```

Recommended settings:

```bash
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
```

Then:

```bash
pm2 save
```

This prevents logs from growing forever on a small VPS.

---

## 9) Restart and update workflow

Use this every time the chatbot backend changes.

### Standard update flow

```bash
cd /home/adminuser/projects/iam/website
git pull
cd api
npm install --omit=dev
pm2 restart iam-chat-proxy
pm2 logs iam-chat-proxy --lines 50
```

### If only `.env` changed

```bash
cd /home/adminuser/projects/iam/website/api
pm2 restart iam-chat-proxy --update-env
```

Use `--update-env` whenever environment variables changed.

### If PM2 process does not exist yet

```bash
cd /home/adminuser/projects/iam/website/api
pm2 start chat-proxy.js --name iam-chat-proxy --cwd /home/adminuser/projects/iam/website/api --time
pm2 save
```

### If dependencies get corrupted

```bash
cd /home/adminuser/projects/iam/website/api
rm -rf node_modules
npm install --omit=dev
pm2 restart iam-chat-proxy
```

Only do that when needed.

---

## 10) Sanity test commands

Run these in order.

### A. Confirm env file exists

```bash
cd /home/adminuser/projects/iam/website/api
ls -la .env
```

### B. Confirm process starts

```bash
cd /home/adminuser/projects/iam/website/api
pm2 start chat-proxy.js --name iam-chat-proxy --cwd /home/adminuser/projects/iam/website/api --time
pm2 status
```

### C. Confirm local port is listening

```bash
ss -ltnp | grep 3860
```

Expected:

- `127.0.0.1:3860`

### D. Test the backend directly on localhost

```bash
curl -N -X POST http://127.0.0.1:3860/chat \
  -H 'Content-Type: application/json' \
  --data '{"messages":[{"role":"user","content":"Geef een korte testreactie."}]}'
```

Expected:

- streamed response chunks from OpenRouter
- no browser-exposed API key

If the key is missing or invalid, check:

```bash
pm2 logs iam-chat-proxy --lines 100
```

### E. Test the public domain path through Plesk

```bash
curl -N -X POST https://interactivemove.nl/api/chat \
  -H 'Content-Type: application/json' \
  --data '{"messages":[{"role":"user","content":"Geef een korte testreactie."}]}'
```

If this fails but localhost works, the problem is in the **Plesk/nginx reverse proxy layer**, not PM2.

### F. Confirm the frontend path matches

The frontend config currently points to:

```js
window.IAM_CHAT_CONFIG = {
  apiUrl: '/api/chat'
};
```

So if the browser widget fails while the direct public curl succeeds, inspect browser console/network next.

---

## 11) Security notes

Non-negotiable rules:

- **OpenRouter key stays server-side only**
- backend listens on **127.0.0.1 only**
- port `3860` is **not** publicly exposed
- `.env` is **not** committed
- file permissions on `.env` should be restrictive

### Good security posture for this setup

- Plesk serves the public website
- Node backend is private behind localhost
- Reverse proxy exposes only `/api/chat`
- Rate limiting is already enabled in code
- CORS is restricted to `interactivemove.nl`

### Current code security notes

The current backend already does a few correct things:

- requires `OPENROUTER_API_KEY`
- rate-limits `/chat`
- validates message array shape
- binds to `127.0.0.1`
- keeps `HTTP-Referer` and `X-Title` server-side

### One practical caveat

Current CORS config is:

```js
app.use(cors({ origin: /interactivemove\.nl$/ }));
```

That is broadly fine for production, but if you later add:

- `www.interactivemove.nl`
- staging domains
- preview domains

then confirm those origins still match, or tighten the rule to an explicit allowlist.

### Optional hardening worth considering later

Not required for launch, but sensible:

- add a simple `/health` endpoint for monitoring
- add `helmet` for conservative HTTP headers on the Node side
- set a stricter request body/message limit if abuse appears
- whitelist only exact origins instead of regex if domain usage stabilizes

---

## 12) Recommended one-time production setup block

If starting from a clean VPS state, this is the practical sequence:

```bash
cd /home/adminuser/projects/iam/website/api
npm install --omit=dev
npm install -g pm2

cat > /home/adminuser/projects/iam/website/api/.env <<'EOF'
NODE_ENV=production
CHAT_PROXY_PORT=3860
CHAT_MODEL=qwen/qwen3.5-35b-a3b
OPENROUTER_API_KEY=sk-or-v1-REPLACE_WITH_REAL_KEY
EOF

chmod 600 /home/adminuser/projects/iam/website/api/.env

pm2 start chat-proxy.js \
  --name iam-chat-proxy \
  --cwd /home/adminuser/projects/iam/website/api \
  --time

pm2 save
pm2 startup
```

Then run the exact `pm2 startup` command it prints.

After that:

```bash
pm2 save
pm2 status
ss -ltnp | grep 3860
```

---

## 13) Recommended operational summary

Use this as the final production standard:

- **Working directory:** `/home/adminuser/projects/iam/website/api`
- **PM2 app name:** `iam-chat-proxy`
- **Bind:** `127.0.0.1`
- **Port:** `3860`
- **Public URL path:** `https://interactivemove.nl/api/chat`
- **Backend route:** `/chat`
- **Env file:** `/home/adminuser/projects/iam/website/api/.env`
- **Secret location:** server only, never frontend

Core commands:

```bash
cd /home/adminuser/projects/iam/website/api
pm2 start chat-proxy.js --name iam-chat-proxy --cwd /home/adminuser/projects/iam/website/api --time
pm2 restart iam-chat-proxy --update-env
pm2 logs iam-chat-proxy --lines 100
pm2 save
pm2 startup
```

That is the simplest production-safe setup for **Hostnet VPS + Plesk + static IAM site + PM2 chatbot backend** without introducing Docker or unnecessary moving parts.
