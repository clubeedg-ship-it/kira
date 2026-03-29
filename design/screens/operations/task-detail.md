# Task Detail Panel

> **Status:** ✅ DESIGNED | **Phase:** 1
> **Purpose:** Universal task detail view. Opens as a side panel (480px) from any screen — Today View, Board View, List View, Inbox. Shows all task metadata, hierarchy context, dependencies, agent work log, and actions.

---

## 1. Design Intent

The task detail panel is the single source of truth for any task. It's not a separate page — it slides in from the right as an overlay panel, keeping the parent view visible underneath. This means you never lose context: you can view task details while still seeing your board, timeline, or inbox.

---

## 2. Panel Layout

```
┌─────────────────────────────────────────────┐
│ ← Close                    ⋮ More actions   │
├─────────────────────────────────────────────┤
│                                             │
│ Health > Fitness Objective > Gym Project    │  ← Breadcrumb
│                                             │
│ ☐ Setup DNS configuration for client X      │  ← Title (editable)
│                                             │
├─ METADATA ──────────────────────────────────┤
│                                             │
│ Status     [todo ▾]        Priority  [●high]│
│ Executor   [🤖 code-agent] Input    [verify]│
│ Area       [AI Recept. ▾]  Project  [Email] │
│ Milestone  [Setup ▾]                        │
│ Due        [Feb 25 ▾]      Scheduled [Feb18]│
│ Duration   [30m]           Context  [@comp] │
│ Energy     [medium ▾]      Source   [conv]  │
│ Tags       [email, dns, client-x]           │
│                                             │
├─ DESCRIPTION ───────────────────────────────┤
│                                             │
│ Configure the sending domain DNS records    │
│ for client X's email campaigns. Need SPF,   │
│ DKIM, and DMARC records added.              │
│                                             │
│ [Edit description]                          │
│                                             │
├─ DEPENDENCIES ──────────────────────────────┤
│                                             │
│ ⛔ BLOCKED BY:                              │
│   ☑ Research best email platform (done)     │
│                                             │
│ 🔗 BLOCKS:                                  │
│   ☐ Import patient list                     │
│   ☐ Test deliverability                     │
│                                             │
│ [+ Add dependency]                          │
│                                             │
├─ AGENT WORK LOG ────────────────────────────┤
│                                             │
│ 🤖 code-agent                               │
│ ┌──────────────────────────────────────┐    │
│ │ Feb 18, 09:32 — Started             │    │
│ │ Feb 18, 09:45 — Completed           │    │
│ │ Output: /vdr/code/email/dns-setup.md│    │
│ │ Duration: 13m │ Cost: $0.04         │    │
│ │ [View output →]                     │    │
│ └──────────────────────────────────────┘    │
│                                             │
├─ LINKED ITEMS ──────────────────────────────┤
│                                             │
│ 💬 Conversation: "Set up email for client"  │
│ 📄 Document: dns-setup.md                   │
│ 📥 Input Queue: Verify DNS configuration    │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ [✅ Mark Done] [🤖 Assign Agent] [🗑 Delete]│
│                                             │
└─────────────────────────────────────────────┘
```

---

## 3. Panel Behavior

**Opening:** Slides in from right (300ms ease-out). Parent view dims with 20% overlay. Panel width: 480px desktop.

**Closing:** ← button, Escape key, or clicking the dimmed area. Slides out (200ms ease-in).

**Mobile:** Full-screen push navigation (no overlay, standard back gesture).

---

## 4. Sections

### 4.1 Breadcrumb

Shows hierarchy: Area > Objective > Project > (Milestone). Each segment is clickable — navigates to that entity's detail view. Text-xs, text-tertiary.

### 4.2 Title

Large text (text-xl, font-semibold). Click to edit inline. Checkbox left of title reflects task status. Checking the box → marks done with animation.

### 4.3 Metadata Grid

Two-column grid of all task fields. Each field is click-to-edit:

