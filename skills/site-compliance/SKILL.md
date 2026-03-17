---
name: site-compliance
description: Analyze and bring any static website into compliance with the Oopuo Site Standard (OSS). Use when asked to check a website against the standard, bring a site into compliance, audit a site's structure, or prepare a website for the Oopuo Ops Platform editor. Triggers on phrases like "check compliance", "bring to standard", "audit site", "prepare for platform", "OSS compliance", "site standard".
---

# Site Compliance

Analyze a static website and bring it into compliance with the Oopuo Site Standard (OSS).

## Standard Reference

Read `references/SITE-STANDARD.md` for the full specification.

## Workflow

### 1. Audit

Scan the target site directory and check against the standard:

```
- [ ] site.json exists with all required fields
- [ ] theme.json exists with design tokens
- [ ] css/theme.css exists with CSS custom properties from theme.json
- [ ] All <section> elements have data-block="type" attribute
- [ ] All content sections have data-editable attribute
- [ ] All editable elements have data-field="name" attribute
- [ ] All repeating elements have data-repeatable + data-item
- [ ] All visible text has data-i18n="key" attribute
- [ ] No inline styles on HTML elements (all moved to CSS classes)
- [ ] blog/ directory exists with index.html and posts/
- [ ] blog/feed.xml RSS template exists
- [ ] Structured data (JSON-LD) on each page
- [ ] Open Graph meta tags on each page
- [ ] assets/images/ organized
- [ ] i18n.js covers all data-i18n keys
```

Output a gap report with ✅/❌ per item.

### 2. Fix

For each gap, modify the site IN PLACE:

- **site.json**: Derive from existing HTML — extract nav, pages, i18n config, SEO defaults, forms
- **theme.json**: Extract design tokens from CSS custom properties
- **css/theme.css**: Move CSS variable definitions here, import from main.css
- **data-block**: Map each `<section>` to a block type (hero, features, services, testimonials, team, contact-form, stats, faq, footer, marquee, two-column, cta-banner)
- **data-editable/data-field**: Add to all content elements (headings, paragraphs, buttons, images, links)
- **data-repeatable/data-item**: Add to repeating grids (cards, team members, FAQs, logos)
- **Inline styles**: Move every `style="..."` to a CSS class in main.css
- **Blog**: Create blog/index.html (listing template matching site design), blog/posts/, blog/feed.xml
- **JSON-LD**: Add Organization, WebPage, BreadcrumbList structured data
- **OG tags**: Add per-page Open Graph meta tags
- **i18n**: Verify all data-i18n keys exist in i18n.js, add missing ones

### 3. Verify

- Confirm no visual changes (design preserved)
- Confirm all HTML files have complete data-* attributes
- Confirm site.json and theme.json are valid JSON
- Commit with message "chore: bring site into OSS compliance"

## Rules

- NEVER change visual design or content
- NEVER remove existing functionality
- NEVER break the i18n system
- Preserve git history
- Touch every HTML file — no section left without data-block
