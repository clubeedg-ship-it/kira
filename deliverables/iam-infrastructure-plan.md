# InterActiveMove Infrastructure Plan

> **Domain:** interactivemove.nl  
> **Server:** Ubuntu 24.04 LTS (Noble Numbat)  
> **Stack:** Static HTMX site + Ghost CMS (headless) + Nginx + Docker  
> **Ghost version:** 6.x (latest stable, currently 6.5.3)  
> **Date:** 2026-02-27  

---

## 1. Ghost CMS Setup Plan

### 1.1 Why Docker (Recommended)

Ghost 6.0+ officially supports Docker Compose as the primary installation method (becoming default in Ghost 7.0). Docker is already installed on this server (Docker 29.2.1, Compose v5.0.2). Benefits:

- **Isolation** — Ghost + MySQL in their own containers, no system pollution
- **Reproducibility** — `docker compose up` on any machine
- **Easy upgrades** — Change image tag, restart
- **Backup simplicity** — Volume snapshots

### 1.2 Ghost in Headless Mode

Ghost will run as a **private, API-only CMS**:

- Set `"privacy": { "useRpcPing": false, "useUpdateCheck": false }` in Ghost config
- The Ghost frontend (themes) is irrelevant — we only use the **Content API**
- Ghost Admin panel (`/ghost/`) is available only for editors to write posts
- Restrict Ghost Admin access via Nginx (IP allowlist or VPN)

### 1.3 Content API Integration

Ghost provides a **Content API** (read-only, public) with a Content API key:

```
GET https://interactivemove.nl/ghost/api/content/posts/?key=CONTENT_API_KEY&limit=10&include=tags,authors
```

**Response:** JSON with posts (title, html, excerpt, feature_image, published_at, etc.)

### 1.4 Sample Blog Page

Save as `blog.html` in the static site root:

