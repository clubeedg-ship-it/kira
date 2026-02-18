# Memory Architecture Audit & Design

**Date:** 2026-02-10
**Author:** Memory Architect Subagent

---

## Part 1: Current State Audit

### Directory Layout

- `~/clawd` → **symlink** to `~/kira` (they're the same workspace)
- `~/chimera` → separate repo with the original memory-graph implementation

### Inventory of All Memory-Related Files

#### ~/kira/scripts/memory/ (Kira's memory layer)

| File | Lines | Layer | Status | Quality |
|------|-------|-------|--------|---------|
| `memory-core.js` | 153 | Orchestrator | ✅ Works (CJS) | Good - clean unified interface |
| `memory-daemon.js` | 468 | Episodic+Semantic extraction | ✅ Works (CJS) - calls GLM-4.7-Flash via Ollama | Production-grade |
| `blackboard.js` | 125 | Working Memory | ✅ Works (CJS) - JSONL store | Solid but simple |
| `episodes.js` | 156 | Episodic | ✅ Works (CJS) - daily JSONL files | Good |
| `procedures.js` | 162 | Procedural | ✅ Works (CJS) - individual JSON files | Good, 107 procedures stored |
| `embeddings.js` | 193 | Semantic Search | ⚠️ Partial - `nomic-embed-text` NOT installed, falls back to bag-of-words | Prototype fallback |
| `reflection.js` | 223 | Meta/Self-improvement | ✅ Works (CJS) | Good concept, 2 reflections generated |
| `memory-watcher.js` | 161 | Auto-extraction daemon | ❌ ESM (`import`) but rest of dir is CJS. References `qwen2.5:0.5b` which isn't available | Broken - module format mismatch |
| `kv-cache.js` | 146 | GPU KV cache mgmt | ⚠️ Utility only - LMCache not installed, no 4090 | Not useful currently |

#### ~/chimera/scripts/ (Chimera's memory system)

| File | Lines | Layer | Status | Quality |
|------|-------|-------|--------|---------|
| `memory-manager.js` | 110 | Orchestrator | ✅ ESM - chains monitor→curator→retriever→sync | Production orchestrator |
| `context-monitor.js` | 208 | Working Memory | ✅ ESM - estimates token usage, triggers curation | Well-designed |
| `curator-agent.js` | 405 | Episodic+Semantic | ✅ ESM - LLM-powered extraction via Ollama | Most sophisticated extractor |
| `memory-retriever.js` | 254 | Retrieval | ✅ ESM - queries graph.db, outputs markdown | Clean |
| `memory-sync.js` | 255 | Auto-sync | ⚠️ ESM - uses regex patterns for fact extraction (crude) | Prototype-level extraction |
| `seed-memory.js` | 111 | Setup | One-time seed script | Utility |

#### ~/chimera/src/memory-graph/ (Core graph library)

| File | Layer | Status | Quality |
|------|-------|--------|---------|
| `index.js` | Graph API | ✅ ESM - MemoryGraph class, wraps all ops | Production-grade |
| `schema.sql` | Schema | ✅ Well-designed with entities, facts, summaries, decisions, preferences | Good |
| `retrieval.js` | 361 lines - search, recall, remember, context retrieval | ✅ Works | Solid |
| `entities.js` | Entity CRUD | ✅ Works | Good |
| `relations.js` | Relation CRUD | ✅ Works | Good |
| `facts.js` | Fact CRUD | ✅ Works | Good |

#### ~/chimera/src/operator/context-engine.js

| Layer | Status | Quality |
|-------|--------|---------|
| Working Memory (focus, recent items, reference resolution) | ✅ ESM | Sophisticated but uses separate `context.db` |

#### ~/kira/scripts/context-summary.js

| Lines | Layer | Status |
|-------|-------|--------|
| 295 | Working Memory recovery | ✅ CJS - summarizes session for context-buffer.md |

### Data Volumes

| Store | Count | Location |
|-------|-------|----------|
| Entities | 593 | `~/chimera/memory/graph.db` |
| Facts | 985 | `~/chimera/memory/graph.db` |
| Summaries | 0 | `~/chimera/memory/graph.db` (table gets dropped by schema.sql!) |
| Decisions | 0 | Same issue - DROP TABLE in schema.sql |
| Preferences | 0 | Same issue |
| Episodes (JSONL) | 4 days | `~/kira/memory/episodes/` |
| Procedures | 107 files | `~/kira/memory/procedures/` (under `~/clawd/`) |
| Blackboard | 5 entries | `~/kira/memory/blackboard.jsonl` |
| Reflections | 2 | `~/kira/memory/reflections/` |
| Embeddings cache | 95KB | `~/kira/memory/embeddings.json` (bag-of-words, not real embeddings) |

### Critical Bugs Found

1. **Schema.sql drops summaries/decisions/preferences tables on every init!** Lines: `DROP TABLE IF EXISTS summaries; DROP TABLE IF EXISTS decisions; DROP TABLE IF EXISTS preferences;` — This destroys curated data every time the curator runs.

2. **`memory-watcher.js` uses ESM syntax** (`import`) but all other kira/scripts/memory files use CJS (`require`). It can't be imported by `memory-core.js`.

3. **`nomic-embed-text` not installed** — embeddings.js falls back to a 256-dim bag-of-words hash, which is essentially random noise for semantic search.

4. **Dual-system confusion** — `memory-daemon.js` (kira) and `curator-agent.js` (chimera) both extract facts from session logs into the same graph.db, potentially duplicating or conflicting.

5. **`memory-sync.js` uses regex** for fact extraction while `curator-agent.js` uses LLM — the regex approach is far inferior and may inject noise.

6. **`operator.db` and `context.db`** are separate from `graph.db` — working memory is fragmented across 3 SQLite databases.

### What's Actually Being Used

Based on AGENTS.md references:
- `context-monitor.js` — referenced in heartbeat flow
- `memory-manager.js` — referenced as `CURATOR_MODEL=qwen3:14b node ~/chimera/scripts/memory-manager.js`
- `memory-retriever.js` — used after compaction
- `context-summary.js` — referenced for manual context buffer generation
- `memory-core.js` — **not clearly called by anything automated**
- `memory-daemon.js` — **not clearly called by anything automated** (overlaps with curator)

### Ollama Models Available

| Model | Size | Use |
|-------|------|-----|
| glm-4.7-flash | 19 GB | Used by memory-daemon.js for extraction |
| qwen3:14b | 9.3 GB | Used by curator-agent.js (via CURATOR_MODEL) |
| qwen2.5-coder:14b | 9 GB | Code tasks |
| granite3.3:2b | 1.5 GB | Fast/small tasks |
| ministral-3:3b | 3.0 GB | Not used |
| **nomic-embed-text** | **NOT INSTALLED** | Needed for vector search |

---

## Part 2: Proposed Unified Architecture

### Design Principles

1. **Single source of truth** — one SQLite database for all structured memory
2. **One extraction pipeline** — don't run two competing LLM extractors
3. **CJS everywhere** in kira/scripts (consistency with existing code)
4. **Degrade gracefully** — works without Ollama, embeddings optional
5. **CLI-first** — single entry point, composable commands

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│              node ~/kira/scripts/memory/index.js        │
│         [search | log | recall | maintain | status]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Working  │  │ Episodic │  │ Semantic │  │Procedu-│ │
│  │ Memory   │  │ Memory   │  │ Memory   │  │  ral   │ │
│  │          │  │          │  │          │  │        │ │
│  │-blackbrd │  │-episodes │  │-entities │  │-proced.│ │
│  │-focus    │  │-sessions │  │-facts    │  │-steps  │ │
│  │-context  │  │-reflect. │  │-relations│  │-scores │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       └──────────────┴──────────────┴─────────── ┘      │
│                    unified.db (SQLite)                   │
├─────────────────────────────────────────────────────────┤
│  Extraction: memory-daemon.js (GLM-4.7-Flash via Ollama)│
│  Embeddings: nomic-embed-text (when available)          │
│  Monitor: context-monitor.js (token tracking)           │
└─────────────────────────────────────────────────────────┘
```

### Unified Database Schema

Merge `graph.db`, `operator.db`, and `context.db` into `~/kira/memory/unified.db`:

```sql
-- Keep from graph.db (DO NOT DROP)
CREATE TABLE IF NOT EXISTS entities (...);
CREATE TABLE IF NOT EXISTS facts (...);
CREATE TABLE IF NOT EXISTS relations (...);
CREATE TABLE IF NOT EXISTS conversations (...);

-- Keep from graph.db (FIX: remove DROP TABLE)
CREATE TABLE IF NOT EXISTS summaries (...);
CREATE TABLE IF NOT EXISTS decisions (...);
CREATE TABLE IF NOT EXISTS preferences (...);
CREATE TABLE IF NOT EXISTS curated_segments (...);

-- Add: Episodes (migrate from JSONL)
CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  type TEXT, -- task, decision, learning, error, milestone
  summary TEXT NOT NULL,
  details TEXT,
  outcome TEXT, -- success, failure, partial
  importance INTEGER DEFAULT 5,
  tags TEXT, -- JSON array
  source TEXT DEFAULT 'manual'
);

