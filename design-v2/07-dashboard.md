# 07 — Dashboard (Platform UI)

> `app.kira.ai` — Where users interact with their AI partner.

---

## Layout

```
┌──────────────────────────────────────────────────┐
│ [⚡] [🏠] [💬] [✅] [📄] [🧠] [⚙️]  [...user] │  ← Sidebar (56px collapsed, 200px expanded)
├──────────────────────────────────────────────────┤
│                                                  │
│              Page Content                        │
│              (full remaining space)              │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Sidebar Navigation

| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| ⚡ | Kira (logo) | `/` | Home / Overview |
| 🏠 | Overview | `/` | Dashboard home with stats |
| 💬 | Chat | `/chat` | AI conversation |
| ✅ | Tasks | `/tasks` | Kanban board |
| 📄 | Documents | `/documents` | File browser |
| 🧠 | Knowledge | `/knowledge` | Entity graph |
| ⚙️ | Settings | `/settings` | Account, providers, preferences |

**Behavior:**
- Collapsed by default (icons only, 56px wide)
- Expands on hover (200px, shows labels)
- Active page highlighted with violet left border
- User avatar at bottom with display name + sign out
- Always visible, never hidden — navigation is always accessible

---

## Pages

### Overview (`/`)

**Purpose:** At-a-glance status. First thing user sees after login.

**Content:**
- Time-aware greeting ("Good morning, Mark")
- 4 stat cards: Tasks Due Today, Active Goals, Knowledge Entities, Tokens This Month
- Quick priorities (top 3 tasks, checkable)
- Recent activity feed (last 10 actions)
- Quick action buttons: "New Chat", "Add Task", "Upload Document"

**API:** `GET /api/overview` → aggregated stats from user's DBs

### Chat (`/chat`)

See [08-chat.md](./08-chat.md) for full spec.

**Layout:** Discord-style message list + input bar + status bar. No bubbles, no left/right alignment.

### Tasks (`/tasks`)

**Layout:** Kanban board with 4 columns: Todo, In Progress, Review, Done

**Features:**
- Drag & drop between columns
- Click to expand task detail (title, description, priority, due date, tags)
- Add task button (opens inline form)
- Priority badges (P0 red, P1 orange, P2 yellow, P3 gray)
- Filter by assignee, tag, priority
- Sort by due date, priority, created date

**API:** `GET/POST/PATCH/DELETE /api/tasks`

### Documents (`/documents`)

**Layout:** File tree on left, preview/upload on right

**Features:**
- Folder navigation (tree view)
- File upload (drag & drop or button)
- File preview (markdown rendered, text displayed, images shown)
- Download button
- Create folder
- Delete file/folder

**API:** `GET /api/documents/tree`, `GET/POST/DELETE /api/documents/:path`

### Knowledge (`/knowledge`)

**Layout:** Entity list with search and type filter

**Features:**
- Search entities by name
- Filter by type (person, project, concept, etc.)
- Click entity to see details (properties, relationships, mentions)
- Visual graph view (future — force-directed graph)

**API:** `GET /api/knowledge/entities`, `GET /api/knowledge/entities/:id`

### Settings (`/settings`)

**Sections:**

1. **Account** — Display name, email, password change, avatar
2. **AI Providers** — Add/remove API keys, select default model
3. **Usage** — Token usage chart, cost breakdown, quota status
4. **Preferences** — Theme, language, notification settings
5. **Data** — Export all data, delete account
6. **Admin** (admin only) — User management, system config

**API:** Various `/api/settings/*` endpoints

---

## Design System

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0F1117` | Main background |
| `--bg-secondary` | `#13151D` | Sidebar, cards |
| `--bg-tertiary` | `#1A1D27` | Inputs, hover states |
| `--border` | `#1E2030` | Borders |
| `--text` | `#E2E8F0` | Primary text |
| `--text-secondary` | `#8B92A5` | Secondary text |
| `--text-muted` | `#5A5F73` | Disabled, hints |
| `--accent` | `#7C3AED` | Primary accent (violet) |
| `--accent-hover` | `#6D28D9` | Accent hover |
| `--error` | `#EF4444` | Error states |
| `--success` | `#22C55E` | Success states |
| `--warning` | `#F59E0B` | Warning states |

### Typography

- Font: Inter (system-ui fallback)
- Base: 14px
- Headings: 16px (h3), 18px (h2), 22px (h1)
- Mono: JetBrains Mono (for code blocks)

### Components

All components use inline styles OR Tailwind classes — never mix. Preference: Tailwind.

**Error Boundary:** Wraps every page route. Shows friendly error + "Go Home" button on crash. Never kills the sidebar.

**Loading States:** Skeleton screens, not spinners. Every page shows a skeleton while loading data.

**Empty States:** Every page has a meaningful empty state with an action button. "No tasks yet — [Create your first task]"

---

## Routing

```typescript
<BrowserRouter>
  <Routes>
    {/* Public */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    
    {/* Protected — wrapped in AuthGuard */}
    <Route element={<AuthGuard />}>
      <Route element={<NavShell />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Route>
    
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
</BrowserRouter>
```

### AuthGuard

```typescript
function AuthGuard() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSkeleton />;
  if (!user) return <Navigate to="/login" />;
  return <Outlet />;
}
```

No inline auth checks in pages. Auth is handled once at the route level.
