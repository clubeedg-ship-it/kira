# 📊 IAM Meeting Dashboard
### Inter Active Move — Strategy & Progress Review
**Date:** February 18, 2026 | **Prepared by:** Oopuo (Kira)

---

# 1. EXECUTIVE OVERVIEW

## What IAM Is
**Inter Active Move B.V.** develops interactive floor and wall projection systems for kindergartens, schools, healthcare, and entertainment venues. Children run, jump, and play on projected games that respond to their movement — no screens, no tablets.

## Market Opportunity

| Metric | Value |
|--------|-------|
| NL kindergarten locations (KDV) | **9,315** |
| Total childcare locations | ~15,000–16,000 |
| Addressable market (progressive/chain) | ~3,000–4,000 locations |
| TAM at €249/mo average | **€8.96M/year** |
| Global interactive projector market | $3.9B (2025), growing 11–15% CAGR |

## Current Status
- ✅ Full competitive analysis & market research completed
- ✅ Website audited, refactor plans ready (v1 & v2)
- ✅ Complete sales toolkit built (one-pager, ROI calculator, free trial package)
- ✅ Email templates & outreach sequences written (NL + EN)
- ✅ 60+ prospect leads identified and tiered
- ✅ Partnership proposals drafted for Partou & KidsFoundation
- ✅ Sales playbook with Apollo.io filters ready
- ⏳ Email migration (Hostinger → Hostnet) — pending
- ⏳ Email automation setup — pending
- ⏳ Website fixes & launch — pending

## Meeting Agenda
1. Review of all deliverables completed
2. Email migration: Hostinger → Hostnet (action plan)
3. Email automation & outreach strategy
4. Website status & next steps
5. Sales pipeline activation
6. Next steps & priorities

---

# 2. WHAT'S BEEN DONE — Deliverables Inventory

| # | Deliverable | Summary | Value |
|---|-------------|---------|-------|
| 1 | **Deep Strategy** | Full market sizing (9,315 KDVs), revenue projections (€105–120K ARR by Oct), unit economics (55–75% gross margin), partnership tiers, 8-month growth trajectory | Foundation for all decision-making — the business plan |
| 2 | **Competitive Analysis** | 7 competitors profiled (EyeClick, Lumo Play, omi, Tovertafel, etc.) with pricing, strengths, weaknesses. IAM positioned in underserved "professional but accessible" tier ($5K–$8K) | Know exactly where IAM wins and how to pitch against each competitor |
| 3 | **Website Audit** | Full inventory of 17 pages, 30 partials. Found broken links (klimwand page missing), missing SEO (no OG tags, no structured data, no analytics), compliance gaps | Clear punch list to get site launch-ready (~5–6 hours of work) |
| 4 | **Website Refactor Plan (v1 + v2)** | Enterprise rebrand specs: color palette, typography, WCAG 2.1 AA compliance, HubSpot form integration replacing WhatsApp CTAs, design system | Blueprint for a professional B2B website that converts |
| 5 | **Landing Page Copy** | Full NL + EN kindergarten landing page: hero, problem/solution, benefits, pricing table, FAQ, testimonials, CTA form | Ready to deploy — optimized for the kindergarten vertical |
| 6 | **Sales One-Pager** | Single-page PDF-ready sales sheet in Dutch: problem → solution → benefits → pricing → CTA | Leave-behind for demos and email attachments |
| 7 | **ROI Calculator** | Break-even analysis showing 0.23 extra child/month covers costs. 3-year scenarios: +€41K (conservative) to +€203K (optimistic) | Closes the "is it worth it?" objection instantly |
| 8 | **Free Trial Package** | 2-week trial offer letter + terms & conditions + evaluation framework | Removes purchase risk — "let the children decide" |
| 9 | **Email Templates (3 sets)** | Kindergarten-specific (intro/social proof/demo offer), cold outreach (personalized with merge fields), chain outreach (partnership angle) — all in Dutch + English reference | Ready to load into any email tool and send |
| 10 | **Cold Outreach Sequence** | 4-email drip: Hook → Social Proof → Value Add → Urgency/Offer, with timing (Day 0/3/7/12) | Automated sequence ready for Instantly or Woodpecker |
| 11 | **Prospect Lists** | 60+ organizations tiered: Tier 1 (large chains: Partou, Humankind, Kindergarden), Tier 2 (mid-size regional), Tier 3 (premium/Montessori early adopters) | Sales team can start calling tomorrow |
| 12 | **Partnership Proposals** | Custom proposals for Partou/KidsFoundation: pilot → rollout → full deployment. Volume pricing from 14% to 40%+ discount | Ready to send to the two largest chains in NL |
| 13 | **Sales Playbook** | Apollo.io search filters (4 segments), email sequences, AI voice agent script, weekly roadmap, KPIs, automation setup guide | Complete operational manual for sales execution |
| 14 | **Email Infrastructure Research** | Compared self-hosted, managed SMTP, and cold email tools. GDPR/Dutch law analysis for B2B cold email | Know exactly what to buy and how to stay legal |
| 15 | **Email Outreach Tools Research** | Platform comparison (Instantly, Woodpecker, Smartlead, Lemlist, Apollo) + Google Maps scraping for leads (Outscraper at €30 for all NL kindergartens) | Tool selection made — just need to subscribe and go |

