# Darwin Gödel Machine — Self-Improvement Loop

> Kira agents that measurably improve themselves over time through empirical evolution, not theoretical proofs.
> Date: 2026-02-12
> Based on: "Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents" (Zhang, Hu, Lu, Lange, Clune — UBC/Sakana AI, 2025)

---

## Overview

The DGM-lite system gives Kira agents the ability to:
1. Log every significant task outcome (success/failure/partial)
2. Analyze failure patterns across time
3. Use LLM to propose concrete improvements to their own configuration
4. Test improvements in sandboxed environments
5. Merge validated improvements into production
6. Maintain a branching tree of configurations (like biological evolution)

This is **not** unconstrained self-modification. All changes are:
- Limited to a whitelist of modifiable files
- Validated in sandbox before production
- Risk-assessed (low=auto-merge, medium/high=human approval)
- Git-committed with full rollback capability
- Archived in a traceable lineage tree

---

## Theoretical Foundation

### Original Gödel Machine (Schmidhuber, 2003)
A theoretical self-improving AI that rewrites its own code, but only after mathematically **proving** each change is beneficial. Problem: proving most changes are beneficial is computationally intractable.

### Darwin Gödel Machine (Zhang et al., 2025)
Replaces mathematical proofs with **empirical validation**:
- Maintain an archive (population) of agent variants
- Each variant is a complete codebase
- New variants are created by sampling a parent and using an LLM to propose modifications
- Variants are tested on benchmarks
- Successful variants join the archive
- The archive grows as a tree, enabling parallel exploration of diverse strategies

**Key result**: SWE-bench 20% → 50%, Polyglot 14% → 30%.

### DGM-lite (Kira adaptation)
We adapt DGM for agent configuration evolution:
- **Population** = archive of configuration states (AGENTS.md, SOUL.md, HEARTBEAT.md, etc.)
- **Mutation** = LLM-proposed changes based on failure pattern analysis
- **Fitness function** = empirical task performance (success rate, speed, quality)
- **Selection** = only validated improvements merge into production
- **Tree** = full lineage tracking enables rollback and branching

---

## Architecture

```
                    ┌────────────────────┐
                    │   Task Execution   │
                    │  (normal agent     │
                    │   operations)      │
                    └────────┬───────────┘
                             │ outcomes
                             ▼
                    ┌────────────────────┐
                    │    Task Logger     │
                    │  (SQLite: tasks)   │
                    └────────┬───────────┘
                             │ accumulated data
                             ▼
                    ┌────────────────────┐
                    │  Pattern Analyzer  │
                    │ (failure clusters, │
                    │  severity scoring) │
                    └────────┬───────────┘
                             │ patterns + focus areas
                             ▼
                    ┌────────────────────┐
                    │ Improvement        │
                    │ Proposer (LLM)     │
                    │ "Given these       │
                    │  failures, what    │
                    │  config changes    │
                    │  would help?"      │
                    └────────┬───────────┘
                             │ proposals (exact diffs)
                             ▼
                    ┌────────────────────┐
                    │ Sandbox Evaluator  │
                    │ (copy config,      │
                    │  apply changes,    │
                    │  run task bank)    │
                    └────────┬───────────┘
                             │ pass/fail + scores
                             ▼
                    ┌────────────────────┐
                    │     Merger         │
                    │ (apply to prod,    │
                    │  git commit,       │
                    │  archive entry)    │
                    └────────┬───────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │  Config Archive    │
                    │  (DGM tree)        │
                    │                    │
                    │  root              │
                    │   ├── v1           │
                    │   │   ├── v1.1     │
                    │   │   └── v1.2     │
                    │   └── v2           │
                    │       └── v2.1     │
                    └────────────────────┘
```

---

## Components

### 1. Task Logger

Records every significant agent action with structured metadata.