-- Add: Procedures (migrate from JSON files)  
CREATE TABLE IF NOT EXISTS procedures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trigger TEXT,
  steps TEXT NOT NULL, -- JSON array
  success_rate REAL,
  times_used INTEGER DEFAULT 0,
  last_used TEXT,
  tags TEXT, -- JSON array
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Add: Working Memory / Blackboard
CREATE TABLE IF NOT EXISTS blackboard (
  id TEXT PRIMARY KEY,
  agent TEXT DEFAULT 'kira',
  type TEXT, -- discovery, request, response, fact
  topic TEXT DEFAULT 'general',
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  resolved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Add: Focus (singleton working memory)
CREATE TABLE IF NOT EXISTS focus (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  type TEXT,
  item_id TEXT,
  title TEXT,
  data TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Add: Embeddings (optional, for vector search)
CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  source_type TEXT, -- episode, fact, entity, procedure
  source_id TEXT,
  text TEXT,
  vector BLOB, -- float32 array serialized
  model TEXT DEFAULT 'nomic-embed-text',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_episodes_timestamp ON episodes(timestamp);
CREATE INDEX IF NOT EXISTS idx_episodes_type ON episodes(type);
CREATE INDEX IF NOT EXISTS idx_episodes_importance ON episodes(importance);
CREATE INDEX IF NOT EXISTS idx_blackboard_resolved ON blackboard(resolved);
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id);
```

### Entry Point: `~/kira/scripts/memory/index.js`

```
node ~/kira/scripts/memory/index.js search "sales automation"
node ~/kira/scripts/memory/index.js log '{"type":"task","summary":"Built memory system"}'
node ~/kira/scripts/memory/index.js recall "Otto"
node ~/kira/scripts/memory/index.js maintain          # run extraction + consolidation
node ~/kira/scripts/memory/index.js status             # overview of all memory stores
node ~/kira/scripts/memory/index.js extract --force    # reprocess session logs
```

### OpenClaw Integration

The system should work with OpenClaw's built-in memory_search by:
1. Writing key context to `~/kira/memory/retrieved-context.md` (already done)
2. Maintaining `~/kira/MEMORY.md` with curated long-term memory
3. Running `maintain` on heartbeats via HEARTBEAT.md
4. The `search` command can be called from OpenClaw tool invocations

---

## Part 3: File-by-File Migration Plan

### KEEP (production-ready, integrate into unified system)

| File | Action |
|------|--------|
| `kira/scripts/memory/memory-core.js` | Refactor → `index.js`, add SQLite unified.db |
| `kira/scripts/memory/memory-daemon.js` | Keep as primary extraction engine (GLM-4.7-Flash) |
| `kira/scripts/memory/blackboard.js` | Migrate storage from JSONL → unified.db |
| `kira/scripts/memory/episodes.js` | Migrate storage from JSONL → unified.db |
| `kira/scripts/memory/procedures.js` | Migrate storage from JSON files → unified.db |
| `kira/scripts/memory/reflection.js` | Keep, point to unified.db |
| `kira/scripts/memory/embeddings.js` | Rewrite for nomic-embed-text + SQLite storage |
| `kira/scripts/context-summary.js` | Keep as-is (standalone context buffer tool) |
| `chimera/src/memory-graph/*` | Keep as library, but point to unified.db |
| `chimera/scripts/context-monitor.js` | Keep, integrate into `maintain` command |
| `chimera/scripts/memory-retriever.js` | Keep, integrate into `recall` command |

### MERGE (combine duplicate functionality)

| Files | Merge Into |
|-------|-----------|
| `chimera/scripts/curator-agent.js` + `kira/scripts/memory/memory-daemon.js` | Keep daemon only (it's more complete and uses CJS-compatible patterns) |
| `chimera/scripts/memory-sync.js` (regex extraction) | Delete — daemon does LLM extraction which is far superior |
| `chimera/scripts/memory-manager.js` (orchestrator) | Merge into `index.js maintain` command |

### DELETE (dead code or superseded)

| File | Reason |
|------|--------|
| `kira/scripts/memory/memory-watcher.js` | Broken (ESM in CJS dir), duplicates daemon |
| `kira/scripts/memory/kv-cache.js` | No 4090, LMCache not installed, aspirational |
| `chimera/scripts/memory-sync.js` | Regex extraction is noise vs LLM extraction |
| `chimera/memory/memory-graph.db` | Empty (0 bytes) |
| `chimera/memory/memory.db` | Empty (0 bytes) |

### FIX URGENTLY

| Issue | Fix |
|-------|-----|
| `schema.sql` DROP TABLE statements | Remove all `DROP TABLE IF EXISTS` lines |
| Install nomic-embed-text | `ollama pull nomic-embed-text` (274MB) |

---

## Part 4: Implementation Order

### Phase 1: Critical Fixes (Day 1) — Immediate Value

1. **Fix schema.sql** — Remove DROP TABLE statements that destroy summaries/decisions/preferences
2. **Install nomic-embed-text** — `ollama pull nomic-embed-text`
3. **Create unified.db** — Migrate data from graph.db + JSONL episodes + JSON procedures
4. **Create `index.js`** — Single CLI entry point wrapping existing modules

### Phase 2: Consolidation (Day 2-3)

5. **Migrate blackboard** from JSONL to SQLite
6. **Migrate episodes** from daily JSONL to SQLite
7. **Migrate procedures** from individual JSON files to SQLite
8. **Wire embeddings** — index all episodes/facts with nomic-embed-text
9. **Delete dead code** — watcher, kv-cache, memory-sync, empty DBs

### Phase 3: Automation (Day 4-5)

10. **Integrate `maintain` into heartbeat** — replace chimera memory-manager.js
11. **Add vector search** to `search` command (cosine similarity on embeddings)
12. **Auto-extraction cron** — run daemon on session log changes (inotify or periodic)
13. **Context injection** — auto-generate retrieved-context.md on session start

### Phase 4: Advanced (Week 2+)

14. **Graph traversal search** — multi-hop entity→relation→entity queries
15. **Temporal decay** — reduce confidence/relevance of old facts
16. **Procedure learning** — auto-extract workflows from successful task chains
17. **sqlite-vec integration** — native vector search extension for better performance

---

## Part 5: OpenClaw Integration

### How It Fits Together

```
OpenClaw Heartbeat
    │
    ├─→ HEARTBEAT.md says: "node ~/kira/scripts/memory/index.js maintain"
    │   ├─→ context-monitor checks token usage
    │   ├─→ memory-daemon extracts from new session messages
    │   ├─→ reflection runs if enough new episodes
    │   └─→ retrieved-context.md updated
    │
    ├─→ AGENTS.md says: "Read memory/retrieved-context.md after compaction"
    │   └─→ retriever queries unified.db, writes markdown
    │
    └─→ MEMORY.md manually curated by Kira during heartbeats
        └─→ Distilled from daily notes + graph facts
```

### Memory Search via OpenClaw

When OpenClaw's `memory_search` is called, it can invoke:
```bash
node ~/kira/scripts/memory/index.js search "query text"
```

Output: JSON with ranked results across all memory layers (episodes, facts, procedures, blackboard).

### Session Startup Flow

1. Read `SOUL.md`, `USER.md`
2. Read today + yesterday `memory/YYYY-MM-DD.md`
3. Read `MEMORY.md` (if main session)
4. Read `memory/retrieved-context.md` (auto-generated from unified.db)
5. If compacted: run `node ~/kira/scripts/memory/index.js recall --topic "last context"`

### What We Have vs What We Need

| Capability | Current | Target |
|-----------|---------|--------|
| Episodic logging | ✅ Works (JSONL) | → SQLite with search |
| Fact extraction | ✅ LLM-powered (daemon) | Keep, deduplicate |
| Knowledge graph | ✅ 593 entities, 985 facts | Fix schema bug, grow |
| Procedural memory | ✅ 107 procedures | → SQLite, add auto-learning |
| Working memory | ⚠️ JSONL blackboard | → SQLite, add focus |
| Vector search | ❌ Bag-of-words fallback | → nomic-embed-text |
| Self-reflection | ✅ Basic | Keep, integrate |
| Context monitoring | ✅ Works | Integrate into maintain |
| Auto-extraction | ⚠️ 2 competing pipelines | → Single daemon |
| Single entry point | ❌ Scattered scripts | → index.js CLI |

---

## Summary

The memory system is **80% built** but fragmented across two repos with duplicate pipelines and a critical schema bug destroying curated data. The main work is:

1. **Fix the schema.sql DROP TABLE bug** (data loss happening now)
2. **Consolidate into one unified.db** (stop fragmenting across 3+ DBs)
3. **Kill the duplicate extraction pipeline** (keep daemon, drop regex sync)
4. **Install nomic-embed-text** (enable real semantic search)
5. **Create index.js CLI** (single entry point for all memory operations)

Total effort: ~2-3 days of focused work for phases 1-2, which delivers 90% of the value.