---

# 3. EMAIL MIGRATION: Hostinger → Hostnet

## Current State
| Item | Status |
|------|--------|
| Current hosting | Hostinger (temporary site) |
| Current email | Hostinger-based (personal setup) |
| Domain | interactivemove.nl |
| Website URL | darkgoldenrod-crane-349726.hostingersite.com |

## Target State
| Item | Target |
|------|--------|
| Hosting | Hostnet (enterprise, NL-based) |
| Primary email | contact@interactivemove.nl |
| Email provider | Hostnet email or Microsoft 365/Google Workspace |
| Authentication | SPF + DKIM + DMARC fully configured |

## Migration Steps

| Step | Action | Priority |
|------|--------|----------|
| 1 | **Purchase Hostnet hosting plan** — choose plan that includes email or add email separately | 🔴 Do first |
| 2 | **Back up everything on Hostinger** — download site files, export any email | 🔴 Before migration |
| 3 | **Upload website to Hostnet** — static HTML site, straightforward file transfer | 🔴 |
| 4 | **Create email accounts on Hostnet** — contact@, info@, otto@ at minimum | 🔴 |
| 5 | **Update DNS/nameservers** — point interactivemove.nl to Hostnet | 🔴 |
| 6 | **Configure MX records** — point to Hostnet mail servers | 🔴 |
| 7 | **Set up SPF record** — `v=spf1 include:_spf.hostnet.nl ~all` (verify with Hostnet docs) | 🟡 |
| 8 | **Set up DKIM** — generate keys via Hostnet panel, add DNS TXT record | 🟡 |
| 9 | **Set up DMARC** — `v=DMARC1; p=none; rua=mailto:dmarc@interactivemove.nl` (start with `none`, move to `quarantine` after monitoring) | 🟡 |
| 10 | **Test email deliverability** — send test emails to Gmail, Outlook, check spam scores (mail-tester.com) | 🟡 |
| 11 | **Cancel Hostinger** — only after everything is confirmed working on Hostnet | 🟢 Last |

## Email Automation Considerations
- **Separate domains for cold outreach** — never use interactivemove.nl for cold email (risk of blacklisting)
- Buy 3–5 secondary domains (e.g., interactivemove-info.nl, iamprojectoren.nl) — ~€50–75/year total
- Set up 10–15 email accounts across these domains for outreach rotation
- Keep interactivemove.nl clean for business correspondence and website forms

## DNS Records Checklist

```
# MX (mail routing)
interactivemove.nl  MX  10  mail.hostnet.nl  (verify exact value)

# SPF (sender authorization)
interactivemove.nl  TXT  "v=spf1 include:_spf.hostnet.nl ~all"

# DKIM (email signing)
selector._domainkey.interactivemove.nl  TXT  "v=DKIM1; k=rsa; p=<key>"

# DMARC (policy)
_dmarc.interactivemove.nl  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@interactivemove.nl"
```

---

# 4. EMAIL AUTOMATION & OUTREACH STRATEGY

## Recommended Tool Stack

| Component | Recommendation | Cost | Why |
|-----------|---------------|------|-----|
| **Cold email platform** | **Instantly.ai** (Hypergrowth) | $97/mo | Best warm-up network, unlimited accounts, 100K emails/mo |
| **Budget alternative** | Woodpecker (Starter) | $24/mo + ~$70 mailboxes | EU-based (GDPR-aligned), built-in verification |
| **Lead scraping** | Outscraper (Google Maps) | ~€30 one-time | All NL kindergartens with emails for $30 |
| **CRM / lead database** | Apollo.io (Basic) | $49/mo | B2B database + email sequences + CRM |
| **Outreach domains** | 5 secondary domains | ~€75/year | Protect main domain reputation |
| **Outreach mailboxes** | 15 accounts (Google Workspace or Maildoso) | $60–86/mo | 30–50 emails/account/day = 500/day capacity |

