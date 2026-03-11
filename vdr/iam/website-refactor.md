# IAM Website Refactor — Full Codebase Prompt (v2)

## Context

You are refactoring the **InterActiveMove (IAM)** website — a Dutch company selling interactive projection systems (floors, walls, sandboxes, climbing walls) to schools, healthcare facilities, entertainment venues, and corporate clients.

**Live site:** https://darkgoldenrod-crane-349726.hostingersite.com/
**Tech stack:** Static HTMX site — pure HTML, CSS, JS. No framework, no build step, no backend.
**Hosting:** Hostinger (temporary), moving to Hostnet soon.

---

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

---

## 🎨 DESIGN SYSTEM SPECIFICATIONS

### Color Palette

The palette balances professional enterprise credibility with the innovative, energetic nature of interactive technology. All colors meet WCAG 2.1 AA contrast requirements.

#### Primary Colors
| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **IAM Blue** | `#0052CC` | 0, 82, 204 | Primary brand, CTAs, links, headers |
| **IAM Blue Dark** | `#003D99` | 0, 61, 153 | Hover states, active elements |
| **IAM Blue Light** | `#4C9AFF` | 76, 154, 255 | Accents, highlights, interactive elements |

#### Secondary Colors
| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Trust Green** | `#00875A` | 0, 135, 90 | Success states, healthcare sector, positive indicators |
| **Innovation Orange** | `#FF7452` | 255, 116, 82 | Education sector accent, badges, alerts |
| **Enterprise Purple** | `#5243AA` | 82, 67, 170 | Premium features, enterprise tier |

#### Neutral Palette
| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Charcoal** | `#172B4D` | 23, 43, 77 | Body text, headers |
| **Slate** | `#42526E` | 66, 82, 110 | Secondary text, captions |
| **Gray 400** | `#6B778C` | 107, 119, 140 | Placeholder text, disabled states |
| **Gray 200** | `#DFE1E6` | 223, 225, 230 | Borders, dividers |
| **Gray 100** | `#F4F5F7` | 244, 245, 247 | Backgrounds, cards |
| **White** | `#FFFFFF` | 255, 255, 255 | Primary background |

#### Semantic Colors
| Name | Hex | Usage |
|------|-----|-------|
| **Success** | `#00875A` | Form success, positive feedback |
| **Warning** | `#FFAB00` | Warnings, attention required |
| **Error** | `#DE350B` | Errors, validation failures |
| **Info** | `#0065FF` | Informational messages |

#### Sector-Specific Accent Colors
| Sector | Accent Color | Hex |
|--------|--------------|-----|
| Education (Onderwijs) | Warm Orange | `#FF8B00` |
| Healthcare (Zorg) | Calm Teal | `#00B8D9` |
| Entertainment (Parken) | Vibrant Purple | `#6554C0` |
| Corporate | Professional Blue | `#0052CC` |

**Design Rationale:** Blue conveys trust, technology, and professionalism (critical for B2B). Green signals healthcare credibility. Orange adds energy without being childish. The neutral palette ensures readability and enterprise-grade cleanliness.

---

### Typography Specifications

#### Font Stack