```html
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog — InterActiveMove</title>
    <link rel="stylesheet" href="/styles.css">
    <script src="https://unpkg.com/htmx.org@2.0.4"></script>
    <style>
        .blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 2rem; padding: 2rem; }
        .blog-card { border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; transition: box-shadow 0.2s; }
        .blog-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .blog-card img { width: 100%; height: 200px; object-fit: cover; }
        .blog-card-body { padding: 1.5rem; }
        .blog-card-body h2 { margin: 0 0 0.5rem; font-size: 1.25rem; }
        .blog-card-body p { color: #666; font-size: 0.9rem; }
        .blog-card-body time { color: #999; font-size: 0.8rem; }
        .blog-post-content { max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.8; }
    </style>
</head>
<body>
    <!-- Include your site header/nav partial here -->
    
    <main>
        <h1 style="text-align:center; padding: 2rem;">Blog</h1>
        <div id="blog-grid" class="blog-grid">
            <p style="text-align:center; grid-column: 1/-1;">Laden...</p>
        </div>
    </main>

    <script>
    const GHOST_API_URL = '/ghost/api/content';
    const GHOST_API_KEY = 'YOUR_CONTENT_API_KEY_HERE'; // Replace after Ghost setup

    async function loadPosts() {
        try {
            const res = await fetch(`${GHOST_API_URL}/posts/?key=${GHOST_API_KEY}&limit=12&include=tags,authors&fields=id,title,slug,excerpt,feature_image,published_at`);
            const data = await res.json();
            const grid = document.getElementById('blog-grid');
            
            if (!data.posts || data.posts.length === 0) {
                grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;">Nog geen berichten.</p>';
                return;
            }

            grid.innerHTML = data.posts.map(post => `
                <article class="blog-card">
                    ${post.feature_image ? `<img src="${post.feature_image}" alt="${post.title}" loading="lazy">` : ''}
                    <div class="blog-card-body">
                        <time datetime="${post.published_at}">${new Date(post.published_at).toLocaleDateString('nl-NL', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                        <h2><a href="/blog-post.html?slug=${post.slug}">${post.title}</a></h2>
                        <p>${post.excerpt || ''}</p>
                    </div>
                </article>
            `).join('');
        } catch (err) {
            console.error('Blog load error:', err);
            document.getElementById('blog-grid').innerHTML = '<p style="grid-column:1/-1;text-align:center;color:red;">Kon blog niet laden.</p>';
        }
    }
    
    loadPosts();
    </script>
</body>
</html>
```

**Single post page** (`blog-post.html`):

```html
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog Post — InterActiveMove</title>
    <link rel="stylesheet" href="/styles.css">
    <script src="https://unpkg.com/htmx.org@2.0.4"></script>
</head>
<body>
    <main class="blog-post-content" id="post-content">
        <p>Laden...</p>
    </main>

    <script>
    const GHOST_API_URL = '/ghost/api/content';
    const GHOST_API_KEY = 'YOUR_CONTENT_API_KEY_HERE';
    const slug = new URLSearchParams(window.location.search).get('slug');

    if (slug) {
        fetch(`${GHOST_API_URL}/posts/slug/${slug}/?key=${GHOST_API_KEY}&include=authors`)
            .then(r => r.json())
            .then(data => {
                const post = data.posts[0];
                document.title = `${post.title} — InterActiveMove`;
                document.getElementById('post-content').innerHTML = `
                    <a href="/blog.html">← Terug naar blog</a>
                    <h1>${post.title}</h1>
                    <time>${new Date(post.published_at).toLocaleDateString('nl-NL', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                    <div>${post.html}</div>
                `;
            })
            .catch(() => {
                document.getElementById('post-content').innerHTML = '<p>Post niet gevonden.</p>';
            });
    }
    </script>
</body>
</html>
```

---

## 2. Docker / Containerization Plan

### 2.1 Architecture

```
                    ┌─────────────────────┐
    Internet ──────▶│  Nginx (port 80/443)│
                    │  - Static files     │
                    │  - Reverse proxy    │
                    │    /ghost/ → Ghost  │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │  Ghost CMS (:2368)  │
                    │  (headless/API)     │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │  MySQL 8 (:3306)    │
                    │  (internal only)    │
                    └─────────────────────┘
```

### 2.2 docker-compose.yml

Save in `~/iam-website/docker-compose.yml`:

```yaml
version: "3.9"

services:
  nginx:
    image: nginx:1.27-alpine
    container_name: iam-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./:/usr/share/nginx/html:ro
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - ./docker/nginx/security-headers.conf:/etc/nginx/snippets/security-headers.conf:ro
      - certbot-webroot:/var/www/certbot:ro
      - certbot-certs:/etc/letsencrypt:ro
    depends_on:
      - ghost
    networks:
      - iam-net

  ghost:
    image: ghost:6-alpine
    container_name: iam-ghost
    restart: unless-stopped
    environment:
      NODE_ENV: production
      url: https://interactivemove.nl
      database__client: mysql
      database__connection__host: mysql
      database__connection__port: 3306
      database__connection__user: ghost
      database__connection__password: ${GHOST_DB_PASSWORD}
      database__connection__database: ghost
      privacy__useRpcPing: "false"
      privacy__useUpdateCheck: "false"
    volumes:
      - ghost-content:/var/lib/ghost/content
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - iam-net
    # Not exposed to host — only accessible via nginx

  mysql:
    image: mysql:8.0
    container_name: iam-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ghost
      MYSQL_USER: ghost
      MYSQL_PASSWORD: ${GHOST_DB_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - iam-net

  certbot:
    image: certbot/certbot:latest
    container_name: iam-certbot
    volumes:
      - certbot-webroot:/var/www/certbot
      - certbot-certs:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do sleep 12h & wait $${!}; certbot renew --webroot -w /var/www/certbot --quiet; done'"

volumes:
  ghost-content:
  mysql-data:
  certbot-webroot:
  certbot-certs:

networks:
  iam-net:
    driver: bridge
```

### 2.3 Environment File

Save as `~/iam-website/.env`:

```bash
GHOST_DB_PASSWORD=CHANGE_ME_strong_random_password_here
MYSQL_ROOT_PASSWORD=CHANGE_ME_another_strong_password
```

**Generate passwords:**
```bash
openssl rand -base64 32  # Run twice, one for each
```

### 2.4 Nginx Configuration

Save as `~/iam-website/docker/nginx/default.conf`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name interactivemove.nl www.interactivemove.nl;

    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name interactivemove.nl www.interactivemove.nl;

    # SSL
    ssl_certificate /etc/letsencrypt/live/interactivemove.nl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/interactivemove.nl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    include /etc/nginx/snippets/security-headers.conf;

    root /usr/share/nginx/html;
    index index.html;

    # Static site
    location / {
        try_files $uri $uri.html $uri/ =404;

        # Cache static assets
        location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|webp|woff2?)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # Ghost Content API (public, read-only)
    location /ghost/api/content/ {
        proxy_pass http://ghost:2368;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Rate limit API
        limit_req zone=ghost_api burst=20 nodelay;
    }

    # Ghost Admin (restricted)
    location /ghost/ {
        # OPTION A: IP allowlist (recommended — replace with your office/VPN IP)
        # allow 1.2.3.4/32;
        # deny all;

        # OPTION B: Basic auth (if no static IP)
        # auth_basic "Ghost Admin";
        # auth_basic_user_file /etc/nginx/.htpasswd;

        proxy_pass http://ghost:2368;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;

        # Rate limit admin
        limit_req zone=ghost_admin burst=5 nodelay;
    }

    # Block direct access to docker/config files
    location ~ /\. { deny all; }
    location ~ ^/(docker|\.env|docker-compose) { deny all; }
    location /tools/ { deny all; }
    location /reference/ { deny all; }
}
```

### 2.5 Security Headers

Save as `~/iam-website/docker/nginx/security-headers.conf`:

```nginx
# Rate limit zones (must be in http context — add to nginx.conf or a top-level include)
# If using default nginx image, add these to a custom nginx.conf:
# limit_req_zone $binary_remote_addr zone=ghost_api:10m rate=10r/s;
# limit_req_zone $binary_remote_addr zone=ghost_admin:10m rate=2r/s;

# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';" always;
```

**Custom nginx.conf** — save as `~/iam-website/docker/nginx/nginx.conf` and mount it:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    server_tokens off;
    client_max_body_size 10m;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=ghost_api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=ghost_admin:10m rate=2r/s;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    include /etc/nginx/conf.d/*.conf;
}
```

Update the nginx service in docker-compose to also mount this:
```yaml
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```

---

## 3. Security & Enterprise Standards

### 3.1 Security Headers

✅ Covered in `security-headers.conf` above:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy` — restrictive, self + unpkg for HTMX

### 3.2 Rate Limiting

- **Content API:** 10 req/s per IP, burst 20 — prevents scraping
- **Ghost Admin:** 2 req/s per IP, burst 5 — prevents brute force
- Ghost has built-in brute force protection for login

### 3.3 Ghost Admin Access Control

1. **IP allowlist** in Nginx (recommended) — only your office/VPN can reach `/ghost/`
2. **Staff accounts** — create individual Ghost accounts for each team member (Author role for bloggers, Editor for reviewers)
3. **2FA** — Ghost supports 2FA; enforce it for all staff
4. **API keys** — Content API key is read-only and safe for frontend; Admin API key stays server-side only

### 3.4 Backup Strategy

**Automated daily backups via cron:**

```bash
#!/bin/bash
# ~/iam-website/docker/backup.sh
set -euo pipefail

BACKUP_DIR="/home/adminuser/backups/iam"
DATE=$(date +%Y-%m-%d_%H%M)
mkdir -p "$BACKUP_DIR"

# 1. Ghost content (images, themes, data)
docker run --rm -v iam-website_ghost-content:/data -v "$BACKUP_DIR":/backup alpine \
    tar czf "/backup/ghost-content-${DATE}.tar.gz" -C /data .

# 2. MySQL dump
docker exec iam-mysql mysqldump -u ghost -p"${GHOST_DB_PASSWORD}" ghost | \
    gzip > "$BACKUP_DIR/ghost-db-${DATE}.sql.gz"

# 3. Static site (git is primary, but snapshot anyway)
tar czf "$BACKUP_DIR/static-site-${DATE}.tar.gz" -C /home/adminuser/iam-website \
    --exclude=docker --exclude=.git --exclude=node_modules .

# 4. Retain last 30 days
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "[$(date)] Backup complete: $BACKUP_DIR"
```

**Cron entry:**
```bash
0 3 * * * /home/adminuser/iam-website/docker/backup.sh >> /var/log/iam-backup.log 2>&1
```

### 3.5 GDPR Compliance

1. **Ghost newsletter/members** — if using Ghost members, configure GDPR-compliant signup (double opt-in)
2. **Cookie consent** — the site already has `cookiebeleid.html`; add a cookie banner if using analytics
3. **Privacy policy** — already exists at `privacybeleid.html`; update to mention Ghost CMS data processing
4. **Analytics** — recommend **Plausible** or **Umami** (self-hosted, cookieless, GDPR-compliant) instead of Google Analytics
5. **Data retention** — configure Ghost to not collect unnecessary data; disable member tracking if not using memberships
6. **Right to erasure** — Ghost Admin allows deleting member data

### 3.6 robots.txt and Sitemap

Existing `robots.txt` is good. Updates needed:

```
# Add to robots.txt
Disallow: /ghost/          # Block Ghost admin/API from crawlers
Disallow: /ghost/api/      # API shouldn't be indexed
```

**Sitemap** — Ghost auto-generates a sitemap at `/ghost/sitemap.xml`. For a unified sitemap:
- Keep the static sitemap at `/sitemap.xml`
- Add blog post URLs dynamically (build script or manual addition after publishing)
- Alternatively, create a sitemap index that references both

---

## 4. Deployment Script

Save as `~/iam-website/deploy.sh`:

```bash
#!/bin/bash
set -euo pipefail

# ============================================================
# InterActiveMove Deployment Script
# Usage: ./deploy.sh [init|up|ssl|backup|status]
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

DOMAIN="interactivemove.nl"
EMAIL="admin@interactivemove.nl"  # Change to real email

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ---- Init: create dirs, generate passwords, first-time setup ----
cmd_init() {
    log "Initializing InterActiveMove infrastructure..."

    # Create required directories
    mkdir -p docker/nginx

    # Generate .env if missing
    if [ ! -f .env ]; then
        log "Generating .env with random passwords..."
        cat > .env <<EOF
GHOST_DB_PASSWORD=$(openssl rand -base64 32)
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)
EOF
        chmod 600 .env
        log ".env created (passwords generated). Keep this file safe!"
    else
        warn ".env already exists, skipping password generation"
    fi

    # Write nginx configs if missing
    if [ ! -f docker/nginx/nginx.conf ]; then
        log "Writing Nginx configs..."
        # (These would be the configs from Section 2.4/2.5 above)
        warn "Please ensure docker/nginx/nginx.conf, default.conf, and security-headers.conf are in place"
    fi

    log "Init complete. Next: ./deploy.sh ssl (for certificates), then ./deploy.sh up"
}

# ---- SSL: obtain Let's Encrypt certificate ----
cmd_ssl() {
    log "Obtaining SSL certificate for ${DOMAIN}..."

    # Start nginx temporarily for ACME challenge (HTTP only)
    # Create a minimal HTTP-only config first
    cat > docker/nginx/default.conf.tmp <<'TMPCONF'
server {
    listen 80;
    server_name interactivemove.nl www.interactivemove.nl;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'SSL setup in progress'; add_header Content-Type text/plain; }
}
TMPCONF

    # Temporarily use HTTP-only config
    cp docker/nginx/default.conf docker/nginx/default.conf.bak 2>/dev/null || true
    cp docker/nginx/default.conf.tmp docker/nginx/default.conf

    docker compose up -d nginx
    sleep 3

    # Request certificate
    docker compose run --rm certbot certonly \
        --webroot -w /var/www/certbot \
        -d "$DOMAIN" -d "www.$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos --no-eff-email

    # Restore full config
    if [ -f docker/nginx/default.conf.bak ]; then
        cp docker/nginx/default.conf.bak docker/nginx/default.conf
        rm docker/nginx/default.conf.bak
    fi
    rm -f docker/nginx/default.conf.tmp

    docker compose restart nginx
    log "SSL certificate obtained and Nginx restarted with HTTPS!"
}

# ---- Up: build and start all services ----
cmd_up() {
    log "Starting InterActiveMove stack..."

    # Validate
    [ -f .env ] || err ".env not found. Run ./deploy.sh init first"
    [ -f docker-compose.yml ] || err "docker-compose.yml not found"

    # Pull latest images
    docker compose pull

    # Start
    docker compose up -d

    log "Waiting for services to be healthy..."
    sleep 10

    # Health checks
    cmd_health
}

# ---- Health: check all services ----
cmd_health() {
    log "Running health checks..."
    local ok=true

    # Check containers running
    for svc in nginx ghost mysql; do
        if docker compose ps "$svc" | grep -q "Up"; then
            log "$svc: running"
        else
            err "$svc: NOT running"
            ok=false
        fi
    done

    # Check Ghost API responds
    if curl -sf -o /dev/null http://localhost:2368/ghost/api/content/settings/ 2>/dev/null; then
        log "Ghost API: responding"
    else
        # Try via nginx
        if curl -sf -o /dev/null http://localhost/ghost/api/content/settings/ 2>/dev/null; then
            log "Ghost API (via nginx): responding"
        else
            warn "Ghost API: not responding yet (may still be starting)"
        fi
    fi

    # Check static site
    if curl -sf -o /dev/null http://localhost/ 2>/dev/null; then
        log "Static site: serving"
    else
        warn "Static site: not responding"
    fi

    $ok && log "All health checks passed!" || warn "Some checks failed — review above"
}

# ---- Backup: run backup now ----
cmd_backup() {
    log "Running backup..."
    if [ -f docker/backup.sh ]; then
        bash docker/backup.sh
    else
        err "docker/backup.sh not found"
    fi
}

# ---- Status: show service status ----
cmd_status() {
    docker compose ps
}

# ---- Stop ----
cmd_stop() {
    log "Stopping all services..."
    docker compose down
    log "Stopped."
}

# ---- Main ----
case "${1:-help}" in
    init)   cmd_init ;;
    ssl)    cmd_ssl ;;
    up)     cmd_up ;;
    health) cmd_health ;;
    backup) cmd_backup ;;
    status) cmd_status ;;
    stop)   cmd_stop ;;
    *)
        echo "Usage: ./deploy.sh [init|ssl|up|health|backup|status|stop]"
        echo ""
        echo "  init    - First-time setup (create dirs, generate passwords)"
        echo "  ssl     - Obtain Let's Encrypt SSL certificate"
        echo "  up      - Pull images, start stack, run health checks"
        echo "  health  - Run health checks only"
        echo "  backup  - Run backup now"
        echo "  status  - Show container status"
        echo "  stop    - Stop all services"
        ;;
