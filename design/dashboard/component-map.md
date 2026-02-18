# Component Map — Every Screen in the App

> Complete screen inventory, navigation structure, and component hierarchy for Kira's dashboard.

---

## 1. Screen Inventory

### 1.1 Top-Level Pages

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 1 | **Dashboard Home** | `/` | Personal overview: today's focus, project summaries, agent activity, goals at risk |
| 2 | **Tasks — List** | `/tasks` | All tasks across projects, list view with filters |
| 3 | **Tasks — Kanban** | `/tasks/board` | Kanban board view |
| 4 | **Tasks — Calendar** | `/tasks/calendar` | Calendar view of tasks by due date |
| 5 | **Tasks — Timeline** | `/tasks/timeline` | Gantt/timeline view |
| 6 | **Task Detail** | `/tasks/:id` | Full task view (modal or page) |
| 7 | **Goals** | `/goals` | All goals with progress, OKR tree |
| 8 | **Goal Detail** | `/goals/:id` | Single goal: progress, linked tasks, check-ins |
| 9 | **Projects** | `/projects` | Project list/grid |
| 10 | **Project Detail** | `/projects/:id` | Project home: overview, tasks, goals, docs, timeline |
| 11 | **Knowledge Graph** | `/graph` | Interactive graph visualization |
| 12 | **Entity Detail** | `/graph/entities/:id` | Entity facts, relationships, timeline |
| 13 | **Graph Discover** | `/graph/discover` | Agent insights and suggestions |
| 14 | **Documents (VDR)** | `/docs` | File browser with folder tree |
| 15 | **Document Viewer** | `/docs/:id` | View/edit document with AI sidebar |
| 16 | **Data Room** | `/docs/rooms/:id` | Investor-ready shared view |
| 17 | **Search** | `/search` | Global search across tasks, docs, entities, goals |
| 18 | **Agent Chat** | `/chat` | Dedicated conversation view (also accessible as overlay) |
| 19 | **Chat History** | `/chat/history` | Past conversations |
| 20 | **Settings** | `/settings` | Account, integrations, preferences |
| 21 | **Settings — Integrations** | `/settings/integrations` | Connected services |
| 22 | **Settings — Agents** | `/settings/agents` | Agent configuration and permissions |
| 23 | **Notifications** | `/notifications` | Notification center (also accessible as dropdown) |
| 24 | **Inbox** | `/inbox` | Agent suggestions, items needing review, pending approvals |

### 1.2 Detailed Screen Specs

---

#### 1. Dashboard Home (`/`)

**What it shows:**
- Greeting with date/time
- "Today's Focus" — agent-curated list of 3-5 priority tasks
- Project cards grid — each showing name, progress %, blocked count
- Goals at risk — goals with status `at_risk` or `behind`
- Agent activity feed — live stream of what agents are doing
- Quick stats: tasks completed this week, goals on track, docs added

**Key interactions:**
- Click task → opens task detail modal
- Click project card → navigates to project detail
- Click goal → navigates to goal detail
- "Add task" quick-add bar at top
- Agent activity items have action buttons (approve, view, dismiss)

**Data sources:** Tasks API, Goals API, Projects API, Agent Activity SSE

---

#### 2-5. Task Views (`/tasks`, `/tasks/board`, `/tasks/calendar`, `/tasks/timeline`)

**Shared elements:**
- View switcher tabs: List | Board | Calendar | Timeline
- Filter bar: project, status, priority, assignee, tags, due date
- Saved views dropdown
- "New task" button
- Bulk action toolbar (appears when items selected)

**List view specifics:** Sortable table with inline editing, row expansion, keyboard nav
**Board view specifics:** Draggable cards in status columns, swimlane toggle, WIP limits
**Calendar view specifics:** Month/week/day toggle, drag tasks to reschedule
**Timeline view specifics:** Zoom controls, dependency arrows, critical path toggle

**Data sources:** Tasks API with SSE for real-time updates

---

#### 6. Task Detail (`/tasks/:id`)

Opens as a **modal overlay** (preserving list context) or full page via direct link.

