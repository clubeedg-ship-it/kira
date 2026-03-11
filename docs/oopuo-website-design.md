# OOPUO.COM — Website Design Specification

*Rebrand from OttoGen → Oopuo. Enterprise-grade. Design-first.*

---

## DESIGN PHILOSOPHY

**References to study:**
- **Palantir** — Dark, authoritative, enterprise gravity. "We build for the hardest problems."
- **Vercel** — Clean, dev-friendly, dark theme with sharp typography and glowing accents
- **Linear** — Minimal, fast-feeling, product-led with subtle animations
- **Stripe** — The gold standard of "enterprise but beautiful"

**Oopuo vibe:** Palantir's gravity + Vercel's polish + Linear's speed feeling.

**Not:** Generic Framer template. Not a startup landing page. Not a portfolio site.

---

## DESIGN SYSTEM

### Colors
```
Background:     #0A0A0A (near-black)
Surface:        #141414 (cards, sections)
Border:         #1F1F1F (subtle dividers)
Text Primary:   #FAFAFA (white)
Text Secondary: #888888 (muted)
Accent:         #3B82F6 (electric blue — trust, tech)
Accent Glow:    #3B82F6 @ 20% opacity (hover states, highlights)
Success:        #22C55E (green accents)
Warning:        #F59E0B
```

### Typography
```
Headings:   Inter or Geist (tight tracking, -0.02em)
Body:       Inter (16px, 1.6 line height)
Mono:       JetBrains Mono (code snippets, stats)
```

### Principles
- **Dark mode only** — signals serious tech, not a playful agency
- **Generous whitespace** — let the work breathe
- **Subtle motion** — fade-in on scroll, not flashy animations
- **Sharp edges** — border-radius: 8px max. No bubbly cards.
- **Grid system** — 12-column, 1200px max-width
- **No stock photos** — use abstract visuals, screenshots, data viz

---

## SITEMAP & PAGE STRUCTURE

```
oopuo.com/
├── / (Home)
├── /services (SMB tier)
├── /enterprise (Enterprise tier)
├── /portfolio (All projects carousel + detail pages)
│   ├── /portfolio/zenithcred
│   ├── /portfolio/interactive-move
│   ├── /portfolio/solyx-energy
│   ├── /portfolio/sentinagro
│   └── /portfolio/[project]
├── /about
├── /contact
└── /blog (future)
```

---

## PAGE DESIGNS

### 1. HOME (/)

**Purpose:** Instantly communicate what Oopuo is. Route visitors to their tier.

#### Hero Section
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Logo: OOPUO (top-left, minimal)       Nav: Services │   │
│                                        Enterprise │      │
│                                        Portfolio │       │
│                                        About │ Contact   │
│                                                          │
│                                                          │
│        We build AI systems                               │
│        that run your business.                           │
│                                                          │
│        [subtext: From intelligent websites to            │
│         private enterprise AI — we architect             │
│         systems that think, scale, and protect.]         │
│                                                          │
│        [CTA: See Our Work]   [CTA: Talk to Us]           │
│                                                          │
│                                                          │
│        ─── Subtle animated grid / particle bg ───        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Two-Path Section (Route SMB vs Enterprise)
```
┌──────────────────────────┬───────────────────────────────┐
│                          │                               │
│  🔷 FOR GROWING          │  🔷 FOR ENTERPRISE            │
│     BUSINESSES           │                               │
│                          │                               │
│  Websites, inventory,    │  Private AI, local models,    │
│  AI support — the full   │  governance, automation at    │
│  digital backbone.       │  institutional scale.         │
│                          │                               │
│  Starting at €397/mo     │  Starting at €2,500/mo        │
│                          │                               │
│  [Explore Services →]    │  [Explore Enterprise →]       │
│                          │                               │
└──────────────────────────┴───────────────────────────────┘
```

#### Portfolio Carousel
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  What we've built                                        │
│                                                          │
│  ◄  [Card: ZenithCred]  [Card: IAM]  [Card: Solyx]  ►   │
│      Corporate wellness   Interactive    Energy          │
│      gamification         projectors     solutions       │
│                                                          │
│  [View All Projects →]                                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```
Cards: Screenshot/mockup + project name + one-line description + category tag.
Auto-scrolling. Click opens /portfolio/[project].

#### Stats Bar
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   6+ Projects Delivered    €1.1M+ Funding Raised         │
│   3 Industries Served      100% Client Retention         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```
Mono font. Animated count-up on scroll.

