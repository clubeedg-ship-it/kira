# Tasks & Goals System

> Notion-level project management where AI agents are first-class participants — not tools you invoke, but teammates that create, update, and complete tasks alongside you.

---

## 1. Task System

### 1.1 Task Data Model

```typescript
interface Task {
  id: string;                    // nanoid
  title: string;
  description?: string;          // Markdown, rendered inline
  status: 'todo' | 'doing' | 'done' | 'blocked';
  priority: 'P0' | 'P1' | 'P2' | 'P3';  // P0 = critical, P3 = someday
  project?: string;              // project ID
  assignee?: string;             // user ID or agent ID
  creator: string;               // who/what created it
  createdAt: DateTime;
  updatedAt: DateTime;
  dueDate?: DateTime;
  completedAt?: DateTime;
  tags: string[];
  subtasks: SubTask[];
  linkedEntities: EntityRef[];   // links to knowledge graph nodes
  linkedGoals: string[];         // goal IDs this task advances
  linkedDocuments: string[];     // VDR document IDs
  dependencies: string[];        // task IDs that must complete first
  recurrence?: RecurrenceRule;   // repeating tasks
  agentMetadata?: {
    source: 'conversation' | 'document' | 'goal_decomposition' | 'suggestion' | 'manual';
    confidence: number;          // 0-1, how confident the agent is this task is correct
    extractedFrom?: string;      // message/doc ID it was extracted from
    reasoning?: string;          // why the agent created/suggested this
  };
  activity: ActivityEntry[];     // audit log of all changes
}

interface SubTask {
  id: string;
  title: string;
  done: boolean;
  assignee?: string;
}

interface ActivityEntry {
  timestamp: DateTime;
  actor: string;        // user or agent ID
  action: string;       // 'status_changed', 'assigned', 'commented', etc.
  details: Record<string, any>;
}
```

### 1.2 Views

#### List View (default)
- Dense, scannable table — inspired by Linear
- Columns: checkbox, priority icon, title, status pill, assignee avatar, due date, tags, project
- Columns are resizable, reorderable, hideable
- Inline editing: click any cell to edit in-place
- Row expansion: click to expand description + subtasks inline (no page navigation)
- Keyboard navigation: j/k to move, enter to expand, space to toggle status, x to select
- Grouping: group by project, status, priority, assignee, or tag
- Sorting: any column, multi-column sort with shift-click

#### Kanban Board
- Columns = status by default (todo → doing → done → blocked)
- Can switch to: group by priority, by assignee, by project
- Drag-and-drop between columns (updates status instantly)
- Card shows: title, priority dot, assignee avatar, due date, subtask progress bar
- WIP limits: configurable max cards per column, visual warning when exceeded
- Swimlanes: optional horizontal grouping (e.g., columns = status, swimlanes = project)
- Collapse/expand columns

#### Calendar View
- Month/week/day views
- Tasks placed on their due date
- Drag to reschedule
- Color-coded by project or priority
- Shows overdue tasks prominently at top
- Integration: also shows calendar events if connected

#### Timeline / Gantt View
- Horizontal bars showing task duration (created → due)
- Dependencies shown as arrows between bars
- Critical path highlighting
- Drag to adjust dates
- Zoom: day / week / month / quarter
- Milestone markers for goals
- Agent work periods: shaded bars showing when an agent was actively working on a task

### 1.3 Filters & Search

```
Filters (combinable, saved as "Views"):
├── Project: [dropdown multi-select]
├── Status: [todo] [doing] [done] [blocked]
├── Priority: [P0] [P1] [P2] [P3]
├── Assignee: [user/agent avatars]
├── Tags: [multi-select with autocomplete]
├── Due Date: [today | this week | this month | overdue | custom range]
├── Created: [date range]
├── Creator: [user | agent | specific agent]
├── Has dependencies: [yes | no]
├── Blocked: [yes | no]
└── Search: [full-text across title + description]
```

- **Saved Views**: name a filter combo, pin to sidebar (e.g., "My P0s this week")
- **Quick filters**: one-click chips at top of any view (e.g., "Assigned to me", "Overdue", "Created by agent")
- **Natural language filter**: type "show me all blocked tasks in Project X assigned to Kira" → agent parses into filters

### 1.4 Bulk Actions

