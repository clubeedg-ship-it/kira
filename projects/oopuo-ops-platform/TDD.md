# Oopuo Ops Platform — Technical Design Document

*Created: 2026-03-14*
*Status: Draft — awaiting Otto's review*

---

## 1. Architecture Overview

### Decision: Modular Monolith in a Monorepo

Not microservices (premature for team size), not a flat monolith (can't enable/disable modules per tenant). A **modular monolith** where each of the 8 modules is a self-contained domain package with its own models, routes, and services — all deployed as one backend process but architecturally separable.

```
oopuo-ops-platform/
├── apps/
│   ├── web/                    # Next.js frontend (dashboard)
│   └── site-preview/           # Lightweight iframe preview server
├── packages/
│   ├── ui/                     # Shared UI component library
│   ├── db/                     # Drizzle schema + migrations
│   └── shared/                 # Types, utils, constants
├── server/                     # Node.js backend (Hono/Express)
│   ├── modules/
│   │   ├── websites/           # Module 1
│   │   ├── blog/               # Module 2
│   │   ├── ai-support/         # Module 3
│   │   ├── email/              # Module 4
│   │   ├── analytics/          # Module 5
│   │   ├── forms-leads/        # Module 6
│   │   ├── notifications/      # Module 7
│   │   └── settings/           # Module 8
│   ├── core/                   # Auth, tenancy, module loader
│   └── index.ts
├── docker-compose.yml
├── turbo.json
└── package.json
```

**Why monorepo (Turborepo):** Single version control, shared types between frontend/backend, atomic deploys. Proven pattern at this team size.

**Why NOT follow the omiximo-inventory FastAPI pattern:** The existing inventory system uses Python/FastAPI + Preact. For the ops platform, the **frontend is the product** — visual page builder, rich editor, real-time dashboards. A TypeScript full-stack approach (Next.js + Hono) gives better type safety end-to-end, and the ecosystem for page builders/editors is JS-native. We'd be fighting the stack with Python here.

---

## 2. Tech Stack

### Backend

| Layer | Choice | Justification |
|-------|--------|---------------|
| **Runtime** | Node.js (Bun for dev speed) | JS ecosystem for editor/builder integrations |
| **Framework** | Hono | Lightweight, fast, works on edge/node, clean middleware |
| **Database** | PostgreSQL 16 | Battle-tested, JSONB for flexible config, row-level security |
| **ORM** | Drizzle ORM | Type-safe, lightweight, great migration story |
| **Queue** | BullMQ (Redis) | Background jobs: site publish, email send, analytics aggregation |
| **Cache** | Redis | Sessions, rate limiting, real-time pub/sub |
| **File Storage** | MinIO (S3-compatible) | Self-hosted for site assets, media library, backups |
| **Search** | PostgreSQL FTS (MVP) → MeiliSearch (later) | Don't over-engineer search day one |

### Frontend

| Layer | Choice | Justification |
|-------|--------|---------------|
| **Framework** | Next.js 15 (App Router) | SSR for SEO pages, RSC for dashboard perf, massive ecosystem |
| **UI Library** | Tailwind CSS + Radix UI primitives | Linear/Vercel aesthetic, accessible, composable |
| **Component Kit** | shadcn/ui | Not a dependency — copied components, full control |
| **State** | Zustand (client) + TanStack Query (server) | Simple, performant, no boilerplate |
| **Charts** | Recharts | Clean, composable, dark-mode friendly |
| **Icons** | Lucide | Already used in omiximo-inventory |

### Module-Specific OSS

| Module | OSS Tool | How Used |
|--------|----------|----------|
| **Website Editor** | **GrapesJS** | Visual drag-and-drop page builder. MIT licensed. Embed as React component. Operates on HTML/CSS — perfect for static site editing. |
| **Blog Editor** | **TipTap** (ProseMirror-based) | Rich text + markdown editor. Better DX than EditorJS (which has plugin quality issues). Ghost's editor is tightly coupled to Ghost — not viable to strip. |
| **Analytics** | **Umami** | Self-hosted, privacy-first, no cookies. Lighter than Plausible (which needs Elixir runtime). Embed tracking script in client sites, pull data via API. |
| **Email** | **Postal** (self-hosted) | Full MTA with API. Handles sending + receiving. Docker-deployable. Alternative: managed Mailgun/Postmark for MVP to reduce ops burden. |

### Auth & Identity

| Layer | Choice |
|-------|--------|
| **Auth Provider** | Clerk (non-negotiable) |
| **Multi-tenancy** | Clerk Organizations = tenants |
| **Roles** | Clerk org roles: `owner`, `admin`, `editor`, `support_agent`, `viewer` |
| **Backend Auth** | Clerk JWT verification middleware on Hono |
| **Frontend Auth** | `@clerk/nextjs` — `<SignIn>`, `<OrganizationSwitcher>`, `useAuth()` |

---

## 3. Database Schema

All tables include `tenant_id UUID NOT NULL` for row-level tenant isolation. Soft deletes via `deleted_at` timestamp.

### Core Tables

```sql
-- Tenant = Clerk Organization (synced via webhook)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',            -- free, starter, pro, enterprise
  enabled_modules TEXT[] DEFAULT '{}', -- ['websites','blog','analytics',...]
  settings JSONB DEFAULT '{}',         -- timezone, language, branding
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Synced from Clerk via webhook
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tenant_members (
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'viewer',  -- owner, admin, editor, support_agent, viewer
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,                 -- 'site.published', 'lead.updated', etc.
  entity_type TEXT,                     -- 'site', 'post', 'lead'
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Module 1: Websites

```sql
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  custom_domain TEXT,
  ssl_status TEXT DEFAULT 'pending',    -- pending, active, expired
  status TEXT DEFAULT 'draft',          -- draft, published
  current_version_id UUID,
  settings JSONB DEFAULT '{}',          -- SEO defaults, favicon, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE site_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id),
  version_number INT NOT NULL,
  published_by UUID REFERENCES users(id),
  snapshot_path TEXT NOT NULL,           -- MinIO path to .tar.gz of static files
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (site_id, version_number)
);

