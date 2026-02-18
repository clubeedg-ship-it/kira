# IAM Website Refactor — Full Codebase Prompt

## Context

You are refactoring the **InterActiveMove (IAM)** website — a Dutch company selling interactive projection systems (floors, walls, sandboxes, climbing walls) to schools, healthcare facilities, entertainment venues, and corporate clients.

**Live site:** https://darkgoldenrod-crane-349726.hostingersite.com/
**Tech stack:** Static HTMX site — pure HTML, CSS, JS. No framework, no build step, no backend.
**Hosting:** Hostinger (temporary), moving to Hostnet soon.

## Site Structure

```
index.html                    # Main landing page (~860 lines)
styles.css                    # Main stylesheet (~5600 lines)
projector.js                  # Interactive projector demo animation
js/cookie-consent.js          # GDPR cookie consent banner
js/htmx.min.js                # HTMX library

# Subpages:
over-ons.html                 # About us
prijzen.html                  # Pricing
onderwijs.html                # Education sector
zorg-revalidatie.html         # Healthcare/rehab sector
parken-speelhallen.html       # Parks & arcades sector
bouw-een-park.html            # Build a park
3d-spellen.html               # 3D games
toegankelijkheid.html         # Accessibility
privacybeleid.html            # Privacy policy
cookiebeleid.html             # Cookie policy

# Product pages:
products/interactieve-vloer.html
products/interactieve-muur.html
products/interactieve-zandbak.html
products/interactieve-klimwand.html
products/mobiele-vloer.html
products/software-maatwerk.html
```

## Tasks

Work through ALL tasks below. For each change, explain what you changed and why.

---

### 1. 🎨 DESIGN — Professional Enterprise Rebrand

The current design feels too playful/childish for the B2B corporate audience IAM targets (school directors, healthcare managers, facility owners, municipal buyers).

**Do:**
- Shift color palette toward professional/enterprise tones — think clean, authoritative, trustworthy. Keep brand recognition but lose the playground feel.
- Typography: use professional font pairings. Headers should feel bold/confident, body text clean and readable.
- Reduce excessive animations, bouncy effects, and playful decorative elements.
- Product cards and sections should feel like enterprise SaaS/B2B — clean grid layouts, proper whitespace, subtle shadows.
- Testimonials section should look credible (enterprise style, not bubbly).
- CTAs should be confident and professional, not bright/childish.
- The interactive projector demo (hero section) is cool — keep it but ensure it feels premium, not toy-like.
- Ensure visual consistency across ALL pages, not just index.html.

**Don't:**
- Don't make it boring/sterile — IAM's product is inherently fun. The design should say "serious company, exciting product."
- Don't remove the interactive elements — just make them feel polished.

---

### 2. 📝 CONTENT — Corporate Copy Rewrite

Current copy is functional but reads like a consumer brochure. Rewrite for decision-makers at organizations.

**Do:**
- Rewrite headlines and body copy to speak to B2B buyers: ROI, measurable outcomes, case studies, institutional credibility.
- Stats section (500+ installations, 10+ years, etc.) — make these more impactful. Add context (e.g., "across X municipalities" or "in Y% of Dutch rehabilitation centers").
- Testimonials — make them sound more institutional/professional. Include titles, organization types.
- Product descriptions — lead with the business value (engagement metrics, therapy outcomes, footfall increase), not just features.
- FAQ — add questions a procurement manager would ask (warranty, maintenance, ROI, integration with existing infrastructure).
- CTA copy: replace playful language with confident professional language. "Plan een gratis adviesgesprek" → something more enterprise.
- Keep all content in **Dutch** (this is a Dutch market site).

**Don't:**
- Don't lose the warmth entirely — these are still people helping kids learn and patients recover.
- Don't invent fake statistics. If you need to adjust numbers, use placeholders like `[X]` and flag them.

---

### 3. 📧 EMAIL — Replace WhatsApp with HubSpot Email Automation

Currently ALL lead capture goes to WhatsApp (`wa.me/31623998934`). This needs to change to HubSpot Forms API.

