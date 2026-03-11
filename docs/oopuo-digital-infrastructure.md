# OOPUO — Digital Infrastructure & Account Management

*Created: 2026-03-07 | Status: Action plan ready*

---

## 1. CORE PRINCIPLE

**Every business account = otto@oopuo.com.**
Personal Gmail is for personal stuff. Business tools = business email. If you sell the company, everything transfers cleanly.

---

## 2. EMAIL ARCHITECTURE

### Platform: Google Workspace (€6/mo — Business Starter)

| Mailbox/Alias | Purpose |
|---------------|---------|
| **otto@oopuo.com** | Primary. All SaaS signups, direct communication |
| **info@oopuo.com** | Alias → otto. Website contact form, public-facing |
| **finance@oopuo.com** | Alias → otto. Bank, Stripe, invoices, accounting |
| **support@oopuo.com** | Alias → otto. Client support tickets |
| **hello@oopuo.com** | Alias → otto. Warm outreach, networking |
| **kira@oopuo.com** | Alias → otto. Bot/automation emails |

All aliases are free and land in one inbox. Add real seats (€6/mo each) when you hire.

### Gmail Filters (set up after Workspace activation)

```
To: info@oopuo.com     → Label: "📥 Inbound"    → Star
To: finance@oopuo.com  → Label: "💰 Finance"    → Skip inbox (archive)
To: support@oopuo.com  → Label: "🎧 Support"    → Star
To: otto@oopuo.com     → Label: "👤 Direct"     → Default inbox
```

---

## 3. ACCOUNT REGISTRATION MAP

### Direct Business Tools (otto@oopuo.com)

| Tool | Email | Purpose |
|------|-------|---------|
| Calendly | otto@oopuo.com | Scheduling (links to Google Calendar) |
| Stripe | otto@oopuo.com | Payments & invoicing |
| Saleshandy | otto@oopuo.com | Cold outreach |
| GitHub | otto@oopuo.com | Code repositories |
| Hostinger | otto@oopuo.com | Web hosting |
| Notion | otto@oopuo.com | Company docs & proposals |
| Moneybird | otto@oopuo.com | NL accounting & BTW |
| Figma | otto@oopuo.com | Design |
| Plausible/PostHog | otto@oopuo.com | Privacy-friendly analytics |
| LinkedIn | Personal (add Oopuo as company) | Personal brand + company page |

### Public-Facing (info@oopuo.com alias)

| Where | Email shown |
|-------|------------|
| Website contact form | info@oopuo.com |
| Chat widget "email us" | info@oopuo.com |
| Google Maps / KvK listing | info@oopuo.com |
| Auto-replies to strangers | info@oopuo.com |

### Finance (finance@oopuo.com alias)

| What | Email |
|------|-------|
| Business bank (Bunq/N26/Revolut) | finance@oopuo.com |
| Stripe notifications | finance@oopuo.com |
| Moneybird accounting | finance@oopuo.com |
| Tax advisor correspondence | finance@oopuo.com |

---

## 4. PASSWORD MANAGEMENT — BITWARDEN

### Setup (migrate from local → cloud)

1. Export local Bitwarden vault
2. Create Bitwarden cloud account (free tier)
3. Import vault into cloud
4. Install phone app (iOS/Android) → enable system autofill
5. Install browser extension → enable auto-fill on page load
6. Master password = the ONLY password you memorize
7. Enable 2FA on Bitwarden itself (use Aegis as backup authenticator)

### Vault Organization

```
📁 Oopuo — Business
   ├── Google Workspace (otto@oopuo.com)
   ├── Stripe
   ├── Calendly
   ├── Saleshandy
   ├── GitHub
   ├── Hostinger
   ├── Moneybird
   ├── Figma
   ├── Plausible
   └── ...

📁 Oopuo — Client Portals
   ├── Solyx Energy (admin access)
   ├── MSTA
   └── ...

📁 Personal
   ├── Personal Gmail
   ├── Netflix
   └── ...
```

### Password Rules
- Every account → unique 20+ char random password (Bitwarden generates)
- 2FA on everything (TOTP in Bitwarden premium €10/yr, or Aegis on phone)
- Never reuse passwords
- Never store in browser — Bitwarden only

---

## 5. FULL DIGITAL STACK

```
IDENTITY LAYER
├── Google Workspace (€6/mo)
│   ├── otto@oopuo.com (primary)
│   ├── info@oopuo.com (alias)
│   ├── finance@oopuo.com (alias)
│   ├── support@oopuo.com (alias)
│   ├── hello@oopuo.com (alias)
│   └── kira@oopuo.com (alias)
│
├── Bitwarden (free or €10/yr premium)
│   └── Every account = unique password + 2FA
│
├── Domain: oopuo.com (already owned)
│
└── Recovery: personal Gmail (backup only, never public)

BUSINESS TOOLS (all registered with otto@oopuo.com)
├── GitHub — code repos
├── Calendly — scheduling (linked to Google Calendar)
├── Stripe — payments & invoicing
├── Saleshandy — cold email outreach
├── LinkedIn — personal profile + Oopuo company page
├── Notion / Google Docs — proposals, client docs
├── Plausible / PostHog — analytics
├── Hostinger — web hosting (NOT email)
└── Figma — design

FINANCE
├── Business bank account (Bunq / N26 / Revolut Business)
│   └── Dedicated IBAN for Oopuo B.V.
├── Moneybird (€17/mo) — NL accounting standard
│   └── Auto-generates invoices, BTW reports, KvK-linked
└── Stripe → bank for client payments

SECURITY
├── 2FA on EVERYTHING
├── Bitwarden = single source of truth for credentials
├── Recovery email: personal Gmail (backup only)
├── Recovery phone: personal number
└── No shared passwords — ever
```

---

## 6. MIGRATION CHECKLIST

For every existing tool you already use:

- [ ] Log in with current email
- [ ] Settings → change email to **otto@oopuo.com**
- [ ] Generate new password in Bitwarden → save
- [ ] Enable 2FA
- [ ] Delete old email association

### Priority migration order:
1. [ ] **Google Workspace** — sign up, activate otto@oopuo.com
2. [ ] **Bitwarden** — migrate local → cloud, install everywhere
3. [ ] **GitHub** — change email to otto@oopuo.com
4. [ ] **Hostinger** — change email
5. [ ] **Stripe** — set up with otto@oopuo.com
6. [ ] **Calendly** — change email, link to Google Calendar
7. [ ] **Saleshandy** — change email
8. [ ] **Moneybird** — sign up with finance@oopuo.com
9. [ ] **LinkedIn** — create Oopuo company page
10. [ ] **All remaining tools** — audit and migrate

---

## 7. DAILY WORKFLOW (How It Feels)

**New client comes in:**
1. Contact form → info@oopuo.com → inbox labeled "📥 Inbound"
2. Reply from otto@oopuo.com (personal touch)
3. Send Calendly link → books on Google Calendar
4. After call → send Stripe invoice → notification to finance@oopuo.com
5. Moneybird auto-categorizes payment
6. All passwords in Bitwarden, auto-filled everywhere

**No context switching. No "which email was this?" No password hunting.**

---

## 8. MONTHLY COST

| Service | Cost |
|---------|------|
| Google Workspace | €6/mo |
| Moneybird | €17/mo |
| Bitwarden Premium | €0.83/mo (€10/yr) |
| **Total** | **~€24/mo** |

For a fully professional, secure, scalable digital foundation.

---

*This document lives at: ~/kira/docs/oopuo-digital-infrastructure.md*
*Related: oopuo-brand-architecture.md, oopuo-website-design.md*
