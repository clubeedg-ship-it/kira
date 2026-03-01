# IAM Work Session — 2025-06-28 (REVISED)

## Context
- **Old site:** interactivemove.nl — WordPress/Elementor/Astra on Plesk
- **New site:** ~/iam-website/ — raw HTML + HTMX + vanilla JS (built by Otto)
- **Goal:** Ship the new site on the same domain (interactivemove.nl) ASAP
- **Team:** Hannelore (owner/mom), Randall (son), Teffin (son), Otto

## The Real Task List

### Task 1: Google Analytics → migrate to new site
**Status:** ⏳ Waiting for analytics contact to reply
- Otto messaged the guy (via Randall's referral)
- **Need from him:** GA4 property ID + GTM container credentials
- Once we have the codes, embed in ~/iam-website/ `<head>`
- Current old site has: GTM-KPX78C22, Google Site Kit

### Task 2: WordPress Backend Check → feature parity audit
**Status:** 🔲 Ready to do NOW
- **Purpose:** NOT to maintain the WP site — to check what functionality it has so the new HTML site matches
- **Need:** Map every WP plugin/feature → check if new site replicates it
- Old site plugins found: Elementor, WooCommerce, Yoast SEO, HubSpot, GTranslate, JetEngine, Site Kit
- **Key question:** Does ~/iam-website/ cover everything the old site does?

### Task 3: HubSpot Form → embed in new site
**Status:** ⏳ Need embed codes from Randall/Teffin/Hannelore
- HubSpot plugin already on old WP site (v11.3.33)
- **Need from team:** HubSpot form embed code (just the JS snippet)
- Otto puts the code into the new HTML site's contact pages
- **3 questions to send:** What's the HubSpot account? Can I get the form embed code? What fields do they want?

### Task 4: Cold Emails Tool Setup
**Status:** 🔍 Research phase — need deeper comparison
- Team will send emails together (Otto crafts + tests, gets commission)
- **Need:** Real functional comparison, not just pricing
- Start cheap, scale if results come
- Must understand: deliverability, warm-up, templates, analytics differences

### Task 5: Email Templates → Hannelore
**Status:** ✅ Drafted (3 Dutch templates)
- Need Otto's QA before sending
- Templates in previous version of this file

## Priority Order
1. **Task 2 (WP audit)** — we can do this RIGHT NOW, no dependencies
2. **Task 4 (Cold email deep comparison)** — research, no dependencies  
3. **Task 5 (Templates QA)** — ready when Otto is
4. **Task 1 (GA)** — blocked on contact reply
5. **Task 3 (HubSpot)** — blocked on team credentials

## Messages to Send (Otto drafts)

**To Randall/Teffin (HubSpot):**
> Hey, I need the HubSpot form embed code for the new website. Can you send me:
> 1. The HubSpot portal ID
> 2. The form embed snippet (from Marketing → Forms → Share → Embed)
> 3. What fields the contact form should have?

**To analytics contact (already sent, waiting)**
