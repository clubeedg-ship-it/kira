# List View — Filterable Task List

> **Status:** ✅ DESIGNED | **Phase:** 1
> **Route:** `/operations/list`
> **Purpose:** Flat, filterable list of tasks with hierarchy breadcrumbs. Inspired by Things 3 / Todoist — fast, keyboard-driven, scannable. The "get things done" view.

---

## 1. Design Intent

Strips away spatial complexity of boards and timelines. Single-column list sorted and filtered to show exactly what you need. Best for: bulk task management, cross-project filtering, quick triage, keyboard-driven workflows.

---

## 2. Layout — Desktop

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR │  LIST VIEW                                             │
│         │                                                        │
│         │  ┌─ TOOLBAR ─────────────────────────────────────────┐ │
│         │  │ [All Areas ▾] [All Status ▾] [All Executors ▾]   │ │
│         │  │ [Priority ▾] [Due Date ▾] [Search... 🔍]  [+New] │ │
│         │  │ Sort: [Priority ▾]  │  Group: [Area ▾]  │  24    │ │
│         │  └───────────────────────────────────────────────────┘ │
│         │                                                        │
│         │  ┌─ GROUP: AI Receptionist ──────────────────────────┐ │
│         │  │ ☐ ● Setup DNS configuration                       │ │
│         │  │   Email Campaign > Setup · 🤖 code · Feb 25 · 30m│ │
│         │  │ ☐ ● Draft email sequence                          │ │
│         │  │   Email Campaign > Content · 🤖 comms · Feb 22    │ │
│         │  │ ☐ ● Follow up with dentist lead                   │ │
│         │  │   Sales Pipeline > Outreach · 👤 you · Today      │ │
│         │  └────────────────────────────────────────────────────┘ │
│         │                                                        │
│         │  ┌─ GROUP: Health ───────────────────────────────────┐ │
│         │  │ ☐   Meal prep for the week                        │ │
│         │  │   Nutrition > Weekly · 👤 you · Sunday             │ │
│         │  └────────────────────────────────────────────────────┘ │
│         │                                                        │
│         │  ┌─ + Quick add task... ──────────────────────────────┐ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Toolbar

### 3.1 Filter Bar

Horizontal row of filter dropdowns. Each filter is additive (AND). Active filters show as pills with ✕.

| Filter | Options |
|--------|---------|
| Area | All Areas, or specific area |
| Status | All, todo, in_progress, waiting, review, done, cancelled |
| Executor | All, agent, human, ambiguous, specific agent |
| Priority | All, critical, high, medium, low |
| Due Date | All, overdue, today, this week, this month, no date |
| Tags | Multi-select from existing |
| Dependencies | All, blocked, blocking, clear |
| Energy | All, low, medium, high |
| Context | All, @computer, @phone, @errands, @office |

### 3.2 Search

Full-text across task titles and descriptions. Debounced 300ms. Highlights matches.

### 3.3 Sort

Priority (default, high→low), Due Date (soonest), Created (newest), Updated (recent), Alphabetical, Duration (shortest).

### 3.4 Group By

Area (default, color-coded headers), Project, Status, Priority, Executor, None (flat).

---

## 4. Task Row

Two-line row, 56px height:

**Line 1:** Checkbox + priority dot (8px colored circle) + title (text-base, font-medium)
**Line 2:** Breadcrumb (text-xs, text-tertiary: "Project > Milestone") + executor icon + due date + duration

Interactions: click checkbox → done, click title → task detail panel, click breadcrumb → navigate, right-click → context menu, hover → quick actions.

---

## 5. Inline Quick Add

Always visible at bottom. Press `q` to focus. Auto-inherits current filter context. Enter to create. Inline syntax: `!high` priority, `@agent` executor, `#tag` tag, `>project` assignment.

---

## 6. Bulk Actions

Shift+click or Cmd+A to select multiple. Floating bar: [✅ Done] [📋 Move] [🏷 Tag] [⚡ Priority] [🗑 Delete].

---

## 7. Data Loading

`GET /api/v1/tasks?area_id=...&status=...&sort=priority&group_by=area&limit=50&offset=0`

Paginated. Infinite scroll loads next 50.

---

## 8. Mobile

Full-width list. Filters → bottom sheet. Swipe right → done. Swipe left → quick actions. Pull-to-refresh.

---

## 9. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j`/`k` | Navigate | `Space` | Toggle done |
| `Enter` | Open detail | `q` | Quick-add |
| `f` | Filters | `/` | Search |
| `x` | Select task | `Cmd+A` | Select all |
| `#` | Cycle group-by |

---

*The List View is the workhorse. Fast, keyboard-driven, filterable. Power through tasks without visual overhead.*