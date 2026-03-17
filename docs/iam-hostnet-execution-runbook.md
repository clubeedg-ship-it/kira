# IAM Hostnet execution runbook

Date: 2026-03-11  
Target: `interactivemove.nl` on Hostnet VPS (`CentOS 8 + Plesk`)  
Chosen deployment mode: **Plesk files + PM2 chatbot**  
Do not use: **Docker for the website runtime**

---

## 1. Purpose

This is the operator runbook for deploying the IAM website to the Hostnet VPS.

Production shape:

- **Plesk serves the public website files** from the domain document root
- **PM2 runs the chatbot backend** as a localhost-only Node process
- **Plesk reverse-proxies `/api/chat`** to `http://127.0.0.1:3860/chat`
- **SSL terminates in Plesk**

If you follow this runbook in order, you should end with:

- `https://interactivemove.nl` serving the new static site
- `https://interactivemove.nl/api/chat` working through Plesk
- chatbot backend running under PM2 and restarting after reboot

---

## 2. Before you touch production

### 2.1 Required access

You need all of the following before starting:

- SSH access to the Hostnet VPS
- a Plesk login with permission to manage `interactivemove.nl`
- the final IAM website release files on your local machine or repo workspace
- the chatbot backend files:
  - `api/chat-proxy.js`
  - `api/package.json`
  - `api/package-lock.json` if present
- the real `OPENROUTER_API_KEY`
- confirmation of the production domain:
  - `interactivemove.nl`
  - `www.interactivemove.nl`

### 2.2 Tools expected on the VPS

Verify these exist:

```bash
node -v
npm -v
pm2 -v
```

If `pm2` is missing:

```bash
npm install -g pm2
pm2 -v
```

### 2.3 Architecture rules

Do not deviate from these rules during deployment:

- Website is served by **Plesk only**
- Chatbot listens on **`127.0.0.1:3860` only**
- Do **not** expose port `3860` publicly
- Do **not** put `.env` files in the public docroot
- Do **not** run `python -m http.server` or another extra web server for the site
- Do **not** leave old and new website versions mixed in the same folder

---

## 3. Deployment variables to fill in first

Before starting, fill these values in your notes:

- **Domain:** `interactivemove.nl`
- **Plesk domain:** `interactivemove.nl`
- **Website docroot:** `____________________`
- **Backend app folder:** `/home/adminuser/projects/iam/website/api`
- **Chatbot port:** `3860`
- **Public chatbot URL:** `https://interactivemove.nl/api/chat`
- **Internal chatbot URL:** `http://127.0.0.1:3860/chat`
- **Release source folder on your machine:** `____________________`

### 3.1 Find the real Plesk docroot

In Plesk, open the domain `interactivemove.nl` and note the document root.

If you are checking from shell, common Plesk paths look like one of these:

- `/var/www/vhosts/interactivemove.nl/httpdocs`
- `/var/www/vhosts/<system-name>/httpdocs`

If unsure, verify in the Plesk UI first. Do **not** guess.

---

## 4. High-level order of operations

Follow this order exactly:

1. Confirm prerequisites
2. Back up the current website files
3. Prepare the release files
4. Upload website files to the Plesk docroot
5. Smoke test the static site
6. Place chatbot backend files outside the public docroot
7. Create the backend `.env` file safely
8. Install backend dependencies
9. Start chatbot with PM2
10. Smoke test chatbot locally on the server
11. Add Plesk reverse proxy for `/api/chat`
12. Smoke test through the public domain
13. Run final go-live checks

Do not configure the proxy before the PM2 process is confirmed working locally.

---

## 5. Stage 1 — Pre-flight checks

### 5.1 SSH into the VPS

```bash
ssh adminuser@YOUR_HOSTNET_VPS_IP
```

### 5.2 Confirm DNS and domain intent

You are deploying the public site for:

- `interactivemove.nl`
- `www.interactivemove.nl`

### 5.3 Confirm no shadow website process is serving old files

Run:

```bash
ps aux | grep -E "http.server|python3 -m http.server|serve" | grep -v grep
```