esac
```

Make executable: `chmod +x deploy.sh`

---

## 5. Deployment Checklist

### First-time deployment:

```bash
cd ~/iam-website

# 1. Initialize (generates passwords, creates dirs)
./deploy.sh init

# 2. Ensure nginx config files are in place
#    - docker/nginx/nginx.conf
#    - docker/nginx/default.conf
#    - docker/nginx/security-headers.conf

# 3. Point DNS: interactivemove.nl → server IP (A record)
#    Also: www.interactivemove.nl → same IP

# 4. Get SSL certificate
./deploy.sh ssl

# 5. Start everything
./deploy.sh up

# 6. Set up Ghost admin
#    Visit https://interactivemove.nl/ghost/
#    Create admin account (first visit only)
#    Create Content API integration:
#      Ghost Admin → Settings → Integrations → + Add custom integration
#      Copy the Content API Key → paste into blog.html

# 7. Set up backup cron
crontab -e
# Add: 0 3 * * * /home/adminuser/iam-website/docker/backup.sh >> /var/log/iam-backup.log 2>&1

# 8. Update robots.txt with Ghost disallow rules
# 9. Test blog page, test admin access
```

### Updating Ghost:

```bash
# Edit docker-compose.yml: change ghost:6-alpine to ghost:6.x.x-alpine
docker compose pull ghost
docker compose up -d ghost
./deploy.sh health
```

---

## 6. File Structure (Final)

```
~/iam-website/
├── docker-compose.yml
├── deploy.sh
├── .env                          # Secrets (gitignored!)
├── docker/
│   ├── nginx/
│   │   ├── nginx.conf
│   │   ├── default.conf
│   │   └── security-headers.conf
│   └── backup.sh
├── index.html
├── blog.html                     # NEW: blog listing
├── blog-post.html                # NEW: single post
├── styles.css
├── js/
├── media/
├── products/
├── partials/
├── robots.txt                    # Updated with Ghost disallow
├── sitemap.xml
├── cookiebeleid.html
├── privacybeleid.html
└── ... (existing pages)
```

**Add to `.gitignore`:**
```
.env
```

---

## 7. Cost & Resource Estimates

| Component | RAM | Disk | Notes |
|-----------|-----|------|-------|
| Nginx | ~20MB | Minimal | Alpine image |
| Ghost | ~150-300MB | ~200MB image | Content in volume |
| MySQL 8 | ~300-500MB | Grows with content | InnoDB buffer pool |
| **Total** | **~500MB-1GB** | **~1GB base** | Well within a 2GB+ VPS |

**Recommended server:** 2 vCPU, 2-4GB RAM, 40GB SSD minimum.