**Layout:**
```
┌────────────────────────────────────────────────────┐
│ [◀ Back]          task-id          [⋮ More] [✕]    │
├──────────────────────────────┬─────────────────────┤
│ MAIN CONTENT                 │ SIDEBAR             │
│                              │                     │
│ ☐ Task Title (editable)      │ Status: [doing ▾]   │
│                              │ Priority: [P1 ▾]    │
│ Description (markdown editor)│ Assignee: [avatar ▾]│
│                              │ Project: [name ▾]   │
│ ─── Subtasks ───             │ Due: [date picker]  │
│ ☑ Subtask 1                  │ Tags: [+ add]       │
│ ☐ Subtask 2                  │                     │
│ [+ Add subtask]              │ ─── Links ───       │
│                              │ 🎯 Goal: "..."       │
│ ─── Activity ───             │ 📄 Doc: "..."        │
│ Otto changed status → doing  │ 🔗 Entity: "..."     │
│ Kira added subtask           │ ⛓ Depends on: "..."  │
│ [Comment box]                │                     │
└──────────────────────────────┴─────────────────────┘
```

**Key interactions:** Inline editing for all fields, markdown editor for description, drag-reorder subtasks, comment with @mentions, link to entities/docs/goals

---

#### 7. Goals (`/goals`)

**Layout options:**
- **OKR Tree**: hierarchical — Objectives with nested Key Results
- **Grid**: goal cards with progress rings
- **List**: table with progress bars

**Each goal card shows:** Title, progress ring/bar, status color, deadline, owner avatar, linked task count

**Filters:** status, owner, time period, project

---

#### 8. Goal Detail (`/goals/:id`)

**Shows:**
- Title, description, status, deadline countdown
- Progress visualization (bar + trend chart)
- If Objective: child Key Results with their progress
- Linked tasks (filterable by status)
- Milestones on mini-timeline
- Check-in history
- Agent insights: "At current pace, you'll hit this goal by [date]"

**Key interactions:** Add check-in, link/unlink tasks, edit target metric, ask agent to decompose

---

#### 9. Projects (`/projects`)

**Grid of project cards**, each showing:
- Emoji + name + status badge
- Mini progress bar (% tasks done)
- Task count, open/blocked count
- Last activity timestamp

**Interactions:** Click → project detail, right-click → quick actions, drag to reorder, "New project" button

---

#### 10. Project Detail (`/projects/:id`)

**Tab navigation:** Overview | Tasks | Goals | Documents | Timeline

- **Overview**: stats cards, recent activity, agent insights
- **Tasks**: embedded task list view (filtered to this project)
- **Goals**: embedded goals view (filtered to this project)
- **Documents**: embedded VDR folder view (project folder)
- **Timeline**: embedded Gantt (filtered to this project)

---

#### 11. Knowledge Graph (`/graph`)

**Full-screen canvas** with overlays:
- Top bar: search, layout mode selector, filter toggle
- Left sidebar (collapsible): filter panel
- Right sidebar (collapsible): entity detail panel (appears on node select)
- Bottom bar: zoom controls, node/edge counts, minimap toggle
- Floating: agent discovery suggestions (dismissible)

---

#### 14. Documents / VDR (`/docs`)

**Layout:**
```
┌──────────┬───────────────────────────────────────┐
│ FOLDER   │ FILE LIST                             │
│ TREE     │                                       │
│          │ [Grid ▾] [Sort ▾] [Filter ▾] [🔍]     │
│ 📁 Root   │                                       │
│ ├── 📁 A  │ ┌──────┐ ┌──────┐ ┌──────┐          │
│ ├── 📁 B  │ │ doc1 │ │ doc2 │ │ doc3 │          │
│ └── 📁 C  │ │ .pdf │ │ .md  │ │ .png │          │
│          │ └──────┘ └──────┘ └──────┘          │
│          │                                       │
│          │ [List view also available]             │
└──────────┴───────────────────────────────────────┘
```

**Views:** Grid (thumbnails) | List (table with details)
**Interactions:** Drag-drop upload, drag between folders, right-click context menu, multi-select, bulk actions

---

#### 15. Document Viewer (`/docs/:id`)

**Layout depends on type:**
- Markdown: rendered content with optional edit mode + AI sidebar
- PDF: embedded viewer with page nav + AI sidebar
- Image: full preview with zoom + AI sidebar
- Code: syntax-highlighted view + AI sidebar

