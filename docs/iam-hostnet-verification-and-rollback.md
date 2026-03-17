# IAM Hostnet deployment verification + rollback checklist

Date: 2026-03-11
Target: `interactivemove.nl` on Hostnet VPS (CentOS 8 + Plesk)
Mode: **Plesk files + PM2 chatbot**

This is the rollout checklist for the chosen production shape:
- static website files served by **Plesk** from the real domain docroot
- chatbot backend served by **PM2** on `127.0.0.1:3860`
- Plesk reverse proxy exposes **`/api/chat`** to the public and forwards it to the local PM2 app

This checklist is optimized for **fast diagnosis during deployment**.
It assumes **no fake health endpoint**. Every check below uses real files, real routes, real logs, and user-visible behavior.

---

## 0) Golden rule before touching production

Do not start deployment until these three things are written down in the rollout notes:

- **current live docroot path** in Plesk
- **current chatbot app path** used by PM2
- **current rollback source** for both website files and chatbot files

Reason:
The biggest realistic failure on this project is not code quality. It is deploying the right files into the **wrong folder**, or restarting PM2 from the **wrong working directory**.

---

## 1) Pre-deploy checks

### A. Confirm the real live paths

- [ ] In Plesk, confirm the domain is the real production domain: `interactivemove.nl`
- [ ] Confirm the **actual document root** for the IAM domain in Plesk
- [ ] Confirm the website is being served by **Plesk/nginx/apache only**
- [ ] Confirm there is **no shadow runtime** serving old files:
  - no `python3 -m http.server`
  - no old ad-hoc web server
  - no second folder being served outside the Plesk docroot
- [ ] Write down the exact docroot path before deploy
- [ ] Write down the exact chatbot app path before deploy, expected to be something like:
  - `/home/adminuser/projects/iam/website/api`

### B. Snapshot the current live state

- [ ] Create a timestamped backup copy of the current **website docroot**
- [ ] Create a timestamped backup copy of the current **chatbot app folder** or at minimum:
  - `chat-proxy.js`
  - `package.json`
  - `package-lock.json`
  - PM2 ecosystem/start command notes
- [ ] Save current Plesk nginx additional directives for the domain
- [ ] Save current PM2 state:
  - `pm2 status`
  - `pm2 show iam-chat-proxy`
  - `pm2 logs iam-chat-proxy --lines 100`
- [ ] Save current listening socket check:
  - `ss -ltnp | grep 3860`

### C. Verify release contents before upload

- [ ] Release bundle includes the expected updated HTML/CSS/JS/media files
- [ ] Release bundle is checked against the intended source branch/folder, not an old rescue copy
- [ ] `index.html` in the release has the expected latest timestamp/content markers
- [ ] Product pages, blog page, legal pages, and contact flow files are present
- [ ] If chat frontend changed, confirm it still points to **`/api/chat`** and not a hardcoded host/port
- [ ] Confirm no secrets are inside public website files
- [ ] Confirm `api/.env` is **not** inside the public docroot sync payload

### D. Verify chatbot runtime prerequisites

- [ ] In chatbot app folder, verify `.env` exists
- [ ] Confirm `OPENROUTER_API_KEY` is present in `api/.env`
- [ ] Confirm `CHAT_PROXY_PORT=3860` or default behavior is acceptable
- [ ] Confirm Node modules are installed in the chatbot app folder
- [ ] Confirm PM2 app name to use during rollout: `iam-chat-proxy`
- [ ] Confirm PM2 `cwd` points to the real chatbot folder, not an older copy
- [ ] Confirm expected bind behavior is localhost-only:
  - app should listen on `127.0.0.1:3860`
  - not on `0.0.0.0:3860`

### E. Verify proxy assumptions before deploy

- [ ] Confirm Plesk/nginx proxy rule exists for **public** `/api/chat`
- [ ] Confirm its **internal upstream** matches the current backend route
- [ ] For this project, be explicit about route mapping before rollout:
  - either public `/api/chat` -> backend `/chat`
  - or public `/api/chat` -> backend `/api/chat`
- [ ] Do not assume old Docker-era proxy paths are still valid
- [ ] If you see `172.17.0.1:3860`, confirm whether that is still intentional; for the chosen Hostnet mode, prefer `127.0.0.1:3860`
- [ ] Save the exact nginx snippet used in Plesk before changing anything

### F. Baseline live behavior before deploy

Run this and keep the output:

- [ ] Open the live homepage and note current version markers
- [ ] Open one product page
- [ ] Open blog index
- [ ] Open one legal page
- [ ] Open contact section/page
- [ ] Open browser devtools console and note whether there are existing errors already
- [ ] Send one real chat message from the live site and save:
  - browser result
  - network status for `/api/chat`
  - PM2 log lines around the request

This baseline matters because it stops false blame after deployment.

---

## 2) Post-file-deploy checks

These checks happen immediately after syncing website files into the Plesk docroot.

### A. Confirm the new files actually landed in the live docroot

- [ ] Check that the updated files are in the **real** Plesk docroot, not only in the repo workspace
- [ ] Verify `index.html` in docroot matches the release copy
- [ ] Verify one changed product page file matches the release copy
- [ ] Verify at least one changed JS file in docroot matches the release copy
- [ ] Verify media paths used by homepage/product pages exist in docroot

### B. Confirm static site is serving the new release

- [ ] Hard refresh homepage in browser
- [ ] View source and verify expected new content is present
- [ ] Check that old/stale text from previous versions is gone
- [ ] Check one known recently fixed issue does not reappear:
  - broken media paths
  - wrong CTA targets
  - old brand spelling/state
  - older pre-resync homepage content

### C. Quick content/path smoke test

- [ ] Homepage loads fully
- [ ] Main navigation works
- [ ] Language switch works on homepage
- [ ] One NL page and one EN page load correctly
- [ ] Contact CTA scrolls or routes correctly
- [ ] Blog page opens without obvious JS/render failure
- [ ] Legal pages open
- [ ] No obvious 404s on critical CSS/JS/media assets in network tab

### D. Browser console check

- [ ] Open devtools console on homepage
- [ ] Confirm no fatal JS errors
- [ ] Open one product page and repeat
- [ ] Open blog page and repeat

Fast triage rule:
- If HTML is live but styling/scripts look old or broken, suspect **wrong docroot** or **partial file sync** before anything else.

---

## 3) Chatbot backend checks

Do these on the VPS after website file deploy and before declaring success.

### A. PM2 process status

- [ ] `pm2 status` shows `iam-chat-proxy` as **online**
- [ ] `pm2 show iam-chat-proxy` confirms:
  - correct script
  - correct `cwd`
  - no restart loop
- [ ] Restart count is not climbing during idle time

### B. Startup log sanity

- [ ] `pm2 logs iam-chat-proxy --lines 100` shows expected startup line
- [ ] No `OPENROUTER_API_KEY env var required` error
- [ ] No `Cannot find module` error
- [ ] No `EADDRINUSE` port conflict error
- [ ] No immediate crash after boot

### C. Socket check

- [ ] `ss -ltnp | grep 3860` shows the process listening
- [ ] It is bound to `127.0.0.1:3860`
- [ ] It is **not** bound to public `0.0.0.0:3860`

### D. Local backend request check

Send a real request to the backend route that PM2 actually serves.

- [ ] Local POST to `http://127.0.0.1:3860/chat` returns an application response or stream
- [ ] If local `/chat` fails, test `/api/chat` only if the code was changed to use that route
- [ ] While sending the request, confirm a matching request appears in PM2 logs

Diagnosis rule:
- If PM2 is online but local curl fails, the problem is in the **Node app / env / runtime**, not Plesk.

---

## 4) `/api/chat` proxy checks

This verifies the full chain: browser -> Plesk -> PM2 -> OpenRouter -> response.

### A. Public route test from server and/or external browser

- [ ] Send a POST to `https://interactivemove.nl/api/chat`
- [ ] Confirm the response is not a generic 404/403/502 from nginx
- [ ] Confirm the request reaches PM2 logs
- [ ] Confirm the public route behavior matches the local backend route behavior

### B. Proxy mapping check

If local backend works but public `/api/chat` fails:

- [ ] Inspect Plesk nginx additional directives
- [ ] Verify the proxy target path is correct
- [ ] Verify there is no duplicated path issue such as:
  - `/api/chat` -> `/api/chat` when backend expects `/chat`
  - `/api/chat` -> `/chat` when backend expects `/api/chat`
- [ ] Verify proxy still points to `127.0.0.1:3860`, not stale Docker bridge config unless intentionally retained
- [ ] Reapply/reload Plesk config after changes

### C. Streaming behavior check

- [ ] Confirm frontend chat request does not hang forever without bytes arriving
- [ ] Confirm proxy does not buffer or cut off streamed response prematurely
- [ ] Confirm slow model responses do not immediately produce gateway timeout