Expected:

- no production website process serving the site outside Plesk

If you find an old ad-hoc web server, stop and report it before continuing.

### 5.4 Confirm chatbot port is not already occupied unexpectedly

```bash
ss -ltnp | grep 3860
```

Expected before setup:

- nothing listening, or only the known IAM chatbot if you are updating an existing deployment

### 5.5 Smoke test for this stage

Checklist:

- [ ] SSH works
- [ ] Plesk access confirmed
- [ ] Correct docroot identified
- [ ] No rogue website server found
- [ ] Port `3860` state understood

---

## 6. Stage 2 — Back up the current live site

Do this before uploading anything.

### 6.1 Create a timestamped backup folder

Replace `<DOCROOT>` with the real Plesk docroot.

```bash
export DOCROOT="<DOCROOT>"
export BACKUP_BASE="/home/adminuser/backups/iam"
export TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_BASE"
cp -a "$DOCROOT" "$BACKUP_BASE/httpdocs-$TS"
```

### 6.2 Verify the backup exists

```bash
ls -lah "$BACKUP_BASE"
```

Expected:

- a new backup folder with the timestamp

### 6.3 Smoke test for this stage

- [ ] Backup folder created
- [ ] Backup folder contains the previous live files
- [ ] You know where to restore from if rollback is needed

---

## 7. Stage 3 — Prepare website release files

The goal here is to upload a **clean release**, not a messy working folder.

### 7.1 Prepare the release folder on your local machine or repo workspace

The release folder should contain only public website files, for example:

- `index.html`
- page `.html` files
- `css/`
- `js/`
- `media/`
- `partials/` if needed by the site at runtime
- favicon and manifest assets

It must **not** contain:

- `.git/`
- `.env`
- `api/.env`
- `node_modules/`
- local notes
- backup folders
- unrelated scripts

### 7.2 Quick local sanity check before upload

Confirm these exist in the release copy:

- homepage
- product pages
- contact page or contact section
- blog page
- legal pages
- all referenced media assets

### 7.3 Optional cleanup check

From the release folder, run something like:

```bash
find . -maxdepth 2 \( -name ".git" -o -name ".env" -o -name "node_modules" \)
```

Expected:

- nothing that should be excluded from the public upload

### 7.4 Smoke test for this stage

- [ ] Release folder is clean
- [ ] No secrets inside the release folder
- [ ] All expected public assets are present

---

## 8. Stage 4 — Upload/deploy website files to the Plesk docroot

Use either Plesk File Manager or `rsync` over SSH/SFTP. `rsync` is preferred because it is repeatable.

### 8.1 Recommended: upload to a temporary release folder first

On the server:

```bash
mkdir -p /home/adminuser/releases/iam-site-$TS
```

From your local machine, sync the release into that temporary folder first:

```bash
rsync -av --delete /path/to/iam-release/ adminuser@YOUR_HOSTNET_VPS_IP:/home/adminuser/releases/iam-site-$TS/
```

### 8.2 Review the uploaded release on the server

```bash
ls -lah /home/adminuser/releases/iam-site-$TS
```

### 8.3 Sync the approved release into the Plesk docroot

```bash
rsync -av --delete /home/adminuser/releases/iam-site-$TS/ "$DOCROOT"/
```

If you are using Plesk File Manager instead:

- upload the clean release contents, not the parent folder
- make sure `index.html` ends up directly in the docroot
- confirm old removed files are also cleaned up

### 8.4 Confirm ownership and readability if needed

If the files uploaded under the wrong owner or permissions, fix them according to the Plesk/domain user model. If unsure, use the same owner/group pattern already present in the docroot.

### 8.5 Smoke test for this stage

From a browser:

- open `https://interactivemove.nl`
- hard refresh
- check a few internal links

From shell:

```bash
curl -I https://interactivemove.nl
```

Expected:

- HTTP `200`
- homepage loads
- CSS, JS, and media assets load

Operator checklist:

- [ ] Homepage works
- [ ] Main navigation works
- [ ] Product pages load
- [ ] Contact section/page loads
- [ ] Blog page loads
- [ ] Legal pages load
- [ ] No obvious broken images

