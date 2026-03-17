# Agency Website Platform Blueprint

**Purpose:** Standardized architecture for building, deploying, and operating client websites on Otto's server.

**Goal:**
- Keep the frontend fast, custom, and AI-buildable
- Give clients safe editing access without exposing core code
- Reuse one repeatable stack across all client sites
- Support optional blogs/newsletters without forcing a CMS on every site
- Minimize maintenance overhead

---

## 1. Core Recommendation

Do **not** use Microweber as the primary layer.

Use a **static-first architecture** with:
- **Custom static frontend** as the default
- **Structured content layer** for safe client edits
- **Ghost only when needed** for blog/newsletter/editorial workflows
- **One internal admin/dashboard** to manage all clients
- **Nginx** as the routing layer
- **Docker** for shared infra and optional per-client app services

This gives the flexibility of custom sites without the long-term pain of a visual builder controlling the whole stack.

---

## 2. High-Level Architecture

```text
                        ┌──────────────────────────┐
                        │      Client Browser      │
                        └────────────┬─────────────┘
                                     │
                               HTTPS │
                                     ▼
                        ┌──────────────────────────┐
                        │     Nginx Reverse Proxy  │
                        │  TLS, routing, caching   │
                        └───────┬────────┬─────────┘
                                │        │
                static pages ───┘        └─── /blog or blog.*
                                │                    │
                                ▼                    ▼
                  ┌──────────────────────┐   ┌──────────────────────┐
                  │ Static frontend      │   │ Ghost instance       │
                  │ HTML/CSS/JS output   │   │ optional per client  │
                  └──────────┬───────────┘   └──────────┬───────────┘
                             │                          │
                             ▼                          ▼
                  ┌──────────────────────┐   ┌──────────────────────┐
                  │ Content/API layer    │   │ Ghost DB + storage   │
                  │ JSON / admin / forms │   │ isolated per client  │
                  └──────────┬───────────┘   └──────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Internal agency hub  │
                  │ clients / deploy /   │
                  │ forms / assets / ops │
                  └──────────────────────┘
```

---

## 3. Design Principles

### A. Static-first by default
Every client website should be treated as a static site unless there is a proven reason not to.

Why:
- faster
- cheaper
- easier to cache
- safer
- easier to version control
- AI-generated code fits this model perfectly

### B. Clients edit content, not structure
Clients should not have free access to page builders that can break layouts.

Clients can edit:
- text
- images
- testimonials
- CTAs
- metadata
- blog posts
- contact information
- offers

Clients should **not** edit:
- routing
- JS logic
- design system
- tracking integrations
- forms plumbing
- SEO structure beyond field-level values

### C. Optional blog layer
Most sites do not need a full CMS.
Ghost should be **optional**, not default.

Use Ghost only when the client needs:
- regular blog publishing
- editorial workflow
- newsletters
- memberships
- multi-author writing

### D. One standardized operational layer
Every client should reuse the same patterns for:
- analytics
- forms
- CRM
- deployment
- backups
- monitoring
- email capture
- SEO defaults

---

## 4. Standardized Stack

## 4.1 Frontend

### Default choice
- **Static HTML/CSS/JS** or **Astro**

### Recommendation
Use **Astro** for most new builds.
Use plain static HTML only when:
- the site is tiny
- speed matters more than maintainability
- there is already a static codebase like IAM

### Why Astro
- outputs static HTML
- component-based
- easier to standardize than raw HTML
- easy to inject structured content
- good SEO by default
- easy partial reuse
- does not force React complexity

### Frontend rules
- no client-side framework by default
- no React unless the page actually needs app-like behavior
- one design system shared across clients
- reusable components for:
  - hero
  - services
  - pricing
  - testimonial blocks
  - FAQ
  - contact section
  - CTA bands
  - blog index cards

---

## 4.2 Styling

### Recommendation
- **Tailwind only if used with discipline**, or
- **vanilla CSS + tokens**, which is probably better for your style

For your workflow, I recommend:
- **design tokens + plain CSS modules/components**

Shared tokens:
- colors
- typography
- spacing
- radius
- shadows
- section widths
- motion timings

This keeps AI outputs cleaner and easier to audit.

---

## 4.3 Content Layer

### Default choice
Use **structured files** per client:
- JSON
- YAML
- Markdown

