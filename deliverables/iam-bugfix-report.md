# InterActiveMove Website — Bug Fix & Contact Audit Report

**Date:** 2026-02-27  
**Scope:** ~/iam-website/

---

## Job 1: Broken Links & 404 Audit

### Architecture Context
The site uses a **Shell + Partial pattern**: shell HTML files at root/products/ load content partials from partials/ via HTMX. Links in partials use paths relative to the **shell's URL context**, not the partial file location.

### Findings

#### ✅ All navigation/product links in partials — NOT BROKEN
The hundreds of links like `href="products/interactieve-vloer.html"` in partials resolve correctly from the shell's URL context. These are **false positives** when checking relative to the partial file's directory.

#### ❌ Actually broken references:

| File | Issue | Status |
|------|-------|--------|
| `privacybeleid.html:263` | Links to `algemene-voorwaarden.html` — file doesn't exist | ⚠️ NOT FIXED (needs content) |
| `cookiebeleid.html:224` | Links to `algemene-voorwaarden.html` — file doesn't exist | ⚠️ NOT FIXED (needs content) |
| `privacybeleid.html` | `hx-get="partials/privacybeleid-nl.html"` — partial doesn't exist | ⚠️ NOT FIXED (lang toggle broken) |
| `privacybeleid.html` | `hx-get="partials/privacybeleid-en.html"` — partial doesn't exist | ⚠️ NOT FIXED (lang toggle broken) |
| `cookiebeleid.html` | `hx-get="partials/cookiebeleid-nl.html"` — partial doesn't exist | ⚠️ NOT FIXED (lang toggle broken) |
| `cookiebeleid.html` | `hx-get="partials/cookiebeleid-en.html"` — partial doesn't exist | ⚠️ NOT FIXED (lang toggle broken) |
| `toegankelijkheid.html` | `hx-get="partials/toegankelijkheid-nl.html"` — partial doesn't exist | ⚠️ NOT FIXED (lang toggle broken) |
| `toegankelijkheid.html` | `hx-get="partials/toegankelijkheid-en.html"` — partial doesn't exist | ⚠️ NOT FIXED (lang toggle broken) |

**Why not auto-fixed:** These need content to be written (legal text for algemene-voorwaarden, and partials extracted from inline content for the 3 legal pages). This is content work, not a code fix.

### Recommendation
1. Create `algemene-voorwaarden.html` with terms & conditions content
2. Extract content from privacybeleid.html, cookiebeleid.html, and toegankelijkheid.html into NL/EN partial pairs to enable language switching

---

## Job 2: Contact Point Audit & Changes

### Summary
- **26 files modified** to replace WhatsApp labels/references with email
- All CTA buttons now correctly route to `mailto:klantcontact@interactivemove.nl` or `mailto:info@interactivemove.nl`
- No explicit WhatsApp buttons remain (there were none linking to wa.me — they were already mailto)

### Key Discovery
The site had already been partially migrated — most `href` values pointed to `mailto:info@interactivemove.nl`, but the **labels, icons, and surrounding text** still said "WhatsApp". This audit fixed all remaining WhatsApp labeling.

### Changes Made

#### Contact Forms (sendToWhatsapp → sendContactEmail)
| File | Change |
|------|--------|
| `index.html` | Renamed function `sendToWhatsapp` → `sendContactEmail`, updated to construct proper mailto with subject/body, target: `klantcontact@interactivemove.nl` |
| `partials/index-nl.html` | Updated form `onsubmit` handler reference |
| `partials/index-en.html` | Updated form `onsubmit` handler reference |
| `partials/content-nl.html` | Updated form `onsubmit` handler reference |
| `partials/content-en.html` | Updated form `onsubmit` handler reference |

#### CTA Button Labels Changed
| File | Old Label | New Label |
|------|-----------|-----------|
| `partials/index-nl.html` | **WhatsApp** / Reactie binnen 15 min | **E-mail** / Reactie binnen 24 uur |
| `partials/index-en.html` | **WhatsApp** / Response within 15 min | **E-mail** / Response within 24 hours |
| `index.html` | Direct Contact via WhatsApp | Direct Contact via E-mail |
| `index.html` mobile CTA | WhatsApp | ✉️ E-mail |
| `partials/over-ons-nl.html` | WhatsApp Contact | E-mail Contact |
| `partials/over-ons-en.html` | WhatsApp Contact | E-mail Contact |
| `partials/prijzen-nl.html` | WhatsApp Direct | E-mail Direct |
| `partials/prijzen-en.html` | WhatsApp Direct | E-mail Direct |
| `prijzen.html` | WhatsApp direct | E-mail direct |
| `partials/onderwijs-nl.html` | Direct via WhatsApp | Direct via E-mail |
| `partials/onderwijs-en.html` | Direct via WhatsApp | Direct via Email |
| `partials/products/interactieve-zandbak-nl.html` | Direct Offerte via WhatsApp / Start WhatsApp Chat | Direct Offerte via E-mail / Stuur E-mail |
| `partials/products/interactieve-zandbak-en.html` | Get Quote via WhatsApp | Get Quote via Email |
| `partials/products/software-maatwerk-nl.html` | Start WhatsApp Gesprek | Stuur E-mail |
| `partials/products/software-maatwerk-en.html` | (no WhatsApp label found) | — |
| `partials/products/interactieve-tekeningen-nl.html` | WhatsApp Contact | E-mail Contact |
| `partials/products/interactieve-tekeningen-en.html` | WhatsApp Contact | E-mail Contact |
| `partials/products/interactieve-vloer-nl.html` | WhatsApp Contact | E-mail Contact |
| `partials/products/interactieve-vloer-en.html` | WhatsApp Contact | E-mail Contact |
| `partials/products/mobiele-vloer-nl.html` | Reserveer via WhatsApp | Reserveer via E-mail |
| `partials/products/mobiele-vloer-en.html` | Reserve via WhatsApp | Reserve via Email |

#### Text/Notice Changes
| File | Change |
|------|--------|
| `partials/index-nl.html` | Removed WhatsApp privacy notice (Meta data processing warning) |
| `partials/index-en.html` | Removed WhatsApp privacy notice |
| `index.html` | Updated privacy notice text, renamed JS comment |
| `partials/zorg-revalidatie-nl.html` | "via WhatsApp" → "via e-mail" in specialist text |
| `partials/zorg-revalidatie-en.html` | "via WhatsApp" → "via email" in specialist text |

### Contact Points NOT Changed (correct as-is)
- **tel: links** — Phone number links throughout footer sections remain unchanged
- **mailto: in footer "Email:" lines** — Already correctly show `klantcontact@interactivemove.nl`
- **mailto: CTA buttons** — Already correctly link to `info@interactivemove.nl` for quotes/CTAs
- **Privacy page references** — `privacy@interactivemove.nl` and `toegankelijkheid@interactivemove.nl` left as-is (functional email addresses)

### Note on WhatsApp SVG Icons
Several CTA buttons still use WhatsApp SVG path icons (the WhatsApp logo) even though they now link to email. **Recommend replacing these SVG icons with an email/envelope icon** in a follow-up design pass.

---

## Remaining Action Items

1. **Create `algemene-voorwaarden.html`** — Referenced from privacy and cookie policy pages
2. **Create language partials** for privacybeleid, cookiebeleid, toegankelijkheid (extract from inline content)
3. **Replace WhatsApp SVG icons** with email envelope icons on CTA buttons (design task)
4. **Consider HubSpot form integration** — Task mentioned HubSpot as an option; currently all CTAs use mailto. A HubSpot form embed could replace the contact form section on the homepage.