#### Trust / Tech Section
```
Built on our own infrastructure.
Oopuo runs on Chimera — our privacy-preserving AI compute layer.
Your data stays yours. No third-party APIs. No cloud lock-in.

[Learn more about our tech →]
```

#### Footer
```
OOPUO
Netherlands-based AI infrastructure company.

Services | Enterprise | Portfolio | About | Contact
LinkedIn | GitHub

© 2026 Oopuo B.V. | KVK: XXXXXXXX
```

---

### 2. SERVICES (/services)

**Audience:** Solyx-type clients. SMBs who need digital infrastructure.

#### Hero
```
Intelligent systems for growing businesses.

Website. Inventory. Support. All powered by AI —
so your business runs even when you don't.
```

#### Service Cards (4 cards, grid layout)
Each card:
- Icon (abstract, not emoji)
- Service name
- 2-line description
- "From €X,XXX" (project fee)
- [Learn more →]

```
┌─────────────────┐  ┌─────────────────┐
│  Web Design &   │  │  Business       │
│  Development    │  │  Systems        │
│                 │  │                 │
│  Brand website  │  │  Inventory,     │
│  that converts  │  │  CRM, ops       │
│                 │  │                 │
│  From €3,500    │  │  From €2,500    │
└─────────────────┘  └─────────────────┘
┌─────────────────┐  ┌─────────────────┐
│  AI Customer    │  │  Brand &        │
│  Support        │  │  Strategy       │
│                 │  │                 │
│  Chat, voice,   │  │  Identity,      │
│  email — 24/7   │  │  positioning    │
│                 │  │                 │
│  From €2,000    │  │  From €2,000    │
└─────────────────┘  └─────────────────┘
```

#### Pricing Table
```
MONTHLY PLANS (stackable)

┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│  Website &       │  Inventory /     │  AI Customer     │  ⭐ Full Stack   │
│  Maintenance     │  Business System │  Support         │  (All-in-one)    │
│                  │                  │                  │                  │
│  €397/mo         │  €497/mo         │  €497/mo         │  €1,097/mo       │
│                  │                  │                  │  Save €294       │
│  • Hosting       │  • System ops    │  • Chatbot ops   │  • Everything    │
│  • Updates       │  • Bug fixes     │  • Voice AI      │  • Priority      │
│  • SEO           │  • Iterations    │  • Training      │  • Monthly call  │
│  • Small changes │  • Data backups  │  • Monitoring     │  • Strategy      │
│  • Uptime mon.   │  • Integrations  │  • Improvements  │                  │
│                  │                  │                  │                  │
│  [Choose →]      │  [Choose →]      │  [Choose →]      │  [Choose →]      │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘

All plans require initial project setup. Billed monthly. Cancel anytime.
```

#### Process Section
```
How we work

1. Discovery    → We learn your business (free consultation)
2. Architecture → We design the system, not just screens
3. Build        → 2-6 week delivery depending on scope
4. Launch       → Go live with full support
5. Grow         → Monthly retainer keeps it evolving
```

#### CTA
```
Ready to build?
Book a free 30-minute discovery call.
[Schedule Now →]
```

---

### 3. ENTERPRISE (/enterprise)

**Audience:** MSTA-type clients. Institutional. Privacy-sensitive. Big budgets.

#### Hero
```
Private AI infrastructure
for organizations that can't
afford to get it wrong.

Local models. Your data. Your control.

[Request a Consultation →]
```

#### Capabilities Grid
```
┌─────────────────────┐  ┌─────────────────────┐
│  AI Strategy &      │  │  Local AI            │
│  Governance         │  │  Deployment          │
│                     │  │                      │
│  Framework design,  │  │  On-premise LLMs,    │
│  policy docs,       │  │  private inference,  │
│  compliance         │  │  zero data leakage   │
│                     │  │                      │
│  From €8,000        │  │  From €15,000        │
└─────────────────────┘  └─────────────────────┘
┌─────────────────────┐  ┌─────────────────────┐
│  Internal           │  │  Data                │
│  Automation         │  │  Infrastructure      │
│                     │  │                      │
│  Document AI,       │  │  Pipelines,          │
│  workflow engine,   │  │  analytics,          │
│  integrations       │  │  dashboards          │
│                     │  │                      │
│  From €10,000       │  │  From €10,000        │
└─────────────────────┘  └─────────────────────┘
```