| Field | Type | Control |
|-------|------|---------|
| Status | select | Dropdown: todo, in_progress, waiting, review, done, cancelled |
| Priority | select | Priority selector with colored dots (critical/high/medium/low) |
| Executor type | select | 🤖 Agent / 👤 Human / ❓ Ambiguous |
| Executor ID | select | Agent picker (if type=agent) |
| Input type | select | no / verify / decide / create |
| Area | select | Area dropdown |
| Project | select | Project dropdown (filtered by area) |
| Milestone | select | Milestone dropdown (filtered by project) |
| Due date | date | Date picker |
| Scheduled | date | Date picker |
| Duration | number | Input with "m" suffix |
| Context | select | @computer, @phone, @errands, @office |
| Energy | select | low, medium, high |
| Source | read-only | Badge showing origin |
| Tags | multi-select | Tag input with autocomplete |

### 4.4 Description

Markdown-rendered content. "Edit description" button switches to textarea with markdown toolbar. Auto-saves on blur.

### 4.5 Dependencies

**Blocked by:** Tasks/projects that must complete before this one starts. Shows checkbox + title. Completed blockers show as checked (green). Click title → opens that task's detail.

**Blocks:** Tasks that are waiting on this task. Shows unchecked with title.

**Add dependency:** Search/select from existing tasks/projects/milestones.

### 4.6 Agent Work Log

Timeline of agent activity on this task. Each entry shows: timestamp, action (started/completed/failed/escalated), output reference (clickable link to VDR), duration, cost. Only shown if task has agent work history.

### 4.7 Linked Items

Cross-references: conversations that created this task, documents produced by agents, input queue items related to this task. Each clickable → navigates to source.

### 4.8 Actions Bar (Bottom)

Sticky bottom bar with primary actions:

| Action | Button | API Call |
|--------|--------|----------|
| Mark Done | ✅ green | `PATCH /tasks/:id {status: "done"}` |
| Assign Agent | 🤖 | `POST /agents/:id/assign {task_id}` |
| Delete | 🗑 red (confirm) | `DELETE /tasks/:id` |

**More actions (⋮ menu):** Duplicate, Convert to project, Move to different project, Add to today, Set recurring, Archive.

---

## 5. Data Loading

**Endpoint:** `GET /api/v1/tasks/:id?expand=project,area,milestone,dependencies,work_log,linked_items`

**Response shape:**
```json
{
  "task": {
    "id": "...", "title": "...", "status": "todo",
    "priority": 1, "executor_type": "agent",
    "executor_id": "code-agent", "requires_input": "verify",
    "due_date": "2026-02-25", "scheduled_date": "2026-02-18",
    "duration_est": 30, "context": "@computer",
    "energy": "medium", "source": "conversation",
    "tags": ["email", "dns"]
  },
  "hierarchy": {
    "area": { "id": "...", "name": "AI Receptionist", "color": "--area-4" },
    "objective": { "id": "...", "title": "Launch email sales" },
    "project": { "id": "...", "title": "Email Campaign Setup" },
    "milestone": { "id": "...", "title": "Setup" }
  },
  "dependencies": {
    "blocked_by": [{ "id": "...", "title": "Research platform", "status": "done" }],
    "blocks": [{ "id": "...", "title": "Import patient list", "status": "todo" }]
  },
  "work_log": [
    { "agent": "code-agent", "action": "started", "timestamp": "...", "output_ref": "..." }
  ],
  "linked_items": [
    { "type": "conversation", "title": "Set up email...", "ref": "..." },
    { "type": "document", "title": "dns-setup.md", "ref": "..." }
  ]
}
```

---

## 6. Real-Time Updates

| SSE Event | Action |
|-----------|--------|
| `TASK_STATUS_CHANGED` (this task) | Update status badge, checkbox |
| `AGENT_STATUS_CHANGED` (assigned agent) | Update work log with new entry |
| `DEPENDENCY_UNBLOCKED` | Update blocked-by section |

---

## 7. Keyboard Shortcuts (when panel is open)

| Key | Action |
|-----|--------|
| `Escape` | Close panel |
| `Space` | Toggle done |
| `e` | Edit description |
| `p` | Cycle priority |
| `s` | Open status dropdown |
| `d` | Open due date picker |
| `a` | Open agent assignment |
| `[` / `]` | Previous / next task (in parent list) |

---

*The task detail panel is the atom of the system. Every view surfaces tasks; this panel is where you inspect and act on any single task without losing context.*