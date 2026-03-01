# IAM Website i18n Refactor Report

**Date:** 2026-02-27  
**Status:** Complete

## Summary

Fixed language switching across all 20 shell files. The core issues were:
1. **9 shells had non-functional EN buttons** — the `<button>` existed but had no `hx-get` attribute
2. **3 legal pages had no partials at all** — cookiebeleid, privacybeleid, toegankelijkheid
3. **3 legal pages were missing DOMContentLoaded `?lang=en` handler**

## Changes Made

### Fix 1: Added `hx-get` to EN buttons (9 files)

These shells had `<button class="lang-btn">EN</button>` with no HTMX attributes — clicking EN did nothing.

**Root-level pages (4):**
- `3d-spellen.html`
- `onderwijs.html`
- `parken-speelhallen.html`
- `zorg-revalidatie.html`

**Product pages (5):**
- `products/interactieve-muur.html`
- `products/interactieve-zandbak.html`
- `products/interactieve-klimwand.html`
- `products/mobiele-vloer.html`
- `products/software-maatwerk.html`

Each EN button now has: `hx-get="partials/PAGE-en.html" hx-target="#page-wrapper" hx-swap="innerHTML" hx-push-url="?lang=en"`

### Fix 2: Created missing NL partials (3 files)

Extracted page-wrapper content from shell into partials:
- `partials/cookiebeleid-nl.html` (217 lines)
- `partials/privacybeleid-nl.html` (256 lines)
- `partials/toegankelijkheid-nl.html` (189 lines)

### Fix 3: Created missing EN partials (3 files)

Translated NL content, used standard EN header/nav/footer from existing partials:
- `partials/cookiebeleid-en.html` (241 lines) — Cookie Policy
- `partials/privacybeleid-en.html` (275 lines) — Privacy Policy
- `partials/toegankelijkheid-en.html` (216 lines) — Accessibility Statement

### Fix 4: Added DOMContentLoaded + syncLang to legal shells (3 files)

Added to `cookiebeleid.html`, `privacybeleid.html`, `toegankelijkheid.html`:
- `syncLang()` function for `data-nl`/`data-en` attributes outside page-wrapper
- `DOMContentLoaded` handler to load EN partial when `?lang=en`
- `htmx:pushedIntoHistory` listener for lang sync

## What Was Already Correct

- All 20 shells already had `#page-wrapper` with content inside it (header, nav, main, footer)
- All existing NL/EN partial pairs (10 root + 7 product = 17 pairs) contained full page content (header through footer)
- All shells already had the NL `hx-get` button working
- Mobile sticky CTA in `index.html` correctly uses `data-nl`/`data-en` with `syncLang`
- Product sticky CTA in `interactieve-vloer.html` is inside page-wrapper (gets swapped with partial)
- All shells already had DOMContentLoaded handlers (except the 3 legal pages)

## Verification

All 20 shells now have:
- ✅ EN button with `hx-get` pointing to correct EN partial
- ✅ `DOMContentLoaded` handler loading EN partial when `?lang=en`
- ✅ Matching NL and EN partial pairs with full page content
