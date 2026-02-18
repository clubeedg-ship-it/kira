# Area View — Single Area Deep-Dive

> **Status:** ✅ DESIGNED | **Phase:** 3
> **Route:** `/operations/area/:id`
> **Purpose:** Comprehensive view of a single area of responsibility. Shows objectives, projects, agents, activity, and principles — everything related to one domain of your life or business.

---

## 1. Design Intent

Areas are the L1 layer — ongoing domains that never "complete." The Area View is a dashboard for one domain: its health, its goals, its active work, and its operating principles. Think of it as the "department page" for that area.

---

## 2. Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR │  💜 AI RECEPTIONIST BUSINESS                           │
│         │  "Build and scale the AI receptionist product"         │
│         │                                                        │
│         │  ┌─ OBJECTIVES (Q1 2026) ────────────────────────────┐ │
│         │  │                                                    │ │
│         │  │ ○ Launch email sales         ████████░░ 72%        │ │
│         │  │   KR: 50 customers           ████░░░░░░ 24/50     │ │
│         │  │   KR: €5k MRR               ███░░░░░░░ €2.1k      │ │
│         │  │                                                    │ │
│         │  │ ○ Improve retention          ██████░░░░ 55%        │ │
│         │  │   KR: Churn < 5%            █████████░ 4.2%       │ │
│         │  │   KR: NPS > 40              ██████░░░░ 32         │ │
│         │  │                                                    │ │
│         │  └────────────────────────────────────────────────────┘ │
│         │                                                        │
│         │  ┌─ ACTIVE PROJECTS ─────────────────────────────────┐ │
│         │  │ ┌───────────┐ ┌───────────┐ ┌───────────┐        │ │
│         │  │ │Email Camp.│ │Landing Pg │ │Onboarding │        │ │
│         │  │ │██████░░  │ │████░░░░  │ │██░░░░░░  │        │ │
│         │  │ │6/10 tasks│ │3/8 tasks │ │1/6 tasks │        │ │
│         │  │ │🤖 comms  │ │🤖 code   │ │👤 you    │        │ │
│         │  │ └───────────┘ └───────────┘ └───────────┘        │ │
│         │  └────────────────────────────────────────────────────┘ │
│         │                                                        │
│         │  ┌─ AGENTS ──────┐  ┌─ PRINCIPLES ─────────────────┐  │
│         │  │ 🤖 comms  🟢  │  │ "Never discount more than    │  │
│         │  │ 🤖 research🟢 │  │  15% on first deal"          │  │
│         │  │ 🤖 code   💤  │  │ "Follow up within 24hrs"     │  │
│         │  └────────────────┘  └──────────────────────────────┘  │
│         │                                                        │
│         │  ┌─ RECENT ACTIVITY ─────────────────────────────────┐ │
│         │  │ 2h ago  🤖 comms-agent completed "Draft welcome"  │ │
│         │  │ 4h ago  ✅ "Research platforms" approved           │ │
│         │  │ 1d ago  📥 New lead: Dentist Jan                  │ │
│         │  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Sections

### 3.1 Header

Area name (large, with color dot and icon), description, and "standard" — what maintaining this area well looks like. Editable inline.

### 3.2 Objectives (Current Quarter)

Each objective shows: title, overall progress bar (auto-calculated from key results), and key results with individual progress bars showing current_value / target_value.

Click objective → opens objective detail panel. Click "Past quarters" to see historical objectives.

### 3.3 Active Projects

Card grid (3 per row desktop). Each card: project title, progress bar (tasks completed/total), task count, primary owner (agent or human), status badge if blocked/at-risk, deadline.

Click card → project detail panel. [+ New Project] button at end.

### 3.4 Assigned Agents

List of agents covering this area. Status dot (working/idle/blocked). Click → agent monitor filtered to this agent.

### 3.5 Principles

Area-specific principles from `principles` table. Shown as quotes with confidence indicator. Click → expand to show rationale, examples, and option to edit. [+ Add Principle] button.

### 3.6 Recent Activity

Feed of recent events in this area: agent completions, task status changes, new messages, input queue items. Chronological, last 20 items. Each item is clickable.

---

## 4. Data Loading

**Endpoint:** `GET /api/v1/areas/:id?expand=objectives,projects,agents,principles,activity`

---

## 5. Mobile

Vertically stacked sections (objectives → projects → activity). Projects as horizontal scrollable cards. Principles collapsed by default.

---

## 6. Interactions

| Action | Behavior |
|--------|----------|
| Edit area name/description | Inline editing |
| Click objective | Objective detail panel |
| Click project card | Project detail panel |
| Click agent | Navigate to agent monitor |
| Click principle | Expand with edit option |
| Click activity item | Navigate to source (task, message, etc.) |

---

*The Area View is your department dashboard. Everything about one domain — goals, projects, agents, principles, activity — in one place.*