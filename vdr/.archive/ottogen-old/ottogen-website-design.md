# OttoGen.io — Design Notes

## Concept
Terminal aesthetic meets Swiss design. The site feels like stumbling into a genius's workstation — monospace everything, precise grid, dramatic ASCII art, and generous whitespace. Not corporate, not startup-bro. Something from the future.

## Design System

### Typography
- **Font stack:** SF Mono → Fira Code → Cascadia Code → JetBrains Mono → Consolas → monospace
- **Scale:** 0.625rem (labels) → 0.75rem (body small) → 0.875rem (body) → 1.5rem (h2) → 2.5rem (h1)
- **All-caps + wide letter-spacing** for labels and nav (Swiss style)

### Color
| Token    | Value     | Use                        |
|----------|-----------|----------------------------|
| --bg     | #fafafa   | Page background            |
| --fg     | #111      | Primary text               |
| --muted  | #666      | Secondary text             |
| --accent | #00ff88   | Neon green — ASCII art, highlights, hover states |
| --border | #ddd      | Section dividers           |

Single accent color (neon green) used sparingly for maximum contrast. Selection highlight uses accent color.

### Grid
- **8px base unit** — all spacing is multiples of 8
- **960px max-width** container — classic Swiss grid width
- **3-column grid** for capabilities, process steps, and pricing
- Collapses to single column on mobile

### Layout Principles
- **Generous vertical padding** (128px between sections)
- **Left-aligned text** — no centering (Swiss typography principle)
- **Horizontal rules** as section dividers (1px border-top)
- **Asymmetric whitespace** — text blocks max at 560-640px even in wider container

## Sections

### Hero
- Large ASCII art "OTTOGEN" in block characters (neon green)
- ASCII box with status/mission — terminal feel
- Bold headline with blinking cursor block
- Staggered fade-in animations (0.3s → 0.6s → 0.8s → 1s)

### What I Do
- Section numbering system (`// 01 —`)
- 3-column capability grid with thick top borders
- Copy is direct, no fluff

### How It Works
- CSS counter-based step numbers (01, 02, 03) in large green type
- Three clear phases: Audit → Architect → Deploy
- Terminal prompt at bottom for flavor

### Pricing
- 3 cards, middle one "featured" with green border + tinted background
- Each card: tag, name, price, italic quote (green left border), feature list
- Hover: green border + subtle lift
- Arrow prefix on list items in accent color

### Contact
- 2-column: ASCII art box (left) + contact links (right)
- Links slide right on hover
- ASCII art hidden on mobile

## Interactions
- **Nav:** Fixed, frosted glass (backdrop-filter blur)
- **Cards:** Hover lift + border color change
- **Links:** Slide-right on hover (contact), color change (nav)
- **Cursor blink:** CSS animation on hero headline
- **Selection:** Accent green background

## Responsive
- Breakpoint at 768px
- All grids collapse to single column
- ASCII art scales down via clamp()
- Contact ASCII hidden on mobile
- Nav links hidden on mobile (could add hamburger later)

## Brand Voice
- Direct, confident, slightly irreverent
- Terminal metaphors throughout
- Short sentences. No corporate filler.
- Pricing is transparent — "I don't do 'let's hop on a call to discuss pricing'"
- Footer: "Built by a human (for now)" — wink at the AI angle

## Next Steps
- [ ] Add hamburger menu for mobile nav
- [ ] Consider dark mode toggle (would suit the terminal aesthetic even more)
- [ ] Add subtle scroll-triggered animations (intersection observer)
- [ ] Custom favicon — terminal cursor or `>_` icon
- [ ] Add Open Graph meta tags for social sharing
- [ ] Consider adding a "proof" section — case studies or metrics