**Contact form (index.html):**
- Replace `sendToWhatsapp(event)` with a `sendToHubSpot(event)` function
- Use HubSpot Forms API v3: `POST https://api.hsforms.com/submissions/v3/integration/submit/{portalId}/{formGuid}`
- Use placeholders `YOUR_PORTAL_ID` and `YOUR_FORM_GUID` that the client will fill in
- Fields to submit: `firstname`, `email`, `company`, `message`
- Show a professional success message after submission (in Dutch)
- Add proper error handling with user-friendly error message (in Dutch)
- Remove the WhatsApp privacy notice under the form
- Add a proper privacy consent checkbox (links to privacybeleid.html)

**Product page CTAs:**
- All 6 product "Meer info" buttons currently link to WhatsApp
- Replace with either:
  - (a) Anchor links to the contact form section with the product name pre-filled, OR
  - (b) A modal contact form with the product name auto-populated
- Option (b) is preferred if you can implement it cleanly

**Footer & other WhatsApp references:**
- Replace the WhatsApp CTA button in the CTA section with an email/form button
- Keep the phone number (`+31 6 23998934`) as a clickable `tel:` link for direct calls
- Update footer contact: `contact@interactivemove.nl` as primary, phone as secondary
- Remove all `wa.me` links throughout the entire site

**The HubSpot integration should:**
```javascript
// Example structure — implement this properly
async function sendToHubSpot(e) {
  e.preventDefault();
  const form = e.target;
  
  const payload = {
    fields: [
      { name: "firstname", value: form.querySelector('[name="name"]').value },
      { name: "email", value: form.querySelector('[name="email"]').value },
      { name: "company", value: form.querySelector('[name="company"]').value },
      { name: "message", value: form.querySelector('[name="details"]').value }
    ],
    context: {
      pageUri: window.location.href,
      pageName: document.title
    }
  };

  try {
    const res = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/YOUR_PORTAL_ID/YOUR_FORM_GUID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );
    if (res.ok) {
      // Show success state
    } else {
      // Show error state
    }
  } catch (err) {
    // Show error state
  }
}
```

---

### 4. 🐛 BUGS & UX — Fix Everything

**Cookie consent:**
- Test the cookie popup works correctly (show/hide, stores preference, respects choice)
- Ensure it doesn't break page layout or overlap important content
- Must comply with Dutch law: Accept and Reject buttons must have equal visual prominence

**Navigation:**
- Mobile nav: ensure hamburger menu works flawlessly, closes on link click
- Active page highlighting in nav
- Smooth scroll to anchors

**Responsive design:**
- Test all breakpoints: mobile (360px), tablet (768px), desktop (1024px+)
- Fix any overflow, text truncation, or layout breaking issues
- Product cards should stack cleanly on mobile

**Visual bugs to look for:**
- Inconsistent spacing/padding between sections
- Font size inconsistencies across pages
- Broken hover states
- Images not loading or wrong aspect ratios
- Z-index issues (elements overlapping incorrectly)
- Flash of unstyled content (FOUC)

**UX improvements:**
- Add loading states for form submission
- Ensure all interactive elements have proper focus states (accessibility)
- Add `aria-labels` where missing
- Ensure proper heading hierarchy (h1 → h2 → h3, no skipping)
- Meta tags: proper title, description, OG tags for social sharing on every page
- Add structured data (Schema.org) for local business

**Performance:**
- Lazy load images below the fold
- Minimize render-blocking resources
- Ensure video in hero section doesn't autoplay with sound

---

## Important Notes

- **Language:** All user-facing content must be in **Dutch**
- **No frameworks:** Keep it pure HTML/CSS/JS + HTMX. Do not add React, Vue, Tailwind, etc.
- **No build step:** Everything must work as static files served directly
- **Email placeholders:** Use `YOUR_PORTAL_ID` and `YOUR_FORM_GUID` for HubSpot — these will be filled in later
- **Contact email:** Use `contact@interactivemove.nl` as the primary email throughout
- **Phone:** Keep `+31 6 23998934` as secondary contact method
- **Domain:** The final domain will be `interactivemove.nl` — use this in meta tags, canonical URLs, etc. even though it's currently on Hostinger

## Deliverables

Provide the complete refactored codebase with:
1. All HTML files updated
2. Updated `styles.css`
3. Updated/new JS files
4. A `CHANGELOG.md` listing every change made, organized by task category
