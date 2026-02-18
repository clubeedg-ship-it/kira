# KIRA — Standard Operating Procedure Engine
## The Deterministic Blueprint Layer

> **Version:** 0.1.0
> **Date:** 2026-02-18
> **Status:** Design Specification
> **Purpose:** Define the hierarchical execution data model that sits between Kira's AI capabilities and its task/goal execution layer.

---

## 1. The Problem

Kira has excellent AI plumbing — 4-layer memory, sub-agent spawning, conversation mining, task-gathering from documents. But the data model these feed into is flat: a `tasks` table and a `goals` table with no hierarchy, no relationships, no agent ownership, no dependency graph, and no classification of what requires human input versus what agents can execute autonomously.

This document defines the **Operating System Data Model** — a composable framework drawing from GTD, P.A.R.A., OKRs, EOS, and Dalio's Principles-based approach. The design is deterministic first, AI-enhanced second: if you stripped away every AI feature, the data model alone should be a functional project management and life operating system.

---

## 2. The Hierarchy (Five Layers)

Every entity in the system lives at one of five layers. Each layer has exactly one parent type (except L0) and can contain children from the layer below.

```
L0  VISION           Why do I exist? Where am I going?
 │                   Horizon: 5-25 years. Never "completes."
 │
L1  AREAS            What am I responsible for?
 │                   Ongoing domains. Health, Business-X, Relationships.
 │                   These never complete — they have a "standard" to maintain.
 │
L2  OBJECTIVES       What do I want to achieve this quarter?
 │                   Time-bounded (default: 12 weeks). Has Key Results.
 │                   Maps to OKRs / EOS Rocks / 12-Week-Year goals.
 │
L3  PROJECTS         What bounded work will achieve the objective?
 │                   Has a deliverable, owner (human or agent), deadline, status.
 │                   Decomposes into milestones.
 │
L4  TASKS            What's the next physical action?
 │                   Atomic. Has context, energy level, duration estimate.
 │                   Classified: agent-executable vs human-required.
```

### Why This Matters

- **Every task traces upward.** If a task doesn't connect to a project → objective → area → vision, it's either misclassified or shouldn't exist.
- **Agent assignment happens at L3.** Projects have owners. An agent owns a project the same way a team lead would.
- **Review cadence maps to layers.** Daily = L4. Weekly = L3. Monthly = L2. Quarterly = L1-L2. Annual = L0.

---

## 3. Data Model (SQLite)

### 3.1 Core Hierarchy

```sql
-- ============================================
-- L0: VISION
-- ============================================
CREATE TABLE vision (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  statement   TEXT NOT NULL,
  horizon     TEXT DEFAULT '10y',
  notes       TEXT,
  status      TEXT DEFAULT 'active',
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- L1: AREAS OF RESPONSIBILITY
-- ============================================
CREATE TABLE areas (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  vision_id   TEXT REFERENCES vision(id),
  name        TEXT NOT NULL,
  description TEXT,
  standard    TEXT,
  icon        TEXT,
  sort_order  REAL DEFAULT 0,
  status      TEXT DEFAULT 'active',
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- L2: OBJECTIVES (Quarterly)
-- ============================================
CREATE TABLE objectives (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  area_id     TEXT NOT NULL REFERENCES areas(id),
  title       TEXT NOT NULL,
  description TEXT,
  quarter     TEXT NOT NULL,
  status      TEXT DEFAULT 'active',
  progress    INTEGER DEFAULT 0,
  start_date  TEXT,
  end_date    TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE key_results (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  objective_id TEXT NOT NULL REFERENCES objectives(id),
  title        TEXT NOT NULL,
  metric_type  TEXT DEFAULT 'number',
  target_value REAL NOT NULL,
  current_value REAL DEFAULT 0,
  unit         TEXT,
  status       TEXT DEFAULT 'active',
  sort_order   REAL DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- L3: PROJECTS
-- ============================================
CREATE TABLE projects (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  objective_id TEXT REFERENCES objectives(id),
  area_id      TEXT REFERENCES areas(id),
  title        TEXT NOT NULL,
  description  TEXT,
  owner_type   TEXT DEFAULT 'human',
  owner_id     TEXT,
  status       TEXT DEFAULT 'planning',
  priority     INTEGER DEFAULT 2,
  deadline     TEXT,
  tags         TEXT,
  sort_order   REAL DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE milestones (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  project_id  TEXT NOT NULL REFERENCES projects(id),
  title       TEXT NOT NULL,
  description TEXT,
  deadline    TEXT,
  status      TEXT DEFAULT 'pending',
  sort_order  REAL DEFAULT 0,
  completed_at TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- L4: TASKS
-- ============================================
CREATE TABLE tasks (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  project_id    TEXT REFERENCES projects(id),
  milestone_id  TEXT REFERENCES milestones(id),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'todo',
  priority      INTEGER DEFAULT 2,
  
  -- EXECUTION CLASSIFICATION
  executor_type TEXT DEFAULT 'human',
  executor_id   TEXT,
  requires_input TEXT DEFAULT 'no',
  
  -- SCHEDULING
  due_date      TEXT,
  scheduled_date TEXT,
  time_block_id TEXT REFERENCES time_blocks(id),
  duration_est  INTEGER,
  
  -- GTD CONTEXT
  context       TEXT,
  energy        TEXT DEFAULT 'medium',
  
  -- METADATA
  source        TEXT,
  source_ref    TEXT,
  tags          TEXT,
  sort_order    REAL DEFAULT 0,
  
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  completed_at  TEXT
);

-- ============================================
-- DEPENDENCIES (DAG between tasks/projects)
-- ============================================
CREATE TABLE dependencies (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  blocker_type  TEXT NOT NULL,
  blocker_id    TEXT NOT NULL,
  blocked_type  TEXT NOT NULL,
  blocked_id    TEXT NOT NULL,
  dep_type      TEXT DEFAULT 'finish_to_start',
  created_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(blocker_id, blocked_id)
);
```

