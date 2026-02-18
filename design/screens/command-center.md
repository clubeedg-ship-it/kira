# Command Center (Home Screen)

> **Status:** ✅ DESIGNED | **Phase:** 1
> **Route:** `/`
> **Purpose:** The first thing you see. A mission control dashboard that answers: "What matters right now?"

---

## 1. Design Intent

Not a chat. Not a kanban. A **calm operational overview** that gives you full situational awareness in under 10 seconds. Designed for the moment you open Kira — morning coffee in hand, wanting to know: what happened overnight, what's urgent, what's next.

The Command Center uses the **Kira Glow** (see design-system.md §9.1) behind the hero section to create visual warmth and focus.

---

## 2. Layout — Desktop (1280px+)

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR │                    COMMAND CENTER                      │
│  (nav)  │                                                        │
│         │  ┌─────────────────────────────────────────────────┐   │
│  🏠 ←   │  │              HERO: GREETING + CONTEXT           │   │
│  📥     │  │  "Good morning, Nano. Wednesday, Feb 18."       │   │
│  💬     │  │  ☀️ 8°C Rotterdam │ 📅 Next: Team standup 10:00 │   │
│  📋     │  │  📥 3 items waiting │ 💬 5 unread messages      │   │
│  📄     │  └─────────────────────────────────────────────────┘   │
│  🧠     │                                                        │
│  📊     │  ┌──────────────────────┐  ┌────────────────────────┐  │
│  ⚙️     │  │   TOP 3 PRIORITIES   │  │    ACTIVE AGENTS       │  │
│         │  │                      │  │                        │  │
│         │  │  1. ██████ Task A    │  │  🟢 research-agent     │  │
│         │  │  2. ██████ Task B    │  │     Working: "Compare  │  │
│         │  │  3. ██████ Task C    │  │     email platforms"   │  │
│         │  │                      │  │  ⚪ comms-agent         │  │
│         │  │  [View all tasks →]  │  │     Idle               │  │
│         │  └──────────────────────┘  │  🟢 code-agent         │  │
│         │                            │     Working: "DNS cfg" │  │
│         │  ┌──────────────────────┐  └────────────────────────┘  │
│         │  │  QUARTER PROGRESS    │                              │
│         │  │                      │  ┌────────────────────────┐  │
│         │  │  OBJ: Launch email   │  │  YESTERDAY'S WINS      │  │
│         │  │  ████████░░ 72%     │  │                        │  │
│         │  │  KR1: 50 customers  │  │  ✅ 5 tasks completed  │  │
│         │  │  ███░░░░░░░ 24/50   │  │  ✅ Research approved  │  │
│         │  │  KR2: €10k MRR      │  │  ✅ Email draft sent   │  │
│         │  │  █████░░░░░ €4.8k   │  │                        │  │
│         │  └──────────────────────┘  │  +12 XP earned         │  │
│         │                            └────────────────────────┘  │
│         │  ┌─────────────────────────────────────────────────┐   │
│         │  │  ⚠️ BLOCKERS & WARNINGS                         │   │
│         │  │  🔴 "Client X contract" blocked 3 days (needs   │   │
│         │  │     your decision) [Resolve →]                   │   │
│         │  │  🟡 "Landing page" due tomorrow, 40% complete    │   │
│         │  └─────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Grid System

- 2-column grid below the hero: left (60%) + right (40%)
- Full-width hero at top
- Full-width blockers bar at bottom
- `gap: var(--space-6)` between all widgets
- Page padding: `var(--space-6)` all sides

---

## 3. Widget Specifications

### 3.1 Hero: Greeting + Context Bar

**Layout:** Full-width card, `--bg-surface` with Kira Glow behind it.