```typescript
interface TaskLog {
  id: number;
  timestamp: string;          // ISO 8601
  task: string;               // "Fix IAM website WhatsApp buttons"
  outcome: 'success' | 'failure' | 'partial';
  category: string;           // code, outreach, research, content, memory, communication, planning, infrastructure, meta
  duration_seconds?: number;
  notes?: string;             // What went wrong or right
  improvement_id?: number;    // FK to proposal that caused this (for tracking improvement impact)
  session_key?: string;
}
```

**Categories:**

| Category | What It Covers |
|----------|---------------|
| `code` | File edits, git operations, sub-agent coding tasks |
| `outreach` | Sending messages, emails, social media posts |
| `research` | Web search, paper analysis, market research |
| `content` | Writing content, creating documents, LinkedIn posts |
| `memory` | Memory operations, context retrieval, graph maintenance |
| `communication` | Telegram/Discord messaging, platform interactions |
| `planning` | Task breakdown, strategy, scheduling |
| `infrastructure` | Server ops, PM2, daemon management |
| `meta` | Self-improvement actions, config changes |

**CLI:**
```bash
node scripts/self-improve/index.js log \
  --task "Fix IAM website" \
  --outcome success \
  --category code \
  --duration 120 \
  --notes "Sub-agent handled all changes"
```

**API:**
```typescript
// POST /api/self-improve/log
interface LogRequest {
  task: string;
  outcome: 'success' | 'failure' | 'partial';
  category: string;
  duration?: number;
  notes?: string;
}
```

### 2. Pattern Analyzer

Reads accumulated task logs, groups failures by category, computes severity.

```typescript
interface FailurePattern {
  category: string;
  failure_count: number;
  total_in_category: number;
  failure_rate: string;         // "33.3%"
  severity: 'low' | 'medium' | 'high';  // ≥5=high, ≥3=medium, else low
  examples: Array<{
    task: string;
    notes: string;
    timestamp: string;
  }>;
}

interface FocusArea {
  category: string;
  priority: string;
  reason: string;               // "5 failures (45% rate) in last 7 days"
  sample_issues: string[];
}

interface Analysis {
  id: number;
  timestamp: string;
  period_days: number;
  total_tasks: number;
  failure_count: number;
  patterns: FailurePattern[];
  focus_areas: FocusArea[];
}
```

**Triggering:**
- Automatically: weekly cron (Sunday 7am CET)
- Manually: `node scripts/self-improve/index.js analyze --days 7`
- Via API: `POST /api/self-improve/analyze`

### 3. Improvement Proposer

Takes analysis results, feeds them to an LLM along with current configuration files, and receives concrete diffs.

```typescript
interface Proposal {
  id: number;
  timestamp: string;
  analysis_id: number;
  description: string;          // "Add retry logic for Telegram message sending"
  target_files: string[];       // ["AGENTS.md"]
  changes: {
    type: 'replace' | 'append';
    old_text?: string;          // Exact text to find (for replace)
    new_text: string;           // New content
  };
  expected_improvement: string; // "Reduce communication failures by ~30%"
  risk: 'low' | 'medium' | 'high';
  status: 'draft' | 'testing' | 'validated' | 'merged' | 'rejected';
  rejection_reason?: string;
  parent_config_hash: string;   // SHA-256 of config at proposal time
}
```

**Modifiable files (whitelist):**
```
AGENTS.md, HEARTBEAT.md, TOOLS.md, SOUL.md,
scripts/self-improve/task-bank.js,
scripts/context-summary.js,
scripts/memory/index.js
```

No other files can be modified by the self-improvement loop. This is a hard security boundary.

**LLM selection:**
- Default: local `qwen3:14b` (fast, free, private)
- Option: Claude via API (higher quality proposals, costs tokens)

### 4. Sandbox Evaluator

Tests proposals without touching production.

**Process:**
1. Copy target files to temp directory
2. Apply proposed changes
3. Run basic validation:
   - File not empty after changes
   - Changes actually applied
   - JSON files parse correctly