Example:
```text
content/
  site.json
  home.json
  about.json
  services.json
  testimonials.json
  faq.json
  seo.json
```

### Why
- safe
- versioned
- easy to diff
- easy to feed into templates
- easy to edit via custom admin

### Recommended editing approach
Build a **small internal content admin** that edits these files or a backing store.

That admin should expose only approved fields.

---

## 4.4 Admin / Client Dashboard

### Recommendation
Build one internal app called something like:
- `agency-hub`
- `site-ops`
- `oopuo-sites`

This becomes the control center for all clients.

### What it should do
Per client:
- edit approved site content fields
- upload/replace images
- edit SEO title/description/OG image
- edit forms destination settings
- view leads
- open blog admin if Ghost exists
- trigger deployment
- view backups
- view health status

### What it should not do
- visual drag/drop page editing
- direct code editing
- raw server access
- unrestricted theme editing

### Tech recommendation for admin
- **Next.js**, **Nuxt**, or simple **Express + server-rendered UI**
- backing store:
  - SQLite/Postgres for metadata
  - content files in repo or object storage

For speed, I’d use:
- **Next.js admin panel**
- **Postgres** for site metadata + users
- content saved into repo or generated JSON files

---

## 4.5 Blog Layer

### Default
No blog unless needed.

### When needed
Deploy **one Ghost instance per client**.

### Why per-client Ghost
- isolation
- no shared content risk
- easier backups
- simpler upgrades
- cleaner ownership boundaries

### Routing patterns
Preferred:
- `blog.clientdomain.com`

Optional:
- `clientdomain.com/blog`

### Recommendation
Use **subdomain** unless brand demands `/blog`.
Subdomain is simpler operationally.

### Ghost responsibilities
- blog posts
- authors
- newsletters
- memberships if needed

### Frontend integration options
1. Keep blog visually separate but branded
2. Pull Ghost content into static frontend via API for featured posts/homepage cards
3. Proxy full blog through Nginx

---

## 4.6 Forms / CRM

### Standardize this hard
Do not reinvent forms per client.

### Recommended default
- **HubSpot** if already central to your workflow

### Why
- reliable
- notifications
- pipeline integration
- automation
- forms and embedded lead capture

### Form strategy
Every site gets one of these patterns:

#### Pattern A — Embedded HubSpot forms
Best for clients who need direct CRM flows.

#### Pattern B — Custom frontend form -> server endpoint -> HubSpot
Best when you want a custom UI but standardized backend.

#### Pattern C — mailto fallback
Only for temporary launch or low-priority sites.
Not ideal long term.

### Recommendation
Use **Pattern B** as standard.

That means:
- custom frontend form UI
- submit to your form service endpoint
- endpoint validates, logs, forwards to HubSpot, optionally sends email

This keeps UX clean and infra standardized.

---

## 4.7 Analytics

### Standard options
- **Plausible** for privacy-first clients
- **GTM + GA4** for marketing-heavy clients

### Recommendation
Support both, chosen per client in config.

Per-client config:
```json
{
  "analytics": {
    "provider": "plausible",
    "domain": "example.com"
  }
}
```

or

```json
{
  "analytics": {
    "provider": "ga4",
    "gtmId": "GTM-XXXXXXX"
  }
}
```

### Rule
Analytics should be injected centrally from config, not hardcoded into random pages.

---

## 4.8 Deployment

### Standard model
- source lives in git
- build happens locally or in CI
- deploy static output to client directory/container
- Nginx serves the output

### Recommendation
Use:
- **GitHub/Gitea repo per client**, or mono-repo with clear structure
- build scripts standardized
- deploy via script or CI action

### Deployment flow
```text
Edit content/code -> commit -> build -> output dist/ -> deploy -> nginx serves -> healthcheck
```

---

## 4.9 Reverse Proxy / Networking

### Standard
Use **Nginx** as the front door.

Responsibilities:
- TLS
- redirects
- canonical host routing
- static asset caching
- blog proxying
- security headers
- compression

### Standard routing examples

#### Static site only
- `example.com` -> `/srv/sites/example/current/dist`

#### Static + Ghost blog
- `example.com` -> static frontend
- `blog.example.com` -> Ghost container

or
- `example.com/blog` -> Ghost container via reverse proxy

---

## 4.10 Storage / Assets

### Recommendation
Keep uploaded assets separate from code.

