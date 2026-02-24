# TASK 021 — Mobile Responsive + PWA

## Agent Instructions

You are making Kira **fully usable on mobile phones** with a Progressive Web App setup for "Add to Home Screen" functionality.

**Read these files first (in order):**
1. `AGENTS.md` — project conventions
2. `design/screens/mobile/mobile-strategy.md` — what's mobile-first, what's desktop-only
3. `design/screens/mobile/chat-mobile.md` — mobile chat layout
4. `design/screens/mobile/today-mobile.md` — mobile today view
5. `design/screens/mobile/inbox-mobile.md` — mobile inbox
6. `design/screens/mobile/quick-capture.md` — mobile task capture
7. `design/ui/design-system.md` — design tokens
8. `src/client/components/layout/AppShell.tsx` — current layout
9. `src/client/components/layout/Sidebar.tsx` — current sidebar

**What you're building:**

### Responsive Breakpoints

Add to `tailwind.config.js` (if not already):
```
screens: {
  sm: '640px',   // tablet
  md: '768px',
  lg: '1024px',  // desktop
  xl: '1280px',
}
```

### Layout Changes (`src/client/components/layout/`)

**AppShell.tsx:**
- Desktop (≥1024px): current layout — 240px sidebar + content
- Tablet (640-1023px): 64px collapsed sidebar (icons only) + content
- Mobile (<640px): no sidebar, bottom tab bar instead

**BottomNav.tsx** (new, mobile only):
```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│   💬    │   📥    │   📋    │   🏠    │   ⋯     │
│  Chat   │  Inbox  │  Today  │  Home   │  More   │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```
- 56px height, fixed bottom, iOS safe area padding (`env(safe-area-inset-bottom)`)
- Badge counts on Inbox and Chat
- "More" opens a bottom sheet: Operations (Board), Agents, Settings
- Active tab: primary color icon + label. Inactive: gray icon, no label.

**Sidebar.tsx:**
- Add `hidden lg:flex` to sidebar container on mobile
- Move all sidebar navigation items to BottomNav for mobile

### Page-Level Responsive Adjustments

**Chat.tsx:**
- Mobile: full-screen, no sidebar visible. Input bar sticks to bottom above keyboard.
- Handle virtual keyboard: listen for `visualViewport.resize` and adjust input position
- Larger touch targets on send button (min 44×44px)

**CommandCenter.tsx:**
- Mobile: single column stack (no 2-column grid). Widgets stack vertically.
- Hero section: smaller padding, shorter greeting

**TodayView.tsx:**
- Mobile: single column, tasks as cards
- Swipe gestures: right = mark complete (green trail), left = open actions (defer, edit, delete)
- Use a lightweight touch gesture handler (e.g., custom pointer events, no heavy library)

**Inbox.tsx:**
- Mobile: full-width cards, swipe right = approve, swipe left = defer/reject
- Remove keyboard shortcuts section (j/k don't apply on mobile)

**BoardView.tsx:**
- Mobile: horizontal scroll for columns (each column is ~280px min-width)
- Or switch to list view by default on mobile with a toggle to kanban

### PWA Setup

**`public/manifest.json`:**
```json
{
  "name": "Kira",
  "short_name": "Kira",
  "description": "Your AI-powered personal operating system",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Service worker** (`public/sw.js`):
- Cache static assets (CSS, JS, icons) on install
- Network-first for API calls
- Queue failed POST requests (task completion, chat send) for retry on reconnect
- Keep it minimal — no complex offline strategy

**Icons:**
- Generate from Kira logo or use a simple ⚡ lightning bolt icon
- Create 192×192 and 512×512 PNGs in `public/`

**Add `<link rel="manifest">` and meta tags to `index.html`:**
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#6366f1">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

### Touch Utilities (`src/client/hooks/useSwipe.ts`)

Custom hook for swipe gesture detection:
```typescript
function useSwipe(ref, { onSwipeLeft, onSwipeRight, threshold = 50 })
```
- Track touchstart, touchmove, touchend
- Calculate horizontal distance
- Visual feedback: element shifts horizontally during swipe, colored trail (green for complete, red for reject)
- Snap back if threshold not reached

### Responsive Detection Hook (`src/client/hooks/useBreakpoint.ts`)

```typescript
function useBreakpoint(): 'mobile' | 'tablet' | 'desktop'
```
Based on `window.innerWidth` with resize listener + debounce.

## Commit Format
```
build(TASK-021): Mobile responsive + PWA + swipe gestures
```

## Acceptance Test
```bash
# 1. Mobile layout
# Resize browser to 375px width → bottom nav appears, sidebar hidden
# All pages render without horizontal scroll

# 2. Bottom nav
# Tap Chat → /chat loads. Badge shows unread count. Active tab highlighted.

# 3. Swipe
# On Today view, swipe right on a task → task completes

# 4. PWA
# On Chrome mobile, "Add to Home Screen" → app launches standalone (no browser chrome)

# 5. Keyboard handling
# Open chat on mobile → tap input → virtual keyboard appears → input stays visible above keyboard

# 6. Tablet
# At 768px width → collapsed sidebar (icons only) + content. No bottom nav.
```
