# IAM Launch Checklist & Code Review

**Date:** 2026-03-11
**Project:** InterActiveMove website (`~/iam-website`)
**Deployment target:** Hostnet VM
**Status:** Close to launch; fix operational gaps before calling production-ready.

---

## Executive Summary

IAM is no longer in rebuild territory.

It is a **launch-hardening** project now.

The codebase is already useful, shippable, and commercially viable. The remaining work is mostly:
- incomplete integrations
- production config cleanup
- launch checklist verification
- a few maintainability/quality issues

### Scores
- **Launch readiness:** 8/10
- **Code quality:** 7/10
- **Operational quality:** 6.5/10
- **Maintainability:** 6.5/10
- **Business usefulness:** 8.5/10

---

## P0 — Must Fix Before Launch

### 1. Implement or remove the empty partner HubSpot form
**Files:**
- `word-partner.html`
- `partials/word-partner-nl.html`
- `partials/word-partner-en.html`

**Issue:**
A placeholder exists but no real embed/working form is present. This creates broken UX.

**Decision needed:**
Pick one:
- real HubSpot embed
- custom form -> endpoint -> HubSpot
- remove empty block and use email CTA only

**Recommendation:**
Use a proper HubSpot-backed flow or remove the placeholder entirely before launch.

---

### 2. Fix Ghost production configuration
**Issues:**
- production `url` needs to be correct
- `mail__from` needs configuration
- Ghost Content API must be verified
- admin rate limit in nginx should be relaxed enough to avoid admin breakage

**Why this matters:**
The blog layer should not be “almost working” in production.

---

### 3. Remove secrets from git / clean env handling
**Files of concern:**
- `.env.docker`
- `api/.env`

**Issue:**
Secrets/config hygiene is not clean enough for production handling.

**Action:**
- confirm what is tracked
- remove secrets from git
- standardize env loading for Hostnet VM deployment

---

### 4. Finish legal completeness
**Check:**
- `algemene-voorwaarden.html` exists or is created
- privacy/cookie/accessibility pages are complete
- language switching works consistently for legal pages

**Why this matters:**
This is a business website. Legal incompleteness makes the launch feel unfinished.

---

### 5. Run a full production smoke test
**Must verify:**
- homepage
- all product pages
- blog index/post flow
- partner page
- contact flow
- language switching
- mobile nav
- social links
- analytics behavior
- forms behavior

---

## P1 — Fix Right After Launch

### 6. Improve contact form UX
**Current state:**
Main form works, but feedback/validation could be stronger.

### 7. Harden CSP further
**Current state:**
CSP exists, which is good.
Still allows `unsafe-inline` and `unsafe-eval`.

### 8. Verify or hide chat widget
If chat is unreliable, do not ship a flaky experience.

### 9. Normalize outbound link hygiene
Add `rel="noopener noreferrer"` consistently for `target="_blank"` links.

### 10. Confirm Ghost homepage/blog integration flow
Featured cards, recent posts, and blog routing should be fully consistent.

---

## P2 — Polish / Growth Improvements

- structured data / JSON-LD
- bundle/minify if worthwhile
- reduce inline styles gradually
- standardize path conventions
- normalize into future platform structure later

---

## Code Review — Current Implementation

## 1. Overall Verdict

This is a **solid, practical production codebase** with some operational debt.

It is not elegant everywhere, but it is already commercially useful.

The real risk is **ops/config consistency**, not whether the site exists.

---

## 2. Strengths

### A. Simple architecture
- static-first frontend
- understandable file layout
- low custom JS footprint
- easy to host
- easy to reason about

### B. Contact flow improved
- main form uses `sendContactEmail`
- mail-based lead path exists
- HubSpot collection hooks exist in JS

### C. Small, understandable JS layer
Key files are cleanly separated:
- `site.js`
- `contact-form.js`
- `cookie-consent.js`
- `chat-widget.js`
- `blog-carousel.js`

### D. Performance improvements already happened
- WebP assets exist
- recent QA indicates major critical/site-quality fixes were already applied

### E. Static + Ghost split is directionally correct
This is the right model for IAM compared to forcing a monolithic CMS.

---

## 3. Main Weaknesses

### A. Too much duplication
There is repeated:
- footer markup
- nav patterns
- social blocks
- GTM noscript blocks
- CTA sections

This is the biggest maintainability issue.

### B. Mixed content/control patterns
The site currently mixes:
- static HTML
- HTMX partial swapping
- Ghost API pulls
- mailto/contact JS
- some HubSpot collection logic
- placeholder partner form pattern

It works, but the mental model is inconsistent.

### C. Ops/config weaker than frontend
Frontend quality is ahead of deployment/config quality.
Main risk areas:
- Ghost config
- secrets handling
- incomplete form integration
- launch checklist gaps

### D. Security posture improved but not complete
Good:
- CSP exists
- security headers exist

Still needs work:
- `unsafe-inline`
- `unsafe-eval`
- config hygiene
- env handling discipline

### E. Content model is page-centric, not system-centric
Fine for one site.
Painful for many.
But this can wait until after launch.

---

## 4. Area-by-Area Review

### Frontend structure — 7/10
**Good:** understandable, practical, low complexity  
**Weak:** duplicated markup and shell/partial drift risk

### JavaScript — 7.5/10
**Good:** small, separated by concern, readable  
**Weak:** mixed integration patterns, not fully standardized

### HTML/CSS — 6.5/10
**Good:** pragmatic, shippable  
**Weak:** repetition, inline styling, maintainability debt

### Blog integration — 6.5/10
**Good:** Ghost split is the right direction  
**Weak:** production config still incomplete

### Forms / CRM — 6/10
**Good:** main path exists  
**Weak:** partner flow incomplete, overall form model not standardized

### Deployment / ops — 6/10
**Good:** deployable structure exists  
**Weak:** env/config/launch discipline still needs cleanup

---

## 5. Recommended Launch Sequence

### Phase 1 — Launch hardening
1. fix partner form decision
2. fix Ghost config
3. clean secrets/env handling
4. finish legal completeness
5. smoke test on production target

### Phase 2 — Stabilize
6. improve form UX
7. verify/hide chat
8. harden CSP
9. fix remaining operational inconsistencies

### Phase 3 — Normalize later
10. reduce duplication
11. standardize content/control model
12. fold into future reusable site architecture

---

## 6. Final Recommendation

**Do not rebuild IAM.**

That would waste time.

Instead:
- finish launch hardening
- deploy cleanly to Hostnet VM
- document what was fixed
- use IAM later as the first normalized client in the broader website system

IAM is already close enough that the best move is disciplined finishing, not redesign.