Use:
- local object storage path or S3-compatible storage (MinIO if needed)
- generated optimized images
- reference URLs in content config

### Asset rules
For each upload:
- store original
- generate optimized versions
- generate WebP/AVIF when useful
- keep deterministic paths

---

## 4.11 Database

### Recommended minimal DB split
- **Postgres** for agency hub metadata and users
- **Ghost DB per client** if Ghost is enabled
- no DB required for static-only sites unless admin/content storage needs it

---

## 4.12 Docker Usage

### Use Docker for
- agency admin app
- Ghost instances
- Postgres
- Redis if needed
- background workers
- image processing services

### Do not force Docker for
- every static site

Static sites can simply be built and served by Nginx from disk.

---

## 5. Exact Standardized Stack for Client Websites

## Tier A — Simple brochure site
Use for most clients.

### Stack
- Astro frontend
- content JSON/YAML/Markdown
- Nginx static serving
- form endpoint -> HubSpot
- analytics from config
- no Ghost

### Features
- homepage
- services
- about
- testimonials
- contact
- SEO
- lead capture

### Client editing
- via agency-hub approved fields only

---

## Tier B — Growth site with blog
Use for clients that publish regularly.

### Stack
- Astro frontend
- structured content files for core pages
- Ghost instance for blog/newsletter
- Nginx routing
- form endpoint -> HubSpot
- analytics from config

### Features
- everything in Tier A
- blog
- authors
- newsletter
- optional lead magnets

### Client editing
- site content in agency-hub
- blog in Ghost admin

---

## Tier C — Advanced marketing site
Use for more demanding clients.

### Stack
- Astro frontend
- agency-hub content editing
- Ghost optional
- feature flags
- A/B testing hooks
- analytics + event tracking
- CRM integrations
- custom APIs if needed

### Features
- landing pages
- campaign pages
- gated offers
- dynamic lead routing
- advanced forms

---

## 6. Concrete Folder Blueprint

Recommended top-level structure on server:

```text
/home/adminuser/
  projects/
    agency-hub/
    sites/
      templates/
        base-marketing/
        base-blog/
        base-service/
      clients/
        iam/
          site/
            src/
            public/
            content/
            dist/
            package.json
            client.config.json
          ghost/
            docker-compose.yml
            .env
          ops/
            nginx.conf
            deploy.sh
            backup.sh
            healthcheck.sh
        client-b/
          site/
          ghost/
          ops/
  data/
    sites/
      iam/
        uploads/
        backups/
      client-b/
        uploads/
        backups/
  nginx/
    sites-enabled/
    snippets/
  logs/
    sites/
      iam/
      client-b/
```

---

## 7. Per-Client Structure

```text
clients/iam/
  site/
    src/
      components/
      layouts/
      pages/
      styles/
      lib/
    content/
      site.json
      home.json
      about.json
      services.json
      testimonials.json
      faq.json
      seo.json
      forms.json
    public/
      images/
      icons/
    dist/
    client.config.json
  ghost/
    docker-compose.yml
    .env
  ops/
    nginx.conf
    deploy.sh
    backup.sh
    healthcheck.sh
```

### Example `client.config.json`

```json
{
  "clientId": "iam",
  "name": "InterActiveMove",
  "domain": "interactivemove.nl",
  "blog": {
    "enabled": true,
    "mode": "subdomain",
    "domain": "blog.interactivemove.nl"
  },
  "analytics": {
    "provider": "ga4",
    "gtmId": "GTM-KPX78C22"
  },
  "crm": {
    "provider": "hubspot",
    "portalId": "...",
    "formMode": "api"
  },
  "deploy": {
    "outputPath": "/srv/sites/interactivemove/current"
  }
}
```

---

## 8. Standard Services

## Shared services
Run once for the whole platform:
- Nginx
- agency-hub admin app
- Postgres
- optional Redis
- optional MinIO/object storage
- monitoring/logging

## Optional per-client services
Only when needed:
- Ghost
- Ghost DB if isolated separately
- custom API workers

---

## 9. Deployment Flow

## A. New client onboarding

```text
1. Create client folder from template
2. Fill client.config.json
3. Add domain + nginx config
4. Add content files
5. Build frontend
6. Deploy static output
7. Connect forms + analytics
8. If blog needed, deploy Ghost
9. Run smoke test
10. Hand client access to agency-hub (+ Ghost if needed)
```

