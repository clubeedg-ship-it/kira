# 19 — Billing & Payments

---

## Tiers

| | Free | Pro | Self-Hosted |
|---|---|---|---|
| **Price** | $0 | TBD by Otto | $0 (BYO server) |
| **Messages** | 50/day | Unlimited | Unlimited |
| **Memory** | 7-day retention | Unlimited | Unlimited |
| **Channels** | Web only | All (Telegram, Discord, etc.) | All |
| **Models** | Sonnet only | All models | Your choice |
| **Storage** | 100MB | 5GB | Your server |
| **Sub-agents** | — | Up to 5 | Unlimited |
| **Support** | Community | Priority | Community |

**Note:** Users bring their own API key for LLM costs, OR use the server default (subject to tier quotas). LLM costs are pass-through — Kira doesn't mark up API usage.

## Free-Access Accounts (Testing)

Admin can create accounts with `tier: 'free-access'` — full Pro features, $0 cost. For:
- Otto's friends testing the platform
- Beta testers
- Demo accounts

```sql
-- Admin sets via API
PATCH /api/admin/users/:id { "tier": "free-access" }
```

Free-access accounts have Pro quotas but no billing. They show as "Free Access" in admin panel so Otto can track who's testing.

## Payment Provider: Stripe

### Why Stripe
- Industry standard, handles everything (cards, invoices, subscriptions, webhooks)
- Stripe Checkout for signup → no custom payment forms
- Stripe Customer Portal for users to manage billing
- Webhook-driven: subscription events update user tier in our DB

### Integration

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

### Flow: Free → Pro Upgrade

```
1. User clicks "Go Pro" (in Settings or splash pricing)
2. POST /api/billing/checkout → creates Stripe Checkout Session
3. Redirect to Stripe Checkout (hosted page)
4. User pays → Stripe redirects back to app
5. Webhook: checkout.session.completed → update user tier to 'pro'
6. User refreshes → Pro features unlocked
```

### Flow: Manage / Cancel

```
1. User clicks "Manage Billing" in Settings
2. POST /api/billing/portal → creates Stripe Customer Portal Session
3. Redirect to Stripe Portal (user can cancel, update card, view invoices)
4. Webhook: customer.subscription.deleted → downgrade user to 'free'
```

### Webhooks We Handle

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set user tier = 'pro', store Stripe customer ID |
| `customer.subscription.updated` | Update tier based on subscription status |
| `customer.subscription.deleted` | Downgrade to 'free' |
| `invoice.payment_failed` | Mark user as 'past_due', send notification |
| `invoice.paid` | Clear 'past_due' flag |

### Schema Addition (system.db)

```sql
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'none';
-- none | active | past_due | canceled
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/billing/checkout` | Create Stripe Checkout session → return URL |
| POST | `/api/billing/portal` | Create Stripe Portal session → return URL |
| GET | `/api/billing/status` | Current tier, subscription status, next billing date |
| POST | `/api/billing/webhook` | Stripe webhook receiver (PUBLIC, verified by signature) |

## Settings UI — Billing Section

```
┌─ Billing ─────────────────────────────────────┐
│                                                │
│  Current Plan: Free                            │
│                                                │
│  ┌─ Pro Plan ─ $X/mo ───────────────────────┐  │
│  │ Unlimited messages, all channels,         │  │
│  │ all models, 5GB storage                   │  │
│  │                                           │  │
│  │ [Upgrade to Pro →]                        │  │
│  └───────────────────────────────────────────┘  │
│                                                │
│  Usage This Month:                             │
│  Messages: 23/50 daily │ Tokens: 120K          │
│  Storage: 12MB / 100MB                         │
└────────────────────────────────────────────────┘
```

For Pro users:
```
┌─ Billing ─────────────────────────────────────┐
│                                                │
│  Current Plan: Pro — $X/mo                     │
│  Next billing: March 11, 2026                  │
│  Payment: •••• 4242                            │
│                                                │
│  [Manage Billing →]  (opens Stripe Portal)     │
│                                                │
│  Usage This Month:                             │
│  Messages: 847 │ Tokens: 2.1M │ Cost: ~$3.20   │
│  Storage: 234MB / 5GB                          │
└────────────────────────────────────────────────┘
```

## Build Phase

Billing goes into **Phase 10 (Settings)** — after core features work, before marketing launch. Stripe integration is ~2 hours of work (Checkout + Portal + webhooks). No custom payment UI needed.
