# IAM legal/compliance page completeness report

## Current state
- `privacybeleid.html`, `cookiebeleid.html`, and `toegankelijkheid.html` all exist as root pages.
- Their language-switch targets also exist:
  - `partials/privacybeleid-nl.html` + `partials/privacybeleid-en.html`
  - `partials/cookiebeleid-nl.html` + `partials/cookiebeleid-en.html`
  - `partials/toegankelijkheid-nl.html` + `partials/toegankelijkheid-en.html`
- Language switching is handled by `js/site.js` using `data-page` → `partials/<slug>-<lang>.html`; this now works for all 4 legal slugs including terms.
- Before fixes, `algemene-voorwaarden.html` did **not** exist, while it was linked from legal pages/footers.

## Exact files reviewed
- `/home/adminuser/iam-website/privacybeleid.html`
- `/home/adminuser/iam-website/cookiebeleid.html`
- `/home/adminuser/iam-website/toegankelijkheid.html`
- `/home/adminuser/iam-website/algemene-voorwaarden.html` (created during this audit)
- `/home/adminuser/iam-website/js/site.js`
- `/home/adminuser/iam-website/build_shells.py`
- `/home/adminuser/iam-website/sitemap.xml`
- `/home/adminuser/iam-website/partials/privacybeleid-nl.html`
- `/home/adminuser/iam-website/partials/privacybeleid-en.html`
- `/home/adminuser/iam-website/partials/cookiebeleid-nl.html`
- `/home/adminuser/iam-website/partials/cookiebeleid-en.html`
- `/home/adminuser/iam-website/partials/toegankelijkheid-nl.html`
- `/home/adminuser/iam-website/partials/toegankelijkheid-en.html`
- `/home/adminuser/iam-website/partials/algemene-voorwaarden-nl.html` (created)
- `/home/adminuser/iam-website/partials/algemene-voorwaarden-en.html` (created)

## Broken/missing links or lang issues found
- **Missing file:** `algemene-voorwaarden.html` was linked from:
  - `privacybeleid.html`
  - `cookiebeleid.html`
  - `partials/privacybeleid-nl.html`
  - `partials/cookiebeleid-nl.html`
- **Missing language targets:** before fixes there were no:
  - `partials/algemene-voorwaarden-nl.html`
  - `partials/algemene-voorwaarden-en.html`
- **English legal partial completeness issue:** the EN versions of privacy/cookie/accessibility had a footer column labeled `Products` instead of a legal-links column, so the swapped EN legal state exposed a less complete legal surface than NL.

## Changes made
- Created root placeholder page:
  - `/home/adminuser/iam-website/algemene-voorwaarden.html`
- Created language partials for terms page:
  - `/home/adminuser/iam-website/partials/algemene-voorwaarden-nl.html`
  - `/home/adminuser/iam-website/partials/algemene-voorwaarden-en.html`
- The new terms page is **explicitly marked as a placeholder / draft** and does not fabricate full legal copy.
- Updated English legal partial footers to include legal links consistently:
  - `/home/adminuser/iam-website/partials/privacybeleid-en.html`
  - `/home/adminuser/iam-website/partials/cookiebeleid-en.html`
  - `/home/adminuser/iam-website/partials/toegankelijkheid-en.html`
- Updated page generator config for future rebuilds:
  - added `algemene-voorwaarden.html` to `/home/adminuser/iam-website/build_shells.py`
- Added terms page to sitemap:
  - `/home/adminuser/iam-website/sitemap.xml`

## Verification after changes
- Verified these files now exist:
  - `algemene-voorwaarden.html`
  - `partials/algemene-voorwaarden-nl.html`
  - `partials/algemene-voorwaarden-en.html`
- Verified language-switch partial targets exist for:
  - `privacybeleid`
  - `cookiebeleid`
  - `toegankelijkheid`
  - `algemene-voorwaarden`
- Verified internal `.html` links from the 4 legal root pages resolve without missing targets.

## Remaining content blockers
- **Client/legal blocker:** the terms page is only a temporary placeholder. Final launch should still get real Algemene Voorwaarden from the client/legal review.
- **Operational blocker:** the emails referenced on legal pages should be confirmed as live/monitored before launch:
  - `privacy@interactivemove.nl`
  - `toegankelijkheid@interactivemove.nl`
- **Compliance note, not changed here:** `build_shells.py` template still contains GTM in the shell template head/noscript. Earlier notes in repo say consent gating exists elsewhere, but if shells are rebuilt this should be re-checked carefully against current consent behavior.