**Primary Font (Headlines):** Inter
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
```
- **Rationale:** Inter is a professional, highly legible typeface designed for screens. Widely used in enterprise SaaS (Stripe, Linear, Figma). Free via Google Fonts.

**Secondary Font (Body):** Source Sans Pro
```css
font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```
- **Rationale:** Excellent readability at small sizes, open-source, complements Inter perfectly.

**Monospace (Code/Technical):** JetBrains Mono
```css
font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
```

#### Type Scale

| Element | Font | Weight | Size (Desktop) | Size (Mobile) | Line Height | Letter Spacing |
|---------|------|--------|----------------|---------------|-------------|----------------|
| **H1** | Inter | 700 | 48px / 3rem | 32px / 2rem | 1.2 | -0.02em |
| **H2** | Inter | 600 | 36px / 2.25rem | 28px / 1.75rem | 1.25 | -0.01em |
| **H3** | Inter | 600 | 28px / 1.75rem | 22px / 1.375rem | 1.3 | 0 |
| **H4** | Inter | 600 | 22px / 1.375rem | 18px / 1.125rem | 1.35 | 0 |
| **H5** | Inter | 500 | 18px / 1.125rem | 16px / 1rem | 1.4 | 0 |
| **Body Large** | Source Sans Pro | 400 | 18px / 1.125rem | 16px / 1rem | 1.6 | 0 |
| **Body** | Source Sans Pro | 400 | 16px / 1rem | 16px / 1rem | 1.6 | 0 |
| **Body Small** | Source Sans Pro | 400 | 14px / 0.875rem | 14px / 0.875rem | 1.5 | 0 |
| **Caption** | Source Sans Pro | 400 | 12px / 0.75rem | 12px / 0.75rem | 1.4 | 0.02em |
| **Button** | Inter | 600 | 16px / 1rem | 16px / 1rem | 1 | 0.01em |
| **Nav Link** | Inter | 500 | 15px / 0.9375rem | 16px / 1rem | 1 | 0.01em |

#### Font Loading
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Sans+Pro:wght@400;600&display=swap" rel="stylesheet">
```

---

### Accessibility Requirements (WCAG 2.1 AA Compliance)

This website **MUST** achieve full **WCAG 2.1 Level AA** compliance. This is a legal requirement under Dutch accessibility law (Besluit digitale toegankelijkheid overheid) and a business requirement for B2B clients in education and healthcare sectors.

#### Mandatory Requirements

**1. Perceivable**
- [ ] All images have descriptive `alt` text (not "image of..." but functional descriptions)
- [ ] Video content has captions/subtitles in Dutch
- [ ] Color is never the sole means of conveying information
- [ ] Text contrast ratio minimum **4.5:1** for body text, **3:1** for large text (>18px bold or >24px regular)
- [ ] UI component contrast minimum **3:1** against background
- [ ] Content can be resized to 200% without loss of functionality
- [ ] No text as images (except logos)

**2. Operable**
- [ ] All functionality available via keyboard (Tab, Enter, Escape, Arrow keys)
- [ ] No keyboard traps
- [ ] Skip-to-content link as first focusable element
- [ ] Focus indicators visible (minimum 2px solid outline, `#0052CC`)
- [ ] Focus order logical (matches visual order)
- [ ] Page titles unique and descriptive
- [ ] Headings in proper hierarchy (no skipping levels)
- [ ] Link text descriptive (no "click here" or "read more" without context)
- [ ] Touch targets minimum 44x44px on mobile
- [ ] No content flashes more than 3 times per second

**3. Understandable**
- [ ] Page language declared: `<html lang="nl">`
- [ ] Form inputs have associated `<label>` elements
- [ ] Error messages identify the field and describe the error
- [ ] Consistent navigation across all pages
- [ ] Consistent identification of UI components

**4. Robust**
- [ ] Valid HTML (run through W3C Validator)
- [ ] ARIA used correctly (prefer native HTML over ARIA)
- [ ] Name, role, value available for all interactive elements

#### Testing Requirements
1. **Automated:** Run axe DevTools or WAVE on all pages
2. **Keyboard:** Navigate entire site using only keyboard
3. **Screen Reader:** Test with NVDA (Windows) or VoiceOver (Mac) on key flows
4. **Color:** Verify all colors using WebAIM Contrast Checker
5. **Zoom:** Test at 200% browser zoom

---

## 📱 MOBILE NAVIGATION SPECIFICATIONS

### Mobile-First Approach

Design for mobile (360px) first, then enhance for larger screens.

### Breakpoints
```css
/* Mobile First */
/* Default styles: 0 - 767px */

/* Tablet */
@media (min-width: 768px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large Desktop */
@media (min-width: 1440px) { }
```

### Mobile Navigation Component

#### Header (Mobile: 0-767px)
```
┌─────────────────────────────────────┐
│ [Logo]              [☰ Menu]        │  Height: 64px
└─────────────────────────────────────┘
```