Diagnosis rule:
- If localhost works but public path fails, this is almost always **proxy configuration**, not model/runtime.

---

## 5) Final browser / user-path checks

This is the minimum path before saying deploy is good.

### A. Website path

- [ ] Open homepage on desktop
- [ ] Open homepage on mobile viewport
- [ ] Navigate to one product page
- [ ] Navigate to contact section/page
- [ ] Navigate to blog index
- [ ] Open one legal page
- [ ] Switch language once and verify the page still functions

### B. Lead-path checks

- [ ] Main CTA works
- [ ] Contact CTA works
- [ ] No CTA routes to dead `mailto:` behavior unless intentionally kept
- [ ] Social links open correctly

### C. Chat path

- [ ] Open the chat widget on the live site
- [ ] Send one short normal question in Dutch or English
- [ ] Confirm visible assistant response arrives
- [ ] Confirm no browser console/network error remains after response
- [ ] Confirm repeated second prompt also works

### D. Final “looks live” check

- [ ] New homepage visuals/content are present
- [ ] No obviously old version appears from cache/wrong folder
- [ ] No missing hero media or broken product media
- [ ] No fatal layout break on mobile nav or key sections

---

## 6) Common failure signatures and fastest likely cause

### 1. Site still shows old version after deploy

Likely causes:
- wrong Plesk docroot updated
- files synced to repo/workspace but not live docroot
- another shadow web server is serving old files
- browser cache/CDN cache masking the change

First checks:
- inspect actual Plesk docroot
- compare live `index.html` vs release `index.html`
- verify there is no `python http.server` or alternate serving path

### 2. Homepage loads but CSS/JS/media broken

Likely causes:
- partial file sync
- missing assets in docroot
- wrong relative paths
- bad release bundle contents

First checks:
- network tab for 404s
- docroot asset existence
- compare release media folders vs live folders

### 3. Chat widget opens but never answers

Likely causes:
- PM2 process down
- PM2 process started in wrong folder, so `.env` not loaded
- missing `OPENROUTER_API_KEY`
- proxy path mismatch
- upstream OpenRouter failure

First checks:
- `pm2 status`
- `pm2 show iam-chat-proxy`
- `pm2 logs iam-chat-proxy --lines 100`
- local curl to `127.0.0.1:3860/...`
- public curl to `/api/chat`

### 4. Public `/api/chat` returns 502

Likely causes:
- PM2 app not listening
- proxy target wrong
- backend crashed on start
- Plesk points to stale address/path

First checks:
- socket on `127.0.0.1:3860`
- PM2 logs
- Plesk directives

### 5. Public `/api/chat` returns 404

Likely causes:
- proxy target path wrong
- route mismatch (`/api/chat` vs `/chat`)
- Plesk snippet not applied to the right domain/vhost

First checks:
- exact proxy_pass target
- exact route implemented by `chat-proxy.js`
- Plesk domain config scope

### 6. PM2 process restarts immediately

Likely causes:
- missing env file
- missing dependency/module
- syntax/runtime error in new code
- port already in use

First checks:
- `pm2 logs iam-chat-proxy --lines 100`
- `pm2 show iam-chat-proxy`
- `ss -ltnp | grep 3860`

### 7. Local backend works but website chat fails

Likely cause:
- Plesk reverse proxy misconfiguration

First checks:
- public curl to `/api/chat`
- Plesk/nginx logs for the domain
- verify request appears in PM2 logs or not

### 8. Chatbot responds with 500 or upstream error

Likely causes:
- invalid OpenRouter key
- upstream outage/rate limit
- malformed request payload from frontend

First checks:
- PM2 logs around request time
- inspect browser payload and response
- validate `api/.env`

---

## 7) Rollback steps — website files

Use website rollback if the static site itself is wrong, incomplete, or serving the wrong release.

### Trigger conditions

Rollback website files if any of these happen:
- homepage or nav is visibly broken
- critical CSS/JS/media assets 404
- wrong release appears in production
- key lead/contact path is broken
- legal/product/blog pages fail in a way that blocks launch confidence

### Website rollback procedure

- [ ] Stop making further content edits mid-incident
- [ ] Identify the last known-good docroot backup
- [ ] Confirm backup path before restoring
- [ ] Replace current docroot contents with the last known-good copy
- [ ] Verify `index.html` and one product page now match the rollback copy
- [ ] Hard refresh browser and verify homepage/product/contact/blog/legal path again
- [ ] Record exact rollback timestamp and backup source used