CREATE TABLE site_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id),
  path TEXT NOT NULL,                    -- '/about', '/contact'
  title TEXT NOT NULL,
  html_content TEXT,                     -- raw HTML
  grapes_data JSONB,                    -- GrapesJS project JSON
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (site_id, path)
);

CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT,
  storage_path TEXT NOT NULL,            -- MinIO path
  alt_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Module 2: Blog

```sql
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_id UUID REFERENCES sites(id),
  author_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content_json JSONB,                    -- TipTap JSON document
  content_html TEXT,                     -- rendered HTML for static generation
  excerpt TEXT,
  featured_image_id UUID REFERENCES media_files(id),
  status TEXT DEFAULT 'draft',           -- draft, review, scheduled, published
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE (tenant_id, slug)
);

CREATE TABLE blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE (tenant_id, slug)
);

CREATE TABLE blog_post_categories (
  post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE TABLE blog_post_tags (
  post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
```

### Module 3: AI Support

```sql
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,                    -- 'voice', 'chat', 'email'
  provider TEXT DEFAULT 'retell',
  provider_agent_id TEXT,                -- Retell agent ID
  phone_number TEXT,
  knowledge_base_id TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID REFERENCES ai_agents(id),
  external_id TEXT,                      -- Retell call ID or email thread ID
  channel TEXT NOT NULL,                 -- 'voice', 'chat', 'email'
  status TEXT DEFAULT 'active',          -- active, resolved, escalated
  customer_name TEXT,
  customer_contact TEXT,                 -- phone/email
  summary TEXT,
  satisfaction_score INT,                -- 1-5
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  role TEXT NOT NULL,                    -- 'ai', 'customer', 'human_agent'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',           -- audio_url, sentiment, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  assigned_to UUID REFERENCES users(id),
  reason TEXT,
  status TEXT DEFAULT 'open',            -- open, in_progress, resolved
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Module 4: Email

```sql
CREATE TABLE email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  address TEXT NOT NULL,                 -- support@client.com
  display_name TEXT,
  type TEXT DEFAULT 'mailbox',           -- mailbox, alias, forwarding
  forward_to TEXT,
  is_shared BOOLEAN DEFAULT false,
  signature_html TEXT,
  provider_id TEXT,                      -- Postal mailbox ID
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID REFERENCES email_accounts(id),
  direction TEXT NOT NULL,               -- 'inbound', 'outbound'
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  message_id TEXT,                       -- RFC message-id
  in_reply_to TEXT,
  thread_id TEXT,                        -- grouped conversation
  status TEXT DEFAULT 'received',        -- received, read, replied, ai_handled
  provider_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Module 5: Analytics