### 3.2 Agent System

```sql
CREATE TABLE agents (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,
  description TEXT,
  model       TEXT DEFAULT 'claude-sonnet-4-5',
  status      TEXT DEFAULT 'idle',
  can_execute  TEXT,
  autonomy     TEXT DEFAULT 'checkpoint',
  area_ids    TEXT,
  max_concurrent INTEGER DEFAULT 3,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE agent_work_log (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  agent_id    TEXT NOT NULL REFERENCES agents(id),
  task_id     TEXT REFERENCES tasks(id),
  project_id  TEXT REFERENCES projects(id),
  action      TEXT NOT NULL,
  details     TEXT,
  output_ref  TEXT,
  duration_ms INTEGER,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE input_queue (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  task_id      TEXT REFERENCES tasks(id),
  agent_id     TEXT REFERENCES agents(id),
  queue_type   TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  options      TEXT,
  deliverable  TEXT,
  area_id      TEXT REFERENCES areas(id),
  priority     INTEGER DEFAULT 2,
  status       TEXT DEFAULT 'pending',
  scheduled_for TEXT,
  resolved_at  TEXT,
  resolution   TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);
```

### 3.3 Time System

```sql
CREATE TABLE time_blocks (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  area_id     TEXT REFERENCES areas(id),
  title       TEXT NOT NULL,
  block_type  TEXT DEFAULT 'work',
  day_of_week INTEGER,
  start_time  TEXT,
  end_time    TEXT,
  is_recurring INTEGER DEFAULT 1,
  specific_date TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE reviews (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  review_type TEXT NOT NULL,
  scheduled   TEXT NOT NULL,
  status      TEXT DEFAULT 'pending',
  insights    TEXT,
  decisions   TEXT,
  completed_at TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);
```

### 3.4 Knowledge & Decisions (Dalio-style)

```sql
CREATE TABLE principles (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  area_id     TEXT REFERENCES areas(id),
  domain      TEXT NOT NULL,
  rule        TEXT NOT NULL,
  rationale   TEXT,
  examples    TEXT,
  confidence  REAL DEFAULT 0.7,
  source      TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE decisions (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  title         TEXT NOT NULL,
  context       TEXT NOT NULL,
  principle_id  TEXT REFERENCES principles(id),
  options       TEXT,
  chosen        TEXT NOT NULL,
  reasoning     TEXT,
  outcome       TEXT,
  outcome_date  TEXT,
  project_id    TEXT REFERENCES projects(id),
  created_at    TEXT DEFAULT (datetime('now'))
);
```

### 3.5 Indexes