## B. Content update flow

```text
Client edits safe fields in agency-hub
-> system updates content source
-> rebuild static site
-> deploy dist
-> purge cache if needed
-> verify healthcheck
```

## C. Blog post flow

```text
Client logs into Ghost
-> writes post
-> publishes
-> Ghost serves post
-> optional homepage/blog widgets pull latest posts via API
```

## D. Code update flow

```text
Otto / AI agent edits template or client code locally
-> commit
-> build
-> deploy
-> smoke test
```

---

## 10. Nginx Routing Blueprint

## Static only
```nginx
server {
    server_name example.com www.example.com;
    root /srv/sites/example/current;
    index index.html;

    location / {
        try_files $uri $uri.html $uri/ /index.html;
    }
}
```

## Static + blog subdomain
```nginx
server {
    server_name example.com www.example.com;
    root /srv/sites/example/current;
    index index.html;

    location / {
        try_files $uri $uri.html $uri/ /index.html;
    }
}

server {
    server_name blog.example.com;

    location / {
        proxy_pass http://ghost-example:2368;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Static + blog at `/blog`
```nginx
location /blog/ {
    proxy_pass http://ghost-example:2368/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## 11. Security Model

### Rules
- clients never get shell access
- clients never edit core templates directly
- no secrets in git
- per-client Ghost isolated if enabled
- uploads separated from code
- shared admin enforces field-level permissions

### Required defaults
- CSP headers
- HSTS
- secure cookies
- backup jobs
- role-based access in agency-hub
- audit trail for client edits

---

## 12. Standardized Integrations

Every client should be configurable through a small, consistent matrix:

| Concern | Standard Options |
|---|---|
| Frontend | Astro / static HTML |
| Content editing | agency-hub structured fields |
| Blog | none / Ghost |
| Forms | HubSpot API |
| Analytics | Plausible / GA4+GTM |
| Email | client SMTP / transactional provider |
| Assets | local uploads / object storage |
| Deployment | build + rsync/symlink swap |
| Monitoring | healthcheck + logs |

---

## 13. What Not To Do

- Don’t make Microweber the main platform
- Don’t give clients full page-builder freedom
- Don’t make every site a Dockerized app if it’s just static
- Don’t hardcode analytics/forms/blog logic per site
- Don’t let Ghost become mandatory for brochure sites
- Don’t mix uploaded assets, generated output, and source code randomly

---

## 14. Recommended Build Standard

## For new websites
- Astro
- structured content files
- shared components
- config-driven forms/analytics/SEO
- agency-hub editing layer
- optional Ghost

## For existing websites like IAM
- keep current static codebase
- normalize into this structure gradually
- do not rebuild unless necessary
- use IAM as the first migration/reference client

---

## 15. IAM Migration Into This Standard

IAM should become the **reference implementation**.

### Phase 1 — stabilize current site
- fix launch blockers
- clean config
- verify forms/blog/security

### Phase 2 — normalize structure
- move IAM into `/projects/sites/clients/iam/`
- add `client.config.json`
- standardize deploy scripts
- standardize nginx config
- separate uploads/backups

### Phase 3 — connect to agency-hub
- expose editable content fields
- decide whether Ghost stays subdomain or `/blog`
- unify analytics/forms into standard config

### Phase 4 — template extraction
- extract reusable components/patterns from IAM
- turn them into your first reusable client template

---

## 16. Final Recommendation

### Best architecture for your server
- **Static-first websites**
- **One internal admin/dashboard for clients**
- **Ghost optional per client**
- **Nginx as front door**
- **Docker only for apps/services that need it**
- **Standardized forms, analytics, deployment, and backups**

### Exact standardized stack to use
- **Frontend:** Astro
- **Content:** JSON/YAML/Markdown
- **Admin:** custom agency-hub app
- **CRM/forms:** HubSpot API
- **Blog:** Ghost when needed
- **Proxy:** Nginx
- **DB:** Postgres for admin metadata
- **Storage:** filesystem or MinIO for uploads/backups
- **Deployment:** git + build + symlink/rsync deploy

This is the cleanest path that matches how you already work.

---

## 17. Immediate Next Step

After saving this:
1. use IAM as the first implementation target
2. fix IAM launch blockers
3. move IAM into the standardized folder structure
4. define what should be editable via agency-hub
5. only then expand the pattern to other clients