4. If task bank has entries: run evaluation tasks against baseline and modified config
5. Compare scores: pass if modified ≥ 90% of baseline (no regression) AND improvement ≥ 0%

```typescript
interface Evaluation {
  id: number;
  timestamp: string;
  proposal_id: number;
  baseline_score: number;
  modified_score: number;
  improvement_pct: number;
  passed: boolean;
  runs: number;
  details: {
    baseline_scores: number[];
    modified_scores: number[];
    tasks_run: number;
  };
}
```

### 5. Merger

Applies validated proposals to production files.

**Process:**
1. Verify proposal status = `validated`
2. Check config hash matches (warn if config changed since proposal)
3. Apply changes to live files
4. Create git commit: `"self-improve: proposal #N — description"`
5. Create archive entry with full config snapshot
6. Update proposal status to `merged`

**Rollback:**
```bash
node scripts/self-improve/index.js archive --rollback <archive-id>
```
Restores all files to the state captured in that archive entry.

**Risk-based merge policy:**

| Risk | Policy |
|------|--------|
| `low` | Auto-merge during full cycle |
| `medium` | Merge but notify user |
| `high` | Require explicit user approval |

### 6. Config Archive (DGM Tree)

Every merged proposal creates an archive node:

```typescript
interface ArchiveEntry {
  id: number;
  timestamp: string;
  parent_id?: number;           // Previous archive entry (forms tree)
  proposal_id: number;
  config_hash: string;          // SHA-256 of all modifiable files
  config_snapshot: Record<string, string>;  // Full file contents
  performance_delta?: number;   // Measured improvement after merge
  description: string;
}
```

**Tree operations:**
- `archive --list` — Show all entries
- `archive --tree` — Visualize the evolution tree
- `archive --show <id>` — Full snapshot of a config state
- `archive --compare <id1> <id2>` — Diff two states
- `archive --rollback <id>` — Restore a previous state

### 7. Task Bank

Curated evaluation tasks for testing proposals:

```typescript
interface EvalTask {
  id: number;
  name: string;
  description: string;
  category: string;
  test_prompt: string;
  success_criteria: {
    type: 'completion';
    min_length?: number;
    must_contain?: string[];
  };
  difficulty: 'easy' | 'medium' | 'hard';
  enabled: boolean;
}
```

Default seed tasks cover: memory read, task planning, code review, research synthesis, error recovery.

---

## Database Schema

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  task TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'partial')),
  category TEXT NOT NULL,
  duration_seconds INTEGER,
  notes TEXT,
  improvement_id INTEGER REFERENCES proposals(id),
  session_key TEXT
);

CREATE TABLE analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  period_days INTEGER NOT NULL,
  total_tasks INTEGER NOT NULL,
  failure_count INTEGER NOT NULL,
  patterns TEXT NOT NULL,     -- JSON
  focus_areas TEXT NOT NULL   -- JSON
);

CREATE TABLE proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  analysis_id INTEGER REFERENCES analyses(id),
  description TEXT NOT NULL,
  target_files TEXT NOT NULL,  -- JSON array
  changes TEXT NOT NULL,       -- JSON
  expected_improvement TEXT NOT NULL,
  risk TEXT NOT NULL CHECK (risk IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'testing', 'validated', 'merged', 'rejected')),
  rejection_reason TEXT,
  parent_config_hash TEXT
);

CREATE TABLE evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  proposal_id INTEGER NOT NULL REFERENCES proposals(id),
  baseline_score REAL,
  modified_score REAL,
  improvement_pct REAL,
  passed INTEGER NOT NULL CHECK (passed IN (0, 1)),
  runs INTEGER NOT NULL DEFAULT 1,
  details TEXT               -- JSON
);

CREATE TABLE archive (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  parent_id INTEGER REFERENCES archive(id),
  proposal_id INTEGER REFERENCES proposals(id),
  config_hash TEXT NOT NULL,
  config_snapshot TEXT NOT NULL,  -- JSON
  performance_delta REAL,
  description TEXT
);