Select multiple tasks (checkboxes or shift-click range):
- Change status
- Change priority
- Reassign (to user or agent)
- Move to project
- Add/remove tags
- Set due date
- Delete / archive
- "Ask agent to review these" → agent analyzes selected tasks and suggests actions

### 1.5 Agent-Powered Task Creation

#### Auto-extraction from Conversations
When you chat with Kira in any context:
- Agent detects actionable items: "I need to...", "Let's do...", "Don't forget to..."
- Shows inline suggestion: `📋 Create task: "Review Q4 financials"? [Yes] [Edit] [Dismiss]`
- If confirmed, task appears with source link back to the conversation
- Bulk extraction: "Kira, pull all action items from today's chat" → creates multiple tasks

#### Auto-extraction from Documents
When a document is uploaded to VDR:
- Agent scans for action items, TODOs, open questions
- Creates draft tasks linked to the document
- Shows in notification: "Found 3 potential tasks in 'Meeting Notes Q4.md'"

#### Goal Decomposition
When a goal is created:
- Agent proposes task breakdown: "To achieve [goal], I suggest these tasks..."
- User approves/edits/dismisses each
- Approved tasks auto-link to the goal

#### Smart Suggestions
Persistent subtle panel (collapsible) showing:
- "Based on your goals, these tasks should be next" (priority recommendation)
- "Task X has been in 'doing' for 5 days — still active?" (stale detection)
- "Tasks Y and Z seem related — should they be in the same project?" (organization)
- "You usually do [type] tasks on Mondays — want me to schedule these?" (pattern learning)

### 1.6 Agent as Assignee

Agents can be assigned tasks just like users:
- Agent picks up task, changes status to 'doing'
- Shows real-time progress in the activity feed
- Can create subtasks as it works
- Marks done when complete, adds summary comment
- If blocked, changes status and explains why
- User can interrupt: "Kira, stop working on task X" or "Kira, reprioritize"

---

## 2. Goal System

### 2.1 Goal Data Model

```typescript
interface Goal {
  id: string;
  title: string;
  description?: string;         // Markdown
  type: 'objective' | 'key_result';
  parentGoal?: string;          // for KR → Objective relationship
  targetMetric?: {
    name: string;               // e.g., "Revenue", "Users", "Tasks completed"
    target: number;
    current: number;
    unit: string;               // "$", "users", "%", etc.
    direction: 'increase' | 'decrease';
  };
  progress: number;             // 0-100, auto-calculated or manual
  progressSource: 'manual' | 'tasks' | 'metric' | 'key_results';
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved' | 'abandoned';
  deadline?: DateTime;
  linkedTasks: string[];
  linkedProjects: string[];
  linkedDocuments: string[];
  owner: string;                // user or agent
  checkIns: GoalCheckIn[];      // periodic progress updates
  milestones: Milestone[];
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface GoalCheckIn {
  id: string;
  timestamp: DateTime;
  author: string;
  progressDelta: number;
  note: string;                 // "Closed 3 deals this week"
  confidence: 'high' | 'medium' | 'low';  // will we hit the target?
}

interface Milestone {
  id: string;
  title: string;
  targetDate: DateTime;
  achieved: boolean;
  achievedAt?: DateTime;
}
```

### 2.2 OKR Structure

```
Objective: "Become the leading AI-native productivity platform"
├── KR1: "Reach 10,000 active users by Q2" (metric: users, target: 10000)
│   ├── Task: Launch beta program
│   ├── Task: Write 5 blog posts
│   └── Task: Set up referral system
├── KR2: "Ship 3 major features" (metric: features, target: 3)
│   ├── Task: Build knowledge graph
│   ├── Task: Build VDR
│   └── Task: Build task system
└── KR3: "Maintain <2s page load" (metric: seconds, target: 2, direction: decrease)
    ├── Task: Set up performance monitoring
    └── Task: Optimize database queries
```

- Objectives contain Key Results
- Key Results link to tasks
- Progress rolls up: task completion → KR progress → Objective progress
- Each level can also have manually-set progress

### 2.3 Progress Tracking

**Automatic tracking:**
- When `progressSource = 'tasks'`: progress = (completed linked tasks / total linked tasks) × 100
- When `progressSource = 'key_results'`: progress = average of child KR progress
- When `progressSource = 'metric'`: progress = (current / target) × 100

