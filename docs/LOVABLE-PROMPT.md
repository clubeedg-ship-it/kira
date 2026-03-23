# Lovable Prompt — Kira Dashboard

Copy-paste this entire prompt into Lovable to build the Kira Dashboard UI.

---

## PROMPT START

Build "Kira Dashboard" — a CEO command center for managing an AI-powered company portfolio. This is a single-page React app (Vite + TypeScript + Tailwind + shadcn/ui) that connects to an existing REST API backend. The backend is fully built and tested — your job is to build a beautiful, functional UI that consumes it.

### Design System

- **Theme:** Dark mode only. Catppuccin Mocha color palette.
- **Primary accent:** `#feba04` (amber)
- **Secondary accent:** `#d23234` (red, for alerts/critical only)
- **Background:** `#1e1e2e` (base), `#313244` (surface), `#45475a` (overlay)
- **Text:** `#cdd6f4` (primary), `#a6adc8` (secondary), `#585b70` (muted)
- **Design signature:** Frosted glass panels (`backdrop-blur-xl bg-surface/60 border border-white/5`), subtle particle/grid background on the main layout
- **Font:** Inter or JetBrains Mono for code
- **Information density over whitespace** — this is a power-user tool, not a marketing page
- **Every panel should feel alive** — real-time data, subtle animations, pulsing status dots

### API Connection

- **Base URL:** Configurable via environment variable `VITE_API_URL` (default: `http://localhost:3847`)
- **Auth:** None needed (single-tenant, auto-authenticated server-side)
- **Response format:** All endpoints return `{ data: T }` or `{ data: T[], total?: number }`
- **Real-time:** SSE stream at `GET /api/v1/events/stream` for live agent activity and chat responses

### Pages / Tabs

Build these as a sidebar-navigated SPA with the following sections:

---

#### 1. Command Center (Default/Home)

The CEO dashboard. One glance = full picture.

**Top bar:** System health strip — RAM usage, GPU temp, services online count (from `GET /api/v1/state/overview`)

**Layout (3 columns on desktop):**
- **Left:** Portfolio cards — each Oopuo company as a card with status dot, tier badge, description (from `GET /api/v1/state/portfolio/projects`)
- **Center:** Active tasks feed — filterable by status, sortable by priority (from `GET /api/v1/tasks?sort=priority&order=asc`)
- **Right:** Live activity feed — real-time SSE events showing what agents are doing right now

**Revenue targets bar:** Show MRR targets with progress indicators (from `GET /api/v1/state/portfolio/revenue-targets`)

---

#### 2. Tasks

Full task management system. This is the core workhorse.

**Endpoints:**
- `GET /api/v1/tasks` — List (supports `status`, `priority`, `project_id`, `executor_type`, `search`, `sort`, `order`, `limit`, `offset`)
- `GET /api/v1/tasks/stats` — Count by status
- `GET /api/v1/tasks/next` — AI-recommended next task
- `POST /api/v1/tasks` — Create
- `PUT /api/v1/tasks/:id` — Update
- `DELETE /api/v1/tasks/:id` — Delete

**UI:**
- Kanban board view (columns: todo, in-progress, blocked, in-review, done) with drag-and-drop
- List view with filters and bulk actions
- Task detail slide-over panel with: title, description (markdown), status, priority (1-4 with color coding), executor type (human/agent), due date, tags, project link
- "Next Task" button that calls `/tasks/next` and highlights the recommended task
- Stats bar at top showing task counts per status
- Tasks assigned to agents should show the agent avatar/icon

**Task Schema:**
```json
{
  "title": "string", "description": "string", "status": "todo|in-progress|blocked|in-review|done|cancelled",
  "priority": 1-4, "executorType": "human|agent", "executorId": "string|null",
  "dueDate": "YYYY-MM-DD", "tags": ["string"], "projectId": "uuid", "energy": "low|medium|high"
}
```

---

#### 3. Projects

Project management with hierarchy: Projects → Milestones → Tasks

**Endpoints:**
- `GET/POST/PUT/DELETE /api/v1/projects[/:id]`
- `GET/POST/PUT/DELETE /api/v1/milestones[/:id]`

**UI:**
- Project cards in a grid, each showing: title, status badge, task count, milestone progress bar, deadline
- Click into a project → see its milestones as a timeline, and tasks grouped under each milestone
- Create/edit project modal

---

#### 4. Chat (Multi-Agent)

Chat interface where you can talk to different AI agents in separate panels.

**Endpoints:**
- `GET /api/v1/chat/conversations` — List conversations
- `POST /api/v1/chat/conversations` — Create
- `GET /api/v1/chat/conversations/:id/messages` — Get messages
- `POST /api/v1/chat/conversations/:id/messages` — Send message `{content: "text"}`
- `GET /api/v1/panels` — List chat panels
- `POST /api/v1/panels` — Create panel `{title, agentId}`
- `DELETE /api/v1/panels/:id` — Remove panel

**Real-time streaming:**
- Connect to `GET /api/v1/events/stream` (SSE)
- Listen for `stream-start`, `stream-delta`, `stream-end` events
- Render tokens as they arrive (typing animation effect)
- Show "thinking" indicator when `activity` event has `type: "thinking"`

**UI:**
- Left sidebar: conversation list (create new, rename, delete)
- Main area: chat messages with markdown rendering (syntax highlighting for code)
- Top tabs: panels — each tab is a different agent conversation
- "New Panel" button that lets you pick an agent (from `GET /api/v1/agents`) or create a general chat
- Messages from the assistant should render markdown with code blocks, tables, lists
- Voice input button (hits `POST /api/v1/transcribe` with audio blob)