CREATE TABLE task_bank (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  test_prompt TEXT NOT NULL,
  success_criteria TEXT NOT NULL,  -- JSON
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  enabled INTEGER NOT NULL DEFAULT 1
);
```

---

## App Integration

### API Endpoints

```typescript
// GET /api/self-improve/status
interface SIStatus {
  configHash: string;
  stats: {
    total: number;
    outcomes: Record<string, number>;
    failureRate: string;
  };
  latestAnalysis?: Analysis;
  pendingProposals: number;
  validatedProposals: number;
  mergedTotal: number;
  archiveSize: number;
}

// POST /api/self-improve/log
// Log a task outcome (see Task Logger above)

// POST /api/self-improve/analyze
interface AnalyzeRequest {
  days?: number;           // default 7
  minFailures?: number;    // default 2
}

// POST /api/self-improve/propose
interface ProposeRequest {
  analysisId?: number;     // default: latest
  model?: string;          // default: qwen3:14b
}

// POST /api/self-improve/evaluate
interface EvaluateRequest {
  proposalId: number;
  runs?: number;           // default 3
}

// POST /api/self-improve/merge
interface MergeRequest {
  proposalId: number;
  dryRun?: boolean;
}

// POST /api/self-improve/run
// Full cycle: analyze → propose → evaluate → merge
interface RunRequest {
  days?: number;
  model?: string;
}

// GET /api/self-improve/archive
// List archive entries

// GET /api/self-improve/archive/:id
// Get specific archive entry with full snapshot

// POST /api/self-improve/archive/rollback
interface RollbackRequest {
  archiveId: number;
}

// GET /api/self-improve/archive/tree
// Full evolution tree

// GET /api/self-improve/history?days=30
// Merged improvements timeline

// GET /api/self-improve/tasks
// List task bank

// POST /api/self-improve/tasks
// Add evaluation task

// GET /api/self-improve/events (SSE)
// Real-time events: log, analyze, propose, evaluate, merge
```

### Dashboard Components

#### Self-Improvement Dashboard Page

```
┌─────────────────────────────────────────────────┐
│  🧬 Self-Improvement                            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Tasks: 47│ │Fail: 12% │ │Merged: 8 │       │
│  │ (7 days) │ │ (↓ from  │ │ configs  │       │
│  │          │ │  25%)    │ │          │       │
│  └──────────┘ └──────────┘ └──────────┘       │
│                                                 │
│  📊 Failure Patterns                            │
│  ┌─────────────────────────────────────┐       │
│  │ communication ████████ 5 (HIGH)     │       │
│  │ outreach      ████     3 (MEDIUM)   │       │
│  │ memory        ██       2 (LOW)      │       │
│  └─────────────────────────────────────┘       │
│                                                 │
│  📝 Proposals                                   │
│  ┌─────────────────────────────────────┐       │
│  │ #12 Add retry for Telegram   [VALIDATED]    │
│  │     Risk: low  │  [Merge] [Reject]  │       │
│  │ #11 Improve memory retrieval [MERGED]       │
│  │ #10 Add error logging        [MERGED]       │
│  └─────────────────────────────────────┘       │
│                                                 │
│  🌳 Evolution Tree                              │
│  ┌─────────────────────────────────────┐       │
│  │  root ─── v1 ─┬─ v1.1 ── v1.1.1   │       │
│  │               └─ v1.2              │       │
│  │          ── v2 ── v2.1             │       │
│  └─────────────────────────────────────┘       │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Components:

| Component | Description |
|-----------|-------------|
| `SIStatusCards` | Top-level metrics: task count, failure rate trend, merged count |
| `FailurePatternChart` | Horizontal bar chart of failure patterns by category with severity colors |
| `ProposalList` | List of proposals with status badges, merge/reject actions |
| `ProposalDetail` | Expanded view: description, target files, diff preview, evaluation results |
| `EvolutionTree` | Interactive tree visualization of config archive (d3-based) |
| `TaskLogTable` | Sortable/filterable table of recent task outcomes |
| `ImprovementTimeline` | Vertical timeline of merged improvements with performance delta |
| `RunCycleButton` | "Run Full Cycle" button with progress indicator |