**Status auto-calculation:**
- `on_track`: progress ≥ expected progress for elapsed time
- `at_risk`: progress is 10-25% behind expected
- `behind`: progress is >25% behind expected
- Agent alerts when status changes: "Goal X just moved to 'at risk'"

**Check-ins:**
- Agent prompts weekly: "How's [goal] going? Any update?"
- User writes brief update, agent extracts progress delta
- Or agent auto-generates: "3 of 8 tasks completed this week, progress +15%"

### 2.4 Goal Decomposition (Agent)

When user creates a high-level goal:
1. Agent analyzes the goal against knowledge graph context
2. Proposes breakdown into Key Results (if Objective) or Tasks (if KR)
3. Suggests milestones and timeline
4. User approves/edits
5. Agent creates linked tasks, assigns estimates
6. Ongoing: agent monitors progress and suggests course corrections

Example:
> User: "I want to raise a Series A by June"
> Agent: "Here's my suggested breakdown:
> - KR1: Complete financial model (2 weeks) → [3 tasks]
> - KR2: Build investor pipeline of 30+ (4 weeks) → [5 tasks]  
> - KR3: Prepare pitch deck and data room (3 weeks) → [4 tasks]
> - KR4: Close term sheet (6 weeks) → [3 tasks]
> Shall I create these?"

### 2.5 Visualization

#### Progress Bars
- Horizontal bars with percentage, color-coded by status
- Nested: Objective bar contains KR segments
- Animated on updates

#### Trend Charts
- Line chart: progress over time vs. expected trajectory
- Shows check-in points as dots
- Projected completion date based on current velocity
- Red zone: area where goal becomes at-risk

#### Milestone Markers
- Diamond markers on timeline
- Green (achieved), gray (upcoming), red (missed)
- Hover shows milestone details

#### Goal Dashboard
- Grid of goal cards showing: title, progress ring, status color, deadline countdown
- Filterable by: time period, owner, status
- "Focus" view: just the goals that need attention (at-risk + behind)

---

## 3. Project Organization

### 3.1 Project Data Model

```typescript
interface Project {
  id: string;
  name: string;
  emoji?: string;               // visual identifier
  color: string;                // for tags, kanban swimlanes
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  owner: string;
  team: string[];               // user + agent IDs
  linkedGoals: string[];
  createdAt: DateTime;
  updatedAt: DateTime;
  settings: {
    defaultView: 'list' | 'kanban' | 'calendar' | 'timeline';
    defaultAssignee?: string;
    taskTemplate?: Partial<Task>;
  };
}
```

### 3.2 Project Home Page

Each project gets a dedicated page:

```
┌─────────────────────────────────────────────┐
│ 🚀 Series A Fundraise                      │
│ Status: Active • Owner: Otto • Due: Jun 2026│
├─────────────────────────────────────────────┤
│ [Overview] [Tasks] [Goals] [Docs] [Timeline]│
├─────────────────────────────────────────────┤
│                                             │
│ OVERVIEW TAB:                               │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ │ 12 Tasks│ │ 3 Goals │ │ 8 Docs  │       │
│ │ 5 done  │ │ 67% avg │ │ 2 new   │       │
│ └─────────┘ └─────────┘ └─────────┘       │
│                                             │
│ Recent Activity:                            │
│ • Kira completed "Draft financial model"    │
│ • Otto added "Q4 Revenue Report.pdf"        │
│ • Kira suggested 2 new tasks                │
│                                             │
│ Agent Insights:                             │
│ "3 tasks are blocked. The pitch deck hasn't │
│  been updated in 2 weeks. Investor list has │
│  12 entries — goal target is 30."           │
└─────────────────────────────────────────────┘
```

### 3.3 Cross-Project Dashboard

The main `/dashboard` view:

```
┌───────────────────────────────────────────────────┐
│ Good morning, Otto                     Wed Feb 11 │
├───────────────────────────────────────────────────┤
│                                                   │
│ TODAY'S FOCUS (agent-curated)                     │
│ ┌─────────────────────────────────────────┐      │
│ │ 🔴 P0: Review term sheet (due today)    │      │
│ │ 🟡 P1: Update pitch deck financials     │      │
│ │ 🟡 P1: Reply to Investor X email        │      │
│ └─────────────────────────────────────────┘      │
│                                                   │
│ PROJECTS                                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ │🚀 Series A│ │📱 Product │ │📊 Ops    │          │
│ │ 67% done │ │ 45% done │ │ 82% done │          │
│ │ 2 blocked│ │ 0 blocked│ │ 1 blocked│          │
│ └──────────┘ └──────────┘ └──────────┘          │
│                                                   │
│ AGENT ACTIVITY (live)                             │
│ 🤖 Kira is researching competitor pricing...      │
│ 🤖 Kira completed "Summarize board deck" 5m ago  │
│                                                   │
│ GOALS AT RISK                                     │
│ ⚠️ "30 investor pipeline" — 40% with 3 weeks left│
└───────────────────────────────────────────────────┘
```

