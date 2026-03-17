# IAM visual audit report

**Date:** 2026-03-11 UTC  
**Project:** `/home/adminuser/iam-website` → `/home/adminuser/projects/iam/website`

## Audit method
- First checked whether the IAM site was available locally.
- `http://127.0.0.1/` is **not** the IAM site; it serves the default nginx welcome page.
- Found a local IAM build running at **`http://127.0.0.1:8017`** and used that for the audit.
- OpenClaw browser automation was **unavailable** on this host (browser tool timed out / gateway issue), so this was a **best-effort fallback audit** using:
  - local headless Chrome screenshots of the target pages
  - source inspection of the rendered HTML files
  - asset existence checks for local images/video/scripts/styles

## Pages checked
- `/`
- `/products/interactieve-muur.html`
- `/products/interactieve-klimwand.html`
- `/products/interactieve-tekeningen.html`
- `/word-partner.html`
- `/blog.html`
- `/privacybeleid.html`

## What looked good
- Local site is available and the target pages render from the local build on port 8017.
- Target pages exist and produced screenshots successfully.
- No obvious **local** missing image/video/style/script files were found on the checked pages.
- No visible hardcoded `iam.zenithcred.com` references were found in the checked page HTML.
- Canonical / OG / hreflang references on the homepage point to **`interactivemove.nl`**, which is correct for launch branding.
- Product pages, blog page, partner page, and privacy page all exist as built pages rather than broken routes.

## Visible / launch-relevant defects found
1. **Default host root is wrong**
   - `http://127.0.0.1/` serves the default nginx welcome page, not IAM.
   - The IAM site is only reachable on **port 8017** in this environment.
   - If this machine is meant to represent launch/prod readiness, root host routing is still not correctly wired.

2. **Dead placeholder content on `word-partner.html`**
   - There is an explicit testimonial placeholder section:
     - heading: **“Wat onze partners zeggen”**
     - body: **“Binnenkort delen onze partners hier hun ervaringen.”**
     - label: **“Partnerverhalen volgen binnenkort”**
   - This reads as unfinished launch content and should be removed, hidden, or replaced with real proof.

3. **Homepage “client logos” are still placeholders, not real client marks**
   - The logo wall uses generic icon blocks like:
     - `100+ Basisscholen`
     - `50+ Zorginstellingen`
     - `75+ Speelparadijzen`
   - This is not broken technically, but it still looks like placeholder trust content rather than real customer proof.
   - Risk: weaker credibility on launch if the intent was to show real client logos.

4. **Blog contains placeholder fallback logic / empty-state copy**
   - `blog.html` includes card placeholder rendering and a **“Coming soon”** empty-state string in the source.
   - If Ghost/API content fails or returns empty, the page can still degrade into placeholder-like UX.
   - I could not fully verify the live blog data state visually because the browser tool was unavailable.

5. **Minor branding inconsistency in footer**
   - Footer copy uses **“Inter Active Move B.V.”** (with spaces) in at least checked built pages.
   - Elsewhere the brand is consistently styled as **InterActiveMove**.
   - Small, but it reads as inconsistent polish on a launch pass.

## Domain leakage check
- **Good:** No target-page HTML checked here leaks `iam.zenithcred.com`.
- **Found elsewhere in repo only:**
  - `docker/nginx/default.conf` still includes `iam.zenithcred.com`
  - old QA/docs mention `iam.zenithcred.com`
- That repo-level residue is not a visible page defect by itself, but worth keeping in mind for infra/config cleanup.

## Broken images / videos
- No checked page showed evidence of missing **local** image/video assets from source inspection.
- External third-party script reference found on multiple pages:
  - `//js.hs-scripts.com/49291889.js`
- That is a protocol-relative HubSpot script, not a local asset issue. I did not count it as broken.

## Layout / nav / footer regressions
- With the browser tool down, I could not do a full interactive/manual visual sweep for subtle spacing, responsive, hover, or sticky-state regressions.
- Based on the available fallback pass, there is **no strong evidence** of catastrophic nav/footer breakage on the checked pages.
- Main visible quality issue in this category is the unfinished/placeholder trust content noted above.

## Launch recommendation
**Recommendation: soft no-go until 2 quick fixes are done.**

Minimum blockers to clear before calling this launch-clean:
- Remove or replace the **partner testimonials placeholder** on `word-partner.html`.
- Ensure the intended public/local root host does **not** serve the default nginx page if this environment is meant to reflect launch readiness.

Nice-to-fix before or immediately after launch:
- Replace homepage logo-wall placeholders with real client logos / testimonials / case proof, or relabel it so it does not feel fake.
- Normalize footer branding to **InterActiveMove B.V.** consistently.
- Confirm the blog empty-state does not surface placeholder UX when Ghost content is unavailable.

## Confidence / limitation
- **Confidence:** moderate for content/config defects, lower for nuanced visual/layout defects.
- **Limitation:** browser automation was unavailable, so this was not a true manual visual browser pass.