#### Settings (extend Settings page)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Auto-merge low risk | Toggle | On | Auto-merge low risk proposals |
| Auto-merge medium risk | Toggle | Off | Auto-merge medium risk proposals |
| Analysis period | Slider (1-30 days) | 7 | Look-back window for analysis |
| Min failures to flag | Number (1-10) | 2 | Minimum failures to create a pattern |
| Proposer model | Select | qwen3:14b | LLM for generating proposals |
| Evaluation runs | Number (1-10) | 3 | Number of test runs per evaluation |
| Weekly cycle | Toggle | On | Enable automatic weekly improvement cycle |
| Cycle day/time | Select | Sunday 07:00 CET | When to run the cycle |

---

## Scheduling

| Schedule | Action | Target |
|----------|--------|--------|
| After each significant task | Log outcome | `tasks` table |
| Weekly (Sunday 7am CET) | Full cycle: analyze→propose→evaluate→merge | Cron job |
| On heartbeat (every 6h) | Check status, report if significant | HEARTBEAT.md |
| Manual | Any step individually | CLI or API |

---

## Safety & Constraints

### File Whitelist
Only these files can be modified:
- `AGENTS.md` — Agent behavior and workflows
- `HEARTBEAT.md` — Autonomous operation checklist
- `TOOLS.md` — Tool configuration notes
- `SOUL.md` — Agent personality and boundaries
- `scripts/self-improve/task-bank.js` — Evaluation tasks
- `scripts/context-summary.js` — Context management
- `scripts/memory/index.js` — Memory system

**Everything else is off-limits.** Source code, credentials, system config — none of these can be modified by the loop.

### Risk Assessment
The proposer LLM classifies each change:
- **Low**: Additive changes (new instructions, additional checks), documentation updates
- **Medium**: Replacing existing behavior, changing thresholds, modifying workflows
- **High**: Removing safety checks, changing boundaries, personality modifications

### Audit Trail
Every action creates a database record:
- Every task log → `tasks` table
- Every analysis → `analyses` table
- Every proposal → `proposals` table with full diff
- Every evaluation → `evaluations` table with scores
- Every merge → `archive` table with full config snapshot + git commit

### Rollback
Any archive state can be restored instantly:
```bash
node scripts/self-improve/index.js archive --rollback <id>
```

### Human Override
- User can reject any proposal at any time
- User can disable the loop entirely (toggle in settings)
- User can modify the file whitelist
- All `high` risk proposals require explicit approval

---

## Metrics & Success Criteria

### Leading Indicators
- Failure rate trending down over weeks
- Average task duration decreasing
- More tasks logged as `success` vs `partial`

### Lagging Indicators
- Number of merged improvements
- Depth of evolution tree (generations of improvement)
- Rollback frequency (lower = better proposals)

### Dashboard KPIs
```
Failure Rate: 25% → 12% (↓52% over 30 days)
Merged Improvements: 8
Evolution Depth: 4 generations
Rollbacks: 0
Average Proposal Quality: 73% pass rate
```

---

## Relationship to Other Design Docs

| Doc | Relationship |
|-----|-------------|
| `agents/self-evolution.md` | DGM extends self-evolution with empirical validation loop |
| `memory/nlp-graph-layer.md` | NLP config is in the modifiable file whitelist |
| `memory/learning-loop.md` | DGM is the structural learning mechanism |
| `agents/autonomy-levels.md` | Auto-merge policy aligns with autonomy levels |
| `gamification/user-engagement.md` | Improvement merges could grant XP |
| `reliability/health-monitoring.md` | DGM status feeds into health dashboard |