- **Logo:** Left-aligned, max-height 40px, links to homepage
- **Hamburger Button:** Right-aligned, 44x44px touch target
- **Background:** White (`#FFFFFF`) with subtle shadow on scroll
- **Position:** Sticky, z-index: 1000

#### Mobile Menu (Expanded State)
```
┌─────────────────────────────────────┐
│ [Logo]              [✕ Close]       │
├─────────────────────────────────────┤
│                                     │
│  Producten                    [▼]   │
│  ├─ Interactieve Vloer             │
│  ├─ Interactieve Muur              │
│  ├─ Interactieve Zandbak           │
│  ├─ Interactieve Klimwand          │
│  ├─ Mobiele Vloer                  │
│  └─ Software & Maatwerk            │
│                                     │
│  Sectoren                     [▼]   │
│  ├─ Onderwijs                      │
│  ├─ Zorg & Revalidatie             │
│  └─ Parken & Speelhallen           │
│                                     │
│  Over Ons                          │
│  Prijzen                           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Contact Opnemen            │   │  Primary CTA
│  └─────────────────────────────┘   │
│                                     │
│  📞 +31 6 23998934                  │
│  ✉️  contact@interactivemove.nl     │
│                                     │
└─────────────────────────────────────┘
```

#### Mobile Navigation Behavior

1. **Hamburger Icon:**
   - Three horizontal lines, 24px wide, 2px thick each
   - 6px spacing between lines
   - Animates to X on open (CSS transition, 300ms ease)

2. **Menu Open:**
   - Full-screen overlay (100vh, 100vw)
   - Background: White
   - Body scroll locked (`overflow: hidden` on `<body>`)
   - Fade-in animation (300ms)

3. **Submenu Accordions:**
   - Tap to expand/collapse
   - Chevron rotates 180° on expand
   - Smooth height transition (200ms)
   - Only one submenu open at a time

4. **Link Behavior:**
   - Menu closes on any link click
   - Smooth scroll to anchor targets
   - Active page highlighted (IAM Blue left border)

5. **Close Triggers:**
   - X button tap
   - Escape key press
   - Click outside menu (on overlay)
   - Any navigation link click

#### Desktop Navigation (1024px+)
```
┌────────────────────────────────────────────────────────────────┐
│ [Logo]   Producten▼  Sectoren▼  Over Ons  Prijzen  [Contact]  │
└────────────────────────────────────────────────────────────────┘
```

- **Dropdowns:** Hover-activated, 200ms delay before close
- **Mega Menu (Producten):** 2-column layout with product icons
- **Active State:** Underline with IAM Blue
- **CTA Button:** Solid IAM Blue, white text, right-aligned

---

## 📝 CONTENT — Copy Structure & Templates

All content must be in **Dutch**. Below are templates and placeholder structures for key pages.

### Homepage (index.html)

#### Hero Section
```
[H1] Breng Beweging en Interactie naar Uw Organisatie

[Subhead] Interactieve projectiesystemen die meetbare resultaten leveren 
in onderwijs, zorg en entertainment.

[CTA Primary] Plan een Adviesgesprek
[CTA Secondary] Bekijk Onze Oplossingen

[Trust Indicators]
✓ 500+ installaties in Nederland en België
✓ 10+ jaar ervaring in interactieve technologie  
✓ 98% klanttevredenheid (gemeten via NPS)
```

#### Value Proposition Section
```
[H2] Waarom Organisaties Kiezen voor InterActiveMove

[Card 1: Onderwijs]
[H3] Verhoogde Leerbetrokkenheid
Scholen rapporteren tot 40% meer engagement tijdens bewegingslessen. 
Onze systemen combineren spel met leerdoelen.
→ Bekijk onderwijsoplossingen

[Card 2: Zorg]
[H3] Bewezen Therapieresultaten
Fysiotherapeuten en revalidatiecentra zetten onze systemen in voor 
motiverende bewegingstherapie met meetbare vooruitgang.
→ Bekijk zorgoplossingen

[Card 3: Entertainment]
[H3] ROI Binnen 2 Jaar
Speelparken en FECs verhogen bezoekersbetrokkenheid en herhalingsbezoek 
met interactieve attracties.
→ Bekijk entertainment-oplossingen
```

