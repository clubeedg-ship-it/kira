# 20 — Live Processes (Mission Control)

> Real-time visibility into everything Kira is doing in the background.

---

## Purpose

Otto's principle: **"I want to see what's happening."**

Kira runs background work constantly — sub-agents, NLP extraction, backfills, code reviews, content generation. This page (and dashboard widget) shows all of it in real-time, like a mission control feed.

Every short-term task that would otherwise be invisible becomes a trackable, visual process.

---

## Examples of Tracked Processes

| Process Type | Example | Progress Style |
|---|---|---|
| **Backfill** | "Extracting 80 historical sessions" | 51/80 with ETA |
| **Sub-agent** | "Writing ZenithCred pitch deck" | Status + elapsed time |
| **NLP extraction** | "Processing 600 messages" | Count + rate (msg/min) |
| **Graph maintenance** | "Dedup + normalize + decay" | Steps (3/3) |
| **Code review** | "Reviewing PR #42 with local model" | In progress / done |
| **Content generation** | "OttoGen webinar draft" | Critic loop iteration (2/5) |
| **Deployment** | "Docker build + push" | Stage-based |
| **Cron job** | "Scheduled graph cleanup" | Last run + next run |

---

## Data Model

```sql
CREATE TABLE processes (
  id TEXT PRIMARY KEY,           -- uuid
  user_id TEXT NOT NULL,         -- owner
  type TEXT NOT NULL,            -- 'subagent' | 'pipeline' | 'cron' | 'daemon' | 'task'
  name TEXT NOT NULL,            -- human-readable label
  status TEXT NOT NULL,          -- 'queued' | 'running' | 'paused' | 'done' | 'failed' | 'cancelled'
  progress_current INTEGER,      -- e.g. 51
  progress_total INTEGER,        -- e.g. 80
  progress_unit TEXT,            -- e.g. 'sessions', 'messages', 'steps'
  rate REAL,                     -- e.g. 3.2 (items per minute)
  eta_seconds INTEGER,           -- estimated time remaining
  started_at TEXT NOT NULL,      -- ISO timestamp
  updated_at TEXT NOT NULL,
  finished_at TEXT,
  metadata TEXT,                 -- JSON blob for type-specific data
  log_tail TEXT,                 -- last N log lines (rolling buffer)
  parent_id TEXT,                -- for nested processes (sub-agent spawned by another)
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_processes_user_status ON processes(user_id, status);
CREATE INDEX idx_processes_updated ON processes(updated_at);
```

---

## API

### `GET /api/processes`
List active + recent processes for authenticated user.

**Query params:**
- `status` — filter: `running`, `done`, `failed`, `all` (default: `running`)
- `limit` — max results (default: 20)
- `since` — ISO timestamp, only return processes updated after this

**Response:**
```json
{
  "data": [
    {
      "id": "proc_abc123",
      "type": "pipeline",
      "name": "Historical backfill (NLP extraction)",
      "status": "running",
      "progress": { "current": 51, "total": 80, "unit": "sessions" },
      "rate": 2.1,
      "eta_seconds": 830,
      "started_at": "2026-02-11T22:00:00Z",
      "updated_at": "2026-02-11T22:34:00Z",
      "log_tail": "[22:34] Processing session 51/80: d3969337..."
    }
  ]
}
```

### `GET /api/processes/:id`
Single process detail with full log tail.

### `POST /api/processes`
Create a new tracked process (internal/service-key only).

### `PATCH /api/processes/:id`
Update progress, status, log. Used by daemons/scripts to report.

### `DELETE /api/processes/:id`
Dismiss/archive a completed process.

---

## Reporter SDK (for scripts/daemons)

Lightweight helper that any script can import to report progress:

```javascript
// ~/kira/scripts/lib/process-reporter.js
class ProcessReporter {
  constructor(name, type, total) {
    // POST /api/processes to create
  }
  
  update(current, logLine) {
    // PATCH /api/processes/:id
    // Auto-calculates rate + ETA from history
  }
  
  done(summary) {
    // PATCH status → 'done'
  }
  
  fail(error) {
    // PATCH status → 'failed'
  }
}

// Usage in backfill script:
const reporter = new ProcessReporter(
  'Historical backfill (NLP extraction)',
  'pipeline',
  80 // total sessions
);

for (const session of sessions) {
  await processSession(session);
  reporter.update(i, `Processed ${session.id}`);
}
reporter.done('80 sessions, 1964 embeddings generated');
```

---

## Dashboard Widget (Overview Page)

A compact card on the Overview page showing active processes:

```
┌─ Active Processes ──────────────────────────────────┐
│                                                      │
│  ● NLP Backfill              51/80 sessions  ██░ 63% │
│    2.1/min · ~14min remaining                        │
│                                                      │
│  ● Sub-agent: Pitch deck     Running · 4m 22s        │
│    "Drafting financial projections section..."        │
│                                                      │
│  ◉ Graph maintenance         ✓ Done · 2m ago         │
│    Merged 12 duplicates, normalized 8 relations      │
│                                                      │
│  ○ Scheduled: Graph cleanup  Next: 00:34 UTC         │
│                                                      │
│                                    View all →         │
└──────────────────────────────────────────────────────┘
```

### Visual Rules
- **Running:** Animated progress bar (monochrome SVG), pulsing dot
- **Done:** Checkmark, fades after 30min (or on dismiss)
- **Failed:** Red-ish indicator, persists until dismissed
- **Queued:** Hollow dot, no animation
- Progress bar: thin horizontal bar, no color — just fill vs empty
- Rate + ETA shown when `progress_total` is known
- Log tail: last line shown inline, expandable for full log

---

## Full Page (`/processes`)

Dedicated page with:
- **Active tab:** All running/queued processes, live-updating
- **History tab:** Completed/failed, filterable by date/type
- **Each process expandable** to show:
  - Full log tail (scrollable, auto-follow)
  - Metadata (model used, tokens consumed, files affected)
  - Nested sub-processes (tree view)
  - Cancel button (for cancellable processes)
- **Auto-refresh:** Poll every 2s for active processes, 30s for history

---

## Nav Update

Add to sidebar:

| Icon | Label | Route | Description |
|---|---|---|---|
| ⚡ | Processes | `/processes` | Live process tracker |

Position: between Knowledge and Settings.

---

## Integration Points

### 1. OpenClaw Sub-agents
When `sessions_spawn` is called, create a process entry. Poll `sessions_list` to update status. On completion, mark done with summary.

### 2. PM2 Daemons
Graph-sync, msg-proxy, chat-sync report their activity via the reporter SDK.

### 3. Cron Jobs
Each cron job run creates a process entry. Shows last run result + next scheduled time.

### 4. Script Pipelines
Backfill, critic-loop, graph-improvements — any long-running script uses the reporter.

### 5. Chat Integration
When a process completes something significant, optionally post a summary to chat (configurable per process type).

---

## Implementation Priority

This is a **Phase 2 feature** (after core dashboard works):
1. Build the `processes` table + API endpoints
2. Add the reporter SDK
3. Wire into backfill script (first integration)
4. Build the dashboard widget
5. Build the full page
6. Wire into sub-agent spawning
7. Wire into remaining daemons

---

*The goal: Otto opens the dashboard and instantly knows what Kira is working on, how far along it is, and whether anything needs attention.*
