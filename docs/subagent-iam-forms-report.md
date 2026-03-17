# IAM Forms + Partner Page Launch Audit

## Current state
- **Main contact form is real and wired to HubSpot.**
  - Homepage contact forms (`partials/index-nl.html`, `partials/index-en.html`) call `sendContactEmail(event)`.
  - `js/contact-form.js` sanitizes input, checks honeypot + cooldown, sends identity data to HubSpot via `_hsq`, and posts to HubSpot collected forms endpoint for portal **49291889**.
  - HubSpot tracking script is globally included in the shell template (`build_shells.py`), so the main form has a real lead-capture path.
- **Main contact form weakness:** validation failures are silent.
  - If name/email/consent is missing or email is invalid, the function just `return`s with no visible feedback.
  - I did **not** change this yet because the task priority was partner-page launch safety and I wanted to avoid broad behavior changes without a dedicated pass.
- **Partner page was not launch-ready.**
  - `word-partner.html` and both partner partials had copy saying “fill in the form” plus an empty `#hubspot-partner-form` placeholder.
  - I found **no actual HubSpot embed**, no form ID, and no custom partner submission endpoint in the repo.
  - Shipping that as-is would present a fake form area / implied functionality that does not exist.

## Exact files reviewed
- `/home/adminuser/iam-website/js/contact-form.js`
- `/home/adminuser/iam-website/partials/index-nl.html`
- `/home/adminuser/iam-website/partials/index-en.html`
- `/home/adminuser/iam-website/partials/word-partner-nl.html`
- `/home/adminuser/iam-website/partials/word-partner-en.html`
- `/home/adminuser/iam-website/word-partner.html`
- `/home/adminuser/iam-website/build_shells.py`

## Recommendation
- **Launch with email/phone CTA on the partner page, not a fake or half-configured form.**
- Why this is the cleanest option right now:
  - Main contact form already has a real HubSpot path.
  - Partner page has **no working embed data** (no HubSpot form ID / embed snippet found).
  - Building a custom partner form -> backend endpoint -> HubSpot is more moving parts and more failure risk right before launch.
  - A direct CTA is honest, reliable, and operationally safe.
- Post-launch ideal next step:
  - If IAM wants CRM-structured partner leads, create a dedicated HubSpot form in HubSpot first, then embed it properly or reuse the existing JS pattern with explicit mapping.

## Changes made
- Replaced the dead HubSpot placeholder / “fill in the form” wording on the partner page with a **launch-safe direct CTA**.
- Updated:
  - `/home/adminuser/iam-website/partials/word-partner-nl.html`
  - `/home/adminuser/iam-website/partials/word-partner-en.html`
  - `/home/adminuser/iam-website/word-partner.html`
- New partner CTA behavior:
  - Clear statement that partnership applications are handled personally
  - Email CTA with partnership subject line
  - Phone CTA
  - Small guidance on what to include (company / region / reseller-installer-distributor intent)

## Verification
- Confirmed main contact form still points to:
  - `sendContactEmail(event)`
  - HubSpot collected forms endpoint: `https://forms.hubspot.com/collected-forms/submit/v1/49291889`
  - HubSpot tracking script: `//js.hs-scripts.com/49291889.js`
- Confirmed partner-page placeholder text / empty HubSpot container is no longer present in the edited partner page content.

## Blockers / questions
- **Missing for real partner-form integration:** HubSpot form embed details / form ID are not present in the repo.
- Optional next pass: improve visible validation feedback on the main contact form so users know why submission was blocked.
