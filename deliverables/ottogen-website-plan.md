# OttoGen Website — Comparison & Modification Plan

**Date:** 2026-03-03
**Prepared by:** Kira

---

## 1. Current State

### Live site (ottogen.io) = Repo code (identical)
- **Single monolithic HTML file** (71KB, 1272 lines)
- Everything inline: CSS in one `<style>` block, JS in one `<script>` block
- No build system, no framework, no package.json
- Sections: Hero, AI Systems showcase, Chat demo, Pricing, Process, Testimonials, About, Contact
- **Aesthetic:** Dark theme, blue (#0055ff) accents, ASCII art elements, animated visualizations
- **Copy focus:** "AI systems that run your business" — positioned as done-for-you AI automation for SMBs
- **Pricing model:** Starter (€497/mo), Growth (€997/mo), Enterprise (€2,497/mo) — monthly subscriptions
- **Tech logos:** OpenAI, Make, Zapier, Notion, Apollo.io, Retell.ai, Claude, Google Sheets

### Repo structure (BAD):
```
clubeedg-ship-it/ottogen-website/
  └── vdr/ottogen/ottogen-website/
        ├── index.html      (71KB monolith)
        ├── favicon.svg
        └── test-ascii.html
```

---

## 2. New Design (from website-design.md)

### Major differences from current:

| Aspect | Current (Live) | New Design |
|--------|---------------|------------|
| **Framework** | Static HTML, no build | Next.js 14 (App Router) + Tailwind |
| **Aesthetic** | Dark + blue, ASCII art | Swiss Cyberpunk: black (#0a0a0a), blue (#3b82f6), neon green (#22c55e) |
| **Typography** | System/custom inline | Inter (body) + JetBrains Mono (code) |
| **Pages** | Single page | Multi-page: /, /services, /insights, /contact |
| **Hero copy** | "AI systems that run your business while you grow it" | "AI infrastructure for businesses that refuse to be left behind" |
| **Services** | 4 chat-based AI systems (Content, Sales, Ops, Analytics) at monthly subscription | 4 consulting services (Strategy Audit, Custom AI, Training, Webinars) at project pricing |
| **Pricing** | €497-2497/mo subscriptions | €500-5000+ per project/session |
| **Portfolio** | Not present | Portfolio strip: IAM, ZenithCred, Chimera, CuttingEdge |
| **About** | Generic founder section | Specific Otto bio with age, background, LinkedIn |
| **Blog** | Not present | /insights content hub with categories |
| **Contact** | Simple form | Split: form + Calendly embed |
| **Analytics** | None | Plausible (privacy-first) |
| **Hosting** | Unknown | Vercel |
| **CMS** | None | Notion API or MDX for blog |

### Key strategic shifts:
1. **From SaaS product → Consulting/agency positioning** (project fees vs subscriptions)
2. **From single-page → multi-page with blog** (SEO play)
3. **From anonymous → Otto's personal brand** (portfolio, bio, LinkedIn)
4. **From tool showcase → thought leadership** (insights hub)

---

## 3. Restructured Repo (DONE)

Proposed clean structure:
```
ottogen-website/
├── README.md
├── package.json
├── .gitignore
├── public/
│   ├── favicon.svg
│   └── assets/          (images, logos)
├── src/
│   ├── index.html       (current site, as-is — Phase 0)
│   ├── css/
│   │   └── styles.css   (extracted from inline)
│   └── js/
│       └── main.js      (extracted from inline)
└── design/
    └── wireframes.md    (the new design spec)
```

---

## 4. Modification Plan

### Phase 0: Clean Up (1-2 hours) ✅ CAN DO NOW
1. Restructure repo (move files out of vdr/ nesting)
2. Extract inline CSS → `css/styles.css`
3. Extract inline JS → `js/main.js`
4. Add `package.json` with basic metadata
5. Add `.gitignore`
6. Add `README.md`
7. Push to repo with clean structure

### Phase 1: Quick Wins on Current Site (2-4 hours)
1. Update hero copy to match new design direction
2. Add portfolio strip section (IAM, ZenithCred, etc.)
3. Update About section with Otto's real bio
4. Add Google Analytics / Plausible
5. Fix meta tags, OG images for social sharing
6. Add Calendly embed to contact section

### Phase 2: Multi-Page Migration (1-2 days)
**Decision needed:** Stay static HTML or migrate to Next.js?

**Option A: Stay static** (faster, simpler)
- Split into separate HTML pages: services.html, insights.html, contact.html
- Add shared header/footer via includes (use 11ty or just JS injection)
- Deploy on Vercel as static

**Option B: Next.js migration** (as designed)
- Full rewrite with Tailwind, App Router, SSR
- Better for SEO and blog functionality
- More work but matches the design spec exactly
- Enables Notion CMS for blog

**Recommendation:** Option A first (ship fast), then Option B when blog content is ready.

### Phase 3: Content & SEO (ongoing)
1. Write 2 seed blog posts (adapt LinkedIn posts)
2. Set up Notion CMS integration
3. SEO optimization (keywords from design spec)
4. Professional headshot for About section

---

## 5. Open Questions for Otto

1. **Pricing model shift:** Current site shows monthly subscriptions (€497-2497/mo). New design shows project pricing (€500-5000+). Which is the actual model?
2. **Stay static or go Next.js?** Phase 1 quick wins or full rebuild?
3. **Calendly:** Is your Calendly set up? What's the booking URL?
4. **Portfolio screenshots:** Do you have visuals for IAM, ZenithCred, etc.?
5. **Headshot:** Do you have a professional photo for the About section?