**AI Sidebar (right panel):**
- Summary
- Key points
- Extracted entities (linked to graph)
- Related documents
- Chat: "Ask about this document"
- Actions: "Summarize", "Find action items", "Compare with..."

---

#### 17. Global Search (`/search`)

**Unified search across all content types:**
- Search bar with type filter chips: All | Tasks | Docs | Entities | Goals
- Results grouped by type
- Each result shows: icon, title, snippet with highlights, source/location
- Semantic search toggle
- Recent searches

**Also accessible via `Cmd+K` command palette** (quick access without navigating)

---

#### 18. Agent Chat (`/chat`)

**Accessible two ways:**
1. Full page at `/chat`
2. Slide-over panel from any page (toggle with `Cmd+/`)

**Layout:**
- Conversation messages (user + agent)
- Inline action cards: when agent creates/modifies something, card shows preview + confirm/edit
- Context awareness: agent knows which page you're on
- File/doc drop zone: drag a file into chat to discuss it
- Quick actions: "/task", "/goal", "/search", "/summarize"

---

#### 24. Inbox (`/inbox`)

**Agent suggestions and items needing attention:**
- Suggested tasks (from conversation extraction)
- Entities needing verification
- Stale items needing review
- Pending agent actions needing approval
- Each item: description, action buttons (approve/edit/dismiss), source link

---

## 2. Navigation Structure

### 2.1 Primary Navigation (Left Sidebar)

```
┌──────────────────┐
│ 🤖 Kira           │
│                    │
│ 🏠 Dashboard       │  → /
│ ✅ Tasks           │  → /tasks
│ 🎯 Goals           │  → /goals
│ 📁 Projects        │  → /projects
│ 🕸️ Graph           │  → /graph
│ 📄 Documents       │  → /docs
│ 💬 Chat            │  → /chat
│ 📥 Inbox (3)       │  → /inbox
│                    │
│ ── Saved Views ──  │
│ My P0s             │  → /tasks?priority=P0&assignee=me
│ This Week          │  → /tasks?due=this-week
│ Investor Pipeline  │  → /graph?filter=investors
│                    │
│ ── Projects ──     │
│ 🚀 Series A        │  → /projects/series-a
│ 📱 Product          │  → /projects/product
│                    │
│                    │
│ ⚙️ Settings        │  → /settings
└──────────────────┘
```

- Sidebar is collapsible to icons only
- Sections are collapsible
- Projects section auto-populated from active projects
- Saved views are user-created
- Unread badge on Inbox

### 2.2 Command Palette (`Cmd+K`)

Global quick-access overlay:
- Search anything: tasks, docs, entities, goals, pages
- Run actions: "Create task", "New project", "Upload document"
- Navigate: type page name to jump there
- Agent commands: "Ask Kira to..."
- Recent items for quick access

### 2.3 Breadcrumbs

Every page shows breadcrumb trail:
`Dashboard > Projects > Series A > Tasks > "Update pitch deck"`

Clickable at each level.

---

## 3. Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| **Desktop** | ≥1280px | Full sidebar + main content + detail panels |
| **Small Desktop** | 1024-1279px | Narrow sidebar (icons + labels), panels overlay |
| **Tablet** | 768-1023px | Sidebar collapses to icons, single-column main, panels as modals |
| **Mobile** | <768px | Bottom tab navigation, full-screen views, swipe gestures |

### Mobile-Specific Adaptations

- Bottom tab bar: Dashboard, Tasks, Docs, Graph, Chat
- Task views: List and Board only (no Gantt on mobile)
- Knowledge graph: simplified view with list-based exploration
- Document viewer: full-screen with gesture navigation
- Swipe right on task → complete, swipe left → context menu
- Pull-to-refresh on all list views
- FAB (floating action button) for quick-add

---

## 4. Component Hierarchy

### 4.1 Shared Layout Components

```
<AppShell>
├── <Sidebar>
│   ├── <Logo />
│   ├── <NavItem /> (repeated)
│   ├── <SavedViewsList />
│   ├── <ProjectsList />
│   └── <UserMenu />
├── <TopBar>
│   ├── <Breadcrumbs />
│   ├── <SearchTrigger />  (opens Cmd+K)
│   └── <NotificationBell />
├── <MainContent>
│   └── {page content}
├── <AgentChatPanel />  (slide-over, toggle with Cmd+/)
├── <CommandPalette />  (modal, toggle with Cmd+K)
└── <NotificationToasts />
```

