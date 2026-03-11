# OttoGen.io Website V2 — Design Decisions

## Color Palette
- **Primary background:** #0a0a0a (near-black)
- **Accent:** Electric blue #0066ff — chosen for premium tech feel, contrast against black, and association with intelligence/precision
- **Text:** #e8e6e3 (warm cream-white, easier on eyes than pure white)
- **Secondary text:** #666666
- **Accent glow:** rgba(0, 102, 255, 0.15) for subtle highlights

## Typography
- **Monospace:** JetBrains Mono (Google Fonts) — headers, terminal elements, code
- **Body:** Inter (Google Fonts) — clean, professional readability
- Mix creates premium "engineer's portfolio" aesthetic

## Effects Stack
1. **Boot sequence** — Pure CSS/JS terminal animation, no library needed. Fake system init with progress bars, checksums, timestamps
2. **Three.js ASCII torus knot** — Using Three.js r158 + AsciiEffect from addons CDN. Torus knot chosen over skull (too edgy) or globe (too generic). Disabled on mobile (< 768px) for performance
3. **Typewriter** — Custom JS, no Typed.js dependency needed for simple effect
4. **Scroll reveals** — IntersectionObserver API, pure CSS transitions
5. **Glitch effect** — CSS clip-path animation on hover
6. **Subtle particle field** — Canvas-based starfield behind content, very low opacity

## Architecture
- Single HTML file, all inline
- CDN: Three.js core + AsciiEffect addon
- Google Fonts: Inter + JetBrains Mono
- No build step, no npm
- Mobile-first responsive, heavy effects disabled on small screens

## Content Strategy
- Sharp, confident copy — not salesy
- Terminal aesthetic reinforces "this person actually builds things"
- Pricing transparent and upfront — builds trust
- CTA is a Calendly-style booking link
