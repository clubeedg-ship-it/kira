# Timeline View — Gantt Chart

> **Status:** ✅ DESIGNED | **Phase:** 3
> **Route:** `/operations/timeline`
> **Purpose:** Gantt-style view showing projects and milestones plotted over time. Visualizes duration, overlap, dependencies, and deadlines across your entire SOP hierarchy. The "strategic planning" view.

---

## 1. Design Intent

The Timeline View answers: "How does everything fit together over time?" While Board View shows status and Today View shows a single day, Timeline shows weeks and months — project bars, milestone diamonds, dependency arrows, and the critical path. Best for: quarterly planning, resource allocation, spotting bottlenecks, deadline management.

---

## 2. Layout — Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│ SIDEBAR │  TIMELINE VIEW                                             │
│         │                                                            │
│         │  ┌─ TOOLBAR ────────────────────────────────────────────┐  │
│         │  │ [All Areas ▾] │ Zoom: [Week ▾] │ [← Prev] Today [→]│  │
│         │  │ Show: [☑ Projects ☑ Milestones ☑ Dependencies]       │  │
│         │  └──────────────────────────────────────────────────────┘  │
│         │                                                            │
│         │  ROWS (left)         │  TIMELINE (right, scrollable)       │
│         │  ─────────────────── │ Feb 10  Feb 17  Feb 24  Mar 3  ... │
│         │                      │    │       │▼TODAY  │       │       │
│         │  💜 AI Receptionist  │    │       │       │       │       │
│         │    Email Campaign    │    ████████████████░░░░░    │       │
│         │      ◆ Research      │       ◆    │       │       │       │
│         │      ◆ Setup         │            ◆       │       │       │
│         │      ◆ Content       │         ████████   │       │       │
│         │      ◆ Launch        │                  ◆ │       │       │
│         │    Landing Page      │              ██████████     │       │
│         │                      │    │       │       │       │       │
│         │  🟡 Sales            │    │       │       │       │       │
│         │    Client Outreach   │  ████████████      │       │       │
│         │      ◆ First batch   │     ◆      │       │       │       │
│         │                      │    │       │       │       │       │
│         │  💚 Health           │    │       │       │       │       │
│         │    Fitness Q1        │  ══════════════════════════════     │
│         │                      │    │       │       │       │       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Structure

### 3.1 Row Panel (Left — 280px fixed)

Hierarchical tree: Area → Project → Milestone. Collapsible. Each row aligns with a horizontal lane on the timeline.

| Row Type | Display |
|----------|---------|
| Area | Bold, area color dot, name. Collapsible. |
| Project | Indented, project title. Shows status badge if at-risk/blocked. |
| Milestone | Indented deeper, milestone title. |

### 3.2 Timeline Panel (Right — Scrollable)

Horizontal calendar grid. Columns depend on zoom level. Today marker is a vertical line (`--primary-400`).

### 3.3 Zoom Levels

| Level | Column Width | Grid Lines | Best For |
|-------|-------------|------------|----------|
| Day | 40px per day | Daily | This week detail |
| Week (default) | 120px per week | Weekly | Monthly planning |
| Month | 200px per month | Monthly | Quarterly overview |
| Quarter | 300px per quarter | Quarterly | Annual planning |

---

## 4. Visual Elements

### 4.1 Project Bar

Horizontal bar spanning from project start_date to deadline.

| State | Style |
|-------|-------|
| Normal | Solid fill, area color, 20px height, 4px radius |
| Completed | Full opacity + checkmark icon |
| At risk | Area color + red right cap (deadline portion) |
| Blocked | Hatched pattern overlay |
| No dates | Gray dashed outline bar at current position |

### 4.2 Milestone Diamond

Small diamond (◆) positioned at milestone deadline date. Color: darker shade of area color. Filled when complete, hollow when pending.

### 4.3 Dependency Arrows

SVG arrows connecting project/milestone endpoints. Arrow from blocker's end to blocked's start.

| Type | Style |
|------|-------|
| finish_to_start | Arrow from end of blocker bar → start of blocked bar |
| start_to_start | Arrow from start → start |
| On critical path | Thicker line (2px), `--accent-red` |
| Normal | 1px, `--text-tertiary` |

### 4.4 Today Marker

Vertical line at current date position. Color: `--primary-400`. Label: "Today" at top. Subtle pulse animation.

### 4.5 Progress Fill

Project bars show progress as a filled portion. E.g., 60% of tasks done → 60% of bar is solid, 40% is lighter/striped.

---

## 5. Interactions

| Action | Behavior |
|--------|----------|
| Click project bar | Open project detail side panel |
| Click milestone | Open milestone within project detail |
| Drag bar end (right) | Reschedule deadline: `PATCH /api/v1/projects/:id {deadline}` |
| Drag entire bar | Reschedule start+end (maintains duration) |
| Drag milestone | Reschedule milestone: `PATCH /api/v1/milestones/:id {deadline}` |
| Scroll horizontal | Pan timeline left/right |
| Scroll vertical | Pan rows up/down |
| Zoom (toolbar or pinch) | Change zoom level |
| Click today button | Scroll to center on today |
| Hover bar | Tooltip: project name, dates, progress %, owner |
| Hover dependency arrow | Highlight both connected items |

---

## 6. Toolbar

| Control | Function |
|---------|----------|
| Area filter | Show only one area's projects |
| Zoom selector | Day / Week / Month / Quarter |
| Navigation | ← / Today / → to scroll time |
| Show toggles | Projects, Milestones, Dependencies (checkboxes) |
| Critical path toggle | Highlight only items on the critical path |

---

## 7. Data Loading

**Endpoint:** `GET /api/v1/views/timeline?area_id=...&start_date=2026-01-01&end_date=2026-04-01`

Returns: projects with dates + progress, milestones with dates + status, dependencies between them.

---

## 8. Mobile

Simplified: horizontal scrollable timeline, single row per project (no milestone breakdown). Tap bar → project detail. Pinch to zoom. No drag-to-reschedule on mobile.

---

## 9. Keyboard

| Key | Action |
|-----|--------|
| `h`/`l` | Scroll timeline left/right |
| `j`/`k` | Navigate rows |
| `+`/`-` | Zoom in/out |
| `t` | Jump to today |
| `Enter` | Open selected project |

---

*The Timeline View is strategic. It shows how all your work fits together over weeks and months. Critical for quarterly planning and spotting conflicts before they become crises.*