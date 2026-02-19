# Navigation & Information Architecture

> **Status:** ✅ DESIGNED | **Phase:** 0
> **Purpose:** Complete sitemap, routing structure, and navigation patterns for desktop and mobile. The skeleton on which all screens hang.

---

## 1. Primary Navigation (Left Sidebar — Desktop)

```
┌──────────────────────┐
│  ✦ KIRA              │  ← Logo / brand mark
│                      │
│  🏠 Command Center   │  → /
│  📥 Inbox            │  → /inbox
│  💬 Chat             │  → /chat
│  📋 Operations       │  → /operations
│  📄 Documents        │  → /documents
│  🧠 Knowledge        │  → /knowledge
│  📊 Dashboards       │  → /dashboards
│                      │
│  ──────────          │
│  🤖 Agents           │  → /agents
│  ⚙️ Settings         │  → /settings
│                      │
│  ──────────          │
│  👤 Profile           │  ← Bottom of sidebar
└──────────────────────┘
```

### Sidebar Behavior

| Property | Value |
|----------|-------|
| Width | 240px expanded, 64px collapsed (icon-only) |
| Collapse trigger | Toggle button at top, or auto-collapse below 1200px viewport |
| Active indicator | Left border accent (3px `--primary-400`) + bg highlight |
| Badges | Inbox: unread count. Operations: overdue count. Agents: active count. |
| Scroll | Sidebar does not scroll (8 primary + 2 secondary items fit) |
| Mobile | Hidden. Replaced by bottom tab bar. |

---

## 2. Complete Route Map

### Top-Level Routes

| Route | Screen | Description |
|-------|--------|-------------|
| `/` | Command Center | Home dashboard |
| `/inbox` | Unified Inbox | Messages + input queue |
| `/chat` | Chat | Conversation with Kira |
| `/operations` | Operations (Today View default) | SOP engine views |
| `/documents` | File Browser | Document management |
| `/knowledge` | Knowledge Graph | Memory explorer |
| `/dashboards` | Custom Dashboards | Widget builder |
| `/agents` | Agent Monitor | Agent management |
| `/settings` | Settings | Configuration |

### Operations Sub-Routes

| Route | Screen |
|-------|--------|
| `/operations` | Today View (default) |
| `/operations/today` | Today View (explicit) |
| `/operations/board` | Board View (scope via query params) |
| `/operations/list` | List View |
| `/operations/timeline` | Timeline View |
| `/operations/area/:areaId` | Area Detail |
| `/operations/objective/:objectiveId` | Objective Detail |
| `/operations/project/:projectId` | Project Detail |
| `/operations/review/:reviewId` | Review Ceremony |

### Entity Routes (Side Panel Overlays)

These open as a 480px side panel over the current view, not full navigation:

| Route Param | Panel |
|-------------|-------|
| `?task=:taskId` | Task Detail panel |
| `?project=:projectId` | Project Detail panel (when opened from other views) |

### Document Routes

| Route | Screen |
|-------|--------|
| `/documents` | File Browser |
| `/documents/:documentId` | Document Viewer |
| `/documents/collection/:collectionId` | Collection filtered view |

### Settings Routes

| Route | Screen |
|-------|--------|
| `/settings` | General settings |
| `/settings/agents` | Agent configuration |
| `/settings/channels` | Channel/bridge management |
| `/settings/schedule` | Time blocks & review cadence |
| `/settings/notifications` | Notification preferences |
| `/settings/export` | Export/backup |

---

## 3. Mobile Navigation

### Bottom Tab Bar (56px, fixed bottom)

```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  💬     │  📥     │  📋     │  🏠     │  ⋯      │
│  Chat   │  Inbox  │  Today  │  Home   │  More   │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

| Tab | Route | Badge |
|-----|-------|-------|
| Chat | `/chat` | Unread count |
| Inbox | `/inbox` | Pending items |
| Today | `/operations/today` | Overdue count |
| Home | `/` | None |
| More | Opens menu sheet | None |

"More" opens a bottom sheet with: Documents, Knowledge, Agents, Dashboards, Settings.

### Mobile Navigation Patterns

- **Push navigation:** Tapping an item pushes a new screen (with back button)
- **Bottom sheets:** Filters, quick add, menus open as bottom sheets
- **Swipe back:** iOS-style swipe from left edge to go back
- **No sidebar:** All navigation via bottom tabs + contextual back buttons

---

## 4. Navigation Patterns

### Breadcrumbs
Shown below the top bar on detail screens. Pattern: `Area > Objective > Project > Task`. Each segment clickable.

### Deep Linking
Every entity has a canonical URL. Sharing a link opens directly to that entity. If task URL is opened, the operations view loads with the task detail panel open.

### Browser History
All navigation pushes to browser history. Back/forward work naturally. Side panels use `?task=` query params (browser-back closes panel).

### Search (Global)
`Cmd+K` opens command palette. Searches across: tasks, projects, areas, documents, settings. Results grouped by type. Enter to navigate.

---

*Navigation is the skeleton. Sidebar for desktop, bottom tabs for mobile, deep links everywhere. Every screen reachable in ≤ 3 taps/clicks.*