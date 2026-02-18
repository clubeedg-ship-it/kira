# Navigation & Information Architecture

> **Status:** 🟡 PARTIAL
> **Phase:** 1
> **Updates:** `design/dashboard/component-map.md`

---

## Primary Navigation (Left Sidebar)

```
🏠 Command Center    → /                → Morning brief, priorities, active agents
📥 Inbox             → /inbox           → Unified inbox + input queue
💬 Chat              → /chat            → Direct conversation with Kira
📋 Operations        → /operations      → SOP: areas, objectives, projects, tasks
📄 Documents         → /documents       → VDR (redesigned)
🧠 Knowledge         → /knowledge       → Memory graph explorer
📊 Dashboards        → /dashboards      → Custom widget dashboards
⚙️ Settings          → /settings        → Agents, channels, schedule, preferences
```

## Operations Sub-routes
```
/operations                    → Default: Today view
/operations/board/:projectId   → Kanban for project
/operations/list               → Filtered list view
/operations/timeline/:areaId   → Gantt view
/operations/area/:areaId       → Area deep-dive
/operations/review/:reviewId   → Review ceremony
```

## Routing Pattern
- Desktop: sidebar always visible, content fills remaining space
- Mobile: bottom tab bar (Chat, Inbox, Today, More)
- Deep links: every entity has a shareable URL
- Modal routing: task/project details open as side panels
