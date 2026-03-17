# IAM chatbot reverse proxy via Plesk/nginx

## Goal

Expose the chatbot on the **same origin** as the website at:

- `https://interactivemove.nl/api/chat`

while the actual chatbot process keeps listening only on:

- `127.0.0.1:3860`

This keeps the browser happy with same-origin requests, avoids CORS complexity, and prevents the chatbot from being directly reachable on a public port.

---

## Recommended architecture

Use this flow:

1. The static website is served normally by Plesk/nginx/Apache.
2. The chatbot runs under **PM2** on the VPS, bound to **localhost only**.
3. nginx, at the domain level, reverse proxies only the path **`/api/chat`** to `http://127.0.0.1:3860`.
4. All other site traffic stays untouched.

So the public sees only:

- `https://interactivemove.nl/api/chat`

and nginx forwards internally to:

- `http://127.0.0.1:3860`

This is the cleanest production setup for **Plesk files + PM2 chatbot**.

---

## Critical security rule

The chatbot service itself should **not** listen on `0.0.0.0:3860`.

It should listen on:

- `127.0.0.1:3860`

or equivalent localhost-only binding.

That means:

- direct internet access to port 3860 is impossible
- only local services on the VPS can reach it
- nginx becomes the only intended public entry point

If the app is Node/Express, that usually means using something like:

```js
app.listen(3860, '127.0.0.1')
```

Do **not** use:

```js
app.listen(3860, '0.0.0.0')
```

unless you have a very specific reason and firewall rules to compensate.

---

## Where to put the nginx config in Plesk

On Plesk, the realistic place is usually the domain's:

- **Apache & nginx Settings**
- **Additional nginx directives**

That is where you add domain-level nginx config snippets.

You are not trying to create a separate vhost manually. You are extending the domain config Plesk already manages.

---

## Reverse proxy concept for `/api/chat`

The clean idea is:

- exact route `/api/chat`
- optionally also `/api/chat/` if your backend uses that style
- proxy requests to `http://127.0.0.1:3860`
- pass through the real host/protocol/client IP headers
- set sane read/connect/send timeouts
- set a sane max request body size

If the chatbot is a single endpoint like `POST /api/chat`, the safest config is to proxy only that path family, not the entire site.

---

## Plesk nginx directives example

Add the following in **Additional nginx directives** for the IAM domain.

```nginx
location = /api/chat {
    proxy_pass http://127.0.0.1:3860/api/chat;

    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;

    proxy_connect_timeout 5s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    send_timeout 60s;

    client_max_body_size 1m;

    proxy_buffering off;
}
```

### If the backend may also use `/api/chat/`

Use this version instead:

```nginx
location ^~ /api/chat {
    proxy_pass http://127.0.0.1:3860;

    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;

    proxy_connect_timeout 5s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    send_timeout 60s;

    client_max_body_size 1m;

    proxy_buffering off;
}
```

## Which variant to choose

Use the **exact-match** version if:

- the frontend only calls exactly `/api/chat`
- the backend endpoint is exactly `/api/chat`
- you want the narrowest possible exposure

Use the **prefix** version if:

- the chatbot also exposes subpaths under `/api/chat/...`
- you might add health or metadata routes under that prefix later

For IAM, if the frontend is fixed to one endpoint, I would choose the **exact-match** version first.

---

## Why `proxy_pass` differs between the two examples

This matters.

### Exact location

```nginx
location = /api/chat {
    proxy_pass http://127.0.0.1:3860/api/chat;
}
```

This is explicit and low-risk.

### Prefix location

```nginx
location ^~ /api/chat {
    proxy_pass http://127.0.0.1:3860;
}
```

This preserves the incoming path more naturally.

Avoid casually mixing trailing slashes in nginx. That is a common source of broken upstream paths.

---

## Proxy headers to keep

