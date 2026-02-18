# Design System & Visual Language

> **Status:** ✅ DESIGNED | **Phase:** 0
> **Aesthetic:** Refined Dark Command Center — Linear meets Arc Browser meets luxury flight deck
> **Principle:** "More beautiful than Notion" = depth, warmth, precision. Not flat. Not cold.

---

## 1. Design Philosophy

Kira is a personal AI operating system. The interface must feel like a **calm command center** — intelligence at your fingertips without visual noise. Every pixel serves a purpose. Dense data feels approachable. Darkness provides focus. Warmth signals a partner, not a tool.

**Core Principles:**
- **Dark-first.** Light mode exists but dark is the default and primary design target.
- **Information density without clutter.** Show more, not less — but with clear hierarchy.
- **Depth over flatness.** Subtle gradients, gentle glows, layered surfaces. Not Material Design's paper metaphor. Think glass and light.
- **Warmth through color.** Cool base + warm accents. The AI feels alive, not sterile.
- **Motion with purpose.** Nothing moves unless it communicates something.
- **Keyboard-first.** Every action reachable by keyboard. Visual affordances for mouse users.

---

## 2. Color Palette

### 2.1 Dark Theme (Primary)

**Backgrounds (darkest to lightest):**
```
--bg-base:        #0C0D11    /* App background — near-black with slight blue */
--bg-surface:     #13141A    /* Cards, panels, sidebar */
--bg-raised:      #1A1B23    /* Elevated cards, modals, dropdowns */
--bg-overlay:     #22232E    /* Hover states, selected items */
--bg-wash:        #2A2B38    /* Divider areas, subtle section separators */
```

**Primary (Indigo-Violet — intelligence, focus):**
```
--primary-50:     #EDE9FE
--primary-100:    #DDD6FE
--primary-200:    #C4B5FD
--primary-300:    #A78BFA
--primary-400:    #8B5CF6    /* Primary button, active nav */
--primary-500:    #7C3AED    /* Hover state */
--primary-600:    #6D28D9
--primary-700:    #5B21B6
--primary-900:    #1E1533    /* Primary tinted surface */
```

**Accent (Warm Amber — action, human touch):**
```
--accent-50:      #FFFBEB
--accent-100:     #FEF3C7
--accent-200:     #FDE68A
--accent-300:     #FCD34D
--accent-400:     #FBBF24    /* Badges, notifications, highlights */
--accent-500:     #F59E0B    /* CTA secondary */
--accent-600:     #D97706
```

**Text:**
```
--text-primary:   #F0F0F5    /* Primary text — not pure white (easier on eyes) */
--text-secondary: #9CA3AF    /* Secondary text, labels */
--text-tertiary:  #6B7280    /* Placeholder, disabled, metadata */
--text-inverse:   #0C0D11    /* Text on light/colored backgrounds */
```

**Borders & Dividers:**
```
--border-subtle:  #1F2029    /* Card borders — barely visible */
--border-default: #2D2E3A    /* Input borders, dividers */
--border-strong:  #3D3E4D    /* Focused input borders */
--border-accent:  var(--primary-400)  /* Active/selected borders */
```

**Semantic Colors:**
```
--success:        #34D399    /* Completed, approved, on-track */
--success-subtle: #064E3B    /* Success background tint */
--warning:        #FBBF24    /* At risk, approaching deadline */
--warning-subtle: #451A03    /* Warning background tint */
--error:          #F87171    /* Failed, overdue, blocked */
--error-subtle:   #450A0A    /* Error background tint */
--info:           #60A5FA    /* Informational, neutral status */
--info-subtle:    #172554    /* Info background tint */
```

### 2.2 Light Theme

```
--bg-base:        #F8F9FC
--bg-surface:     #FFFFFF
--bg-raised:      #FFFFFF
--bg-overlay:     #F1F2F6
--bg-wash:        #E8E9EF
--text-primary:   #111827
--text-secondary: #6B7280
--text-tertiary:  #9CA3AF
--border-subtle:  #E5E7EB
--border-default: #D1D5DB
--border-strong:  #9CA3AF
```

Primary and accent colors stay the same (adjust saturation -10% for light mode readability).

### 2.3 Area Colors

Each area of responsibility gets a signature color for time blocks, badges, and visual coding:

```
--area-1:         #8B5CF6    /* Violet — default/first area */
--area-2:         #3B82F6    /* Blue */
--area-3:         #10B981    /* Emerald */
--area-4:         #F59E0B    /* Amber */
--area-5:         #EF4444    /* Red */
--area-6:         #EC4899    /* Pink */
--area-7:         #06B6D4    /* Cyan */
--area-8:         #84CC16    /* Lime */
```

Used as: time block background tint (10% opacity), sidebar badge dots, project card left-border accent, area icon tint.

### 2.4 Priority Colors

```
--priority-critical: #EF4444  /* Red — pulse animation on badges */
--priority-high:     #F59E0B  /* Amber */
--priority-medium:   #3B82F6  /* Blue */
--priority-low:      #6B7280  /* Gray */
```

### 2.5 Agent Status Colors

```
--agent-working:     #34D399  /* Green pulse */
--agent-idle:        #6B7280  /* Gray */
--agent-blocked:     #F87171  /* Red */
--agent-sleeping:    #4B5563  /* Dim gray */
```

---

## 3. Typography

### 3.1 Font Stack

```
--font-display:  'Outfit', sans-serif         /* Headings — geometric, modern, warm */
--font-body:     'Plus Jakarta Sans', sans-serif  /* Body — humanist, excellent readability */
--font-mono:     'JetBrains Mono', monospace  /* Code, IDs, technical data */
```