#### Products Section
```
[H2] Onze Interactieve Systemen

[Product Card Template]
[Image: Product in use in professional setting]
[Badge: "Meest gekozen" / "Nieuw" / "Voor verhuur"]
[H3] [Productnaam]
[Body] [2-3 zinnen over zakelijke waarde, niet features]
[Link] Specificaties bekijken →
[Link] Offerte aanvragen →
```

#### Social Proof Section
```
[H2] Vertrouwd Door Beslissers in Onderwijs en Zorg

[Testimonial Template]
"[Quote over zakelijke impact - ROI, uitkomsten, efficiëntie]"
— [Naam], [Functie]
   [Organisatie]
   [Optioneel: Logo]

[Stats Bar]
500+ actieve installaties | 150+ scholen | 50+ zorginstellingen | 
25+ gemeenten
```

#### CTA Section
```
[H2] Ontdek Wat InterActiveMove Voor Uw Organisatie Kan Betekenen

[Body] Plan een vrijblijvend adviesgesprek. Onze experts bespreken uw 
situatie en tonen relevante referenties.

[Form Fields]
- Naam*
- E-mailadres*
- Organisatie*
- Sector (dropdown: Onderwijs / Zorg / Entertainment / Anders)
- Bericht
- [Checkbox] Ik ga akkoord met het privacybeleid*

[CTA] Verstuur Aanvraag

[Trust Signals]
✓ Reactie binnen 24 uur
✓ Geen verplichtingen
✓ Referenties op aanvraag
```

### Product Page Template (products/*.html)

```
[Breadcrumb] Home > Producten > [Productnaam]

[H1] [Productnaam]
[Subhead] [Één zin zakelijke waardepropositie]

[Hero Image: Product in professionele setting]

[H2] Zakelijke Voordelen

[Benefit 1]
[Icon] [H3] [Voordeel voor organisatie]
[Body] [2-3 zinnen met concrete uitkomsten]

[Benefit 2]
[Icon] [H3] [Voordeel voor gebruikers]
[Body] [2-3 zinnen]

[Benefit 3]
[Icon] [H3] [Voordeel voor beheerders]
[Body] [2-3 zinnen]

[H2] Technische Specificaties

| Specificatie | Details |
|--------------|---------|
| Projectiegrootte | [X] tot [Y] m² |
| Installatie | [Plafond/Mobiel/etc.] |
| Minimale ruimtehoogte | [X] meter |
| Meegeleverde software | [X] spellen, Game Editor |
| Garantie | [X] jaar |
| Onderhoud | [Details] |

[H2] Implementatietraject

1. [Stap] — [Beschrijving]
2. [Stap] — [Beschrijving]
3. [Stap] — [Beschrijving]
4. [Stap] — [Beschrijving]

[H2] Klantcase
[Quote + organisatienaam + resultaten]

[CTA Section]
[H3] Interesse in de [Productnaam]?
[Body] Vraag vrijblijvend een offerte aan of plan een demonstratie.
[CTA Primary] Offerte Aanvragen
[CTA Secondary] Demo Plannen
```

### Sector Page Template (onderwijs.html, zorg-revalidatie.html, etc.)

```
[H1] InterActiveMove voor [Sector]
[Subhead] [Specifieke waardepropositie voor deze sector]

[Hero: Sector-specifieke beelden]

[H2] Uitdagingen in [Sector]
- [Uitdaging 1 die IAM oplost]
- [Uitdaging 2]
- [Uitdaging 3]

[H2] Onze Oplossingen voor [Sector]
[Product cards relevant voor deze sector]

[H2] Resultaten bij [Sector]-Organisaties
[Case studies / testimonials specifiek voor sector]

[H2] Veelgestelde Vragen over [Sector]
[FAQ specifiek voor inkoopcriteria van deze sector]

[CTA] Neem Contact Op met Onze [Sector]-Specialist
```

