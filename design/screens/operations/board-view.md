# Board View — Kanban

> **Status:** ✅ DESIGNED | **Phase:** 1
> **Route:** `/operations/board`
> **Purpose:** Kanban board showing tasks as cards in columns. Default columns by status, switchable to priority/executor/milestone/area. Supports drag-and-drop, filtering, and multiple scope levels.

---

## 1. Design Intent

The Board View is the spatial overview of work. While Today View is temporal (time-mapped), Board View is categorical — grouping tasks into columns by status, priority, or other dimensions. It answers: "Where does everything stand?"

Best for: project-level work tracking, sprint planning, visual status overview.

---

## 2. Layout — Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│ SIDEBAR │  BOARD VIEW                                                │
│         │                                                            │
│         │  ┌─ TOOLBAR ─────────────────────────────────────────────┐ │
│         │  │ Scope: [AI Recept. ▾] > [Email Campaign ▾]           │ │
│         │  │ Group: [Status ▾]  Filter: [All ▾]  [+ New Task]     │ │
│         │  └───────────────────────────────────────────────────────┘ │
│         │                                                            │
│         │  ┌─ TODO ──┐ ┌─ IN PROG ┐ ┌─ WAITING ┐ ┌─ DONE ──────┐  │
│         │  │  (5)    │ │  (2)     │ │  (1)     │ │  (8)        │  │
│         │  │         │ │          │ │          │ │             │  │
│         │  │ ┌─────┐ │ │ ┌──────┐│ │ ┌──────┐│ │ ┌─────────┐│  │
│         │  │ │█ DNS│ │ │ │█Draft││ │ │█Revie││ │ │☑Research ││  │
│         │  │ │🤖 Hi│ │ │ │🤖 Med││ │ │👤 Med││ │ │✅ $0.04  ││  │
│         │  │ │Feb25│ │ │ │Feb20 ││ │ │Feb22 ││ │ │          ││  │
│         │  │ └─────┘ │ │ └──────┘│ │ └──────┘│ │ └─────────┘│  │
│         │  │         │ │          │ │          │ │             │  │
│         │  │ ┌─────┐ │ │ ┌──────┐│ │          │ │ ┌─────────┐│  │
│         │  │ │█Call│ │ │ │█Test ││ │          │ │ │☑Analyze  ││  │
│         │  │ │👤 Hi│ │ │ │🤖 Low││ │          │ │ │✅ $0.02  ││  │
│         │  │ │Today│ │ │ │Feb24 ││ │          │ │ │          ││  │
│         │  │ └─────┘ │ │ └──────┘│ │          │ │ └─────────┘│  │
│         │  │         │ │          │ │          │ │             │  │
│         │  │ + Add   │ │          │ │          │ │             │  │
│         │  └─────────┘ └──────────┘ └──────────┘ └─────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Toolbar

### 3.1 Scope Selector (Cascading)

Controls which tasks appear on the board. Three-level cascade:

1. **Area** dropdown → filters to one area (or "All Areas")
2. **Objective** dropdown → filters within selected area (or "All Objectives")
3. **Project** dropdown → filters within selected objective (or "All Projects")

Selecting an area auto-populates objective/project dropdowns. Selecting "All" at any level shows everything below.

### 3.2 Group By

Determines what the columns represent:

| Group By | Columns |
|----------|---------|
| **Status** (default) | todo, in_progress, waiting, review, done, cancelled |
| **Priority** | critical, high, medium, low |
| **Executor** | Each agent + "human" + "ambiguous" |
| **Milestone** | One column per milestone in selected project |
| **Area** | One column per area (only when scope = "All Areas") |

### 3.3 Filters

Additional filters stack on top of scope:

| Filter | Options |
|--------|---------|
| Executor type | agent, human, ambiguous |
| Priority | critical, high, medium, low |
| Due date | overdue, today, this week, this month, no date |
| Tags | Multi-select from existing tags |
| Has dependencies | blocked, blocking, none |

### 3.4 New Task Button

Opens quick-add modal pre-populated with current scope (area, project, milestone).

---

## 4. Column

### 4.1 Column Header

```
┌─ TODO ──────────────────────┐
│  (5)                    ⋮   │
```

- Column title: text-sm, font-semibold, uppercase
- Count badge: text-xs, text-tertiary
- ⋮ menu: Collapse column, Hide column, Sort cards (by priority, due date, created)

### 4.2 Column Behavior

- Vertical scroll within column if cards exceed viewport
- Min width: 280px. Max width: 360px.
- Horizontal scroll for many columns (board scrolls left-right)
- Empty column: shows dashed outline "Drag tasks here" or "+ Add task"

---

## 5. Task Card

```
┌─────────────────────────────┐
│██                           │  ← Area color bar (top 3px)
│ Setup DNS configuration     │  ← Title (max 2 lines)
│ Email Campaign > Setup      │  ← Breadcrumb (project > milestone)
│                             │
│ 🤖 code-agent    ● High    │  ← Executor + priority dot
│ 📅 Feb 25        ⏱ 30m     │  ← Due date + duration
│ 🔗 2  📎 1                  │  ← Dependency count + attachment count
└─────────────────────────────┘
```

