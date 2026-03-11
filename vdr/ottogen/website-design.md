# OttoGen — Website Wireframes & Content Architecture

*Created: 2026-02-15 | Kira Night Shift*

---

## Brand Direction

- **Aesthetic:** Swiss Cyberpunk — clean grid layouts, monospace type, neon accents on dark backgrounds
- **Tone:** Visionary but grounded. "The genius behind the companies" curriculum.
- **Colors:** Deep black (#0a0a0a), Electric blue (#3b82f6), Neon green (#22c55e), White (#fafafa)
- **Typography:** Inter (body), JetBrains Mono (code/accents)

---

## Page Structure

### 1. HERO / Landing (`/`)

```
┌─────────────────────────────────────────────────────┐
│  [OttoGen Logo]                    [Services] [Blog] [Contact] │
├─────────────────────────────────────────────────────┤
│                                                     │
│   "AI infrastructure for businesses               │
│    that refuse to be left behind."                 │
│                                                     │
│   [Book a Call →]     [See What We Build →]        │
│                                                     │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│   │ 50+     │ │ 6       │ │ €2M+    │            │
│   │ installs│ │ products│ │ managed │            │
│   └─────────┘ └─────────┘ └─────────┘            │
├─────────────────────────────────────────────────────┤
│  WHAT WE DO (3-column grid)                        │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │ AI Strategy│ │ Custom AI │ │ AI Ops &  │       │
│  │ Consulting │ │ Solutions │ │ Training  │       │
│  │            │ │           │ │           │       │
│  │ Audit your │ │ Built-to- │ │ Deploy &  │       │
│  │ workflows, │ │ spec AI   │ │ train     │       │
│  │ find AI    │ │ tools for │ │ your team │       │
│  │ leverage   │ │ your ops  │ │ on AI     │       │
│  └───────────┘ └───────────┘ └───────────┘       │
├─────────────────────────────────────────────────────┤
│  PORTFOLIO STRIP (horizontal scroll)               │
│  [IAM] [ZenithCred] [Chimera] [CuttingEdge]       │
│  Brief card per project with image + one-liner     │
├─────────────────────────────────────────────────────┤
│  ABOUT OTTO (split: image left, text right)        │
│  ┌──────┐  "20 years old. Self-taught in AI,      │
│  │ Photo│   markets, and neuroscience. Building    │
│  │      │   the future of private AI from the      │
│  └──────┘   Netherlands."                          │
│             [LinkedIn →] [Follow the journey →]    │
├─────────────────────────────────────────────────────┤
│  CTA BANNER                                        │
│  "Ready to integrate AI into your business?"       │
│  [Schedule Free Consultation →]                    │
├─────────────────────────────────────────────────────┤
│  FOOTER: © Oopuo Group | Privacy | Links           │
└─────────────────────────────────────────────────────┘
```

### 2. SERVICES (`/services`)

```
┌─────────────────────────────────────────────────────┐
│  HEADER: "What We Build"                           │
├─────────────────────────────────────────────────────┤
│  SERVICE 1: AI Strategy Audit                      │
│  ┌─────────────────────────────────────────┐       │
│  │ Icon + Title                            │       │
│  │ We map your business processes, identify │       │
│  │ AI leverage points, and deliver a        │       │
│  │ prioritized roadmap.                     │       │
│  │                                          │       │
│  │ Deliverables:                            │       │
│  │ • Process audit report                   │       │
│  │ • AI opportunity matrix                  │       │
│  │ • 90-day implementation roadmap          │       │
│  │ • ROI projections                        │       │
│  │                                          │       │
│  │ Price: From €2,500                       │       │
│  │ [Get Started →]                          │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
│  SERVICE 2: Custom AI Solutions                    │
│  (Same card format)                                │
│  • Chatbots, automation, data pipelines            │
│  • Price: From €5,000                              │
│                                                     │
│  SERVICE 3: AI Training & Workshops                │
│  • Team upskilling, prompt engineering, AI ops     │
│  • Price: From €1,500/session                      │
│                                                     │
│  SERVICE 4: Webinars & Speaking                    │
│  • "Future of AI" series, private corporate events │
│  • Price: From €500/session                        │
└─────────────────────────────────────────────────────┘
```

### 3. BLOG / CONTENT HUB (`/insights`)

```
┌─────────────────────────────────────────────────────┐
│  HEADER: "Insights"                                │
│  Filter: [All] [AI Strategy] [Privacy] [Technical] │
├─────────────────────────────────────────────────────┤
│  GRID (2-column)                                   │
│  ┌──────────────┐ ┌──────────────┐                │
│  │ Featured     │ │ Latest       │                │
│  │ article with │ │ article      │                │
│  │ large image  │ │              │                │
│  └──────────────┘ └──────────────┘                │
│  ┌──────────────┐ ┌──────────────┐                │
│  │ Article      │ │ Article      │                │
│  └──────────────┘ └──────────────┘                │
│                                                     │
│  [Load More →]                                     │
└─────────────────────────────────────────────────────┘
```

### 4. CONTACT (`/contact`)

```
┌─────────────────────────────────────────────────────┐
│  Split layout:                                     │
│  LEFT: Contact form                                │
│  • Name, Email, Company, Message                   │
│  • [Send Message →]                                │
│                                                     │
│  RIGHT: Direct booking                             │
│  • Calendly embed (30-min consultation)            │
│  • Email: otto@ottogen.ai                          │
│  • LinkedIn link                                   │
└─────────────────────────────────────────────────────┘
```

---

## Technical Spec

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Framework | Next.js 14 (App Router) | SSR for SEO, React ecosystem |
| Styling | Tailwind CSS | Matches Swiss Cyberpunk aesthetic, fast |
| CMS | Notion API or MDX | Otto already uses Notion |
| Hosting | Vercel | Free tier, instant deploys |
| Analytics | Plausible | Privacy-first (on brand) |
| Booking | Calendly embed | Simple, proven |
| Forms | Resend + React Email | Clean transactional emails |

---

## Content Priorities (Phase 1)

1. ✅ Hero section copy + stats
2. ✅ 3 service descriptions with pricing
3. ◻ Portfolio project cards (need screenshots)
4. ◻ Otto bio paragraph + headshot
5. ◻ 2 seed blog posts (LinkedIn posts adapted)
6. ◻ Calendly setup

---

## SEO Keywords

Primary: "AI consulting Netherlands", "AI strategy for SMB", "AI automation services"
Secondary: "privacy AI", "custom AI solutions", "AI workshops Netherlands"
Long-tail: "how to integrate AI into small business", "AI audit for companies"

---

*Next step: Build the landing page as a single HTML prototype for Otto's review.*