```sql
-- Aggregated from Umami API, cached locally
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_id UUID REFERENCES sites(id),
  period TEXT NOT NULL,                  -- 'day', 'week', 'month'
  date DATE NOT NULL,
  pageviews INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  bounce_rate DECIMAL(5,2),
  avg_session_duration INT,              -- seconds
  top_pages JSONB DEFAULT '[]',
  traffic_sources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, site_id, period, date)
);
```

### Module 6: Forms & Leads

```sql
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_id UUID REFERENCES sites(id),
  name TEXT NOT NULL,
  fields JSONB NOT NULL,                 -- [{name, type, label, required}]
  redirect_url TEXT,
  notification_emails TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  data JSONB NOT NULL,                   -- submitted field values
  source_url TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  submission_id UUID REFERENCES form_submissions(id),
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  status TEXT DEFAULT 'new',             -- new, contacted, qualified, converted, lost
  assigned_to UUID REFERENCES users(id),
  notes TEXT,
  source TEXT,                           -- 'form', 'manual', 'import'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Module 7: Notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),     -- NULL = all org members
  type TEXT NOT NULL,                    -- 'escalation', 'form_submission', 'publish_success', etc.
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,                             -- in-app URL to navigate to
  is_read BOOLEAN DEFAULT false,
  channel TEXT DEFAULT 'in_app',         -- in_app, email, webhook
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  notification_type TEXT NOT NULL,
  channels TEXT[] DEFAULT '{in_app}',    -- in_app, email, webhook
  is_enabled BOOLEAN DEFAULT true,
  UNIQUE (tenant_id, user_id, notification_type)
);
```

### Module 8: Settings (uses `tenants`, `tenant_members`, `audit_log` tables above)

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,                -- bcrypt hash of API key
  key_prefix TEXT NOT NULL,              -- first 8 chars for identification
  permissions TEXT[] DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. API Design

All endpoints prefixed with `/api/v1`. Authentication via Clerk JWT in `Authorization: Bearer <token>`. Tenant derived from Clerk org context.

### Module 1: Websites

```
GET    /api/v1/sites                         # List sites for tenant
POST   /api/v1/sites                         # Create new site
GET    /api/v1/sites/:id                     # Get site details
PATCH  /api/v1/sites/:id                     # Update site settings
DELETE /api/v1/sites/:id                     # Delete site

GET    /api/v1/sites/:id/pages               # List pages
POST   /api/v1/sites/:id/pages               # Create page
GET    /api/v1/sites/:id/pages/:pageId       # Get page content
PUT    /api/v1/sites/:id/pages/:pageId       # Update page (save)
DELETE /api/v1/sites/:id/pages/:pageId       # Delete page

POST   /api/v1/sites/:id/publish             # Publish current state → hosting
GET    /api/v1/sites/:id/versions            # List versions
POST   /api/v1/sites/:id/rollback/:versionId # Rollback to version

POST   /api/v1/sites/:id/import              # Import static site files (ZIP/tar)
GET    /api/v1/sites/:id/export              # Export site as ZIP

POST   /api/v1/sites/:id/domain              # Connect custom domain
DELETE /api/v1/sites/:id/domain              # Disconnect custom domain

GET    /api/v1/media                          # List media files
POST   /api/v1/media/upload                   # Upload file to media library
DELETE /api/v1/media/:id                      # Delete media file
```