### Important rollback rule

If the chatbot is the only failing component, do **not** roll back the whole website unless the frontend itself was changed badly.

---

## 8) Rollback steps — chatbot / PM2 changes

Use chatbot rollback if the site is fine but chat is failing.

### Trigger conditions

Rollback chatbot changes if:
- PM2 process crashes after deploy
- local backend test fails after code/env change
- public `/api/chat` worked before and broke after chatbot update
- env/runtime mistake cannot be fixed in a few minutes

### Chatbot rollback procedure

- [ ] Restore previous chatbot app files from the last known-good backup
- [ ] Restore previous `.env` if it was changed and the old one was known-good
- [ ] Reinstall dependencies only if needed for the restored version
- [ ] Restart/reload PM2 using the restored app directory
- [ ] Verify PM2 is online and stable
- [ ] Verify local request to `127.0.0.1:3860/...`
- [ ] Verify public request to `https://interactivemove.nl/api/chat`
- [ ] Test one browser chat from the live site

### Proxy rollback procedure

If the break came from Plesk proxy edits:
- [ ] Restore the previous saved Plesk nginx directives
- [ ] Reapply/reload Plesk config
- [ ] Retest public `/api/chat`

### Safe fallback if chat cannot be fixed fast

If website files are healthy but chatbot remains broken:
- [ ] keep the static site live
- [ ] temporarily disable/hide the chat widget if possible
- [ ] do not take down the full site for a chatbot-only incident

That is the correct business decision here.

---

## 9) What to capture in logs during rollout

Capture these **during** rollout, not later after context is lost.

### A. Deployment metadata

- [ ] date/time of deploy start and end
- [ ] operator name
- [ ] release source path / branch / commit if available
- [ ] real Plesk docroot path used
- [ ] real chatbot app path used

### B. Website evidence

- [ ] list of files synced to docroot
- [ ] checksum or timestamp proof for `index.html` and one changed page
- [ ] screenshots of homepage before/after if possible
- [ ] browser console errors, if any
- [ ] network 404/500 entries on critical assets, if any

### C. PM2 evidence

- [ ] `pm2 status`
- [ ] `pm2 show iam-chat-proxy`
- [ ] `pm2 logs iam-chat-proxy --lines 100` before and after restart
- [ ] restart count before and after deploy
- [ ] socket output for port `3860`

### D. Proxy evidence

- [ ] exact Plesk nginx directive snippet used for `/api/chat`
- [ ] result of local backend curl
- [ ] result of public `/api/chat` curl
- [ ] domain/nginx error log lines if proxy fails

### E. User-path evidence

- [ ] homepage result
- [ ] one product page result
- [ ] contact flow result
- [ ] blog result
- [ ] one successful live chat request with timestamp

### F. If there is a failure

For any failure, capture all four in one block:
- [ ] exact step that failed
- [ ] exact visible symptom
- [ ] exact HTTP status / log line
- [ ] whether localhost test passed or failed

That last point is the fastest divider:
- localhost fail = app/runtime/env problem
- localhost pass + public fail = proxy/Plesk problem
- files present but browser old = docroot/serving path problem

---

## 10) Fast triage order during incident

When something breaks, do checks in this order:

1. **Are we serving the right folder?**
   - Plesk docroot
   - no shadow web server
2. **Did the new files actually land?**
   - `index.html`, changed page, changed asset
3. **Is PM2 online and stable?**
   - `pm2 status`, logs, restart count
4. **Does localhost backend work?**
   - curl local backend route
5. **Does public `/api/chat` work?**
   - curl public domain route
6. **Does the browser user path work?**
   - homepage -> CTA -> chat

This order avoids wasting time debugging OpenRouter or JS when the real issue is just wrong folder / stale runtime / missing proxy.

---

## 11) Launch pass criteria

Do not call deployment successful until all of these are true:

- [ ] Plesk is serving the intended new website files from the real docroot
- [ ] no shadow server is serving an older copy
- [ ] PM2 chatbot is online, stable, and listening on `127.0.0.1:3860`
- [ ] public `https://interactivemove.nl/api/chat` works through the real proxy chain
- [ ] homepage, one product page, contact path, blog, and legal page all load correctly
- [ ] chat widget completes at least one real user-visible response from the live site
- [ ] rollback sources for website and chatbot remain available

If any one of those is false, deployment is still in-progress, not complete.
