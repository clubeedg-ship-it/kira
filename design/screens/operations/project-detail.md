# Project Detail

> **Status:** ✅ DESIGNED | **Phase:** 1
> **Route:** `/operations/project/:id`
> **Purpose:** Full project view showing milestones, tasks, dependencies, agent work, documents, and activity. The "war room" for a single bounded piece of work.

---

## 1. Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR │  ← AI Receptionist > Email Sales > Email Campaign      │
│         │                                                        │
│         │  ┌─ HEADER ─────────────────────────────────────────┐  │
│         │  │ Email Campaign Setup                [Edit] [⋮]   │  │
│         │  │ Status: [active ▾]  Priority: [● high]           │  │
│         │  │ Owner: 🤖 comms-agent  Deadline: Mar 15          │  │
│         │  │ Progress: ████████░░ 6/10 tasks                  │  │
│         │  └──────────────────────────────────────────────────┘  │
│         │                                                        │
│         │  ┌─ MILESTONES ─────────────────────────────────────┐  │
│         │  │ ◆ Research & Strategy    ████████████ 3/3 ✅     │  │
│         │  │ ◆ Setup                  ██████░░░░░ 1/3  🟡     │  │
│         │  │   ☐ Create email account       👤 you  Feb 20   │  │
│         │  │   ☐ Import patient list        👤 you  Feb 22   │  │
│         │  │   ☑ Configure DNS              🤖 code ✅       │  │
│         │  │ ◆ Content                ████░░░░░░░ 1/3  🔵     │  │
│         │  │   ☐ Write welcome sequence     🤖 comms Feb 24  │  │
│         │  │   ☐ Design email template      ❓ TBD           │  │
│         │  │   ☐ Newsletter template        🤖 comms Feb 26  │  │
│         │  │ ◆ Launch                 ░░░░░░░░░░░ 0/3  ⚪     │  │
│         │  └──────────────────────────────────────────────────┘  │
│         │                                                        │
│         │  ┌─ LEFT (60%) ──────────┐ ┌─ RIGHT (40%) ──────────┐ │
│         │  │ DEPENDENCIES          │ │ AGENT WORK LOG          │ │
│         │  │ Blocked by: (none)    │ │ 🤖 code: DNS done ✅   │ │
│         │  │ Blocks: Landing Page  │ │ 🤖 research: 3 tasks ✅│ │
│         │  │                       │ │ Total cost: $0.12       │ │
│         │  ├───────────────────────┤ ├─────────────────────────┤ │
│         │  │ DOCUMENTS              │ │ ACTIVITY               │ │
│         │  │ 📄 platform-research  │ │ 2h ago: DNS completed   │ │
│         │  │ 📄 dns-setup.md       │ │ 1d ago: Research done   │ │
│         │  │ 📄 email-strategy     │ │ 2d ago: Project created │ │
│         │  └───────────────────────┘ └─────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Sections

### 2.1 Header
Project title (editable), status dropdown, priority selector, owner (agent picker or "you"), deadline (date picker), progress bar (auto-calculated from task completion).

### 2.2 Milestones & Tasks
Ordered list of milestones, each expandable to show its tasks. Milestone shows: title, progress bar, task count, status indicator (✅ done, 🟡 active, 🔵 upcoming, ⚪ not started, 🔴 blocked).

Tasks within milestones: checkbox + title + executor + due date. Click → task detail panel. Drag to reorder or move between milestones.

[+ Add milestone] and [+ Add task] buttons at relevant positions.

### 2.3 Dependencies
Visual list: what blocks this project, what this project blocks. Click any to navigate. [+ Add dependency] button.

### 2.4 Agent Work Log
Timeline of all agent work on this project's tasks. Shows: agent, task, action, output reference, duration, cost. Total cost for project.

### 2.5 Documents
Files in VDR tagged to this project. Thumbnails with title. Click → document viewer. Shows agent outputs and user uploads.

### 2.6 Activity Feed
Chronological feed of all events: task completions, status changes, agent work, input queue items. Last 20 items.

---

## 3. Actions

| Action | Button/Control |
|--------|---------------|
| Edit project | Inline editing on all header fields |
| Add task | [+ Add task] within any milestone |
| Add milestone | [+ Add milestone] at bottom of milestone list |
| Change owner | Agent picker dropdown |
| Archive/delete | ⋮ menu → Archive, Delete (with confirmation) |
| Decompose further | ⋮ menu → "Ask Kira to decompose" (AI generates sub-tasks) |

---

## 4. Data Loading

`GET /api/v1/projects/:id?expand=milestones,tasks,dependencies,work_log,documents,activity`

---

## 5. Mobile
Vertically stacked: header → milestones (collapsible) → documents (horizontal scroll) → activity. Full-width.

---

*The Project Detail is the war room for bounded work. Everything about one project: milestones, tasks, agents, documents, and progress — all in one view.*