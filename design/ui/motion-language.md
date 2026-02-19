# Motion Language

> **Status:** ✅ DESIGNED | **Phase:** 0
> **Purpose:** Animation principles, timing curves, transition types, micro-interactions, loading states, and drag-and-drop feedback. Motion makes Kira feel alive and responsive.

---

## 1. Animation Principles

1. **Purposeful** — Every animation communicates something (state change, spatial relationship, feedback). No decorative animation.
2. **Fast** — UI should feel instant. Most transitions under 200ms. Never block interaction.
3. **Natural** — Ease-out for entrances (decelerating), ease-in for exits (accelerating). No linear transitions on UI elements.
4. **Consistent** — Same type of action = same animation everywhere.
5. **Reducible** — Respect `prefers-reduced-motion`. All animations have a static fallback.

---

## 2. Timing Curves & Durations

### Duration Scale

| Token | Duration | Use |
|-------|----------|-----|
| `--duration-instant` | 100ms | Hover states, color changes |
| `--duration-fast` | 150ms | Button press, toggle, checkbox |
| `--duration-normal` | 200ms | Panel slide, dropdown open, fade |
| `--duration-slow` | 300ms | Page transitions, modal open |
| `--duration-deliberate` | 500ms | Complex layout shifts, drag settle |

### Easing Curves

| Token | Curve | Use |
|-------|-------|-----|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances (element appearing) |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Exits (element leaving) |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.55, 1)` | Moving between positions |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful feedback (checkbox, like) |

---

## 3. Transition Types

### Page Transitions
Content area cross-fades between routes. Duration: `--duration-normal`. No slide — just opacity (0→1 in, 1→0 out).

### Side Panel (Task/Project Detail)
Slides in from right. Duration: `--duration-slow`, `--ease-out`. Backdrop fades to 20% black simultaneously. Close: reverse with `--ease-in`.

### Modal
Fades in + scales from 95% to 100%. Duration: `--duration-normal`. Backdrop fades to 40% black. Close: reverse.

### Dropdown / Popover
Scales from 95% to 100% + fades. Origin: from trigger element. Duration: `--duration-fast`.

### Sidebar Collapse/Expand
Width animates 240px ↔ 64px. Duration: `--duration-normal`, `--ease-in-out`. Labels cross-fade.

### Bottom Sheet (Mobile)
Slides up from bottom. Duration: `--duration-slow`. Drag to dismiss (velocity-based: fast flick = close, slow drag = snap).

---

## 4. Micro-Interactions

### Button Press
Scale to 98% on mousedown, back to 100% on mouseup. Duration: `--duration-instant`.

### Checkbox Toggle
Check mark draws in (stroke-dashoffset animation). Duration: `--duration-fast`, `--ease-spring`. Background color transitions simultaneously.

### Toggle Switch
Thumb slides left↔right. Track color transitions. Duration: `--duration-fast`.

### Priority Dot
Color cross-fade when priority changes. Duration: `--duration-instant`.

### Badge Count
Number change: old number fades out + slides up, new number fades in + slides up from below. Duration: `--duration-fast`.

### Progress Bar
Width animates smoothly to new value. Duration: `--duration-deliberate`, `--ease-in-out`. Avoids jitter by debouncing rapid updates.

---

## 5. Loading States

### Skeleton Screens
Gray placeholder shapes matching content layout. Shimmer animation: gradient sweeps left-to-right, 1.5s cycle, infinite.

```css
background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;
```

### Spinner
20px circular spinner for inline loading. Rotates 360° in 800ms, linear. Used in buttons (replaces text), small containers.

### Progress Indicator (Top Bar)
Thin 2px bar at top of content area. Indeterminate: bouncing gradient. Used for: agent work in progress, page loading.

---

## 6. Drag-and-Drop

### Pick Up
Card elevates (shadow increases to `--shadow-lg`), scales to 102%, slight rotation (1-2°). Opacity: 90%.

### Ghost Card
Semi-transparent copy follows cursor. Original card shows dashed outline placeholder.

### Drop Zone
Target column/area shows highlight border (`--primary-400`, 2px dashed). Background lightens slightly.

### Drop
Card settles into position with `--ease-spring`, `--duration-deliberate`. Brief scale overshoot (101% → 100%).

### Invalid Drop
Card snaps back to original position with `--ease-spring`.

---

## 7. Real-Time Updates (SSE)

### New Item Appears
Slides in from top of list + fades. Duration: `--duration-normal`. Brief highlight pulse (background flashes `--primary-100` then fades).

### Value Change (counters, progress)
Animated number counting (countUp.js style). Progress bars smooth-transition.

### Status Change
Color cross-fade. Optional brief pulse on the status badge.

### Toast Notification
Slides in from bottom-right. Stacks above existing toasts (16px gap). Auto-dismiss: slides out right after 5s.

---

## 8. Reduced Motion

When `prefers-reduced-motion: reduce`:
- All transitions become instant (0ms duration)
- Skeleton shimmer stops (static gray)
- Drag-and-drop uses opacity only (no rotation/scale)
- Progress bars jump to final value
- Page transitions are instant cuts

---

*Motion is the personality of Kira's UI. Fast, purposeful, natural. Everything feels responsive and alive — but never distracting.*