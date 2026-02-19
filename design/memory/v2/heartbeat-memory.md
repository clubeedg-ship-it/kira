# Heartbeat Memory Maintenance

> **Status:** ✅ DESIGNED | **Phase:** 4
> **Purpose:** Separate memory maintenance process that runs on its own schedule. Handles compaction, graph enrichment, stale fact pruning, and context pre-loading. Does NOT consume the main agent's context window.

---

## 1. The Problem

Memory maintenance (compaction, decay, enrichment) currently happens inline with the main agent's processing, consuming context window tokens. It should be a background process that keeps memory healthy without interrupting conversations.

---

## 2. Heartbeat Memory Process

Runs as part of the heartbeat process (see `design/backend/heartbeat-process.md`). Separate context, separate model (Haiku for most tasks, Sonnet for complex enrichment).

### Schedule

| Task | Frequency | Model | Approx. Cost |
|------|-----------|-------|-------------|
| Confidence decay recalculation | Daily (02:00) | None (pure math) | $0 |
| Stale fact identification | Daily (02:00) | None (query) | $0 |
| Graph enrichment | Daily (03:00) | Haiku | ~$0.01 |
| Conversation compaction | After each conversation ends | Haiku | ~$0.005 |
| Entity deduplication | Weekly (Sunday 03:00) | Sonnet | ~$0.05 |
| Context pre-loading | 15-min intervals (daytime) | Haiku | ~$0.002 |
| Memory health report | Weekly (Sunday 04:00) | Haiku | ~$0.01 |

---

## 3. Task Details

### 3.1 Confidence Decay Recalculation
Pure SQL: apply decay formula to all entities. Update confidence scores. Move entities between active/dormant/stale/archived. No LLM needed.

### 3.2 Stale Fact Identification
Query entities where `confidence < 0.3`. Queue for human review in weekly review ceremony. Group by area.

### 3.3 Graph Enrichment
Haiku reads recent conversation logs and agent outputs. Identifies implicit relationships not yet in the graph. Creates new edges. Example: user discussed Client X and Brevo in same message → infer relationship "Client X uses Brevo" if not already present.

### 3.4 Conversation Compaction
After a conversation ends: Haiku extracts key facts, decisions, tasks, and entities. Stores compressed summary. Links to temporal graph. Reduces storage of raw conversation history.

### 3.5 Entity Deduplication
Sonnet reviews entities that may be duplicates ("Jan" vs "Jan de Vries" vs "Jan from dental practice"). Proposes merges. High-confidence merges auto-apply. Low-confidence merges queued for human review.

### 3.6 Context Pre-Loading
Checks calendar for upcoming events. Runs proactive injection pipeline (see `proactive-injection.md`). Caches compiled context blocks.

### 3.7 Memory Health Report
Generated weekly: total entities, new this week, decayed this week, archived, duplicates merged, graph density, top entities by reference count. Included in weekly review.

---

## 4. Isolation

The heartbeat memory process:
- Has its own context window (small: ~4K tokens for instructions + current batch)
- Reads from memory DB directly (no API round-trips)
- Writes directly to memory DB
- Does NOT access conversation history of active sessions
- Logs its work to `heartbeat_log` table

```sql
CREATE TABLE heartbeat_log (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,     -- 'decay', 'enrichment', 'compaction', 'dedup', 'preload'
  status TEXT DEFAULT 'completed',
  details TEXT,                -- JSON: what was done
  entities_affected INTEGER,
  duration_ms INTEGER,
  cost_usd REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

*Heartbeat memory is the janitor, librarian, and pre-loader. Runs in the background, keeps memory clean, and prepares context before you need it.*