### 4.2 Shared UI Components

```
Foundation:
├── <Button> — primary, secondary, ghost, danger variants
├── <Input> — text, number, date, with validation
├── <Select> — single, multi, with search
├── <Modal> — dialog overlay
├── <Dropdown> — menu with items, separators, nested menus
├── <Tooltip> — hover info
├── <Badge> — status pills, count badges
├── <Avatar> — user/agent avatars with online indicator
├── <Tag> — colored chips for tags
├── <Tabs> — horizontal tab navigation
├── <EmptyState> — illustration + message when no data

Data Display:
├── <DataTable> — sortable, filterable, paginated table
├── <KanbanBoard> — drag-and-drop column layout
├── <Calendar> — month/week/day views
├── <Timeline> — horizontal Gantt bars
├── <ProgressBar> — linear progress
├── <ProgressRing> — circular progress
├── <TrendChart> — line chart for goals
├── <ActivityFeed> — timestamped event list
├── <EntityCard> — compact entity summary

Forms:
├── <MarkdownEditor> — rich text with markdown shortcuts
├── <TagInput> — multi-value input with autocomplete
├── <DatePicker> — date/time selection
├── <FileUpload> — drag-and-drop zone
├── <InlineEdit> — click-to-edit text/select

Graph:
├── <GraphCanvas> — force-directed graph renderer
├── <GraphControls> — zoom, layout, minimap
├── <GraphFilterPanel> — type/relationship/time filters
├── <EntityDetailPanel> — facts, relationships, timeline

Agent:
├── <AgentMessage> — chat bubble with action cards
├── <SuggestionCard> — approve/edit/dismiss pattern
├── <AgentActivityItem> — what agent is doing now
├── <InlineAgent> — contextual agent UI within any view
```

### 4.3 Agent Integration Pattern

The agent is NOT in a separate tab. It's woven into every view:

- **Task list**: subtle agent row suggesting next tasks
- **Document viewer**: AI sidebar with summary and chat
- **Knowledge graph**: discovery overlay with insights
- **Goal detail**: agent commentary on progress
- **Project overview**: agent-written status summary
- **Every empty state**: agent offers to help ("No tasks yet. Want me to create some based on your goals?")
- **Every search**: "Can't find it? Ask Kira to look deeper"

Pattern: `<InlineAgent context={currentView} />` renders appropriate agent UI per view.

---

## 5. Design System

### 5.1 Visual Language

- **Typography**: Inter for UI, JetBrains Mono for code
- **Colors**: Neutral base (zinc/slate), vibrant accents per entity type
  - Blue: people/users
  - Green: companies/success
  - Purple: projects/goals
  - Orange: warnings/at-risk
  - Red: errors/blocked/P0
  - Teal: agent actions
- **Spacing**: 4px grid system
- **Borders**: subtle, 1px, rounded-lg (8px)
- **Shadows**: minimal, used for elevation (modals, dropdowns)
- **Dark mode**: first-class, not an afterthought
- **Motion**: subtle, purposeful — 150ms transitions, spring physics for drag

### 5.2 Performance Targets

- **First paint**: <1s
- **Interactive**: <2s
- **Task list render (1000 tasks)**: <100ms (virtualized)
- **Graph render (500 nodes)**: <500ms
- **Search results**: <200ms
- **SSE latency**: <100ms from event to UI update
- **Optimistic updates**: immediate (0ms perceived latency)

### 5.3 Tech Stack (Frontend)

- **Framework**: React 18+ with Vite (build tool) + react-router-dom v6 (client-side routing)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: Zustand for client state, TanStack Query for server state
- **Real-time**: SSE with EventSource API
- **Graph**: Cytoscape.js (WebGL renderer)
- **Charts**: Recharts or Visx
- **DnD**: dnd-kit
- **Editor**: TipTap (markdown + rich text)
- **Virtualization**: TanStack Virtual for large lists
- **Routing**: Explicit route definitions in a central router config (no file-based routing). All components are client-side rendered.
