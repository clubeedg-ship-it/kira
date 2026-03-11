# IAM Website Audit — 2026-02-12

**Auditor:** Kira (COO, Oopuo)  
**Repository:** `~/iam-website/`  
**Domain:** interactivemove.nl  
**Stack:** Static HTML5 + HTMX 1.9 + Vanilla CSS/JS

---

## Executive Summary

The site is structurally complete with 17 shell pages, 30 HTMX partials (NL/EN), local fonts, cookie consent JS, and legal pages. However, there are **several broken links, missing pages, inconsistent asset versioning, zero Open Graph/structured data, and incomplete compliance implementation**. These issues need resolution before the site can be considered production-ready.

---

## 1. What's Done & Working ✅

| Area | Status |
|------|--------|
| **17 HTML shell pages** | All present with proper `<head>`, viewport, title, description meta |
| **30 HTMX partials** | NL + EN for all major pages and products |
| **HTMX i18n system** | Shell + partial swap pattern fully implemented |
| **projector.js** | Interactive particle canvas background |
| **styles.css** | ~1,700 lines, CSS custom properties, responsive breakpoints |
| **Local fonts** | Inter (4 weights) self-hosted as woff2 in `media/fonts/` |
| **robots.txt** | Proper Allow/Disallow rules, sitemap reference |
| **sitemap.xml** | 16 URLs covering all main pages + legal pages |
| **Media assets** | Dual format (PNG + WebP) for all hero/product images |
| **Legal pages** | `privacybeleid.html`, `cookiebeleid.html`, `toegankelijkheid.html` created |
| **Cookie consent** | `js/cookie-consent.js` exists |
| **WhatsApp CTAs** | Integrated across pages |
| **Reference material** | `reference/scraped-content/interactivemove-content.md` |
| **Strategy docs** | `UX_CONVERSION.md`, `COMPLIANCE_AUDIT.md` — comprehensive guides |

---

## 2. Broken & Incomplete 🔴

### 2.1 Missing Pages (Broken Links)

| Missing File | Linked From | Impact |
|---|---|---|
| **`products/interactieve-klimwand.html`** | Multiple partials (3d-spellen, parken-speelhallen, bouw-een-park, over-ons) + sitemap | **HIGH** — 404 for visitors, broken sitemap entry |
| **`algemene-voorwaarden.html`** (Terms & Conditions) | `cookiebeleid.html`, `privacybeleid.html` footer | **HIGH** — Legal compliance gap + broken links |

### 2.2 Missing Partials

| Missing | Impact |
|---|---|
| `partials/products/interactieve-klimwand-nl.html` | No content even if shell existed |
| `partials/products/interactieve-klimwand-en.html` | No content even if shell existed |
| `partials/cookiebeleid-nl.html` / `-en.html` | Legal pages have NO i18n support |
| `partials/privacybeleid-nl.html` / `-en.html` | Legal pages have NO i18n support |
| `partials/toegankelijkheid-nl.html` / `-en.html` | Legal pages have NO i18n support |

### 2.3 CSS Version Mismatch

| File | Version |
|---|---|
| `over-ons.html` | `styles.css?v=1.1` ❌ |
| `prijzen.html` | `styles.css?v=1.1` ❌ |
| All other pages | `styles.css?v=1.3` ✅ |

**Impact:** over-ons and prijzen may serve stale cached CSS.

### 2.4 Sitemap Gaps

Missing from `sitemap.xml`:
- `products/interactieve-tekeningen.html` (exists on disk, has partials)
- `interactieve-tekeningen` partials exist but page not documented anywhere

### 2.5 Orphaned / Undocumented Content

| Item | Notes |
|---|---|
| `partials/content-nl.html` / `content-en.html` (348/341 lines) | Purpose unclear — not referenced by any shell page. Possibly legacy or unused. |
| `products/interactieve-tekeningen.html` + partials | Product page exists but not in CLAUDE.md, README, or sitemap. New product or rename of klimwand? |

### 2.6 Font Path Issue

`styles.css` uses **absolute paths** for fonts: `url('/media/fonts/Inter-Light.woff2')`. This will **break** if the site is deployed to a subdirectory (e.g., GitHub Pages project page).

---

## 3. What's Missing Entirely ⚪

### 3.1 SEO

