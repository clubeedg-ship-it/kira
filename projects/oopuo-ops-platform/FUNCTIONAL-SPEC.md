# Oopuo Ops Platform — Functional Specification

*Created: 2026-03-14*
*Status: Approved by Otto*

---

## What Is This?

A unified operations platform for SMBs. One dashboard where clients manage their entire web presence + AI support operations. Think "WordPress + Mailchimp + Zendesk + Cloudflare + Google Analytics" in one clean, minimalist platform.

**First client:** Oopuo itself (dogfooding).

**Auth:** Clerk (multi-tenant organizations, roles, SSO)

**Philosophy:** Never build from scratch when a better open-source option exists. Strip out the best OSS tools (like Ghost for blogging, Microweber/GrapesJS for page building) and unify them under one platform.

---

## Module 1: Website Manager 🌐

### Core Features
- **Static file backup** — pull/backup client's live website as static files
- **Live preview** — render the actual website inside the platform (iframe)
- **Visual editor** — click any element on the rendered site to edit (text, images, links, styles)
- **Edit-in-place** for existing static sites (MVP)
- **Upgradeable to full page builder** — drag-and-drop blocks (investigate GrapesJS, Microweber, or similar OSS)
- **Multi-page management** — add, remove, reorder pages
- **Draft → Publish workflow** — edit freely, push to live hosting when ready
- **Version history** — rollback to any previous state
- **Mobile/tablet/desktop preview toggle**
- **Custom domain connection** + automatic SSL (Let's Encrypt)
- **SEO settings per page** (title, meta description, OG image)
- **Media library** — upload, organize, browse images and files
- **Forms builder** — drag-and-drop contact/lead capture forms, submissions go to Forms & Leads module

### How It Works
1. Platform stores website as static files (HTML/CSS/JS/assets)
2. Rendered in iframe for preview/editing
3. Modifications edit the static files
4. "Publish" pushes updated files to hosting (Caddy/nginx or S3+CDN)
5. Version control — every publish creates a snapshot

---

## Module 2: Blog / Content 📝

### Core Features
- **Rich text editor** — investigate stripping Ghost's editor, or use TipTap / Editor.js
- **Categories and tags**
- **Featured images**
- **Schedule publishing** — write now, publish later
- **Auto-generates** blog listing page + individual post pages into the static site
- **RSS feed** auto-generated
- **SEO per post** (title, description, OG image, slug)
- **Author profiles** (for multi-author setups)
- **Markdown support** alongside rich text
- **Draft / review / published** status workflow

---

## Module 3: AI Support Monitor 🤖

### Client View
- **Monitoring dashboard** — all AI-handled conversations (voice calls, email, chat)
- **Escalation inbox** — conversations AI couldn't handle → client steps in as human agent
- **Conversation transcripts** — full history of what AI said
- **Basic metrics** — resolution rate, volume, avg handle time, customer satisfaction
- **Real-time notifications** on escalations

### Admin View (Oopuo internal)
- **Agent setup per client** — configure Retell AI agents, assign phone numbers, set knowledge base
- **Service management** — which clients have which AI services active
- **Cross-client metrics** — overview of all clients' AI performance
- **Billing tracking** — usage per client

### Technical
- Sync from Retell API (calls, transcripts, metrics)
- Sync from email system (AI-handled emails)
- Webhook receiver for real-time escalation alerts

---

## Module 4: Email 📧

### Core Features
- **Client email accounts** on their domain (support@, info@, etc.)
- **Webmail inbox** — send/receive from within the platform
- **Forwarding rules**
- **Shared inboxes** — multiple team members access same mailbox
- **Ties into AI Support** — emails can be auto-handled by AI or land in escalation inbox
- **Email signatures** management

### Technical
- DNS MX record management
- Integration with email provider (investigate: Postal, Mailu, or managed service)

---

## Module 5: Analytics 📊

### Core Features
- **Website traffic** — page views, unique visitors, traffic sources, top pages
- **AI support metrics** — pulled from Module 3
- **Form submission stats** — conversion rates
- **Blog post performance** — views per post
- **At-a-glance dashboard** — not competing with GA, just useful data
- **Privacy-first** — no cookies needed, server-side analytics (investigate Plausible/Umami OSS)

---

## Module 6: Forms & Leads 📋

### Core Features
- **Form submissions** from website forms (Module 1)
- **Lead list** with status (new, contacted, converted, lost)
- **Email notification** on new submission
- **Export to CSV**
- **Simple CRM-lite** — enough to follow up on leads, not Salesforce
- **Notes per lead**
- **Assign to team member**

---

## Module 7: Notifications & Alerts 🔔

### Core Features
- Escalated support conversation
- New form submission received
- Website publish succeeded/failed
- SSL certificate expiring
- Domain DNS issues
- Blog post scheduled for publishing
- **Configurable per client** — email, in-platform, webhook
- **Notification center** in platform UI

---

## Module 8: Settings & Admin ⚙️

### Core Features
- **Team members + roles** (owner, editor, support agent, viewer)
- **Billing** (future — Stripe integration for subscription management)
- **API keys** for external integrations
- **Audit log** — who changed what, when
- **White-label options** (future — clients see their own brand, not Oopuo)
- **Tenant settings** — timezone, language, branding

---

## What Is NOT In This Platform

- ❌ Inventory management (separate product)
- ❌ Invoicing/accounting (integrate with existing tools if needed)
- ❌ Full CRM (keep it leads-only)
- ❌ E-commerce/shop (out of scope)

---

## Existing Code to Analyze

- `~/kira/projects/oopuo-website/` — current static Oopuo website (HTML/CSS/JS)
- `~/kira/docs/oopuo-website-design.md` — design spec for oopuo.com
- `~/kira/docs/oopuo-digital-infrastructure.md` — infrastructure docs
- `~/kira/docs/oopuo-brand-architecture.md` — brand docs
- `~/omiximo-email-automation/` — existing email automation system (reference for plugin architecture)
- `~/omiximo-platform/bridge-current/` — marketplace bridge (reference)
- `~/omiximo-inventory/v2/` — inventory system being rebuilt (reference for FastAPI patterns)

---

## Design Principles

- **Minimalist** — clean, not cluttered. Linear/Vercel aesthetic.
- **Dark mode default** — matches Oopuo brand
- **Mobile-first** — clients will check from phones
- **Fast** — no loading spinners for basic operations
- **Practical** — every feature earns its place. No bloat.