**Total monthly cost: ~$150–230/mo** for a 500 emails/day operation.

## Automation Pipeline

```
Website Form (HubSpot) ──→ CRM (Apollo/HubSpot) ──→ Lead scoring
                                    │
Google Maps Scrape ────────→ Prospect DB ──→ Email verification
                                    │
                              Cold Outreach ──→ Instantly.ai
                                    │         (4-email sequence)
                                    │
                              Responses ──→ Demo booking ──→ Trial ──→ Close
```

## Cold Outreach Strategy

| Segment | Volume | Approach | Templates Ready? |
|---------|--------|----------|-----------------|
| Tier 1: Large chains (Partou, Humankind, etc.) | 15 orgs | Partnership proposal, HQ approach | ✅ |
| Tier 2: Mid-size regional (20–100 locations) | 35 orgs | Email sequence + phone follow-up | ✅ |
| Tier 3: Premium/Montessori independents | 15+ orgs | Personalized demo offer | ✅ |
| Broader kindergarten market | 3,000–5,000 | Automated cold email via Instantly | ✅ |

## Warm-Up Timeline

| Week | Action | Capacity |
|------|--------|----------|
| 1 | Buy domains, create mailboxes, start warm-up | 0 real emails |
| 2 | Continue warm-up, 5–10 real emails/account | ~75–150/day |
| 3 | Ramp up to 15–25/account | ~225–375/day |
| 4+ | Full capacity 30–50/account | **450–750/day** |

## GDPR / Dutch Law Status
- **B2B cold email to company addresses is legal** under Dutch Telecommunicatiewet Art. 11.7
- Requirements: clear sender ID, unsubscribe link, honor opt-outs, relevant to recipient's role
- Risk level: **Low** for professional B2B outreach to kindergartens

---

# 5. WEBSITE STRATEGY

## Current State (from audit)

| Area | Status |
|------|--------|
| Structure | 17 pages, 30 HTMX partials, bilingual (NL/EN) — **~85% complete** |
| Design | Functional but too playful for B2B. Needs enterprise rebrand |
| **Blocking issues** | Klimwand page missing (broken links everywhere), no analytics, no OG tags |
| SEO | Zero — no structured data, no canonical URLs, no hreflang |
| Compliance | Cookie consent JS exists but no banner in HTML, terms page missing |
| Conversion | WhatsApp-only CTAs, no email forms, no testimonials, no video demos |
| Performance | No lazy loading, images serve PNG instead of WebP, 17MB media folder |

## Priority Fixes

| Priority | Task | Time Est. |
|----------|------|-----------|
| 🔴 P0 | Create klimwand product page (fixes broken links on every page) | 2–3h |
| 🔴 P0 | Create algemene voorwaarden (terms) page — legal requirement | 1h |
| 🔴 P0 | Fix CSS version on over-ons.html and prijzen.html | 15min |
| 🔴 P0 | Implement cookie consent banner | 1h |
| 🟡 P1 | Add Open Graph + structured data (JSON-LD) to all pages | 2h |
| 🟡 P1 | Install analytics (Plausible or GA4) | 15min |
| 🟡 P1 | Create kindergarten landing page from our copy | 3–4h |
| 🟡 P1 | Replace WhatsApp CTAs with HubSpot form integration | 2–3h |
| 🟢 P2 | Image optimization + lazy loading | 1h |
| 🟢 P2 | Add testimonials / social proof sections | 1h |

**Total to launch-ready (P0 + P1): ~12–15 hours**