#### Enterprise Pricing
```
ONGOING SUPPORT

┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│  AI Operations   │  Infrastructure  │  Dedicated       │  ⭐ Enterprise   │
│  & Monitoring    │  Maintenance     │  AI Engineering  │  Full Stack      │
│                  │                  │                  │                  │
│  €2,500/mo       │  €1,500/mo       │  €4,500/mo       │  €8,500/mo       │
│                  │                  │                  │                  │
│  • Model ops     │  • Server ops    │  • 40h/mo bank   │  • Everything    │
│  • Drift detect  │  • Security      │  • Feature dev   │  • Account lead  │
│  • Performance   │  • Scaling       │  • Optimization  │  • SLA backed    │
│  • Incidents     │  • Backups       │  • Consulting    │  • Strategy      │
│                  │                  │                  │                  │
│  [Select →]      │  [Select →]      │  [Select →]      │  [Contact Us →]  │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘

Custom engagements available. All projects scoped individually.
```

#### Why Oopuo (Trust builders)
```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  🔒      │  │  🇪🇺      │  │  🏗️      │  │  🤝      │
│  Zero    │  │  EU       │  │  We      │  │  Your    │
│  cloud   │  │  native,  │  │  built   │  │  team,   │
│  lock-in │  │  GDPR     │  │  Chimera │  │  not a   │
│          │  │  native   │  │  — our   │  │  vendor  │
│          │  │          │  │  own AI  │  │          │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

#### CTA
```
Let's discuss your infrastructure.
[Request Consultation →]
```

---

### 4. PORTFOLIO (/portfolio)

**Full-width carousel + grid view toggle.**

Each project card:
```
┌──────────────────────────────────┐
│  [Screenshot / Hero Image]       │
│                                  │
│  ZenithCred                      │
│  Corporate Wellness Platform     │
│                                  │
│  Tags: [Startup] [Gamification]  │
│        [Hardware + Software]     │
│                                  │
│  [View Case Study →]             │
└──────────────────────────────────┘
```

Filter tabs at top: `All | Startups | Client Work | Internal`

Each case study page (/portfolio/[project]):
- Hero image
- Challenge → Solution → Result
- Tech stack used
- Screenshots / demo
- Testimonial (if available)
- [Back to Portfolio] [Next Project →]

**Projects to feature:**
1. ZenithCred — wellness gamification (investment stage)
2. Interactive Move (IAM) — interactive projectors
3. Solyx Energy — website + systems (when complete)
4. SentinAgro — drone monitoring (concept/planned)
5. CuttingEdge — interior design PM
6. Abura Cosmetics — sales support

---

### 5. ABOUT (/about)

```
Built in the Netherlands.
Powered by conviction.

[Photo/avatar of Otto]

Otto — Founder & CEO
Self-taught AI architect. Building infrastructure
that puts data ownership back in people's hands.

Our mission: Make AI private, accessible, and unstoppable.

Timeline:
2025 — Founded Oopuo
2025 — Built Chimera (privacy-preserving AI compute)
2026 — Launched services arm
2026 — ZenithCred raises seed round
```

---

## BUILD PLAN

### Platform: **Framer** (fast, visual, ships in days not weeks)
or **Next.js on Vercel** (if you want full control + code)

**Recommendation:** Start with Framer for speed. Migrate to Next.js when portfolio grows.

### Phase 1 — Ship in 3-5 days:
1. Home page (hero, two-path, carousel, stats, footer)
2. Services page (cards, pricing table, process)
3. Enterprise page (capabilities, pricing, trust)
4. Contact page (form + Calendly embed)
5. Portfolio page (carousel + 2-3 case study stubs)

### Phase 2 — Week 2:
6. Individual case study pages
7. About page
8. SEO + meta tags + OG images
9. Analytics (Plausible or PostHog, not Google)

### Phase 3 — Ongoing:
10. Blog
11. Case study depth (results, numbers)
12. Client testimonials
13. Localization (Dutch version)

---

## CRITICAL DESIGN RULES

1. **No "AI" in every sentence** — show it, don't say it
2. **No generic stock imagery** — use real screenshots, abstract art, or nothing
3. **Price confidence** — show pricing openly. Enterprise clients respect transparency.
4. **Speed** — page must load in <2s. No heavy animations.
5. **Mobile-first** — 60%+ visitors will be on phone (LinkedIn traffic)
6. **One CTA per section** — don't overwhelm
7. **Dark mode only** — consistency, seriousness, differentiation