### Over Ons Page (over-ons.html)

```
[H1] Over InterActiveMove

[H2] Onze Missie
[Body] [2-3 alinea's over het bedrijf, opgericht in [JAAR], gevestigd in 
[PLAATS], met focus op innovatie in interactieve technologie]

[H2] Ons Team
[Team member cards met foto, naam, functie - optioneel]

[H2] Onze Waarden
- [Waarde 1]: [Korte uitleg]
- [Waarde 2]: [Korte uitleg]
- [Waarde 3]: [Korte uitleg]

[H2] Certificeringen & Partners
[Logo's van relevante certificeringen, lidmaatschappen, partners]

[H2] Werken bij IAM
[Optioneel: vacatures of link naar werkenbij]
```

### Prijzen Page (prijzen.html)

```
[H1] Transparante Prijzen

[Intro] Bij InterActiveMove geloven we in transparantie. Hieronder vindt u 
indicatieve prijsranges. Voor een exacte offerte nemen we uw specifieke 
situatie door.

[H2] Koopoplossingen

[Pricing Table]
| Product | Vanaf | Inclusief |
|---------|-------|-----------|
| Interactieve Vloer | €[X].000 | Hardware, software, installatie, training |
| Interactieve Muur | €[X].000 | ... |
| etc. |

[H2] Huuroplossingen

[Table for rental pricing]

[H2] Wat Is Inbegrepen?
- [Item]
- [Item]
- [Item]

[H2] Financieringsopties
[Info over leasing, huurkoop, etc.]

[CTA] Ontvang een Offerte op Maat
```

---

## Tasks

Work through ALL tasks below. For each change, explain what you changed and why.

---

### 1. 🎨 DESIGN — Professional Enterprise Rebrand

The current design feels too playful/childish for the B2B corporate audience IAM targets (school directors, healthcare managers, facility owners, municipal buyers).

**Do:**
- Implement the color palette defined above — shift from playful to professional while maintaining brand energy
- Apply the typography specifications — Inter for headlines, Source Sans Pro for body
- Reduce excessive animations, bouncy effects, and playful decorative elements
- Product cards and sections should feel like enterprise SaaS/B2B — clean grid layouts, proper whitespace, subtle shadows
- Testimonials section should look credible (enterprise style, not bubbly)
- CTAs should be confident and professional, not bright/childish
- The interactive projector demo (hero section) is cool — keep it but ensure it feels premium, not toy-like
- Ensure visual consistency across ALL pages, not just index.html

**Don't:**
- Don't make it boring/sterile — IAM's product is inherently fun. The design should say "serious company, exciting product."
- Don't remove the interactive elements — just make them feel polished.

---

### 2. 📝 CONTENT — Corporate Copy Rewrite

Current copy is functional but reads like a consumer brochure. Rewrite for decision-makers at organizations.

**Do:**
- Follow the copy structure templates provided above
- Rewrite headlines and body copy to speak to B2B buyers: ROI, measurable outcomes, case studies, institutional credibility
- Stats section (500+ installations, 10+ years, etc.) — make these more impactful with context
- Testimonials — make them sound institutional/professional with titles and organization types
- Product descriptions — lead with business value, not just features
- FAQ — add questions a procurement manager would ask (warranty, maintenance, ROI, integration)
- CTA copy: replace playful language with confident professional language
- Keep all content in **Dutch**

**Don't:**
- Don't lose the warmth entirely
- Don't invent fake statistics — use placeholders like `[X]` and flag them

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
- Replace with modal contact form with the product name auto-populated
- Modal should use same HubSpot submission logic

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
- Implement mobile navigation per specifications above
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

### 5. ♿ ACCESSIBILITY — WCAG 2.1 AA Compliance

Implement all accessibility requirements listed in the Design System Specifications section above.