| Item | Status |
|---|---|
| **Open Graph tags** (og:title, og:image, og:description) | ❌ None on any page |
| **Twitter Card tags** | ❌ None |
| **Structured Data** (JSON-LD) | ❌ None — no Organization, Product, or BreadcrumbList schema |
| **Canonical URLs** | ❌ Not set on any page |
| **hreflang tags** | ❌ Missing — critical for NL/EN bilingual SEO |
| **XML sitemap lastmod dates** | ❌ No `<lastmod>` elements |

### 3.2 Analytics & Tracking

| Item | Status |
|---|---|
| Google Analytics / GA4 | ❌ Not installed |
| Google Search Console verification | ❌ No meta tag |
| Conversion tracking | ❌ None |
| Hotjar / heatmaps | ❌ None |

### 3.3 Performance

| Item | Status |
|---|---|
| `loading="lazy"` on images | ❌ Not implemented |
| `<picture>` elements with WebP fallback | ❌ WebP files exist but HTML references PNG |
| Service worker / offline support | ❌ |
| Preload hints for critical CSS/fonts | ❌ |
| Image compression / optimization audit | Not done (17MB media folder) |

### 3.4 Compliance (per COMPLIANCE_AUDIT.md)

| Item | Status |
|---|---|
| Cookie consent **banner UI** | ❌ JS file exists but no evidence of banner in HTML shells |
| GDPR consent checkboxes on WhatsApp CTAs | ❌ |
| KvK/BTW number in footer | Needs verification |
| Algemene Voorwaarden page | ❌ Missing entirely |

### 3.5 Conversion Elements

| Item | Status |
|---|---|
| Contact form (email-based alternative to WhatsApp) | ❌ |
| Newsletter signup | ❌ |
| Customer testimonials / case studies | ❌ |
| Client logo wall | ❌ |
| Video demos on product pages | ❌ (only hero-video.webm on homepage) |
| Social proof counters | ❌ |

---

## 4. Prioritized Recommendations

### P0 — Fix Before Launch (Blocking)

1. **Create `products/interactieve-klimwand.html`** + NL/EN partials — multiple pages link to it
2. **Create `algemene-voorwaarden.html`** — legal requirement, linked from legal pages
3. **Fix CSS version** on `over-ons.html` and `prijzen.html` → `v=1.3`
4. **Implement cookie consent banner** — JS exists but needs HTML integration
5. **Add Open Graph tags** to all pages (title, description, image, url, type)

### P1 — Critical for SEO & Compliance (Week 1)

6. Add `<link rel="canonical">` to all pages
7. Add `hreflang` tags for NL/EN variants
8. Add JSON-LD structured data (Organization on homepage, Product on product pages)
9. Add `interactieve-tekeningen` to sitemap (or clarify if it should exist)
10. Clarify/remove orphaned `partials/content-nl.html` and `content-en.html`
11. Create i18n partials for legal pages (privacy, cookies, accessibility)
12. Fix absolute font paths in `styles.css` → relative paths

### P2 — Performance & Conversion (Week 2-3)

13. Add `loading="lazy"` to all below-fold images
14. Use `<picture>` elements to serve WebP with PNG fallback
15. Install analytics (GA4 or privacy-friendly alternative like Plausible)
16. Add customer testimonials / social proof sections
17. Add video demos to product pages
18. Build email-based contact form as WhatsApp alternative
19. Compress/optimize media folder (currently ~17MB)

### P3 — Nice-to-Have (Backlog)

20. Service worker for offline support
21. Bundle HTMX locally (currently CDN-dependent)
22. Add `<lastmod>` dates to sitemap
23. Newsletter signup integration
24. A/B test CTAs
25. Mobile particle count reduction in `projector.js`
26. Fix `tools/migrate_i18n.py` hardcoded path

---

## 5. File Inventory Summary

| Category | Count | Notes |
|---|---|---|
| Shell pages (root) | 11 | index + 7 section + 3 legal |
| Shell pages (products/) | 6 | vloer, muur, zandbak, tekeningen, mobiele, software |
| Partials (pages) | 18 | 9 pages × NL/EN |
| Partials (products) | 12 | 6 products × NL/EN |
| Orphan partials | 2 | content-nl.html, content-en.html |
| Media files | 40 | PNG + WebP pairs, video, logo, icons |
| JS files | 3 | projector.js, cookie-consent.js, htmx.min.js |
| CSS files | 1 | styles.css (~1,700 lines) |
| Config files | 2 | robots.txt, sitemap.xml |
| Documentation | 4 | CLAUDE.md, README.md, UX_CONVERSION.md, COMPLIANCE_AUDIT.md |
| Tools | 1 | migrate_i18n.py |

---

*Generated 2026-02-12 by Kira / Oopuo*