### Module 2: Blog

```
GET    /api/v1/posts                          # List posts (filterable)
POST   /api/v1/posts                          # Create post
GET    /api/v1/posts/:id                      # Get post
PUT    /api/v1/posts/:id                      # Update post
DELETE /api/v1/posts/:id                      # Delete post
POST   /api/v1/posts/:id/publish              # Publish post (regenerates static pages)
POST   /api/v1/posts/:id/schedule             # Schedule post

GET    /api/v1/categories                     # CRUD categories
POST   /api/v1/categories
GET    /api/v1/tags                           # CRUD tags
POST   /api/v1/tags
```

### Module 3: AI Support

```
GET    /api/v1/conversations                  # List conversations (filterable by status, channel)
GET    /api/v1/conversations/:id              # Full conversation with messages
POST   /api/v1/conversations/:id/respond      # Human agent responds to escalation
PATCH  /api/v1/conversations/:id/resolve      # Mark resolved

GET    /api/v1/escalations                    # Escalation inbox
PATCH  /api/v1/escalations/:id/assign         # Assign to team member
PATCH  /api/v1/escalations/:id/resolve        # Resolve escalation

GET    /api/v1/ai-agents                      # List AI agents (admin)
POST   /api/v1/ai-agents                      # Create/configure agent (admin)
PATCH  /api/v1/ai-agents/:id                  # Update agent config (admin)

GET    /api/v1/support/metrics                # Dashboard metrics (resolution rate, volume, etc.)

POST   /api/v1/webhooks/retell                # Webhook receiver for Retell events
```

### Module 4: Email

```
GET    /api/v1/email/accounts                 # List email accounts
POST   /api/v1/email/accounts                 # Create account
PATCH  /api/v1/email/accounts/:id             # Update (signature, forwarding)

GET    /api/v1/email/messages                 # List messages (inbox)
GET    /api/v1/email/messages/:id             # Get message
POST   /api/v1/email/send                     # Send email
POST   /api/v1/email/reply/:id                # Reply to message
```

### Module 5: Analytics

```
GET    /api/v1/analytics/overview             # Dashboard summary
GET    /api/v1/analytics/pageviews            # Pageview data (date range, grouping)
GET    /api/v1/analytics/sources              # Traffic sources
GET    /api/v1/analytics/pages                # Top pages
GET    /api/v1/analytics/blog                 # Blog post performance
```

### Module 6: Forms & Leads

```
GET    /api/v1/forms                          # List forms
POST   /api/v1/forms                          # Create form
PUT    /api/v1/forms/:id                      # Update form
DELETE /api/v1/forms/:id                      # Delete form

GET    /api/v1/forms/:id/submissions          # List submissions
POST   /api/v1/forms/submit/:formId           # Public endpoint — form submission (no auth)

GET    /api/v1/leads                          # List leads
GET    /api/v1/leads/:id                      # Get lead detail
PATCH  /api/v1/leads/:id                      # Update lead (status, notes, assign)
POST   /api/v1/leads/export                   # Export CSV
```

### Module 7: Notifications

```
GET    /api/v1/notifications                  # List notifications (paginated)
PATCH  /api/v1/notifications/:id/read         # Mark as read
POST   /api/v1/notifications/read-all         # Mark all as read
GET    /api/v1/notifications/preferences      # Get preferences
PUT    /api/v1/notifications/preferences      # Update preferences

WS     /api/v1/notifications/stream           # WebSocket for real-time notifications
```

### Module 8: Settings

