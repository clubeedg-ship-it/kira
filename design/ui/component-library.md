# Component Library

> **Status:** ✅ DESIGNED | **Phase:** 0
> **Purpose:** Complete catalog of reusable UI components for Kira. Every component defined with variants, states, sizes, and accessibility requirements. Based on the design-system.md tokens.

---

## 1. Buttons

### Variants
| Variant | Use | Style |
|---------|-----|-------|
| Primary | Main actions (Create, Save, Approve) | `--primary-500` bg, white text |
| Secondary | Alternative actions (Cancel, Filter) | `--bg-tertiary` bg, `--text-primary` |
| Ghost | Subtle actions (Edit, More) | Transparent bg, `--text-secondary`, border on hover |
| Danger | Destructive (Delete, Cancel task) | `--accent-red` bg, white text |
| Success | Positive (Approve, Complete) | `--accent-green` bg, white text |

### Sizes
| Size | Height | Padding | Font |
|------|--------|---------|------|
| sm | 28px | 8px 12px | text-xs |
| md (default) | 36px | 8px 16px | text-sm |
| lg | 44px | 12px 24px | text-base |

### States
Default, Hover (+4% brightness), Active (-4%), Disabled (40% opacity), Loading (spinner replaces text).

### Icon Buttons
Square variant: same heights, equal padding. Icon only with tooltip on hover. Used for: close, settings, more actions.

---

## 2. Inputs

### Text Input
```
Label (text-xs, text-secondary, font-medium)
┌──────────────────────────────────┐
│ Placeholder text                 │  36px height
└──────────────────────────────────┘
Helper text (text-xs, text-tertiary)
```
States: default, focused (`--primary-400` border), error (`--accent-red` border + error message), disabled.

### Textarea
Same as text input but multi-line. Auto-grows to content (min 3 rows, max 12 before scroll).

### Select / Dropdown
Click → opens dropdown list. Search filter for >5 options. Selected item shown in trigger. Multi-select variant with tag pills.

### Date Picker
Click input → calendar popover. Relative shortcuts: Today, Tomorrow, Next Monday, Next Week, No Date. Manual entry supported.

### Search Input
Left-aligned search icon. Debounced (300ms). Clear button on right when populated. Can show inline results dropdown.

---

## 3. Display Components

### Card
Base container: `--bg-secondary`, `--border-subtle` border, `--radius-lg` corners, `--shadow-sm`. Variants: task card, project card, document card, agent card (each defined in their respective screen specs).

### Badge
Pill-shaped label. Variants by color: status badges (green/yellow/red/gray), priority badges (dot + text), count badges (numeric).
Sizes: sm (18px height, text-xs), md (22px height, text-xs).

### Avatar
Circular. Sizes: xs (20px), sm (24px), md (32px), lg (40px). Agent avatars: 🤖 emoji on colored circle. User: initials on gradient. Channel: platform icon.

### Progress Bar
Linear: 4px height, rounded, `--primary-500` fill on `--bg-tertiary` track. Label optional (percentage text right-aligned). Variants: area-colored (uses area's color for fill).

### Tag / Chip
Removable pill: text + ✕ button. Colors: default (gray), area-colored, custom. Height: 24px. Click ✕ to remove.

### Tooltip
Appears on hover (300ms delay). Dark bg (`--bg-inverse`), white text. Positioned auto (prefers top). Max width: 240px. Arrow pointing to trigger.

### Toast / Notification
Bottom-right stack. Auto-dismiss (5s default). Types: success (green left border), error (red), info (blue), warning (yellow). Dismiss button. Action button optional ("Undo").

### Empty State
Centered in container. Icon (64px, muted), heading (text-lg), description (text-sm, text-tertiary), action button. Used when lists/views have no data.

### Skeleton / Loading
Animated shimmer placeholders matching content shape. Pulse animation (1.5s). Used while data loads. Specific skeletons for: card, list row, detail panel.

---

## 4. Navigation Components

### Sidebar Nav Item
48px height. Icon (20px) + label (text-sm). States: default, hover (bg highlight), active (primary color + bold). Badge count (right-aligned pill). Collapsible groups.

### Breadcrumb
Segments separated by `/` or `>`. Each segment clickable. Last segment is current (bold, non-clickable). Truncates with `...` if too long.

### Tab Bar
Horizontal tabs. Active tab: primary color underline (2px) + bold text. Inactive: text-secondary. Used for view switching (Board/List/Timeline).

### Bottom Nav (Mobile)
Fixed bottom bar, 56px height. 4-5 icon+label items. Active: primary color. iOS-safe area padding.

---

## 5. Overlay Components

### Modal / Dialog
Centered overlay. Background dim (40% black). Sizes: sm (400px), md (560px), lg (720px). Header with title + close button. Body content. Footer with action buttons (right-aligned). Close: click backdrop, ✕ button, Escape key.

### Drawer (Side Panel)
Slides from right. Width: 480px (desktop). Used for: task detail, project detail. Background dims at 20%. Close: ← button, Escape, click backdrop.

### Popover
Positioned relative to trigger element. Arrow pointing to trigger. Used for: filter menus, date pickers, user menus. Click outside to dismiss.

### Context Menu
Right-click activated. Standard menu items with icons. Keyboard navigable (arrow keys + Enter). Dividers between groups.

### Command Palette (Cmd+K)
Full-width overlay (560px centered). Search input + results list. Fuzzy search across tasks, projects, documents, actions. Keyboard navigable. Categories: Tasks, Projects, Areas, Documents, Actions.

---

## 6. Data Components

### Table
Sortable columns (click header → ascending/descending). Resizable columns (drag border). Row hover highlight. Row selection (checkbox). Sticky header on scroll.

### Kanban Column
280-360px width. Header with title + count + menu. Vertical scrollable card list. Drop zone highlighting. Add button at bottom.

### Timeline Bar
Horizontal bar with colored fill. Drag handles on ends for resizing. Positioned on time grid. States: normal, at-risk (red cap), blocked (hatched), complete (full + check).

### Key Result Meter
Progress bar with: current value label, target value label, percentage. Color shifts: green (>70%), yellow (40-70%), red (<40%).

---

## 7. Accessibility

All components meet WCAG 2.1 AA: focus indicators visible (2px `--primary-400` outline), keyboard navigable, proper ARIA roles and labels, color not sole information carrier (icons/text accompany color), touch targets ≥44px on mobile, reduced motion support.

---

*The component library is the toolkit. Every screen in Kira is built from these atoms. Consistent, accessible, beautiful.*