---

#### 5. Knowledge Graph

Interactive visualization of the entity-relationship graph.

**Endpoints:**
- `GET /api/v1/knowledge/graph?limit=200` — Returns `{entities: [...], relations: [...]}`
- `GET /api/v1/knowledge/entity/:id` — Entity detail with facts and relations
- `GET /api/v1/knowledge/entities?q=search&type=person` — Search/filter

**UI:**
- Force-directed graph visualization (use `@react-sigma/core` or `react-force-graph-2d`)
- Nodes colored by entity type (person=blue, company=green, project=purple, concept=orange)
- Click a node → side panel shows entity details, facts, and connected entities
- Search bar to filter/highlight entities
- Zoom controls, fullscreen toggle
- Node size based on number of connections

---

#### 6. Documents (Notion-like)

Freeform document editor — agents use this as their workspace.

**Endpoints:**
- `GET /api/v1/documents` — List (filter: `search`, `folder`)
- `GET /api/v1/documents/:id` — Get document
- `POST /api/v1/documents` — Create `{title, content, folder, tags}`
- `PUT /api/v1/documents/:id` — Update
- `DELETE /api/v1/documents/:id` — Delete

**UI:**
- Left sidebar: folder tree + document list (group by `folder` field)
- Main area: rich markdown editor with live preview (use `@uiw/react-md-editor` or similar)
- Auto-save on edit (debounced PUT)
- Document metadata bar: tags, folder, created date, last modified
- "New Document" with folder selection
- Search across all documents

---

#### 7. Skills Marketplace

Browse and manage AI agent skills.

**Endpoints:**
- `GET /api/v1/skills` — All skills with install status
- `GET /api/v1/skills/:name` — Skill detail
- `POST /api/v1/skills/:name/install` — Install
- `DELETE /api/v1/skills/:name` — Uninstall
- `GET /api/v1/agents/openclaw` — Currently active skills

**UI:**
- Grid of skill cards: name, description, author, install status (installed/available)
- Click → detail view with full description, capabilities, configuration
- Install/uninstall toggle button
- Filter: installed, available, by category
- "Currently Active" section at top showing what the agent can do right now

---

#### 8. Memory

Browse the AI's memory — what it knows, what it has learned.

**Endpoints:**
- `GET /api/v1/state/memory/stats` — Overview stats
- `GET /api/v1/state/memory/facts?limit=50` — Extracted facts
- `GET /api/v1/state/memory/search?q=X` — Semantic search
- `GET /api/v1/state/memory/daily-logs` — Daily log files
- `GET /api/v1/state/memory/daily-logs/:date` — Read a log

**UI:**
- Stats cards at top: total facts, knowledge graph size, daily logs count
- Semantic search bar with results showing relevance score
- Facts list with action badges (ADD/UPDATE/DELETE)
- Daily logs timeline — click a date to read the markdown content
- Memory graph: simple visualization of how facts connect

---

#### 9. Infrastructure

Server monitoring dashboard.

**Endpoints:**
- `GET /api/v1/state/infra/system` — RAM, disk, GPU, uptime
- `GET /api/v1/state/infra/pm2` — All Node.js services
- `GET /api/v1/state/infra/docker` — Docker containers

**UI:**
- System gauges: RAM %, Disk %, GPU % (circular progress rings)
- GPU card: RTX 4090 with temp, VRAM usage, utilization
- PM2 services table: name, status (green/red dot), CPU, memory, restarts, uptime
- Docker containers table: name, image, status, ports
- Auto-refresh every 30 seconds

---

#### 10. Settings

Configuration page.

**Endpoints:**
- `GET /api/v1/settings` — Current settings
- `PATCH /api/v1/settings` — Update (merge)
- `GET /api/v1/identity` — Agent identity
- `PUT /api/v1/identity` — Update identity

**UI:**
- Grouped settings sections
- Identity editor: agent name, role, description
- API configuration display
- Theme preferences (future: light mode toggle)

---

#### 11. Paperclip Visualizer

Show autonomous task runner state.

**Endpoints:**
- `GET /api/v1/state/infra/pm2` — Filter for `paperclip` process
- `GET /api/v1/state/activity/agent-outputs` — Recent output files
- `GET /api/v1/state/activity/agent-outputs/:name` — Read output

**UI:**
- Process status card (running/stopped, uptime, memory)
- Output feed: chronological list of files Paperclip has produced
- Click an output → render the JSON/markdown content
- Activity sparkline showing when outputs were generated

---

### Global UI Elements

- **Sidebar:** Collapsible, icon-based when collapsed. Sections: Command Center, Tasks, Projects, Chat, Knowledge Graph, Documents, Skills, Memory, Infrastructure, Settings
- **Top bar:** App title "Kira ⚡", current time, system health indicators (green/yellow/red dots for services)
- **Toast notifications:** For errors, success messages
- **Loading states:** Skeleton loaders for all data fetches
- **Empty states:** Helpful illustrations/messages when no data exists yet
- **Responsive:** Optimized for desktop (1440px+), usable on tablet, basic on mobile
- **Keyboard shortcuts:** `Cmd+K` for global search, `Cmd+N` for new task, `Esc` to close modals

### Tech Stack

- React 18+ with TypeScript
- Vite for bundling
- Tailwind CSS + shadcn/ui components
- TanStack Query (React Query) for data fetching and caching
- React Router for navigation
- Zustand for global state (sidebar collapsed, active panel, etc.)
- react-force-graph-2d for knowledge graph
- @uiw/react-md-editor for document editing
- recharts for any charts/sparklines

## PROMPT END