These headers are the minimum useful set:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Port $server_port;
```

What they do:

- `Host`: lets the app know the original domain requested
- `X-Real-IP`: original client IP
- `X-Forwarded-For`: full proxy chain
- `X-Forwarded-Proto`: whether the user came via HTTPS
- `X-Forwarded-Host`: original host header
- `X-Forwarded-Port`: original public port

These help with:

- logging
- request auditing
- absolute URL generation if ever needed
- security checks that depend on original scheme/host

---

## Timeout guidance

For chatbot requests, use moderate timeouts.

Recommended starting point:

```nginx
proxy_connect_timeout 5s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
send_timeout 60s;
```

### Why

- `proxy_connect_timeout 5s`:
  - if PM2 app is down or not listening, fail quickly
- `proxy_read_timeout 60s`:
  - enough for slower LLM-backed responses without leaving sockets open forever
- `proxy_send_timeout 60s` and `send_timeout 60s`:
  - sane defaults for request/response handling

### If the chatbot sometimes takes longer

If model calls can take 90-120 seconds, raise only `proxy_read_timeout` first, for example:

```nginx
proxy_read_timeout 120s;
```

Do not jump to extremely high values unless necessary.

---

## Body-size guidance

Most chatbot requests are small JSON payloads.

Recommended starting point:

```nginx
client_max_body_size 1m;
```

That is enough for normal chat payloads and blocks unusually large request bodies.

If the frontend later sends:

- long conversation history
- base64 blobs
- file attachments

then adjust deliberately, for example to `2m` or `5m`. For plain text chat, **1m is usually more than enough**.

---

## Optional rate limiting guidance

For launch, rate limiting is useful but should stay simple.

### Important Plesk caveat

`limit_req_zone` must usually be defined at the `http` context, not inside a `location`. In many Plesk setups, **Additional nginx directives** is not the right scope for declaring a new zone.

So:

- **safe default:** launch without nginx rate limiting and rely on app-level throttling/logging first
- **if server-level nginx config is available outside Plesk domain snippets:** define a zone there, then apply `limit_req` in the domain snippet

### If you do have server-level nginx access

In a server/global nginx context:

```nginx
limit_req_zone $binary_remote_addr zone=iam_chat_limit:10m rate=10r/m;
```

Then in the domain location:

```nginx
limit_req zone=iam_chat_limit burst=20 nodelay;
```

### Practical recommendation

For this IAM deployment:

- start with app-level abuse protection if available
- add nginx rate limiting only if you confirm Plesk allows the required scope cleanly
- avoid fragile Plesk hacks that break on rebuilds or updates

---

## How to keep the chatbot private except through the domain

You want all public traffic to go through `https://interactivemove.nl/api/chat`, and nowhere else.

Use all of these together:

### 1. Bind app to localhost only

Best protection:

- chatbot listens on `127.0.0.1:3860`

### 2. Do not open port 3860 in firewall/security groups

On CentOS 8, if firewalld is in use, do **not** add a public allow rule for 3860.

The intended public ports are only:

- 80
- 443

### 3. Do not publish a separate subdomain directly to PM2

Do not create things like:

- `chat.interactivemove.nl:3860`
- direct panel mapping to public Node port

That defeats the simplicity and safety of same-origin proxying.

### 4. Proxy only the required path

Expose only `/api/chat`, not all localhost routes.

### 5. Optionally add app-side origin/host validation

If the chatbot backend supports it, validate:

- `Host` is `interactivemove.nl` or `www.interactivemove.nl`
- requests are expected JSON POSTs

This is secondary protection, not a substitute for localhost binding.

---

## Verification: prove nginx reaches localhost:3860

Do not declare this done until these checks pass.

## Step 1: verify the PM2 app is listening locally

On the VPS:

```bash
pm2 status
ss -ltnp | grep 3860
```

Expected result:

- PM2 shows the chatbot online
- socket listener is on `127.0.0.1:3860` or `::1:3860`
- **not** on `0.0.0.0:3860`

Good:

```text
LISTEN 0 511 127.0.0.1:3860
```

Less good / public:

```text
LISTEN 0 511 0.0.0.0:3860
```

## Step 2: test the chatbot locally, bypassing nginx

From the VPS itself:

```bash
curl -i http://127.0.0.1:3860/api/chat \
  -H 'Content-Type: application/json' \
  --data '{"message":"ping"}'
```

Expected:

- HTTP response from the chatbot app
- likely `200`, `400`, or application-specific JSON
- any valid app response proves the local service works

If this fails, nginx is not the problem yet.

## Step 3: test through the public domain

From the VPS or another machine:

```bash
curl -i https://interactivemove.nl/api/chat \
  -H 'Content-Type: application/json' \
  --data '{"message":"ping"}'
```

Expected:

- response shape similar to the localhost test
- if localhost works but domain fails, the problem is in nginx/Plesk/proxy config

## Step 4: compare app logs during the request

Watch PM2 logs while sending a request:

```bash
pm2 logs <chatbot-name> --lines 100
```

Then hit:

```bash
curl -i https://interactivemove.nl/api/chat \
  -H 'Content-Type: application/json' \
  --data '{"message":"test via proxy"}'
```

If the app log receives the request when calling the public domain, the reverse proxy path is working.

## Step 5: inspect nginx access/error logs if needed

Typical Plesk-managed logs are under something like:

- `/var/www/vhosts/system/interactivemove.nl/logs/`

Useful commands:

```bash
tail -f /var/www/vhosts/system/interactivemove.nl/logs/proxy_access_log
tail -f /var/www/vhosts/system/interactivemove.nl/logs/proxy_error_log
```