```
GET    /api/v1/settings                       # Tenant settings
PUT    /api/v1/settings                       # Update settings
GET    /api/v1/team                           # List members + roles
POST   /api/v1/team/invite                    # Invite member (via Clerk)
PATCH  /api/v1/team/:userId/role              # Change role
DELETE /api/v1/team/:userId                   # Remove member

GET    /api/v1/api-keys                       # List API keys
POST   /api/v1/api-keys                       # Create API key
DELETE /api/v1/api-keys/:id                   # Revoke API key

GET    /api/v1/audit-log                      # Query audit log
```

---

## 5. Plugin/Module Architecture

### Module Registry

Each module is a self-registering package:

```typescript
// server/modules/websites/index.ts
import { ModuleDefinition } from '../core/module-loader';

export const websitesModule: ModuleDefinition = {
  id: 'websites',
  name: 'Website Manager',
  version: '1.0.0',
  dependencies: [],           // other module IDs this depends on
  routes: (app) => {           // Hono route registration
    app.get('/api/v1/sites', ...);
    // ...
  },
  jobs: [                     // BullMQ job processors
    { queue: 'site-publish', handler: publishSiteJob },
  ],
  webhooks: [],               // external webhook handlers
};
```

### Module Loader

```typescript
// server/core/module-loader.ts
class ModuleLoader {
  private modules: Map<string, ModuleDefinition>;

  async loadForTenant(tenantId: string, app: Hono) {
    const tenant = await getTenant(tenantId);
    for (const mod of this.modules.values()) {
      if (tenant.enabled_modules.includes(mod.id)) {
        mod.routes(app);
      }
    }
  }
}
```

### Tenant Middleware

```typescript
// Every API request passes through:
async function tenantMiddleware(c: Context, next: Next) {
  const clerkAuth = getAuth(c);
  const orgId = clerkAuth.orgId;
  if (!orgId) return c.json({ error: 'No organization selected' }, 403);

  const tenant = await getTenantByClerkOrg(orgId);
  c.set('tenant', tenant);
  c.set('user', clerkAuth);

  // Module access check
  const module = getModuleFromPath(c.req.path);
  if (module && !tenant.enabled_modules.includes(module)) {
    return c.json({ error: 'Module not enabled' }, 403);
  }

  await next();
}
```

---

## 6. Auth Architecture

### Flow

```
Browser → Clerk.js (auth UI) → JWT issued
   ↓
Next.js middleware verifies JWT → passes to RSC/API routes
   ↓
API calls → Hono backend → Clerk JWT verification middleware
   ↓
tenant_id extracted from Clerk orgId → all DB queries scoped
```

### Roles & Permissions Matrix

| Action | Owner | Admin | Editor | Support Agent | Viewer |
|--------|-------|-------|--------|---------------|--------|
| Manage team | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit site | ✅ | ✅ | ✅ | ❌ | ❌ |
| Publish site | ✅ | ✅ | ❌ | ❌ | ❌ |
| Write blog post | ✅ | ✅ | ✅ | ❌ | ❌ |
| Publish blog post | ✅ | ✅ | ❌ | ❌ | ❌ |
| Handle escalation | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage leads | ✅ | ✅ | ✅ | ✅ | ❌ |
| View analytics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage billing | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ❌ | ❌ | ❌ |
| API key management | ✅ | ✅ | ❌ | ❌ | ❌ |

### Tenant Isolation

- **Database level:** Every query includes `WHERE tenant_id = $1`. Enforced via Drizzle query wrapper — no raw queries without tenant scope.
- **Storage level:** MinIO bucket per tenant (`tenant-{id}/`).
- **Clerk level:** Organization-scoped JWTs. Users can belong to multiple orgs (switch in UI).

---

## 7. Frontend Architecture