```sql
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_executor ON tasks(executor_type, executor_id);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_scheduled ON tasks(scheduled_date);
CREATE INDEX idx_projects_objective ON projects(objective_id);
CREATE INDEX idx_projects_area ON projects(area_id);
CREATE INDEX idx_projects_owner ON projects(owner_type, owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_objectives_area ON objectives(area_id);
CREATE INDEX idx_objectives_quarter ON objectives(quarter);
CREATE INDEX idx_key_results_objective ON key_results(objective_id);
CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_dependencies_blocker ON dependencies(blocker_id);
CREATE INDEX idx_dependencies_blocked ON dependencies(blocked_id);
CREATE INDEX idx_input_queue_status ON input_queue(status);
CREATE INDEX idx_input_queue_area ON input_queue(area_id);
CREATE INDEX idx_agent_work_log_agent ON agent_work_log(agent_id);
CREATE INDEX idx_agent_work_log_task ON agent_work_log(task_id);
CREATE INDEX idx_reviews_type_status ON reviews(review_type, status);
CREATE INDEX idx_time_blocks_area ON time_blocks(area_id);
CREATE INDEX idx_time_blocks_day ON time_blocks(day_of_week);
CREATE INDEX idx_decisions_principle ON decisions(principle_id);
```

---

## 4. The Machine: How It Runs

### 4.1 The Operating Rhythm

```
06:00  DAILY STARTUP (agent-driven)
       ├── Pull today's scheduled tasks
       ├── Check input_queue for pending items
       ├── Check dependencies: did any blockers clear overnight?
       ├── Generate "Top 3" priorities (weighted: deadline × blocking × priority)
       ├── Check agent work log: what completed while you slept?
       └── Present Morning Brief

       THROUGHOUT DAY
       ├── Tasks flow through: todo → in_progress → review → done
       ├── Agents work their assigned tasks autonomously
       ├── When agents hit 'verify'/'decide' items → input_queue
       ├── User processes input_queue during scheduled time_blocks
       └── New tasks captured from conversations → classified → placed in hierarchy

20:00  DAILY CLOSE (agent-driven)
       ├── Summarize: tasks completed, tasks remaining
       ├── Update key_results with new metrics
       ├── Move unfinished scheduled tasks → tomorrow or re-prioritize
       ├── Log to reviews table (daily type)
       └── Queue tomorrow's tasks

FRIDAY WEEKLY REVIEW (agent-assisted, human-led)
       ├── All projects: status check (on track / at risk / blocked)
       ├── Input queue: anything stale? Escalate or dismiss
       ├── Dependencies: any bottlenecks forming?
       ├── Principles: any decisions this week that should become principles?
       ├── Next week: pre-schedule time blocks, assign agent work
       └── Log to reviews table (weekly type)

QUARTER-END QUARTERLY PLANNING
       ├── Score outgoing objectives (completed / failed / deferred)
       ├── Review areas: any new area? Any area to archive?
       ├── Set new objectives + key results for next quarter
       ├── Decompose objectives into projects
       ├── Assign project owners (human or agent)
       └── Log to reviews table (quarterly type)
```

### 4.2 Task Classification Engine

```
NEW TASK CAPTURED
    │
    ├─→ Does it have a clear project?
    │   ├── YES → Assign to project
    │   └── NO  → Place in INBOX (project_id = NULL)
    │            Agent proposes project assignment in input_queue
    │
    ├─→ Can an agent do this?
    │   ├── Pattern: "research X"          → executor_type = 'agent', requires_input = 'verify'
    │   ├── Pattern: "draft email to X"    → executor_type = 'agent', requires_input = 'verify'
    │   ├── Pattern: "compare options for" → executor_type = 'agent', requires_input = 'decide'
    │   ├── Pattern: "call/meet/negotiate" → executor_type = 'human', requires_input = 'create'
    │   ├── Pattern: "setup/configure X"   → executor_type = 'agent', requires_input = 'verify'
    │   ├── Pattern: "design/create X"     → executor_type = 'ambiguous'
    │   └── DEFAULT                        → executor_type = 'human'
    │
    ├─→ Priority scoring:
    │   score = (deadline_urgency × 3) + (blocking_count × 2) + (explicit_priority × 1)
    │
    └─→ Scheduling:
        If agent-executable → immediately assign to agent
        If human-required → schedule into next available time_block
        If ambiguous → enter input_queue for human classification
```

### 4.3 Agent Orchestration Model