**Checklist to verify:**
- [ ] `<html lang="nl">` on all pages
- [ ] Skip-to-content link
- [ ] All images have alt text
- [ ] Color contrast meets 4.5:1 minimum
- [ ] Keyboard navigation works throughout
- [ ] Focus indicators visible (2px solid #0052CC)
- [ ] Form labels associated with inputs
- [ ] Error messages descriptive
- [ ] Heading hierarchy correct
- [ ] ARIA used correctly where needed
- [ ] Touch targets 44x44px minimum

**Run automated testing:**
```bash
# Using axe-cli
npx axe https://darkgoldenrod-crane-349726.hostingersite.com/

# Or use browser extensions:
# - axe DevTools
# - WAVE
```

---

## Important Notes

- **Language:** All user-facing content must be in **Dutch**
- **No frameworks:** Keep it pure HTML/CSS/JS + HTMX. Do not add React, Vue, Tailwind, etc.
- **No build step:** Everything must work as static files served directly
- **Email placeholders:** Use `YOUR_PORTAL_ID` and `YOUR_FORM_GUID` for HubSpot
- **Contact email:** Use `contact@interactivemove.nl` as the primary email throughout
- **Phone:** Keep `+31 6 23998934` as secondary contact method
- **Domain:** The final domain will be `interactivemove.nl` — use this in meta tags, canonical URLs, etc.
- **Accessibility:** WCAG 2.1 AA compliance is mandatory, not optional

---

## Deliverables

Provide the complete refactored codebase with:
1. All HTML files updated
2. Updated `styles.css` implementing design system
3. Updated/new JS files
4. A `CHANGELOG.md` listing every change made, organized by task category
5. An `ACCESSIBILITY-REPORT.md` documenting WCAG compliance status

---

## Changelog (v1 → v2)

### Added in v2.0

| Section | What Was Added | Rationale |
|---------|----------------|-----------|
| **Color Palette** | Complete color system with primary, secondary, neutral, and semantic colors including hex values, RGB, and usage guidelines | QA feedback: missing color specifications. Developers need exact values to implement consistently. |
| **Typography** | Full type scale with font families (Inter + Source Sans Pro), weights, sizes for desktop/mobile, line heights, and letter spacing | QA feedback: missing font specifications. Ensures visual consistency and proper hierarchy. |
| **WCAG 2.1 AA** | Dedicated accessibility section with 25+ specific requirements, testing procedures, and compliance checklist | QA feedback: accessibility level not specified. Legal requirement for Dutch B2B (especially edu/healthcare clients). |
| **Mobile Navigation** | Complete mobile nav specifications including wireframes, behavior specs, touch targets, animation timings, and breakpoints | QA feedback: mobile navigation not specified. Critical for mobile-first implementation. |
| **Copy Templates** | Structured content templates for homepage, product pages, sector pages, about, and pricing with placeholder text | QA feedback: missing actual copy. Gives developers and copywriters clear structure to work from. |
| **Sector Colors** | Color accents for Education, Healthcare, Entertainment, and Corporate sectors | Enables visual differentiation between sector-specific pages while maintaining brand consistency. |
| **Task 5** | New accessibility task with specific implementation checklist | Separates accessibility work into its own trackable task. |
| **Deliverables Update** | Added ACCESSIBILITY-REPORT.md to deliverables | Documentation requirement for compliance verification. |

### Design Decisions Rationale

1. **Inter + Source Sans Pro fonts:** Industry-standard pairing used by enterprise companies (Stripe, Linear). Highly legible, free, well-supported.

2. **Blue-based palette:** Blue conveys trust, technology, and professionalism—critical for B2B. Avoids the "playground" feel of the current design.

3. **WCAG 2.1 AA (not AAA):** AA is the legal standard in Netherlands and achievable without compromising design. AAA would be too restrictive.

4. **Mobile-first navigation:** 60%+ of B2B research now happens on mobile. Proper mobile nav is essential for lead capture.

5. **44x44px touch targets:** Apple/Google minimum recommendation for accessible mobile interfaces.

---

*Document Version: 2.0*
*Last Updated: 2025-02-05*
*Author: Content Revision Agent, Oopuo Holdings*