### Card Anatomy

| Element | Source | Display |
|---------|--------|---------|
| Area color | area.color | 3px top border |
| Title | task.title | text-sm, font-medium, max 2 lines truncated |
| Breadcrumb | project.title > milestone.title | text-xs, text-tertiary |
| Executor | executor_type + name | Icon + text-xs |
| Priority | task.priority | Colored dot |
| Due date | task.due_date | 📅 + date, red if overdue |
| Duration | task.duration_est | ⏱ + minutes |
| Dependencies | count of blocked_by | 🔗 + count (red if blocking) |
| Attachments | count of linked docs | 📎 + count |

### Card States

| State | Visual |
|-------|--------|
| Normal | Default card styling |
| Blocked | Red left border + "⛔ Blocked" badge |
| Overdue | Red due date text + subtle red background tint |
| Done | Muted opacity (0.6), strikethrough title |
| Dragging | Elevated shadow, slight rotation (2deg), origin ghost at 30% opacity |
| Drop target | Column border pulses with `--primary-400` |

### Card Interactions

- **Click** → opens task detail side panel
- **Drag** → move between columns (changes status) or reorder within column (changes sort_order)
- **Right-click** → context menu: Change priority, Assign agent, Set due date, Delete
- **Hover** → subtle elevation increase, shows quick-action buttons (checkbox, priority toggle)

---

## 6. Drag and Drop

### Between Columns
Dragging a card from "TODO" to "IN PROGRESS" → `PATCH /api/v1/tasks/:id {status: "in_progress"}`. Optimistic UI update, reverts on error.

### Within Column
Reordering → `PATCH /api/v1/tasks/:id {sort_order: <new_value>}`. Sort order uses fractional values (insert between existing values).

### Visual Feedback
- Drag start: card lifts (shadow increase), ghost stays at origin (30% opacity)
- Over valid column: column header highlights, insertion line shows between cards
- Drop: spring animation, card settles into position

---

## 7. Data Loading

**Endpoint:** `GET /api/v1/views/board?area_id=...&objective_id=...&project_id=...&group_by=status`

**Response:**
```json
{
  "scope": {
    "area": { "id": "...", "name": "AI Receptionist" },
    "project": { "id": "...", "title": "Email Campaign" }
  },
  "group_by": "status",
  "columns": [
    {
      "key": "todo",
      "label": "To Do",
      "count": 5,
      "cards": [
        {
          "id": "...",
          "title": "Setup DNS",
          "area_color": "--area-4",
          "breadcrumb": "Email Campaign > Setup",
          "executor_type": "agent",
          "executor_name": "code-agent",
          "priority": 1,
          "due_date": "2026-02-25",
          "duration_est": 30,
          "dependency_count": 2,
          "attachment_count": 1,
          "is_blocked": false,
          "is_overdue": false,
          "sort_order": 1.0
        }
      ]
    }
  ]
}
```

---

## 8. Real-Time (SSE)

| Event | Action |
|-------|--------|
| `TASK_STATUS_CHANGED` | Animate card from old column to new column |
| `TASK_CREATED` | Insert card in appropriate column |
| `TASK_DELETED` | Remove card with fade animation |
| `DEPENDENCY_UNBLOCKED` | Remove "Blocked" badge, update card |

---

## 9. Mobile Layout

Horizontal swipeable columns. One column visible at a time with dots indicator at bottom.

- Swipe left/right to change column
- Tap card → full-screen task detail
- Long-press card → drag mode (vibration feedback)
- Pull down on column → refresh
- FAB button (bottom-right) → quick add task

---

## 10. Settings

Persisted per-user in local storage:

| Setting | Default |
|---------|---------|
| Default scope | All Areas |
| Default group by | Status |
| Show done column | Yes |
| Show cancelled column | No |
| Card size | Normal (compact option available) |
| WIP limits | None (configurable per column) |

---

## 11. Empty State

**No tasks in scope:**
```
┌─────────────────────────────────────────┐
│                                         │
│  📋 No tasks in this view.              │
│                                         │
│  Try changing the scope or filters,     │
│  or create your first task.             │
│                                         │
│  [+ Create Task]  [Clear Filters]       │
│                                         │
└─────────────────────────────────────────┘
```

---

## 12. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `n` | New task (quick-add) |
| `1-6` | Jump to column 1-6 |
| `j`/`k` | Navigate cards in current column |
| `h`/`l` | Move focus to prev/next column |
| `Enter` | Open focused card detail |
| `m` | Move focused card (enters drag mode, arrow keys + Enter to drop) |
| `f` | Open filter panel |
| `g` | Open group-by selector |

---

*The Board View is the spatial complement to the Today View. Today is temporal (when). Board is categorical (what state). Together they cover the two primary ways of thinking about work.*