**Fallback chain:** `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

**Why these fonts:**
- **Outfit** — Geometric sans with subtle warmth. Distinctive without being distracting. Excellent at display sizes. Not overused in dashboards.
- **Plus Jakarta Sans** — Designed for UI. Excellent x-height, clear at small sizes, humanist warmth. Better than Inter (everyone uses Inter).
- **JetBrains Mono** — Best-in-class mono for code and data. Ligatures, clear symbol differentiation.

### 3.2 Type Scale (Major Third — 1.25 ratio)

```
--text-xs:    0.75rem  / 1rem     (12px) — Captions, timestamps, badges
--text-sm:    0.875rem / 1.25rem  (14px) — Secondary text, table cells, metadata
--text-base:  1rem     / 1.5rem   (16px) — Body text, list items, descriptions
--text-lg:    1.125rem / 1.75rem  (18px) — Emphasized body, card titles
--text-xl:    1.25rem  / 1.75rem  (20px) — Section headings, widget titles
--text-2xl:   1.5rem   / 2rem     (24px) — Page section headings
--text-3xl:   1.875rem / 2.25rem  (30px) — Page titles
--text-4xl:   2.25rem  / 2.5rem   (36px) — Dashboard hero numbers (KPIs)
```

### 3.3 Font Weights

```
--font-regular:   400   /* Body text */
--font-medium:    500   /* Emphasized body, labels */
--font-semibold:  600   /* Card titles, nav items, buttons */
--font-bold:      700   /* Page titles, hero numbers */
```

### 3.4 Heading Styles

| Level | Font | Size | Weight | Color | Usage |
|-------|------|------|--------|-------|-------|
| H1 | Outfit | 30px | Bold | text-primary | Page titles: "Command Center", "Operations" |
| H2 | Outfit | 24px | Semibold | text-primary | Section headings within pages |
| H3 | Outfit | 20px | Semibold | text-primary | Widget titles, card section headers |
| H4 | Plus Jakarta | 18px | Semibold | text-primary | Sub-section headers |
| H5 | Plus Jakarta | 16px | Semibold | text-secondary | Label headings |
| H6 | Plus Jakarta | 14px | Medium | text-tertiary | Small section labels, all-caps |

---

## 4. Spacing System

### 4.1 Base Unit: 4px

```
--space-0:   0px
--space-0.5: 2px      /* Micro — icon-to-text gap */
--space-1:   4px      /* Tight — between badge elements */
--space-1.5: 6px
--space-2:   8px      /* Default — inline element gap */
--space-3:   12px     /* Compact — between related items */
--space-4:   16px     /* Standard — card padding, list item gap */
--space-5:   20px
--space-6:   24px     /* Comfortable — section gap */
--space-8:   32px     /* Roomy — between sections */
--space-10:  40px
--space-12:  48px     /* Page section gap */
--space-16:  64px     /* Major section separator */
--space-20:  80px     /* Page top/bottom margin */
```

### 4.2 Component Padding Standards

```
Button (sm):     4px 12px
Button (md):     8px 16px
Button (lg):     12px 24px
Input:           8px 12px
Card:            16px (compact) / 20px (default) / 24px (spacious)
Modal:           24px
Sidebar:         12px horizontal, 8px between items
Page content:    24px horizontal padding, 24px top
Table cell:      8px 12px
Badge:           2px 8px
Toast:           12px 16px
```

---

## 5. Elevation & Depth

### 5.1 Shadow Scale (Dark Theme)

Dark themes use subtle luminosity shifts rather than heavy shadows:

```
--shadow-xs:  0 1px 2px rgba(0, 0, 0, 0.3)
--shadow-sm:  0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)
--shadow-md:  0 4px 8px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)
--shadow-lg:  0 8px 16px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3)
--shadow-xl:  0 16px 32px rgba(0, 0, 0, 0.6), 0 8px 16px rgba(0, 0, 0, 0.4)
```

**Glow effects (primary interactive elements):**
```
--glow-primary: 0 0 20px rgba(139, 92, 246, 0.15)   /* Subtle violet glow */
--glow-accent:  0 0 20px rgba(251, 191, 36, 0.10)    /* Subtle amber glow */
--glow-success: 0 0 12px rgba(52, 211, 153, 0.15)    /* Completion glow */
```

### 5.2 Z-Index System

```
--z-base:       0       /* Normal flow */
--z-raised:     10      /* Cards, raised surfaces */
--z-sticky:     20      /* Sticky headers, sidebar */
--z-dropdown:   30      /* Dropdowns, popovers */
--z-overlay:    40      /* Overlay backdrops */
--z-modal:      50      /* Modals, dialogs */
--z-toast:      60      /* Toast notifications */
--z-tooltip:    70      /* Tooltips */
--z-command:    80      /* Command palette (Cmd+K) */
```

### 5.3 Card Elevation Levels

| Level | Background | Border | Shadow | Usage |
|-------|-----------|--------|--------|-------|
| Flat | bg-surface | border-subtle | none | Default cards, list items |
| Raised | bg-raised | border-default | shadow-sm | Hover state, focused cards |
| Elevated | bg-raised | border-strong | shadow-md | Modals, dropdowns, command palette |
| Floating | bg-raised | border-accent | shadow-lg + glow | Active drag targets, expanded detail panels |

---

## 6. Border & Shape

### 6.1 Border Radius Scale

```
--radius-none:   0px
--radius-sm:     4px     /* Badges, small elements */
--radius-md:     8px     /* Buttons, inputs, cards (DEFAULT) */
--radius-lg:     12px    /* Large cards, modals */
--radius-xl:     16px    /* Feature cards, hero widgets */
--radius-2xl:    20px    /* Overlay panels */
--radius-full:   9999px  /* Pills, avatars, circular buttons */
```

**Default:** `--radius-md` (8px) for most elements. Consistent, modern, not too round (avoids toy-like feel), not too sharp (avoids corporate coldness).

### 6.2 Border Styles

```
--border-width-thin:   1px    /* Card borders, dividers */
--border-width-medium: 2px    /* Focus indicators, active states */
--border-width-thick:  3px    /* Area color accent bars on cards */
```

---

## 7. Animation & Motion

### 7.1 Duration Scale

```
--duration-instant:  75ms    /* Instant feedback (button press, toggle) */
--duration-fast:     150ms   /* Quick transitions (hover, focus, badge) */
--duration-normal:   250ms   /* Standard transitions (panel open, card expand) */
--duration-slow:     400ms   /* Deliberate transitions (page change, modal) */
--duration-slower:   600ms   /* Emphasis transitions (onboarding, celebration) */
```

### 7.2 Easing Curves

```
--ease-in-out:      cubic-bezier(0.4, 0, 0.2, 1)     /* Default for most transitions */
--ease-out:         cubic-bezier(0, 0, 0.2, 1)        /* Elements entering (slide in) */
--ease-in:          cubic-bezier(0.4, 0, 1, 1)        /* Elements exiting (slide out) */
--ease-bounce:      cubic-bezier(0.34, 1.56, 0.64, 1) /* Playful: badge count update */
--ease-spring:      cubic-bezier(0.22, 1, 0.36, 1)    /* Drag and drop snap */
```

### 7.3 Motion Principles

**DO animate:**
- Page transitions (crossfade, 250ms)
- Panel open/close (slide + fade, 250ms)
- Card hover state (elevation lift, 150ms)
- Status badge updates (scale bounce, 150ms)
- Progress bar changes (width transition, 400ms)
- Drag-and-drop ghost and snap (spring easing)
- Toast enter/exit (slide from right + fade)
- Skeleton screen shimmer (continuous subtle)

**DON'T animate:**
- Text content changes (instant swap)
- Color theme toggle (instant, no transition — avoids disorienting flash)
- Data table sort (instant reorder, no row animation)
- Keyboard navigation focus (instant move, just outline change)

**Special effects:**
- **Agent working indicator:** Soft pulsing glow (green, 2s cycle, ease-in-out)
- **Priority critical badge:** Subtle pulse (red, 3s cycle)
- **Real-time number updates:** Count-up animation (400ms, ease-out)
- **Task completion:** Brief green flash on row + checkmark scale-in (150ms)
- **XP gain:** Number float-up + fade (600ms, ease-out)

---

## 8. Accessibility

### 8.1 Color Contrast

- All text meets **WCAG AA** minimum (4.5:1 for normal text, 3:1 for large text)
- `--text-primary` on `--bg-surface`: 12.5:1 ✅
- `--text-secondary` on `--bg-surface`: 5.8:1 ✅
- `--text-tertiary` on `--bg-surface`: 3.4:1 ✅ (large text only)
- Never rely on color alone to convey meaning (always pair with icon/text/shape)

### 8.2 Focus Indicators

```css
:focus-visible {
  outline: 2px solid var(--primary-400);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

Tab order follows visual layout. Focus trap in modals. Skip-to-content link on every page.

### 8.3 Touch Targets

- Minimum touch target: 44px × 44px (mobile)
- Minimum click target: 32px × 32px (desktop)
- Interactive elements spaced at least 8px apart

### 8.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

### 8.5 Screen Reader

- All images have alt text
- Icon-only buttons have aria-label
- Live regions for real-time updates (agent status, badge counts)
- Semantic HTML: nav, main, aside, section, article
- ARIA landmarks for major page regions

---

## 9. Special Visual Elements

### 9.1 The "Kira Glow"

Signature visual: a subtle gradient glow behind the most important element on screen. Used sparingly for maximum impact.

```css
.kira-glow {
  background: radial-gradient(
    ellipse at center,
    rgba(139, 92, 246, 0.08) 0%,
    transparent 70%
  );
}
```

Applied to: Command Center hero section, active agent card, current time block, primary CTA.

### 9.2 Glass Effect (for elevated overlays)

```css
.glass {
  background: rgba(19, 20, 26, 0.8);
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

Applied to: Command palette, notification dropdown, tooltip.

### 9.3 Gradient Borders (premium feel)

```css
.gradient-border {
  border: 1px solid transparent;
  background-image: linear-gradient(var(--bg-surface), var(--bg-surface)),
                    linear-gradient(135deg, var(--primary-400), var(--accent-400));
  background-origin: border-box;
  background-clip: padding-box, border-box;
}
```

Applied to: Featured cards, active project, "today's top priority" card.

---

## 10. Implementation Notes

### 10.1 CSS Architecture

Use CSS custom properties (variables) defined at `:root` and `[data-theme="light"]`. All color references go through variables — never hard-code hex values in components.

### 10.2 Dark/Light Toggle

Store preference in localStorage. Default: dark. Respect `prefers-color-scheme` on first visit if no stored preference.

### 10.3 Responsive Strategy

- **Desktop (1280px+):** Full sidebar + content + detail panel (three-column capable)
- **Tablet (768px–1279px):** Collapsible sidebar + content (two-column)
- **Mobile (< 768px):** Bottom tab nav + full-screen views (single column)

### 10.4 Loading States

Every data-dependent view has a skeleton screen (shimmer animation on `--bg-wash` colored blocks matching the final layout shape). No spinners except for actions in progress (button loading state).

---

*This design system is the visual DNA of Kira. Every screen spec references these tokens. No component should introduce a color, font size, or spacing value that isn't defined here.*
