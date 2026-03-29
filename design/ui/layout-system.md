# Layout System

> **Status:** ✅ DESIGNED | **Phase:** 0
> **Purpose:** Grid system, responsive breakpoints, page templates, and content area behavior. The structural framework that every screen sits within.

---

## 1. Responsive Breakpoints

| Name | Min Width | Columns | Sidebar | Usage |
|------|-----------|---------|---------|-------|
| `mobile` | 0px | 1 | Hidden (bottom tabs) | Phone portrait |
| `tablet` | 768px | 2 | Collapsible overlay | Tablet / phone landscape |
| `desktop` | 1024px | 3 | Persistent (240px) | Laptop |
| `wide` | 1440px | 4 | Persistent (240px) | Desktop monitor |
| `ultrawide` | 1920px | 4 | Persistent (240px) | Large monitor (max-width content) |

---

## 2. Page Shell

Every page shares the same outer shell:

```
┌─────────────────────────────────────────────────────┐
│ SIDEBAR (240px)  │  CONTENT AREA                     │
│                  │                                    │
│  Nav items       │  ┌─ TOP BAR (56px) ──────────┐   │
│  (see nav.md)    │  │ Breadcrumb │ Search │ User │   │
│                  │  └─────────────────────────────┘   │
│                  │                                    │
│                  │  ┌─ PAGE CONTENT ─────────────┐   │
│                  │  │                             │   │
│                  │  │  (varies by screen)         │   │
│                  │  │                             │   │
│                  │  └─────────────────────────────┘   │
│                  │                                    │
└─────────────────────────────────────────────────────┘
```

### Top Bar (56px height)
Left: breadcrumb trail. Center: page title (on mobile). Right: global search trigger, notification bell, user avatar menu.

### Content Area
Fills remaining space after sidebar. Scrolls independently. No max-width constraint (screens define their own internal max-widths where needed).

---

## 3. Page Templates

### Template A: Full Content
Single scrollable content area. Used by: Command Center, Chat, Review View.
```
│ SIDEBAR │ [Full-width content]                    │
```

### Template B: Content + Side Panel
Main content (60-65%) + persistent or toggleable side panel (35-40%). Used by: Inbox (list + detail), Document Viewer (preview + metadata).
```
│ SIDEBAR │ [Main content 65%] │ [Side panel 35%]  │
```

### Template C: Toolbar + Content
Toolbar row above content. Used by: Operations views, File Browser.
```
│ SIDEBAR │ [Toolbar row          ]                 │
│         │ [Content area below   ]                 │
```

### Template D: Content + Overlay Panel
Main content with task/project detail sliding in as an overlay from right (480px). Used by: any view when opening a task.
```
│ SIDEBAR │ [Content (dimmed)]   │ [Panel 480px]    │
```

---

## 4. Spacing & Content Grid

Content areas use CSS Grid or Flexbox — NOT a fixed 12-column grid. Each screen defines its own internal layout. Global spacing uses the design-system spacing scale (4px base unit).

### Content Padding
| Breakpoint | Horizontal Padding | Vertical Padding |
|------------|-------------------|------------------|
| mobile | 16px | 16px |
| tablet | 24px | 24px |
| desktop+ | 32px | 24px |

### Card Grid (used by: project cards, document cards)
| Breakpoint | Columns | Gap |
|------------|---------|-----|
| mobile | 1-2 | 12px |
| tablet | 2-3 | 16px |
| desktop | 3-4 | 16px |
| wide | 4-5 | 20px |

---

## 5. Sidebar Behavior

| Breakpoint | State | Interaction |
|------------|-------|-------------|
| mobile | Hidden | Bottom tab bar instead |
| tablet | Collapsed (64px icons) | Tap hamburger to expand as overlay |
| desktop | Expanded (240px) | Toggle button to collapse to 64px |
| wide+ | Expanded (240px) | Always visible |

Collapsed state: icons only, tooltips on hover. Expand: smooth slide animation (200ms ease).

---

## 6. Scroll Behavior

| Element | Scroll |
|---------|--------|
| Sidebar | No scroll (all items fit) |
| Top bar | Fixed (sticky top) |
| Content area | Independent vertical scroll |
| Side panel | Independent vertical scroll |
| Mobile bottom tabs | Fixed (sticky bottom) |

---

## 7. Z-Index Scale

| Layer | Z-Index | Elements |
|-------|---------|----------|
| Base content | 0 | Page content |
| Sticky headers | 10 | Toolbar, table headers |
| Sidebar | 20 | Sidebar navigation |
| Side panel | 30 | Task/project detail overlay |
| Dropdowns | 40 | Select menus, popovers |
| Modal backdrop | 50 | Dim overlay |
| Modal | 60 | Dialog boxes |
| Toast | 70 | Notifications |
| Command palette | 80 | Cmd+K overlay |

---

*The layout system defines how every screen is structured. Consistent sidebar, responsive breakpoints, predictable templates. The frame that holds everything.*