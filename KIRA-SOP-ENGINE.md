# KIRA — Standard Operating Procedure Engine
## The Deterministic Blueprint Layer

> **Version:** 0.1.0
> **Date:** 2026-02-18
> **Status:** Design Specification
> **Purpose:** Define the hierarchical execution data model that sits between Kira's AI capabilities and its task/goal execution layer.

---

## 1. The Problem

Kira has excellent AI plumbing — 4-layer memory, sub-agent spawning, conversation mining, task-gathering from documents. But the data model these feed into is flat: a `tasks` table and a `goals` table with no hierarchy, no relationships, no agent ownership, no dependency graph, and no classification of what requires human input versus what agents can execute autonomously.

This document defines the **Operating System Data Model** — a composable framework drawing from GTD, P.A.R.A., OKRs, EOS, and Dalio's Principles-based approach.

---

## 2. The Hierarchy (Five Layers)

```
L0  VISION           Why do I exist? Where am I going? (5-25 years)
L1  AREAS            What am I responsible for? (ongoing domains)
L2  OBJECTIVES       What do I want to achieve this quarter? (time-bounded)
L3  PROJECTS         What bounded work will achieve the objective?
L4  TASKS            What's the next physical action? (atomic)
```

- Every task traces upward. Orphan tasks are the #1 productivity killer.
- Agent assignment happens at L3. Projects have owners.
- Review cadence maps to layers: Daily=L4, Weekly=L3, Monthly=L2, Quarterly=L1-L2, Annual=L0.

---

## 3. Data Model (SQLite)

### 3.1 Core Hierarchy

```sql
-- L0: VISION
CREATE TABLE vision (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  statement   TEXT NOT NULL,
  horizon     TEXT DEFAULT '10y',
  notes       TEXT,
  status      TEXT DEFAULT 'active',
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- L1: AREAS OF RESPONSIBILITY
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

-- L2: OBJECTIVES (Quarterly)
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

-- L3: PROJECTS
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

-- L4: TASKS
CREATE TABLE tasks (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  project_id    TEXT REFERENCES projects(id),
  milestone_id  TEXT REFERENCES milestones(id),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'todo',
  priority      INTEGER DEFAULT 2,
  executor_type TEXT DEFAULT 'human',
  executor_id   TEXT,
  requires_input TEXT DEFAULT 'no',
  due_date      TEXT,
  scheduled_date TEXT,
  time_block_id TEXT REFERENCES time_blocks(id),
  duration_est  INTEGER,
  context       TEXT,
  energy        TEXT DEFAULT 'medium',
  source        TEXT,
  source_ref    TEXT,
  tags          TEXT,
  sort_order    REAL DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  completed_at  TEXT
);

-- DEPENDENCIES (DAG)
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

### 3.4 Knowledge & Decisions

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

### 4.1 Operating Rhythm

```
06:00  DAILY STARTUP (agent-driven)
       - Pull today's scheduled tasks
       - Check input_queue for pending items
       - Check dependencies: did any blockers clear?
       - Generate Top 3 priorities (weighted scoring)
       - Check agent work log: overnight completions
       - Present Morning Brief

       THROUGHOUT DAY
       - Tasks flow: todo -> in_progress -> review -> done
       - Agents work assigned tasks autonomously
       - verify/decide items -> input_queue
       - User processes input_queue during time_blocks
       - New tasks captured -> classified -> placed in hierarchy

20:00  DAILY CLOSE (agent-driven)
       - Summarize completions and remaining
       - Update key_results with new metrics
       - Move unfinished tasks -> tomorrow
       - Log to reviews table

FRIDAY WEEKLY REVIEW (agent-assisted, human-led)
       - All projects: status check
       - Input queue: anything stale?
       - Dependencies: bottlenecks?
       - Principles: decisions -> principles?
       - Next week: schedule time blocks, assign agents

QUARTER-END PLANNING
       - Score outgoing objectives
       - Set new objectives + key results
       - Decompose into projects
       - Assign owners (human or agent)
```

### 4.2 Task Classification Engine

```
NEW TASK CAPTURED
  |
  +-> Clear project? YES -> assign / NO -> Inbox (agent proposes)
  +-> Agent-executable?
  |   research -> agent, requires_input: verify
  |   draft -> agent, requires_input: verify
  |   compare -> agent, requires_input: decide
  |   call/meet -> human, requires_input: create
  |   ambiguous -> input_queue for classification
  |
  +-> Priority score:
  |   (deadline_urgency x 3) + (blocking_count x 2.5)
  |   + (explicit_priority x 1.5) + (area_weight x 1.0)
  |
  +-> Scheduling:
      agent-executable -> assign immediately
      human-required -> next available time_block
      ambiguous -> input_queue
```

### 4.3 Agent Orchestration

Orchestrator (Kira COO) assigns work to specialist agents (research, comms, code). Each agent follows the work cycle:

1. Pick highest-priority assigned task
2. Check dependencies (all clear?)
3. Execute task
4. Save output to VDR
5. Log to agent_work_log
6. If requires_input != 'no': create input_queue entry, task -> 'waiting'
7. If requires_input == 'no': task -> 'done'
8. Check: did this unblock anything?
9. Pick next task

### 4.4 The Input Queue

The single place where everything needing human attention surfaces:

- **VERIFY** — Agent did the work, you approve/redo/edit
- **DECIDE** — Agent presents options, you choose
- **CREATE** — Only you can do this (calls, meetings, creative work)
- **CLASSIFY** — Ambiguous items needing human categorization

---

## 5. Integration Points

- **Replaces:** `design-v2/10-tasks-goals.md` flat schema
- **Memory:** Knowledge graph enriched with principles, decisions, project context
- **Agents:** Sub-agent sessions tagged with agent_id and task_id
- **Dashboard:** Input queue becomes the primary view (80% of daily interaction)

---

## 6. What Makes This "Deterministic"

1. **What to work on next** — Priority scoring formula produces deterministic ordering
2. **Who does what** — Executor classification is rule-based first, AI-enhanced second
3. **When things happen** — Review cadence is fixed (Friday=weekly, quarter-end=planning)
4. **How decisions are made** — Principles table means recurring decisions follow rules
5. **Where things go** — Every output has a home: VDR, input_queue, or agent_work_log

The AI makes all of this 10x faster. But strip the AI away and you still have a functioning project management system.

---

## 7. Implementation Order

1. Schema migration (replace flat tasks/goals)
2. Seed data (vision, areas, current objectives)
3. Classification engine (task-gathering -> classifier)
4. Input queue (dashboard view — daily driver)
5. Agent registry (register sub-agents)
6. Review cadence (auto-create reviews)
7. Time blocks (model weekly schedule)
8. Dependencies (DAG + cascade logic)
9. Principles (capture decisions as principles)
10. Decision log (track outcomes, feed back to confidence)

---

*This is the layer Kira is missing. Everything else — memory, agents, gamification, widgets — is enhancement on top of this foundation. Build the machine first. Then make it intelligent.*