Depending on the Plesk build, filenames can vary slightly, but the vhost system log directory is the first place to check.

---

## Expected request flow

A successful request chain should look like this:

1. Browser sends `POST https://interactivemove.nl/api/chat`
2. Domain nginx location matches `/api/chat`
3. nginx forwards to `http://127.0.0.1:3860/api/chat`
4. PM2 Node app processes request
5. Response goes back through nginx to browser

No CORS setup should be necessary if frontend and endpoint are on the same origin.

---

## Common failure modes in Plesk

These are the realistic ones to expect.

## 1. nginx snippet placed in the wrong domain

Symptom:

- config looks right, but requests never hit the app

Cause:

- directives were added under the wrong subscription/domain, or to `www` assumptions that do not match the actual vhost

Check:

- correct domain in Plesk
- request host matches that domain config

## 2. Plesk/nginx config rebuild overwrote assumptions

Symptom:

- worked briefly, then stopped after a Plesk change/rebuild

Cause:

- manual edits outside supported Plesk locations

Fix:

- keep the custom proxy rule in **Additional nginx directives**, not in ad-hoc hand-edited generated files

## 3. Upstream path mismatch from bad `proxy_pass`

Symptom:

- 404 from the chatbot app
- app logs show wrong route like `/chat` or duplicated `/api/chat/api/chat`

Cause:

- incorrect combination of `location` path and `proxy_pass` URL/trailing slash

Fix:

- use one of the exact known-good patterns from this document
- do not freestyle slash behavior

## 4. Chatbot is only listening on a different interface/port

Symptom:

- `502 Bad Gateway`

Cause:

- PM2 app crashed
- app listening on another port
- app bound to unexpected address

Check:

```bash
pm2 status
ss -ltnp | grep 3860
curl -i http://127.0.0.1:3860/api/chat
```

## 5. Apache/nginx interaction confusion in Plesk

Symptom:

- requests go somewhere unexpected
- location block appears ignored

Cause:

- misunderstanding which layer is serving what in Plesk

Guideline:

- this proxy rule is for **nginx in front**
- keep it domain-level and path-specific
- verify in nginx proxy logs, not only Apache logs

## 6. Request body too large

Symptom:

- `413 Request Entity Too Large`

Fix:

- raise `client_max_body_size` carefully
- do not set it huge by default

## 7. Timeout too short

Symptom:

- `504 Gateway Timeout`
- chatbot works locally but fails on slow generation

Fix:

- increase `proxy_read_timeout` moderately
- confirm the backend is actually just slow, not broken

## 8. HTTPS/proto confusion in app logic

Symptom:

- app generates wrong redirects/URLs or rejects secure requests incorrectly

Fix:

- ensure these headers are passed:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Port $server_port;
```

## 9. Direct public access still possible on port 3860

Symptom:

- `curl http://server-ip:3860/...` works from outside

Cause:

- app bound to `0.0.0.0`
- firewall allows 3860

Fix:

- bind to `127.0.0.1`
- close external access to 3860

---

## Recommended final configuration for IAM

For simplicity and safety, this is the recommended production starting point.

### In the chatbot app

- listen on `127.0.0.1:3860`
- endpoint stays at `/api/chat`
- accept JSON POST only if possible

### In PM2

- keep chatbot process named clearly, for example `iam-chatbot`
- ensure restart on boot is configured

### In Plesk domain nginx directives

Use:

```nginx
location = /api/chat {
    proxy_pass http://127.0.0.1:3860/api/chat;

    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;

    proxy_connect_timeout 5s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    send_timeout 60s;

    client_max_body_size 1m;

    proxy_buffering off;
}
```

### At the firewall/network layer

- allow public access only to 80/443
- do not expose 3860

---

## Post-deploy smoke test checklist

Run these after applying the Plesk config.

```bash
pm2 status
ss -ltnp | grep 3860
curl -i http://127.0.0.1:3860/api/chat -H 'Content-Type: application/json' --data '{"message":"local test"}'
curl -i https://interactivemove.nl/api/chat -H 'Content-Type: application/json' --data '{"message":"public test"}'
```

Success means:

- PM2 process is online
- service listens only on localhost
- localhost test returns app response
- public domain test returns same app response
- PM2 logs show the request arriving

---

## Bottom line

For this Hostnet VPS + CentOS 8 + Plesk deployment, the safest simple production setup is:

- website served normally by Plesk
- chatbot kept on PM2 at `127.0.0.1:3860`
- nginx reverse proxy only for `/api/chat`
- no public exposure of port 3860
- moderate timeouts, small body limit, optional rate limiting later if needed

That gives IAM a same-origin chatbot endpoint without turning the chatbot into a separately exposed service.
