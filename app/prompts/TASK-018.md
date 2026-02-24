# TASK 018 — Quick Add / Command Palette

## Agent Instructions

You are building a **command palette-style quick task creation** overlay triggered by `Cmd+K` from any page.

**Read these files first (in order):**
1. `AGENTS.md` — project conventions
2. `design/screens/operations/quick-add.md` — full UI spec with inline syntax
3. `src/server/routes/tasks.ts` — existing task CRUD
4. `src/server/routes/projects.ts` — existing project CRUD (for auto-suggest)
5. `src/db/schema.ts` — schema

**What you're building:**

### Frontend Component (`src/client/components/QuickAdd.tsx`)

Global overlay triggered by:
- `Cmd+K` / `Ctrl+K` from any page
- `q` key when focus is on a task list
- `+` button in view toolbars

**UI:** Centered modal overlay with backdrop blur. Single text input at top.

**Inline syntax parsing** (real-time as user types):
- `!critical` / `!high` / `!medium` / `!low` → priority
- `#tagname` → tag
- `@agent` → executor_type = agent; `@me` → executor_type = human
- `due:friday` / `due:2026-03-01` / `due:tomorrow` / `due:eod` → due_date
- `>projectname` → project (fuzzy match against user's projects)
- Everything else → task title

**Parsed preview** below input:
```
┌─ PARSED ──────────────────────────────────────┐
│ Project: [Email Campaign ▾]  Priority: [high] │
│ Due: [Feb 21 ▾]  Executor: [🤖 agent]        │
│ Tags: [auth] [frontend]                       │
└───────────────────────────────────────────────┘
```

**Keyboard shortcuts:**
- `Enter` → create task → close overlay → show toast "✓ Task created"
- `Shift+Enter` → create task → clear input → stay open for another
- `Esc` → close without creating
- `Tab` → focus moves between parsed field dropdowns for manual adjustment

**Project auto-suggest:**
- Fetch user's projects on mount (cache in TanStack Query)
- When `>` is typed, show dropdown of matching projects
- If no `>` prefix, auto-suggest based on title keywords vs existing project names (fuzzy)

### Backend

No new endpoints needed — uses existing `POST /api/v1/tasks`.

Add a utility function `parseQuickAddSyntax(input: string)` in `src/shared/utils.ts` that extracts structured data from the raw input string. This is used client-side for the preview and sent as the task body.

### Global Keyboard Listener

In `src/client/App.tsx` or a `useGlobalShortcuts` hook:
- Listen for `Cmd+K` / `Ctrl+K` → open QuickAdd
- Prevent default browser behavior (Chrome's address bar)
- Only active when QuickAdd is not already open

### Integration Points
- After task creation, emit SSE event (already handled by task CRUD)
- Command Center and Board View will update via existing SSE listeners

## Commit Format
```
build(TASK-018): Quick Add command palette with inline syntax
```

## Acceptance Test
```bash
# 1. Trigger
# Press Cmd+K → overlay appears with focus on input

# 2. Parse
# Type: "Fix login bug !critical #auth due:tomorrow @agent"
# → Preview shows: priority=critical, tag=auth, due=tomorrow, executor=agent, title="Fix login bug"

# 3. Create
# Press Enter → task created → overlay closes → toast confirmation

# 4. Batch
# Press Shift+Enter → task created → input clears → type another

# 5. Escape
# Press Esc → overlay closes, nothing created

# 6. Project suggest
# Type: ">Zeni" → dropdown shows "ZenithCred" project → select → project_id set

# 7. Works from every page
# Navigate to /operations/board → Cmd+K works
# Navigate to /chat → Cmd+K works
```
