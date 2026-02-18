# Kira Self-Improvement Loop (DGM-lite)
# Production Architecture — v1.0

## Overview

A closed-loop system that makes Kira measurably better over time by:
1. Logging every significant task outcome
2. Analyzing failure patterns
3. Proposing concrete improvements
4. Testing improvements in sandboxed sub-agents
5. Merging validated improvements into production config

## Design Principles

- **No placeholders.** Every function does real work or doesn't exist.
- **SQLite for state.** No loose JSON files. One DB, proper schema, queryable.
- **Idempotent.** Every script can be re-run safely.
- **CLI-first.** Every action available via `node index.js <command>`.
- **Observable.** Every step logs what it did and why.

## Components

### 1. Task Logger (`logger.js`)
Logs task outcomes to SQLite. Called after significant work.

```
node index.js log --task "Fix IAM website" --outcome success --category code --duration 120 --notes "Sub-agent handled well"
node index.js log --task "Send investor email" --outcome failure --category outreach --notes "No email access, had to ask Otto"
```

Fields: id, timestamp, task, outcome (success|failure|partial), category, duration_seconds, notes, improvement_id (nullable FK)

### 2. Analyzer (`analyzer.js`)
Reads task logs, identifies failure clusters, computes stats.

```
node index.js analyze [--days 7] [--min-failures 3]
```

Output: JSON array of failure patterns with frequency, severity, suggested focus area.
Stores analysis results in `analyses` table.

### 3. Proposer (`proposer.js`)
Takes analysis results, uses LLM (local qwen or Claude) to propose concrete changes.

```
node index.js propose [--analysis-id <id>] [--model qwen3:14b]
```

A "proposal" is:
- A description of what to change
- The exact file(s) to modify
- The exact diff/content
- Expected improvement metric
- Risk assessment (low/medium/high)

Stored in `proposals` table with status: draft → testing → validated → merged | rejected

### 4. Evaluator (`evaluator.js`)
Tests a proposal by spawning a sandboxed sub-agent that runs with the proposed changes.

```
node index.js evaluate --proposal-id <id> [--runs 3]
```

Process:
1. Copy current config to temp workspace
2. Apply proposed changes
3. Run test tasks (from a curated task bank)
4. Compare performance: baseline vs modified
5. Score: pass if improvement ≥ threshold, no regressions

Results stored in `evaluations` table.

### 5. Merger (`merger.js`)
Applies validated proposals to production config.

```
node index.js merge --proposal-id <id>
```

Process:
1. Verify proposal status = validated
2. Create git commit with changes
3. Apply changes to live files
4. Update proposal status to merged
5. Log the merge as a task outcome (meta-improvement)

### 6. Archive (`archive.js`)
Maintains DGM-style tree of configurations.

```
node index.js archive --list
node index.js archive --show <id>
node index.js archive --rollback <id>
```

Each merged proposal creates an archive entry with:
- Parent config hash
- Applied changes
- Performance delta
- Timestamp

### 7. Orchestrator (`index.js`)
CLI entry point + full-cycle runner.

```
node index.js run          # Full cycle: analyze → propose → evaluate → merge
node index.js status       # Show current stats, pending proposals, recent merges
node index.js log ...      # Log a task
node index.js analyze ...  # Run analysis
node index.js propose ...  # Generate proposals
node index.js evaluate ... # Test a proposal
node index.js merge ...    # Apply a proposal
node index.js archive ...  # Manage config archive
node index.js tasks        # List task bank for evaluation
```

## Database Schema (SQLite)

```sql
-- Task outcomes
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

-- Failure pattern analyses
CREATE TABLE analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  period_days INTEGER NOT NULL,
  total_tasks INTEGER NOT NULL,
  failure_count INTEGER NOT NULL,
  patterns TEXT NOT NULL, -- JSON array of identified patterns
  focus_areas TEXT NOT NULL -- JSON array of recommended focus areas
);

-- Improvement proposals
CREATE TABLE proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  analysis_id INTEGER REFERENCES analyses(id),
  description TEXT NOT NULL,
  target_files TEXT NOT NULL, -- JSON array of file paths
  changes TEXT NOT NULL, -- JSON: the actual diffs/content
  expected_improvement TEXT NOT NULL,
  risk TEXT NOT NULL CHECK (risk IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'testing', 'validated', 'merged', 'rejected')),
  rejection_reason TEXT,
  parent_config_hash TEXT
);

-- Evaluation runs
CREATE TABLE evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  proposal_id INTEGER NOT NULL REFERENCES proposals(id),
  baseline_score REAL,
  modified_score REAL,
  improvement_pct REAL,
  passed INTEGER NOT NULL CHECK (passed IN (0, 1)),
  runs INTEGER NOT NULL DEFAULT 1,
  details TEXT -- JSON: per-run breakdown
);

-- Config archive (DGM tree)
CREATE TABLE archive (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  parent_id INTEGER REFERENCES archive(id),
  proposal_id INTEGER REFERENCES proposals(id),
  config_hash TEXT NOT NULL,
  config_snapshot TEXT NOT NULL, -- JSON: full config state
  performance_delta REAL,
  description TEXT
);

-- Task bank for evaluation
CREATE TABLE task_bank (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  test_prompt TEXT NOT NULL,
  success_criteria TEXT NOT NULL, -- JSON: how to evaluate
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  enabled INTEGER NOT NULL DEFAULT 1
);
```

## Integration

### Heartbeat
Every 6 hours: `node index.js status` — check if analysis is due
Weekly (Sunday): `node index.js run` — full improvement cycle

### After Significant Tasks
Call `node index.js log` with outcome data.

### Cron
- Daily: `node index.js analyze --days 7`
- Weekly: `node index.js run` (full cycle)

## File Structure

```
scripts/self-improve/
├── index.js          # CLI orchestrator
├── db.js             # SQLite connection + schema init
├── logger.js         # Task outcome logging
├── analyzer.js       # Failure pattern analysis
├── proposer.js       # LLM-powered improvement proposals
├── evaluator.js      # Sandboxed testing
├── merger.js         # Apply validated changes
├── archive.js        # Config tree management
├── task-bank.js      # Manage evaluation tasks
├── ARCHITECTURE.md   # This file
├── data/
│   └── self-improve.db  # SQLite database
├── archive/          # Config snapshots (git-tracked)
├── logs/             # Structured run logs
└── proposals/        # Human-readable proposal docs
```
