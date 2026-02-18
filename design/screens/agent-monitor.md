# Agent Monitor

> **Status:** ✅ DESIGNED | **Phase:** 3
> **Route:** `/agents`
> **Purpose:** Live dashboard showing all agents, their status, current work, cost tracking, and performance. The "team management" view for your AI workforce.

---

## 1. Design Intent

Agents are your team. The Agent Monitor lets you see what everyone is working on, how much they're costing, how well they're performing, and gives you controls to pause, reassign, or inspect. Think of it as a team dashboard for AI workers.

---

## 2. Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR │  AGENT MONITOR                                         │
│         │                                                        │
│         │  ┌─ SUMMARY BAR ────────────────────────────────────┐  │
│         │  │ 🟢 2 Working  💤 1 Idle  ⛔ 0 Blocked            │  │
│         │  │ Today: $0.34 / $20.00 limit  │  Tasks: 8 done    │  │
│         │  └──────────────────────────────────────────────────┘  │
│         │                                                        │
│         │  ┌─ AGENT CARDS ────────────────────────────────────┐  │
│         │  │ ┌────────────────────────────────────────────┐   │  │
│         │  │ │ 🤖 research-agent              🟢 Working  │   │  │
│         │  │ │ Level 3 (340 XP)  │  Checkpoint autonomy   │   │  │
│         │  │ │                                             │   │  │
│         │  │ │ 📋 Current: "Compare email platforms"       │   │  │
│         │  │ │ ⏱ 12m elapsed  │  💰 $0.08 this task      │   │  │
│         │  │ │ ████████░░ 3/4 tool calls                  │   │  │
│         │  │ │                                             │   │  │
│         │  │ │ Today: 3 tasks done  │  $0.18 total        │   │  │
│         │  │ │ Approval rate: 92%  │  Avg: 15m/task       │   │  │
│         │  │ │                                             │   │  │
│         │  │ │ [Pause] [View Work] [Reassign] [Settings]  │   │  │
│         │  │ └────────────────────────────────────────────┘   │  │
│         │  │                                                   │  │
│         │  │ ┌────────────────────────────────────────────┐   │  │
│         │  │ │ 🤖 comms-agent                 🟢 Working  │   │  │
│         │  │ │ Level 5 (520 XP)  │  Checkpoint autonomy   │   │  │
│         │  │ │ 📋 Current: "Draft welcome sequence"        │   │  │
│         │  │ │ ...                                         │   │  │
│         │  │ └────────────────────────────────────────────┘   │  │
│         │  │                                                   │  │
│         │  │ ┌────────────────────────────────────────────┐   │  │
│         │  │ │ 🤖 code-agent                  💤 Idle     │   │  │
│         │  │ │ Level 2 (180 XP)  │  No current task       │   │  │
│         │  │ │ Queue: 2 tasks waiting                      │   │  │
│         │  │ │ ...                                         │   │  │
│         │  │ └────────────────────────────────────────────┘   │  │
│         │  └──────────────────────────────────────────────────┘  │
│         │                                                        │
│         │  ┌─ WORK HISTORY ───────────────────────────────────┐  │
│         │  │ 10:32  🤖 code   ✅ "Configure DNS"  $0.04 13m  │  │
│         │  │ 09:45  🤖 research ✅ "Analyze list"  $0.02 8m   │  │
│         │  │ 09:15  🤖 research ✅ "Research plat." $0.08 22m  │  │
│         │  │ [Load more...]                                    │  │
│         │  └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Sections

### 3.1 Summary Bar

Global stats: agents by status count, today's total cost vs daily limit, total tasks completed today.

### 3.2 Agent Cards

One card per registered agent. Sorted: working first, then idle, then blocked.

**Card content:**
- Agent name, status dot (green=working, gray=idle, red=blocked, yellow=paused)
- Level + XP (gamification)
- Autonomy level badge
- Current task (if working): title, elapsed time, cost, progress indicator
- Today's stats: tasks completed, total cost
- Performance: approval rate, avg time per task
- Action buttons: Pause/Resume, View Work (opens work log), Reassign (current task), Settings

### 3.3 Work History

Chronological feed of all completed agent work. Shows: time, agent, outcome (✅/❌), task title, cost, duration. Click entry → task detail. Filterable by agent.

---

## 4. Agent Card Actions

| Action | Effect |
|--------|--------|
| Pause | Agent finishes current task, then stops picking up new ones. Status → 'paused'. |
| Resume | Agent starts picking up queued tasks again. |
| View Work | Expands card to show full work log timeline |
| Reassign | Opens task picker to assign specific task to this agent |
| Settings | Opens modal: change model, autonomy level, area assignments, max_concurrent, cost limit |

---

## 5. Cost Tracking Detail

Expandable section per agent showing cost breakdown:

| Period | Cost | Tasks |
|--------|------|-------|
| Today | $0.18 | 3 |
| This week | $0.72 | 14 |
| This month | $2.84 | 52 |

By project: cost per project this agent has worked on. By model: token usage breakdown (input/output).

---

## 6. Real-Time (SSE)

| Event | Action |
|-------|--------|
| `agent.status_changed` | Update agent card status dot + current task |
| `agent.work_completed` | Add entry to work history, update stats |
| `agent.cost_updated` | Update cost counters |

---

## 7. Data Loading

`GET /api/v1/agents?expand=current_task,stats,work_log_recent`

---

## 8. Mobile

Vertically stacked agent cards. Tap card to expand full detail. Summary bar sticky at top.

---

*The Agent Monitor is your team dashboard. See who's working on what, how much it's costing, and step in when needed. Your AI workforce, managed.*