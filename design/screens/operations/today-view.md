# Today View — Daily Execution

> **Status:** ✅ DESIGNED | **Phase:** 1
> **Route:** `/operations/today`
> **Purpose:** Your daily execution cockpit. Shows today's scheduled tasks layered onto time blocks, with calendar events and priorities integrated. This is where work gets done.

---

## 1. Design Intent

The Today View answers one question: **"What am I doing right now, and what's next?"** It's a vertical timeline of your day — time blocks color-coded by area, tasks slotted into each block, calendar events interspersed. Not a kanban. Not a list. A **time-mapped execution plan.**

This is the primary view during working hours. When the Command Center is the "open the laptop" view, Today View is the "heads-down working" view.

---

## 2. Layout — Desktop

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR │              TODAY — Wednesday, Feb 18                  │
│         │                                                        │
│         │  ┌─ TOP BAR ────────────────────────────────────────┐  │
│         │  │ ◀ Yesterday  │  Today  │  Tomorrow ▶  │ 📅 Pick  │  │
│         │  │ Progress: ████████░░ 6/9 tasks  │  +12 XP today  │  │
│         │  └──────────────────────────────────────────────────┘  │
│         │                                                        │
│         │  ┌─ TIMELINE (65%) ─────┐  ┌─ SIDEBAR (35%) ────────┐ │
│         │  │                      │  │                         │ │
│         │  │  NOW 09:15 ─ ─ ─ ─  │  │  📥 INPUT QUEUE (3)    │ │
│         │  │                      │  │  ● 🔴 Verify: Email    │ │
│         │  │  ┌─ 09:00-11:00 ──┐ │  │    platform research   │ │
│         │  │  │ 💜 AI Recept.  │ │  │  ● 🟡 Decide: Pricing │ │
│         │  │  │ Deep Work      │ │  │  ● 🟢 Create: Call Jan │ │
│         │  │  │                │ │  │                         │ │
│         │  │  │ ☐ Setup DNS   │ │  │  ──────────────────     │ │
│         │  │  │   🤖 code-agt │ │  │                         │ │
│         │  │  │ ☑ Draft email │ │  │  📋 UNSCHEDULED (4)     │ │
│         │  │  │   ✅ done     │ │  │  Drag into time blocks: │ │
│         │  │  │ ☐ Review docs │ │  │                         │ │
│         │  │  │   👤 you      │ │  │  ☐ Update README       │ │
│         │  │  └────────────────┘ │  │  ☐ Reply to investor   │ │
│         │  │                      │  │  ☐ Check analytics     │ │
│         │  │  📅 11:00 Team call  │  │  ☐ Review PR #42       │ │
│         │  │  (Google Calendar)   │  │                         │ │
│         │  │                      │  │  ──────────────────     │ │
│         │  │  ┌─ 11:30-13:00 ──┐ │  │                         │ │
│         │  │  │ 💚 Health      │ │  │  🤖 AGENTS WORKING     │ │
│         │  │  │ Lunch + Walk   │ │  │  🟢 research-agent      │ │
│         │  │  │ ☐ Meal prep   │ │  │    Comparing platforms  │ │
│         │  │  └────────────────┘ │  │  🟢 code-agent          │ │
│         │  │                      │  │    DNS configuration   │ │
│         │  │  ┌─ 14:00-16:00 ──┐ │  │                         │ │
│         │  │  │ 🟡 Sales       │ │  │                         │ │
│         │  │  │ Client Work    │ │  │                         │ │
│         │  │  │ ☐ Follow up   │ │  │                         │ │
│         │  │  │ ☐ Send quote  │ │  │                         │ │
│         │  │  └────────────────┘ │  │                         │ │
│         │  └──────────────────────┘  └─────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Timeline Column (Left — 65%)

### 3.1 Time Block Card

Each time block from `time_blocks` table renders as a card. Background: `--bg-surface`. Left border: 3px solid area color. Height: dynamic (min 80px). Collapsed if no tasks (40px header only).

### 3.2 Task Row Within Block

| Element | Source | Style |
|---------|--------|-------|
| Checkbox | `task.status` | Round. Done = filled green + checkmark animation. |
| Title | `task.title` | text-base, font-medium. Strikethrough when done. |
| Executor | `task.executor_type` | 🤖 agent / 👤 human icon + name |
| Duration | `task.duration_est` | text-xs, mono. E.g. "30m" |
| Priority | `task.priority` | Colored dot |
| Status badge | `task.status` | Only for non-todo: "waiting", "blocked", "review" |

**Interactions:** Click checkbox → mark done. Click title → task detail panel. Drag → reorder/move blocks. Right-click → context menu.

### 3.3 Calendar Events

Non-editable blocks from Google Calendar API. Background: `--bg-wash`. Dashed border. Shows join link for video calls.

### 3.4 Now Indicator

Horizontal line at current time position. Color: `--primary-400`. Subtle pulse. Auto-scrolls viewport. Updates every minute.

### 3.5 Time Gaps

Collapsed spacers between blocks showing free time. Click to create ad-hoc time block.

### 3.6 Day Navigation

Top bar: ◀ Yesterday | Today | Tomorrow ▶ | 📅 Pick. Keyboard: `h`/`l` = prev/next, `t` = today.

### 3.7 Progress Bar

`████████░░ 6/9 tasks │ +12 XP today`. Color transitions: red→amber→green by completion %.

---

## 4. Right Sidebar (35%)

### 4.1 Input Queue Mini
Top 5 pending items. Click → full Inbox. Quick hover actions: approve/dismiss.

### 4.2 Unscheduled Tasks
Tasks due/scheduled today without a time_block_id. **Drag sources** — drag into timeline blocks to schedule. Spring-ease drop animation.

### 4.3 Agents Working
Active agents with status dot + current task. Click → Agent Monitor.

---

## 5. Layout — Mobile

Full-screen scrollable timeline. No sidebar — input queue count as tappable banner at top. Expandable "Unscheduled" section below timeline.

**Mobile interactions:** Tap checkbox → done. Tap task → full-screen detail. Long-press → drag. Swipe right → mark done. Pull-to-refresh.

---

## 6. Real-Time (SSE)

| Event | Action |
|-------|--------|
| `TASK_STATUS_CHANGED` | Update row + progress bar |
| `INPUT_QUEUE_ITEM_ADDED` | Increment badge |
| `AGENT_STATUS_CHANGED` | Update agent sidebar |
| `DEPENDENCY_UNBLOCKED` | Remove blocked badge |

---

## 7. Data Loading

**Endpoint:** `GET /api/v1/views/today?date=2026-02-18`

Returns: time_blocks (with nested tasks), calendar_events, unscheduled tasks, input_queue_count + preview, agents, progress stats.

---

## 8. Empty States

**No time blocks:** Prompt to set up weekly schedule or create one-off block.
**No tasks:** Blocks appear empty with "+ Add task" buttons.

---

## 9. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `t` | Today | `h`/`l` | Prev/next day |
| `n` | Scroll to now | `q` | Quick-add task |
| `j`/`k` | Navigate tasks | `Space` | Toggle done |
| `Enter` | Open detail | `d` | Date picker |

---

*The Today View is your daily execution cockpit. Review the timeline, drag unscheduled tasks into blocks, process the input queue, then work top-to-bottom through the day.*