### 3.4 Agent Autonomy in Projects

Agents can autonomously:
- Create tasks when they identify work needed
- Reorganize tasks between projects (with notification)
- Update task status as they work
- Add documents to project when generated
- Flag risks: "This project has no tasks due this week but the deadline is in 2 weeks"
- Suggest project creation: "These 5 tasks seem related — create a project?"

---

## 4. Live Data & Real-Time Updates

### 4.1 SSE Architecture

```
Client ←──SSE──── API Server ←──events──── Agent Runtime
                       ↑
                  In-process event emitter (EventEmitter / BroadcastChannel)
```

Events streamed to client:
- `task.created`, `task.updated`, `task.deleted`
- `goal.progress_changed`, `goal.status_changed`
- `agent.started_task`, `agent.completed_task`, `agent.blocked`
- `agent.suggestion` (new smart suggestion)
- `project.updated`

### 4.2 Agent Activity Feed

Persistent sidebar component (collapsible):
```
AGENT ACTIVITY
──────────────
🔵 NOW: Researching "AI market size 2026"
   └─ For task: "Market analysis section"
   └─ 2 sources found so far...

✅ 5m ago: Completed "Draft exec summary"
   └─ Added to VDR: /Series A/Pitch Deck/exec-summary.md

💡 12m ago: Suggestion
   └─ "The financial model uses 2024 data.
      Want me to update projections to 2026?"
   └─ [Accept] [Dismiss] [Discuss]

⚠️ 1h ago: Blocked on "Get Cap Table"
   └─ "I need access to Carta or a CSV export"
```

### 4.3 Notifications

**In-app:**
- Bell icon with unread count
- Notification panel: grouped by project
- Click to navigate to relevant task/goal

**Priority levels:**
- 🔴 Urgent: P0 task overdue, goal fell behind, agent blocked and needs input
- 🟡 Important: task completed, goal milestone reached, agent suggestion
- ⚪ Info: status changes, new tasks created by agent

**External (optional):**
- Telegram message for urgent items
- Daily digest: summary of all changes

### 4.4 Optimistic Updates

- All mutations update UI immediately (optimistic)
- Server confirmation reconciles within ~100ms
- Conflict resolution: last-write-wins for simple fields, merge for lists
- Offline queue: changes made offline replay when connection restored

---

## 5. Keyboard Shortcuts

Global:
- `Cmd+K` → Command palette (search tasks, goals, navigate, run actions)
- `Cmd+N` → New task
- `Cmd+Shift+N` → New goal
- `Cmd+/` → Toggle agent chat panel

In task views:
- `j/k` → Navigate up/down
- `Enter` → Open/expand task
- `Space` → Toggle task status
- `x` → Select task
- `p` then `0-3` → Set priority
- `a` → Assign
- `t` → Add tag
- `d` → Set due date
- `#` → Move to project
- `Esc` → Close/deselect

---

## 6. Data Sources & API

> **v1.0: SQLite. Migration path to PostgreSQL documented in cost/scalability.md**

All task/goal data lives in SQLite with the following access pattern:

```
Dashboard UI ──REST/tRPC──→ API Server ──better-sqlite3──→ SQLite
     ↑                          ↑
     └──────SSE────────────────┘
     
Agent Runtime ──internal API──→ Same SQLite (WAL mode for concurrent reads)
```

Key endpoints:
- `GET /api/tasks` — list with filters, pagination, sorting
- `POST /api/tasks` — create (user or agent)
- `PATCH /api/tasks/:id` — update fields
- `POST /api/tasks/bulk` — bulk operations
- `GET /api/goals` — list with progress calculation
- `GET /api/projects/:id/overview` — project dashboard data
- `GET /api/dashboard` — cross-project summary
- `SSE /api/events` — real-time event stream