---

## 9. Stage 5 — Place chatbot backend files

The backend must be outside the public website docroot.

### 9.1 Create or verify the backend app folder

```bash
mkdir -p /home/adminuser/projects/iam/website/api
```

### 9.2 Place these backend files there

Required files:

- `/home/adminuser/projects/iam/website/api/chat-proxy.js`
- `/home/adminuser/projects/iam/website/api/package.json`
- `/home/adminuser/projects/iam/website/api/package-lock.json` if present

Upload them with `rsync`, `scp`, SFTP, or Plesk file tools.

Example with `rsync` from local machine:

```bash
rsync -av /path/to/repo/api/ adminuser@YOUR_HOSTNET_VPS_IP:/home/adminuser/projects/iam/website/api/
```

### 9.3 Verify the backend folder contents

```bash
ls -lah /home/adminuser/projects/iam/website/api
```

Expected:

- `chat-proxy.js`
- `package.json`
- backend-only files
- no public website-only clutter

### 9.4 Smoke test for this stage

- [ ] Backend folder exists
- [ ] `chat-proxy.js` exists
- [ ] `package.json` exists
- [ ] Backend is outside the public docroot

---

## 10. Stage 6 — Create the backend `.env` file safely

This step matters. Do not paste secrets into chat, notes, or tracked files.

### 10.1 Create the `.env` file on the server

```bash
cd /home/adminuser/projects/iam/website/api
nano .env
```

Use this template:

```env
NODE_ENV=production
CHAT_PROXY_PORT=3860
CHAT_MODEL=qwen/qwen3.5-35b-a3b
OPENROUTER_API_KEY=REPLACE_WITH_REAL_KEY
```

### 10.2 Lock down permissions immediately

```bash
chmod 600 /home/adminuser/projects/iam/website/api/.env
```

### 10.3 Verify permissions

```bash
ls -lah /home/adminuser/projects/iam/website/api/.env
```

Expected:

- only the deploy/operator user should be able to read it

### 10.4 Rules for this file

- keep it **server-side only**
- never place it under the public docroot
- never commit it to git
- never put the API key in frontend files such as `js/chat-config.js`

### 10.5 Smoke test for this stage

- [ ] `.env` exists
- [ ] `OPENROUTER_API_KEY` is present
- [ ] permissions are `600` or equally restrictive
- [ ] `.env` is outside public web root

---

## 11. Stage 7 — Install backend dependencies

### 11.1 Install production dependencies

```bash
cd /home/adminuser/projects/iam/website/api
npm install --omit=dev
```

### 11.2 Verify install finished without error

Check for:

- no missing package fatal errors
- `node_modules/` created

```bash
ls -lah /home/adminuser/projects/iam/website/api
```

### 11.3 Smoke test for this stage

- [ ] `npm install` completed successfully
- [ ] `node_modules` exists
- [ ] no missing dependency errors

---

## 12. Stage 8 — Start chatbot with PM2

Do not configure public proxying yet. First confirm the backend runs locally.

### 12.1 Start or restart the chatbot process

```bash
cd /home/adminuser/projects/iam/website/api
pm2 start chat-proxy.js \
  --name iam-chat-proxy \
  --cwd /home/adminuser/projects/iam/website/api \
  --time
```

If the process already exists:

```bash
pm2 restart iam-chat-proxy
```

### 12.2 Check PM2 status

```bash
pm2 status
pm2 logs iam-chat-proxy --lines 50
```

Expected:

- status shows `online`
- startup log indicates the proxy is listening on port `3860`

### 12.3 Verify it is bound to localhost only

```bash
ss -ltnp | grep 3860
```

Expected:

- `127.0.0.1:3860`
- **not** `0.0.0.0:3860`

### 12.4 Save PM2 state and enable startup on reboot

```bash
pm2 save
pm2 startup
```

PM2 will print a command to run, usually with `sudo`. Copy and run the exact command PM2 gives you.

Then save again:

```bash
pm2 save
```