## Refactor Vision (v2)
- Enterprise color palette (IAM Blue #0052CC, professional neutrals)
- Inter + Source Sans Pro typography
- WCAG 2.1 AA compliance
- HubSpot Forms API replacing all WhatsApp CTAs
- Sector-specific accent colors (Education: orange, Healthcare: teal)
- Modal contact forms on product pages with auto-populated product name

---

# 6. SALES PIPELINE & STRATEGY

## Target Segments

| Segment | Size | Avg. Deal Value | Sales Cycle | Priority |
|---------|------|----------------|-------------|----------|
| Large chains (10+ locations) | 15 targets | €50K–500K+/year | 3–6 months | 🔴 Highest |
| Mid-size regional (20–100 loc.) | 35 targets | €5K–50K/year | 1–3 months | 🟡 Medium |
| Premium/Montessori independents | 15+ targets | €3.5K–4K/year | 2–4 weeks | 🟢 Quick wins |
| Broader KDV market (cold outreach) | 3,000+ | €3.5K–4K/year | 1–2 months | 🟡 Volume |

## Pricing & Packaging

| Option | Price | Includes |
|--------|-------|----------|
| **Lease Standard** | €199/mo | Hardware, installation, 200+ games, email support |
| **Lease Plus** | €299/mo | Hardware, installation, 500+ games, priority support |
| **Purchase** | From €3,500 | Hardware + installation + 1st year content (€49/mo thereafter) |
| **Free Trial** | 2 weeks, €0 | Full system, no commitment, we install and remove |

### Volume Discounts (for chains)

| Units | Discount | Effective Rate |
|-------|----------|---------------|
| 10–24 | 14% | €298/mo total |
| 25–49 | 26% | €258/mo total |
| 50–99 | 37% | €218/mo total |
| 100+ | 40%+ | Custom |

## Partnership Strategy

**Target #1: Partou/KidsFoundation** (~1,000+ locations combined)
- Proposal ready: 3-phase approach (pilot → 50 locations → full network)
- One deal = potentially €2.4M–4.2M ARR at scale
- Exclusivity offer available for 100+ unit commitment

**Target #2: Humankind** (465 locations)
- Humanistic pedagogy aligns perfectly with IAM's educational value proposition

**Target #3: Kindergarden** (Bright Horizons-backed, premium)
- Highest revenue per location, innovation budget, early adopter profile

## Sales Playbook Highlights
- Apollo.io filters configured for 4 segments (Education, Healthcare, Sports, Play)
- Cold email sequences ready in Dutch for each segment
- AI voice agent script drafted for phone follow-ups
- Weekly sales roadmap with KPIs defined

## Revenue Trajectory (Realistic 8-Month)

| Month | Units | MRR | ARR |
|-------|-------|-----|-----|
| Feb | 0–1 | €249 | €3K |
| Apr | 5–6 | €1.5K | €18K |
| Jun | 12–15 | €3.7K | €45K |
| Aug | 25–28 | €7K | €84K |
| Oct | 35–40 | €10K | **€105–120K** |

---

# 7. NEXT STEPS & ACTION ITEMS

## Immediate (This Week)

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | **Complete email migration to Hostnet** — hosting + email + DNS | Otto | 🔴 |
| 2 | **Fix website P0 blockers** — klimwand page, terms page, CSS versions | Otto/Dev | 🔴 |
| 3 | **Install analytics** on website (Plausible or GA4) | Otto/Dev | 🔴 |
| 4 | **Buy 3–5 outreach domains** (protect main domain) | Otto | 🟡 |

## Short-Term (Next 2 Weeks)

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 5 | **Set up Instantly.ai or Woodpecker** — create account, connect mailboxes | Otto | 🔴 |
| 6 | **Start email warm-up** (2–4 weeks before sending) | Automated | 🔴 |
| 7 | **Implement HubSpot forms** on website (replace WhatsApp) | Dev | 🟡 |
| 8 | **Create kindergarten landing page** from existing copy | Dev | 🟡 |
| 9 | **Scrape full NL kindergarten list** via Outscraper (~€30) | Otto | 🟡 |
| 10 | **Send partnership proposal** to Partou/KidsFoundation | Otto | 🟡 |

## Medium-Term (Month 1–2)

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 11 | **Launch cold email campaign** to Tier 3 (premium/Montessori) first | Otto | 🔴 |
| 12 | **Book 5–10 demos** with Tier 3 prospects (quick wins, case studies) | Otto | 🔴 |
| 13 | **Website enterprise rebrand** per v2 design system | Dev | 🟡 |
| 14 | **Approach Kindergarden** for pilot (premium, high visibility) | Otto | 🟡 |
| 15 | **Set up CRM** (Apollo.io or HubSpot) for pipeline tracking | Otto | 🟡 |

## Longer-Term (Month 2–4)

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 16 | **Convert 2–3 pilot customers** → case studies with testimonials | Otto | 🔴 |
| 17 | **Scale cold outreach** to full kindergarten list (500/day) | Otto | 🟡 |
| 18 | **Tier 1 chain outreach** with case study data from pilots | Otto | 🟡 |
| 19 | **Attend Kinderopvang Totaal** trade fair (if timing works) | Otto | 🟢 |

---

## Key Decision Points for This Meeting

1. **Hostnet plan selection** — which hosting/email package?
2. **Cold email tool** — Instantly ($97/mo) vs Woodpecker ($24/mo + mailboxes)?
3. **CRM choice** — Apollo.io vs HubSpot (free tier)?
4. **Website work** — who executes the P0 fixes and landing page?
5. **First outreach targets** — start with Tier 3 (quick wins) or go straight to chains?

---

*Prepared by Oopuo (Kira) · February 18, 2026*
*All source materials available in ~/kira/vdr/iam/*
