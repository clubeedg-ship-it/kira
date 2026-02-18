# Navigation & Information Architecture

> **Status:** 🟡 PARTIAL | **Phase:** 0
> **Updates:** `design/dashboard/component-map.md`

---

## Primary Navigation (Left Sidebar)

```
🏠 Command Center   ← Morning brief, today's priorities, active agents
📥 Inbox            ← Unified inbox (all channels + input queue)
💬 Chat             ← Direct conversation with Kira
📋 Operations       ← SOP engine: areas, objectives, projects, tasks
📄 Documents        ← VDR (redesigned)
🧠 Knowledge        ← Memory graph explorer
📊 Dashboards       ← Custom widget dashboards
⚙️ Settings         ← Agents, channels, schedule, preferences
```

## Operations Sub-Routes
- `/operations` → default to Today View
- `/operations/today` → Today View
- `/operations/board/:projectId` → Kanban Board
- `/operations/list` → Filtered List
- `/operations/timeline/:areaId` → Gantt Timeline
- `/operations/area/:areaId` → Area Deep-Dive
- `/operations/review/:reviewId` → Review Ceremony
- `/operations/task/:taskId` → Task Detail (or slide-over)
- `/operations/project/:projectId` → Project Detail
- `/operations/objective/:objectiveId` → Objective Detail

## Routing Pattern
- Hash-based routing (SvelteKit or custom)
- Slide-over panels for detail views (don't leave current context)
- Breadcrumb: always shows Area > Objective > Project > Task path
- Deep links: every entity has a shareable URL

## TODO
- Full sitemap with all routes
- Sidebar collapse/expand behavior
- Mobile navigation (bottom tab bar)
- Keyboard shortcuts for navigation
- URL structure finalization