```
┌─────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT (Kira COO)         │
│                                                           │
│  Responsibilities:                                        │
│  - Morning brief generation                              │
│  - Task classification and routing                       │
│  - Input queue management                                │
│  - Review cadence enforcement                            │
│  - Agent assignment and load balancing                   │
│  - Escalation handling                                   │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
    │RESEARCH │    │ COMMS   │    │  CODE   │
    │ AGENT   │    │ AGENT   │    │ AGENT   │
    └────┬────┘    └────┬────┘    └────┬────┘
         │               │               │
         ▼               ▼               ▼
    ┌─────────────────────────────────────────┐
    │          AGENT WORK CYCLE               │
    │                                          │
    │  1. Pick highest-priority assigned task  │
    │  2. Check dependencies (all clear?)      │
    │  3. Execute task                         │
    │  4. Save output to VDR                   │
    │  5. Log to agent_work_log                │
    │  6. If requires_input != 'no':           │
    │     → Create input_queue entry           │
    │     → Task status = 'waiting'            │
    │  7. If requires_input == 'no':           │
    │     → Task status = 'done'               │
    │  8. Check: did this unblock anything?    │
    │  9. Pick next task                       │
    └─────────────────────────────────────────┘
```

### 4.4 The Input Queue (Your Control Surface)

The **single place** where everything that needs your attention surfaces.

```
┌─────────────────────────────────────────────────────────┐
│  INPUT QUEUE                                    Feb 18  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🔴 VERIFY (Agent did the work, you approve)             │
│  ├── Research: Best email platform for client X          │
│  │   Agent: research-agent │ Output: /vdr/research/...  │
│  │   [Approve] [Redo] [Edit] [Dismiss]                  │
│  │                                                       │
│  🟡 DECIDE (Agent presents options, you choose)          │
│  ├── Pricing: 3 options for receptionist monthly plan    │
│  │   Option A: €49/mo │ B: €79/mo │ C: €59/mo + setup  │
│  │   [A] [B] [C] [Need more info] [Defer]              │
│  │                                                       │
│  🟢 CREATE (Only you can do this)                        │
│  ├── Call: Follow up with dentist lead                   │
│  │   Scheduled: Today 14:00-14:30 (Sales time block)    │
│  │   [Done] [Reschedule] [Delegate]                     │
│  │                                                       │
│  ⚪ CLASSIFY (Ambiguous — help the system learn)         │
│  ├── "Update landing page copy" — agent or human?        │
│  │   [Agent can draft] [I'll do it] [Split it]          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 5. End-to-End Example

**User says:** "I want to set up email sales for a client"

1. **Conversation mining** detects goal with implicit decomposition
2. **Orchestrator** creates hierarchy: Objective → Project → 4 Milestones → 12 Tasks
3. **Classification** assigns executor types (agent/human/ambiguous)
4. **Agents start immediately** on Milestone 1 (no dependencies)
5. **Input queue** surfaces completed research for human review
6. **Human approves** → dependencies cascade → Milestone 2 unblocks
7. **Parallel execution** — agents work Milestone 3 while human does Milestone 2

---

## 6. Integration Points

- **Tasks/Goals:** Flat tables replaced by this hierarchy
- **Operating Framework:** Priority stack becomes function of area weights + dependency graph
- **Memory:** Knowledge graph enriched with principles, decisions, project context
- **Agent System:** Sub-agents map to agents table, work log replaces informal tracking
- **Dashboard:** Input queue becomes THE primary view (80% of time spent here)

---

## 7. What Makes This "Deterministic"

1. **What to work on next** — Priority scoring formula produces deterministic ordering
2. **Who does what** — Executor classification is rule-based first, AI-enhanced second
3. **When things happen** — Review cadence is fixed (Friday = weekly review)
4. **How decisions are made** — Principles table means recurring decisions don't require fresh thinking
5. **Where things go** — Every output has a home: VDR, input_queue, agent_work_log

The AI makes all of this 10x faster. But strip the AI away and you still have a functioning project management system.

---

## 8. Implementation Order

1. Schema migration — Replace flat tasks/goals with hierarchy
2. Seed data — Create vision, areas, current objectives
3. Classification engine — Wire task-gathering to classifier
4. Input queue — Build dashboard view (daily driver)
5. Agent registry — Register sub-agents in agents table
6. Review cadence — Auto-create reviews, build templates
7. Time blocks — Model weekly schedule
8. Dependencies — Wire up DAG and cascade logic
9. Principles — Start capturing decisions as principles
10. Decision log — Track outcomes, feed back into confidence