| Element | Data Source | Style |
|---------|------------|-------|
| Greeting | Time of day + user name from settings | H1 (Outfit, 30px, bold) |
| Date | System clock | text-secondary, text-lg |
| Weather | Weather API (user's city from settings) | Icon + temp, text-secondary |
| Next event | Calendar integration (Google Calendar API) | 📅 icon + event title + time |
| Input queue count | `GET /api/v1/input-queue/count` | Badge (accent color, pill shape) |
| Unread messages | `GET /api/v1/inbox/unread-count` | Badge (info color, pill shape) |

**Greeting logic:**
```
00:00–05:59  "Working late, {name}."
06:00–11:59  "Good morning, {name}."
12:00–16:59  "Good afternoon, {name}."
17:00–20:59  "Good evening, {name}."
21:00–23:59  "Winding down, {name}."
```

**SSE events:** `MESSAGE_RECEIVED` → update unread count. `INPUT_QUEUE_ITEM_ADDED` → update queue count.

### 3.2 Top 3 Priorities

**Layout:** Card with 3 task rows. Left border colored by area color.

| Element | Data Source | Style |
|---------|------------|-------|
| Tasks | `GET /api/v1/views/top-3` | List of 3 task cards |
| Per task: title | `task.title` | text-base, font-medium, text-primary |
| Per task: project | `task → project.title` | text-xs, text-tertiary, breadcrumb |
| Per task: priority badge | `task.priority` | Colored dot (priority color) |
| Per task: executor | `task.executor_type` | Icon: 🤖 agent / 👤 human |
| Per task: due | `task.due_date` | text-xs, right-aligned. Red if overdue. |
| Footer link | — | "View all tasks →" links to /operations |

**Interactions:**
- Click task → open task detail (side panel)
- Checkbox on each task → mark done (with completion animation)
- Drag to reorder → updates sort_order via `PATCH /tasks/:id`

**SSE events:** `TASK_STATUS_CHANGED` → re-fetch top 3.

### 3.3 Active Agents

**Layout:** Card with agent rows. Status dot + name + current work.

| Element | Data Source | Style |
|---------|------------|-------|
| Agents | `GET /api/v1/agents?status=working,idle` | List, max 5 shown |
| Per agent: status dot | `agent.status` | Colored dot (agent status colors). Working = pulse animation. |
| Per agent: name | `agent.name` | text-sm, font-medium |
| Per agent: current task | Latest `agent_work_log` where action='started' | text-xs, text-secondary, truncated to 1 line |
| Per agent: elapsed time | `agent_work_log.created_at` → now | text-xs, text-tertiary, live counter |
| Footer link | — | "Agent monitor →" links to /agents |

**Interactions:**
- Click agent → navigate to agent monitor detail
- Hover → tooltip with full task title and cost so far

**SSE events:** `AGENT_STATUS_CHANGED` → update row in-place (no full re-fetch).

### 3.4 Quarter Progress

**Layout:** Card with current quarter's objectives. Each objective has a progress bar + key results breakdown.

| Element | Data Source | Style |
|---------|------------|-------|
| Objectives | `GET /api/v1/objectives?quarter=current&status=active` | List, collapsible |
| Per objective: title | `objective.title` | text-base, font-medium |
| Per objective: progress | `objective.progress` | Progress bar (primary color fill) |
| Per objective: key results | `GET /api/v1/objectives/:id/key-results` | Sub-list, smaller progress bars |
| Per KR: current/target | `kr.current_value / kr.target_value` | text-xs mono, right side |
| Per KR: unit | `kr.unit` | text-xs, text-tertiary |

**Progress bar color logic:**
- 0–33%: `--error` (red)
- 34–66%: `--warning` (amber)
- 67–100%: `--success` (green)

**SSE events:** `KEY_RESULT_UPDATED` → animate progress bar change.

### 3.5 Yesterday's Wins

**Layout:** Compact card. List of completed items from previous day.

| Element | Data Source | Style |
|---------|------------|-------|
| Completed tasks | `GET /api/v1/tasks?status=done&completed_at=yesterday` | Count + list of titles |
| Completed reviews | `GET /api/v1/reviews?status=completed&completed_at=yesterday` | Listed if any |
| XP earned | `GET /api/v1/xp/daily?date=yesterday` | "+{n} XP" with accent color |
| Streak | `GET /api/v1/xp/streak` | "🔥 {n} day streak" if active |

**Design:** Green success-subtle background tint. Checkmark icons. Celebratory feel — this is the dopamine card.

### 3.6 Blockers & Warnings

**Layout:** Full-width bar at bottom. Only shows if there ARE blockers. Hidden when clean.

| Element | Data Source | Style |
|---------|------------|-------|
| Blocked items | `GET /api/v1/tasks?status=blocked` + `GET /api/v1/projects?status=blocked` | List with red left-border |
| At-risk items | Tasks due within 48h with < 50% estimated completion | List with amber left-border |
| Stale input queue | `GET /api/v1/input-queue?status=pending&created_before=5d` | List with amber left-border |
| Per item: title | Entity title | text-sm, font-medium |
| Per item: reason | Blocked reason or days overdue | text-xs, text-tertiary |
| Per item: action | — | "[Resolve →]" button → opens entity detail |

**Conditional rendering:** If no blockers or warnings, this entire section is hidden. The page feels lighter on good days.

---

## 4. Layout — Mobile (< 768px)

Mobile Command Center is a scrollable vertical stack. No two-column grid.

```
┌─────────────────────────┐
│ Greeting + Context      │  ← Compact: name, date, weather inline
│ 📥 3  💬 5             │  ← Badges as horizontal row
├─────────────────────────┤
│ ⚠️ Blockers (if any)    │  ← Promoted to top on mobile (urgent first)
├─────────────────────────┤
│ Top 3 Priorities        │  ← Swipeable task cards
├─────────────────────────┤
│ Active Agents           │  ← Compact: just status dot + name + task
├─────────────────────────┤
│ Quarter Progress        │  ← Collapsed by default, tap to expand
├─────────────────────────┤
│ Yesterday's Wins        │  ← Summary only: "5 tasks, +12 XP"
├─────────────────────────┤
│ ──── bottom nav ────    │
│ 💬 Chat │ 📥 Inbox │   │
│ 📋 Today │ ••• More    │
└─────────────────────────┘
```

Key mobile differences:
- Blockers move to TOP (urgency first on mobile)
- Quarter Progress collapsed by default (tap to expand)
- Yesterday's Wins shows summary count only
- Agent status is simplified (no elapsed time counter)

---

## 5. Empty State (Fresh Install)

When there's no data yet (first run):

```
┌─────────────────────────────────────────────┐
│                                             │
│         ✨ Welcome to Kira                   │
│                                             │
│  "Let's set up your operating system."      │
│                                             │
│  Step 1: Define your vision  [Start →]      │
│  Step 2: Create your areas                  │
│  Step 3: Set first objectives               │
│  Step 4: Connect your channels              │
│                                             │
│  Or just start chatting — I'll learn        │
│  your structure from our conversation.      │
│                                             │
│              [Open Chat →]                   │
│                                             │
└─────────────────────────────────────────────┘
```

Uses the Kira Glow prominently. Onboarding wizard or free-form chat — user chooses their path.

---

## 6. Real-Time Behavior

| SSE Event | Action |
|-----------|--------|
| `TASK_STATUS_CHANGED` | Re-fetch top 3 priorities, update wins count |
| `INPUT_QUEUE_ITEM_ADDED` | Increment badge count (bounce animation) |
| `INPUT_QUEUE_ITEM_RESOLVED` | Decrement badge count |
| `AGENT_STATUS_CHANGED` | Update agent row in-place |
| `KEY_RESULT_UPDATED` | Animate progress bar |
| `MESSAGE_RECEIVED` | Increment unread badge |
| `DEPENDENCY_UNBLOCKED` | Remove item from blockers (fade out) |

---

## 7. Data Loading Strategy

**Initial load:** Single composite endpoint `GET /api/v1/views/command-center` returns all widget data in one request. Avoids waterfall of 8+ API calls.

**Response shape:**
```json
{
  "greeting": { "name": "Nano", "time_of_day": "morning" },
  "weather": { "temp": 8, "unit": "C", "condition": "sunny", "city": "Rotterdam" },
  "next_event": { "title": "Team standup", "time": "10:00", "in_minutes": 45 },
  "input_queue_count": 3,
  "unread_messages": 5,
  "top_3": [ /* task objects with project breadcrumb */ ],
  "agents": [ /* agent objects with current work */ ],
  "objectives": [ /* with key_results nested */ ],
  "yesterday_wins": { "tasks_completed": 5, "xp_earned": 12, "streak": 7, "items": [...] },
  "blockers": [ /* blocked/at-risk items */ ]
}
```

**Skeleton loading:** Show shimmer placeholders matching each widget's layout shape while composite endpoint loads. Target: < 500ms for full render.

---

*The Command Center is the soul of Kira. It should feel like opening the cockpit of a well-designed aircraft — everything you need, nothing you don't, all at a glance.*