### App Structure (Next.js App Router)

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + header shell
│   │   ├── page.tsx                # Overview dashboard
│   │   ├── sites/
│   │   │   ├── page.tsx            # Sites list
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx        # Site overview
│   │   │   │   ├── editor/page.tsx # GrapesJS editor (full-screen)
│   │   │   │   ├── pages/page.tsx  # Page list
│   │   │   │   ├── media/page.tsx  # Media library
│   │   │   │   └── settings/page.tsx
│   │   ├── blog/
│   │   │   ├── page.tsx            # Posts list
│   │   │   ├── new/page.tsx        # TipTap editor
│   │   │   └── [id]/edit/page.tsx
│   │   ├── support/
│   │   │   ├── page.tsx            # Conversations list
│   │   │   ├── escalations/page.tsx
│   │   │   └── [id]/page.tsx       # Conversation detail
│   │   ├── email/
│   │   ├── analytics/
│   │   ├── leads/
│   │   ├── notifications/
│   │   └── settings/
│   └── api/                        # Next.js API routes (proxy to Hono or light handlers)
├── components/
│   ├── layout/                     # Sidebar, Header, CommandPalette
│   ├── editors/                    # GrapesJS wrapper, TipTap wrapper
│   ├── data/                       # DataTable, Cards, Filters
│   └── ui/                         # shadcn components
└── lib/
    ├── api.ts                      # API client (fetch wrapper)
    ├── hooks/                      # Custom hooks
    └── utils.ts
```

### Key UI Patterns

- **Sidebar navigation** — collapsible, shows only enabled modules
- **Command palette** (⌘K) — quick navigation, search across all modules
- **Toast notifications** — sonner
- **Data tables** — TanStack Table (not Tabulator — better React integration)
- **Real-time** — WebSocket connection for notifications, support escalations
- **Dark mode default** — light mode available, dark is default per brand

---

## 8. Infrastructure

### Docker Compose (Development + Production)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes: [minio_data:/data]

  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    depends_on: [postgres]

  backend:
    build: ./server
    depends_on: [postgres, redis, minio]
    environment:
      - DATABASE_URL=postgresql://...
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio:9000

  web:
    build: ./apps/web
    depends_on: [backend]
    environment:
      - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${CLERK_PUB_KEY}
      - API_URL=http://backend:3001

  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
```

### Static Site Hosting Model

```
Client edits site in platform
    ↓
"Publish" clicked
    ↓
BullMQ job: site-publish
    ↓
1. Generate static HTML from GrapesJS project data + blog posts
2. Inject analytics tracking script (Umami)
3. Inject form handler scripts (POST to /api/v1/forms/submit/:formId)
4. Package as static files
5. Upload to MinIO bucket: sites/{tenant_id}/{site_slug}/
6. Signal Caddy to serve from that bucket (or sync to CDN)
    ↓
Caddy reverse proxy: custom_domain → MinIO bucket (file_server)
```

### Custom Domain Flow

1. Client adds custom domain in settings
2. Platform generates required DNS records (CNAME/A)
3. Client adds DNS records at their registrar
4. Platform polls DNS verification
5. Caddy auto-provisions SSL via Let's Encrypt (built-in ACME)
6. Domain routes to correct site bucket

### CDN Strategy (Post-MVP)

- Cloudflare in front of Caddy for DDoS protection + edge caching
- Static assets served with long cache headers
- API calls bypass CDN (direct to backend)

---

## 9. Third-Party Integrations

### Retell AI (Module 3)

- **Webhook:** Retell sends call events → `POST /api/v1/webhooks/retell`
- **API:** Pull call recordings, transcripts, metrics on schedule (BullMQ cron job)
- **Escalation:** Retell transfer event → create escalation → notify via WebSocket + email
- **Config:** Agent configuration done via Retell dashboard (MVP) → in-platform config later

### Clerk

- **Frontend:** `@clerk/nextjs` for auth UI, session management, org switching
- **Backend:** JWT verification on every API call
- **Webhooks:** `POST /api/v1/webhooks/clerk` — sync user creates/updates, org membership changes
- **Roles:** Clerk org roles map to platform permissions

