# IAM Website Review — github.com/clubeedg-ship-it/iam-website
*Reviewed: 2026-02-08 | Reviewer: Kira (AI subagent)*

---

## Current State: ~85% Complete

The site is a well-built static website for Inter Active Move B.V. using HTML5 + CSS + HTMX for SPA-like i18n. It's production-ready in structure but has several missing pieces that would cause broken links and gaps.

---

## Tech Stack
- **100% static site** — no backend, no build step
- HTML5 + Vanilla CSS (~1700 lines) + HTMX 1.9 for language switching
- Vanilla JS Canvas API for interactive particle background (`projector.js`)
- Self-hosted fonts (Inter) and HTMX for GDPR compliance
- Cookie consent + privacy/cookie policy pages included
- Bilingual: Dutch (default) + English via HTMX partial swapping

---

## What's Finished ✅

| Item | Status |
|------|--------|
| Homepage (index.html) | ✅ Complete with hero video, stats, products, testimonials, FAQ, contact form |
| 6 product pages (vloer, muur, zandbak, tekeningen, mobiele-vloer, software) | ✅ Shell + NL/EN partials |
| 7 solution pages (bouw-een-park, 3d-spellen, parken-speelhallen, onderwijs, zorg-revalidatie, over-ons, prijzen) | ✅ Shell + NL/EN partials |
| i18n system (NL/EN) | ✅ Working shell+partial pattern |
| Interactive particle background | ✅ Fully functional |
| Mobile navigation (hamburger) | ✅ Implemented |
| Contact form → WhatsApp | ✅ Working |
| GDPR compliance (cookie consent, privacy policy, cookie policy, accessibility page) | ✅ Complete |
| Responsive design | ✅ Mobile-first CSS |
| SEO basics (meta tags, sitemap.xml, robots.txt) | ✅ Present |

---

## What's Incomplete / Broken 🚨

### 1. Missing: Interactieve Klimwand (Climbing Wall) page
- **Severity: HIGH** — Linked from navigation on EVERY page (~60+ references across all partials)
- `products/interactieve-klimwand.html` — **does not exist**
- `partials/products/interactieve-klimwand-nl.html` — **does not exist**
- `partials/products/interactieve-klimwand-en.html` — **does not exist**
- Product images exist: `media/products/interactieve-klimwand.png/.webp` ✅
- Hero image missing: `media/hero_interactieve_klimwand.png` — **does not exist** (referenced in muur partials)
- **Fix:** Create shell + NL/EN partials following existing product page pattern
- **Time estimate: 2-3 hours**

### 2. Placeholder social media links
- **Severity: MEDIUM** — Facebook, Twitter, YouTube links are all `href="#"` in every footer
- Found in all 16 partials + index.html
- **Fix:** Replace with actual IAM social URLs (or remove if no accounts exist)
- **Time estimate: 15 minutes**

### 3. Missing: `partials/content-nl.html` and `partials/content-en.html`
- **Severity: LOW** — These appear to be old/legacy homepage partials (pre-redesign). The current `partials/index-nl.html` and `partials/index-en.html` are the active ones. These orphan files should be removed or clarified.
- **Time estimate: 5 minutes** (delete)

### 4. Interactieve Tekeningen (Interactive Drawings) product
- **Severity: LOW** — Page exists with shell + partials but is NOT in main nav or README
- Listed in navigation within other product partials but missing from `index.html` homepage nav and product grid
- **Fix:** Either add to main nav + homepage product grid, or remove references
- **Time estimate: 30 minutes**

### 5. No analytics
- **Severity: MEDIUM** — No Google Analytics, Plausible, or any tracking
- **Fix:** Add privacy-friendly analytics (Plausible recommended for GDPR)
- **Time estimate: 15 minutes**

### 6. `tools/migrate_i18n.py` has hardcoded path
- **Severity: LOW** — Dev tooling only, not user-facing
- **Time estimate: 10 minutes**

---

## Cross-Reference with IAM Landing Page Copy

Our landing page copy (`vdr/iam-landing-page-copy.md`) is specifically focused on **kindergartens/kinderdagverblijven** — a specific vertical. The existing website is broader (education, healthcare, entertainment, parks). Here's what can be injected:

### Can Inject Directly ✅
| Copy Section | Where to Put It |
|---|---|
| Hero headline/subheadline (NL+EN) | New kindergarten landing page OR update `onderwijs.html` |
| Problem section (7 hours sitting stats) | `onderwijs.html` or new kindergarten page |
| Solution section (how it works, 4 steps) | `products/interactieve-vloer.html` — enhance existing content |
| Benefits (6 blocks: learning, activity, time-saving, library, maintenance, enrollment) | `onderwijs.html` or vloer product page |
| Pricing table (Lease Basic/Plus/Purchase) | `prijzen.html` — currently has pricing but could be enhanced with kindergarten-specific tiers |
| FAQ section (8 detailed Q&As) | Supplement existing FAQ on homepage and/or add to onderwijs page |
| Testimonials (3 quotes) | Replace placeholder names with real ones when available |
| SEO meta tags | Update `<head>` on relevant pages |
| CTA form fields | Enhance existing contact form with kindergarten-specific fields |

### Recommended Approach
1. **Create a dedicated kindergarten landing page** (`kinderdagverblijven.html`) using the full copy — this is optimized for that vertical and shouldn't dilute the general site
2. **Enhance `onderwijs.html`** with the problem/solution framing from the copy
3. **Update `prijzen.html`** with the lease pricing model from the copy
4. **Add the kindergarten FAQs** to existing FAQ sections

---

## Recommended Actions to Launch

| Priority | Action | Time | Notes |
|----------|--------|------|-------|
| 🔴 P0 | Create klimwand product page (shell + NL/EN partials) | 2-3h | Broken links on every page |
| 🔴 P0 | Fix or remove social media links (footer) | 15min | Placeholder `#` links look unprofessional |
| 🟡 P1 | Add Interactieve Tekeningen to main nav + homepage grid | 30min | Product exists but hidden |
| 🟡 P1 | Create kindergarten landing page from our copy | 3-4h | New vertical-specific landing page |
| 🟡 P1 | Add analytics (Plausible/GA4) | 15min | Can't measure anything currently |
| 🟢 P2 | Inject kindergarten copy into onderwijs.html | 1-2h | Enhance education page |
| 🟢 P2 | Update prijzen.html with lease pricing model | 1h | Add kindergarten-specific pricing |
| 🟢 P2 | Clean up orphan partials (content-nl/en.html) | 5min | Housekeeping |
| 🟢 P2 | Fix migrate_i18n.py hardcoded path | 10min | Dev tooling |
| ⚪ P3 | Image optimization (media folder ~17MB) | 30min | Performance |
| ⚪ P3 | Add lazy loading to images | 30min | Performance |

**Total estimated time to launch-ready: ~5-6 hours** (P0 + P1 items)
**Total with all improvements: ~10-12 hours**

---

## Summary

Otto's repo is solid — well-structured, GDPR-compliant, bilingual, and visually polished. The main blocker is the missing Klimwand page causing broken links everywhere. Fix that + social links, and the general site is launchable. The kindergarten copy we have is a perfect fit for a dedicated landing page that can drive the childcare vertical.
