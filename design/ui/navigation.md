# Navigation & Information Architecture

> **Status:** 🟡 PARTIAL | **Phase:** 0
> **Updates:** `design/dashboard/component-map.md`

---

## Primary Navigation (Left Sidebar)

```
🏠 Command Center   ← Morning brief, today's priorities, active agents
📥 Inbox            ← Unified inbox (all channels + input queue merged)
💬 Chat             ← Direct conversation with Kira
📋 Operations       ← SOP engine: areas, objectives, projects, tasks
📄 Documents        ← VDR (redesigned)
🧠 Knowledge        ← Memory graph explorer
📊 Dashboards       ← Custom widget dashboards
⚙️ Settings         ← Agents, channels, schedule, preferences
```

## Operations Sub-Routes
```
/operations
  /today          ← Today view (default)
  /board/:id      ← Kanban for project or area
  /list           ← Filtered list view
  /timeline/:id   ← Gantt for area
  /areas          ← All areas overview
  /areas/:id      ← Single area deep-dive
  /reviews        ← Review view
  /tasks/:id      ← Task detail
  /projects/:id   ← Project detail
  /objectives/:id ← Objective detail
```

## TODO
- Complete routing table for all views
- Sidebar collapsed state (icons only)
- Mobile bottom tab bar mapping
- Deep-link URL patterns
- Breadcrumb generation rules
- Active state highlighting logic
