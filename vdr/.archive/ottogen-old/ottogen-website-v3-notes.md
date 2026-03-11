# OttoGen Website V3 — Notes

## Version History
- **V1**: Too simple, lacked impact
- **V2**: Too tech-savvy — terminal boot sequences, ASCII art, code aesthetics alienated the ICP
- **V3**: Premium consultancy feel — Apple/Stripe-level polish, zero code aesthetics

## V3 Design Decisions
- **Fonts**: Space Grotesk (headings) + Inter (body) via Google Fonts
- **Color**: Dark bg (#050510) with electric blue (#0055ff) — premium + trustworthy
- **Hero**: Animated gradient mesh (3 blobs, canvas) — futuristic but not nerdy
- **Animations**: IntersectionObserver reveals, count-up stats, hover card lifts, parallax CTA glow
- **Copy**: Conversational English, written for Dutch SMB owners (bakeries, consultants, trades, e-commerce)
- **No frameworks**: Single HTML file, inline CSS + JS, ~24KB total

## Sections
1. **Nav** — Fixed, glassmorphism on scroll, mobile hamburger
2. **Hero** — Gradient mesh canvas bg, bold headline, dual CTA
3. **Pain** — Problem statement + 73% stat circle
4. **Services** — 3 cards (Audit €500, Partner €1.5-2.5k/mo, Build €2.5-5k), middle "featured"
5. **How It Works** — 4 steps with connected line
6. **Stats** — Count-up numbers (40h saved, 12 businesses, 97% satisfaction, 3 days to results)
7. **Testimonials** — 3 placeholder cards with Dutch names
8. **About** — Photo placeholder + personal copy
9. **CTA** — Radial glow, Calendly link
10. **Footer** — Minimal

## TODO for Otto
- [ ] Replace Calendly link with actual booking URL
- [ ] Add real photo in About section
- [ ] Replace placeholder testimonials with real ones
- [ ] Add favicon + OG meta tags
- [ ] Consider Dutch translation
- [ ] Add analytics (GA4 or Plausible)
- [ ] Custom domain setup