### 12.5 Smoke test for this stage

- [ ] PM2 process exists
- [ ] PM2 process is `online`
- [ ] backend listens on `127.0.0.1:3860`
- [ ] PM2 startup configured

---

## 13. Stage 9 — Test chatbot locally before exposing it through Plesk

This is the dependency-order check.

**Correct order:**

1. backend files in place
2. `.env` created
3. dependencies installed
4. PM2 process online
5. local curl test passes
6. only then configure Plesk reverse proxy

### 13.1 Local HTTP check

If there is no `/` route, a `404` on `/` is acceptable. The important thing is the process is reachable.

```bash
curl -i http://127.0.0.1:3860/
```

### 13.2 Local chatbot endpoint check

Use the endpoint the Node app actually exposes:

```bash
curl -N -X POST http://127.0.0.1:3860/chat \
  -H 'Content-Type: application/json' \
  --data '{"message":"Hello from local smoke test"}'
```

Expected:

- connection succeeds
- backend responds without crashing
- PM2 logs do not show fatal errors

If this fails, **stop here**. Do not touch the Plesk proxy yet.

### 13.3 Smoke test for this stage

- [ ] `curl` to localhost reaches the service
- [ ] POST to `/chat` responds
- [ ] PM2 logs remain healthy

---

## 14. Stage 10 — Configure Plesk reverse proxy for `/api/chat`

Only do this after the localhost test passes.

### 14.1 Open Plesk

Go to the domain:

- `interactivemove.nl`

Find:

- **Apache & nginx Settings**
- or the area that contains **Additional nginx directives**

### 14.2 Add the reverse proxy config

Use this mapping:

- public path: `/api/chat`
- internal path: `http://127.0.0.1:3860/chat`

Recommended snippet:

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

### 14.3 Important mapping rule

Do **not** point `/api/chat` to `/api/chat` on the Node side unless the backend code actually uses that route.

For this deployment, the intended mapping is:

- `/api/chat` → `http://127.0.0.1:3860/chat`

### 14.4 Apply the config

Save the Plesk settings and let Plesk rebuild/reload the web config.

### 14.5 Smoke test for this stage

After saving, check:

```bash
curl -i https://interactivemove.nl/api/chat \
  -H 'Content-Type: application/json' \
  --data '{"message":"public proxy test"}'
```

Expected:

- request reaches the backend through the public domain
- no `502 Bad Gateway`
- no `404` caused by wrong proxy path mapping

If localhost works but public domain fails, the fault is in the Plesk/nginx proxy layer.

---

## 15. Stage 11 — End-to-end smoke tests after deployment

Run these in order.

### 15.1 Static website smoke tests

Open these pages manually in a browser:

- homepage
- one product page
- blog page
- contact page or contact section
- privacy page
- terms page

Check:

- page loads
- layout is correct
- images load
- no obvious missing CSS/JS
- no broken language switching if applicable

### 15.2 Browser console check

On the homepage and one product page:

- open browser dev tools
- confirm there are no major red console errors

### 15.3 Chatbot smoke test from browser

From the live website:

- open the chatbot UI
- send a short test message
- confirm the response returns
- confirm the frontend is calling `/api/chat`, not `:3860`

### 15.4 Public HTTP checks from shell

```bash
curl -I https://interactivemove.nl
curl -I https://www.interactivemove.nl
```

Expected:

- valid HTTPS
- successful response on the intended hostname(s)

### 15.5 PM2 health check

```bash
pm2 status
pm2 logs iam-chat-proxy --lines 100
```

Check:

- process is still `online`
- no crash loop
- no repeated proxy/auth failures

### 15.6 Local port exposure check

```bash
ss -ltnp | grep 3860
```

Expected:

- still only `127.0.0.1:3860`

---

## 16. Final go-live checklist

Do not call the deployment complete until every item below is true.

### 16.1 Website

- [ ] `https://interactivemove.nl` serves the new site
- [ ] `www.interactivemove.nl` behavior is correct
- [ ] homepage loads cleanly
- [ ] main navigation works
- [ ] product pages work
- [ ] contact path works
- [ ] blog page works
- [ ] legal pages are reachable
- [ ] no obvious broken media

