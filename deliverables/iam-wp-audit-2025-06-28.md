# InterActiveMove.nl — WordPress Backend Audit
**Date:** 2025-06-28 | **Auditor:** Kira (automated external scan)

---

## Stack Overview
| Component | Version/Detail |
|-----------|---------------|
| CMS | WordPress (latest branch) |
| PHP | 8.2.30 |
| Web Server | Nginx |
| Hosting Panel | Plesk |
| Theme | Astra |
| Page Builder | Elementor + Elementor Pro v3.31.2 |
| SEO | Yoast SEO v26.7 |
| E-commerce | WooCommerce + WooCommerce Payments |
| Analytics | Google Site Kit v1.168.0 + GTM4WP |
| GTM Container | GTM-KPX78C22 |
| CRM | HubSpot WP Plugin v11.3.33 |
| Translation | GTranslate |
| Custom Post Types | JetEngine v3.6.3 + JetMenu |
| Extras | ElementsKit Lite, Unlimited Elements for Elementor Premium |

---

## ✅ What's Good
- **PHP 8.2** — current and supported
- **Yoast SEO** — properly configured, sitemap active (7 sub-sitemaps)
- **GDPR consent mode** — fully configured for all EU countries
- **wp-json/users endpoint blocked** — returns 403 (good security practice)
- **robots.txt** — clean, blocks WooCommerce sensitive paths
- **HubSpot already installed** — Page Analytics tracking active
- **Google Site Kit + GTM** — analytics infrastructure in place

## ⚠️ Needs Attention

### Security Headers (MISSING)
| Header | Status | Risk |
|--------|--------|------|
| Strict-Transport-Security (HSTS) | ❌ Missing | Medium — browsers don't enforce HTTPS |
| X-Frame-Options | ❌ Missing | Medium — clickjacking possible |
| X-Content-Type-Options | ❌ Missing | Low — MIME sniffing attacks |
| Content-Security-Policy | ❌ Missing | Medium — XSS protection |
| X-XSS-Protection | ❌ Missing | Low — legacy but still useful |
| Referrer-Policy | ❌ Missing | Low — referrer leakage |

**Fix:** Add to Nginx config or via WordPress plugin (e.g., "HTTP Headers" or "Security Headers" plugin).

### Performance
- **No caching plugin detected** — no WP Rocket, W3 Total Cache, LiteSpeed, or Autoptimize
- **Recommendation:** Install WP Rocket or LiteSpeed Cache for page caching, CSS/JS minification, and image lazy loading
- **CDN:** No Cloudflare or other CDN detected — would improve global load times

### Plugin Inventory (needs wp-admin to verify)
- Check for outdated plugins (can only see versions for some from frontend)
- Elementor Pro v3.31.2 — verify this is latest
- JetEngine v3.6.3 — verify
- Remove any unused/inactive plugins

### WooCommerce
- Payments plugin active — verify payment gateway configuration
- Shop page exists at /shop/ — check if products are current
- Cart/checkout/my-account pages exist — verify they work

---

## 📊 Site Structure (32 indexed pages)

### Product Pages
- /interactive-wall/
- /interactive-wall-sports/
- /interactive-wall-animated-drawings/
- /interactive-sandbox/
- /interactive-mobile-floor/
- /interactive-climbing-wall/
- /interactive-slope/
- /interactive-cubes/
- /magic-pencil/
- /interactive-shooting-gallery/
- /interactive-floor-figures/

### Key Pages
- /contacts/ — Contact page with form
- /be-a-partner/ — Partner program
- /catalog/ — Product catalog
- /help-center/ — Support
- /about-us/ and /who-we-are/ — About pages (duplicate?)
- /create-your-game/ — Custom game builder
- /build-a-park/ — Park builder
- /blog/ — Blog section
- /shop/ — WooCommerce shop

### Potential Issues
- `/fearwef/` — appears to be a test/junk page (should be deleted or noindexed)
- `/home/` exists alongside `/` — possible duplicate homepage
- Two "about" pages: `/about-us/` and `/who-we-are/`

---

## Recommended Actions

### Immediate (this week)
1. **Add security headers** via Nginx or plugin
2. **Install caching plugin** (WP Rocket recommended)
3. **Delete `/fearwef/` page** — junk/test content in sitemap
4. **Verify GA4 data flow** (Randall's task)

### Short-term (this month)
5. **Configure HubSpot forms** on /contacts/ and /be-a-partner/
6. **Audit all plugins** for updates from wp-admin
7. **Set up CDN** (Cloudflare free tier minimum)
8. **Consolidate duplicate pages** (/about-us/ vs /who-we-are/, / vs /home/)

### Nice-to-have
9. Add structured data for products (WooCommerce schema)
10. Set up uptime monitoring
11. Regular automated backup verification