### Umami Analytics

- **Tracking:** JavaScript snippet injected into published static sites
- **API:** Pull analytics data into platform dashboard via Umami REST API
- **Self-hosted:** Runs in same Docker Compose, shares PostgreSQL

### Email (Postal — Post-MVP)

- **MVP:** Email module shows AI support transcripts + simple send via SMTP (use existing Google Workspace)
- **Phase 2:** Deploy Postal container for full send/receive, MX record management
- **Integration:** Postal webhooks for inbound email → parse → store → AI or escalation

---

## 10. Data Flow Diagrams

### Edit Site → Publish

```
User clicks "Edit" on site
    ↓
GrapesJS editor loads (site_pages.grapes_data)
    ↓
User makes changes → auto-saves to DB every 30s
    ↓
User clicks "Publish"
    ↓
API: POST /sites/:id/publish
    ↓
Backend enqueues BullMQ job "site-publish"
    ↓
Job processor:
  1. Load all site_pages for site
  2. Render GrapesJS data → static HTML
  3. Merge blog posts → static HTML pages
  4. Copy assets from media library
  5. Inject Umami tracking + form scripts
  6. Create site_version record
  7. Upload .tar.gz to MinIO (snapshot)
  8. Sync static files to serving bucket
  9. Reload Caddy route if needed
    ↓
Notification: "Site published successfully" → WebSocket
Audit log: site.published
```

### AI Escalation Flow

```
Customer calls AI agent (Retell)
    ↓
AI can't resolve → triggers transfer/escalation
    ↓
Retell webhook → POST /webhooks/retell
    ↓
Backend:
  1. Create/update conversation record
  2. Create escalation (status: open)
  3. Determine assigned user (round-robin or default)
  4. Create notification
  5. Push via WebSocket to online users
  6. Send email notification if configured
    ↓
Support agent sees escalation in inbox
    ↓
Agent responds → POST /conversations/:id/respond
    ↓
Response relayed (email reply or noted for follow-up)
    ↓
Agent resolves → PATCH /escalations/:id/resolve
    ↓
Metrics updated, audit logged
```

### Form Submission → Lead

```
Visitor fills form on published site
    ↓
JavaScript POST → /api/v1/forms/submit/:formId (public, no auth, rate-limited)
    ↓
Backend:
  1. Validate form fields against form definition
  2. Create form_submission record
  3. Auto-create lead (status: new)
  4. Trigger notification → assigned user or all admins
  5. Send email notification if configured
    ↓
Lead appears in Forms & Leads module
    ↓
Team member updates status, adds notes, assigns
```

---

## 11. Key Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript (full-stack) | Type safety, single language, editor/builder ecosystem |
| Backend framework | Hono | Fast, lightweight, great middleware, runs anywhere |
| Frontend framework | Next.js 15 | SSR, RSC, file-based routing, massive ecosystem |
| Database | PostgreSQL 16 | Proven, JSONB for flexible data, FTS for search |
| ORM | Drizzle | Type-safe, lightweight, excellent DX |
| Page builder | GrapesJS | MIT, battle-tested, HTML/CSS output perfect for static sites |
| Blog editor | TipTap | ProseMirror-based, extensible, great React integration |
| Analytics | Umami (self-hosted) | Privacy-first, no cookies, simple API |
| Auth | Clerk | Non-negotiable. Multi-tenant orgs, roles, SSO |
| File storage | MinIO | S3-compatible, self-hosted, free |
| Queue | BullMQ + Redis | Reliable background jobs, cron, retries |
| Monorepo | Turborepo | Fast builds, shared packages, proven |
| CSS | Tailwind + shadcn/ui | Matches Linear/Vercel aesthetic, full control |
| Hosting | Docker Compose on VPS | Simple, cost-effective for initial scale |

---

*This document will be kept in sync as architecture decisions evolve.*