### 16.2 Chatbot

- [ ] PM2 process `iam-chat-proxy` is online
- [ ] chatbot binds only to `127.0.0.1:3860`
- [ ] `.env` exists outside docroot
- [ ] `.env` permissions are restricted
- [ ] localhost POST to `/chat` works
- [ ] public POST to `/api/chat` works
- [ ] chatbot works from the frontend UI

### 16.3 Plesk / proxy / SSL

- [ ] reverse proxy is configured in Plesk, not via ad-hoc manual hacks
- [ ] `/api/chat` proxies to `127.0.0.1:3860/chat`
- [ ] SSL certificate is valid
- [ ] HTTP to HTTPS behavior is correct

### 16.4 Operations / rollback

- [ ] previous site backup exists
- [ ] operator knows rollback path
- [ ] PM2 startup is saved
- [ ] logs can be viewed with PM2

---

## 17. Rollback procedure

If the new website breaks badly but the server itself is fine:

### 17.1 Restore the previous website files

```bash
rsync -av --delete "$BACKUP_BASE/httpdocs-$TS/" "$DOCROOT"/
```

### 17.2 If chatbot changes caused the issue

You have two safe rollback options:

- restore the previous backend files into `/home/adminuser/projects/iam/website/api`
- or stop the bad release and restart the previous known-good PM2 process/files

Then:

```bash
pm2 restart iam-chat-proxy
pm2 logs iam-chat-proxy --lines 50
```

### 17.3 Verify rollback

- homepage loads again
- chat path behavior is understood
- no active crash loop remains

---

## 18. Troubleshooting quick guide

### Problem: homepage loads, but styles/images are broken

Likely cause:

- bad upload path
- files synced into wrong folder level
- missing assets in release package

Check:

- `index.html` is directly in docroot
- `media/`, `css/`, and `js/` exist in docroot

### Problem: PM2 process will not start

Check:

```bash
pm2 logs iam-chat-proxy --lines 100
node -v
npm -v
cat /home/adminuser/projects/iam/website/api/package.json
```

Likely causes:

- missing dependency
- syntax/runtime error
- bad `.env`

### Problem: localhost works, but public `/api/chat` fails

Likely cause:

- wrong Plesk proxy rule
- wrong internal path mapping
- proxy config not applied

Check:

- `/api/chat` must proxy to `http://127.0.0.1:3860/chat`
- Plesk settings were saved and re-applied
- vhost logs under a path like:
  - `/var/www/vhosts/system/interactivemove.nl/logs/`

### Problem: public chatbot returns `502 Bad Gateway`

Likely cause:

- PM2 process down
- backend listening on wrong address/port
- Plesk cannot reach localhost target

Check:

```bash
pm2 status
ss -ltnp | grep 3860
curl -N -X POST http://127.0.0.1:3860/chat -H 'Content-Type: application/json' --data '{"message":"debug test"}'
```

### Problem: chatbot works briefly, then stops after reboot

Likely cause:

- `pm2 startup` not completed
- `pm2 save` not run after process creation

Check:

```bash
pm2 status
pm2 save
pm2 startup
```

---

## 19. Operator sign-off block

Fill this in after deployment.

- **Operator:** ____________________
- **Date/time started:** ____________________
- **Date/time completed:** ____________________
- **Plesk docroot used:** ____________________
- **Backend folder used:** `/home/adminuser/projects/iam/website/api`
- **Backup folder created:** ____________________
- **PM2 process name:** `iam-chat-proxy`
- **Final result:** Success / Rolled back / Partial
- **Notes:** ____________________

---

## 20. Definition of done

This deployment is done only when:

- the static site is live through Plesk
- the chatbot works through `https://interactivemove.nl/api/chat`
- the backend is private on localhost only
- PM2 restores the chatbot after reboot
- a backup of the previous release exists

That is the production-safe target for **Hostnet VPS + CentOS 8 + Plesk + Plesk files + PM2 chatbot**.