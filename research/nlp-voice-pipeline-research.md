# NLP Voice-to-Agent Pipeline: Production Architecture Research

**Author:** Kira ⚡  
**Date:** 2026-02-14  
**Purpose:** Design v2 NLP pipeline — database-backed, multi-user, production-grade  
**Audience:** Otto + future Kira engineering team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [State of the Art (2025-2026)](#2-state-of-the-art)
3. [Current System Audit](#3-current-system-audit)
4. [Voice-Specific NLP Challenges](#4-voice-specific-challenges)
5. [Database-Backed Context Systems](#5-database-backed-context)
6. [Production Architecture Patterns](#6-production-architecture)
7. [V2 Architecture Design](#7-v2-architecture)
8. [Migration Plan](#8-migration-plan)
9. [Technology Choices](#9-technology-choices)
10. [Effort Estimates](#10-effort-estimates)

---

## 1. Executive Summary

Our current NLP pipeline works for a single user (Otto) but has fundamental scaling limitations: a single markdown file for context output, a single SQLite database shared across all operations, no user isolation, and file-based state management. 

The v2 architecture must serve thousands of users with:
- **Per-user isolated SQLite databases** (aligned with our existing decision)
- **Database-backed context** instead of `retrieved-context.md`
- **Real-time voice pipeline** with <2s end-to-end latency
- **Temporal knowledge graph** tracking fact evolution
- **Idle-aware processing** that doesn't burn resources when nothing's happening

The key insight from industry research: the best production systems use a **hybrid retrieval** approach (vector similarity + graph traversal + recency weighting) with **per-user isolated stores** and **streaming ASR post-processing**. We're already doing 70% of this — the migration is mostly about data isolation and replacing file I/O with database queries.

---

## 2. State of the Art (2025-2026)

### 2.1 Voice Agent Pipeline Architectures

Three dominant patterns have emerged:

**A. Cascading Pipeline (what we use)**
```
Audio → STT (Whisper) → Post-process → NLP/Enrich → LLM → TTS → Audio
```
- Latency: 500-1200ms per stage
- Pros: Each component swappable, debuggable, local-first possible
- Cons: Cumulative latency, no parallelism
- Used by: Most production systems, Pipecat framework, Deepgram workflows

**B. Unified/End-to-End**
```
Audio → Multimodal LLM (GPT-4o Realtime) → Audio
```
- Latency: <500ms
- Pros: Natural flow, emotional awareness, no text intermediary
- Cons: Vendor lock-in, expensive, can't enrich context between STT and LLM
- Used by: OpenAI Realtime API, Google Gemini Live

**C. Concurrent/Actor Pipeline**
```
Audio → [STT Actor] ──→ [LLM Actor] ──→ [TTS Actor] → Audio
              ↓                ↓               ↓
         [partial text]  [partial resp]  [partial audio]
```
- Latency: <500ms target via parallelism
- Pros: Handles interruptions, scales multi-conversation
- Cons: Complex state management, error isolation
- Used by: Pipecat, Gladia concurrent pipelines

**Our position:** We use Architecture A, which is correct for our use case. We don't need real-time voice conversation (sub-second) — we need **voice message transcription → enriched agent query**. Our latency budget is 2-5 seconds total, not 500ms. This is a fundamentally different problem from real-time voice agents.

### 2.2 Key Frameworks

| Framework | Language | Focus | Relevance to Us |
|-----------|----------|-------|-----------------|
| **Pipecat** | Python | Real-time voice agents | Low — designed for live conversation, not async voice messages |
| **Zep/Graphiti** | Python | Temporal knowledge graphs + memory | **High** — their graph architecture is what we need for v2 |
| **Mem0** | Python | Agent memory (vector + graph + KV) | Medium — simpler than Zep, good for reference |
| **Letta (MemGPT)** | Python | Hierarchical memory management | Medium — interesting archival memory pattern |

### 2.3 Memory System Benchmarks (LoCoMo)

| System | Accuracy | Key Strength |
|--------|----------|-------------|
| Zep/Graphiti | 75.14% | Temporal graphs, auto-assembly |
| Letta/MemGPT | 74.0% | Hierarchical core + archival |
| Mem0 | 68.5% | Flexible, swappable stores |
| Naive RAG | ~55% | Just vector search |

**Takeaway:** Graph-based retrieval (Zep) outperforms pure vector search by ~20%. We already have a graph — we need to make retrieval smarter and temporal-aware.

---

## 3. Current System Audit

### 3.1 Architecture Overview

```
Voice Message (Telegram/WebUI)
    ↓
Whisper large-v3 (GPU Router :3853 → :3852)
    ↓
Transcription text
    ↓
Message Proxy (:3850) — typo fix + graph context lookup
    ↓
Context written to memory/retrieved-context.md ← FILE-BASED (problem)
    ↓
OpenClaw loads workspace context (includes retrieved-context.md)
    ↓
Agent processes with enriched context
    ↓
Graph Sync Daemon extracts entities/facts from response
    ↓
unified.db updated (entities, relations, facts, embeddings)
```

### 3.2 Component Assessment

| Component | File | Status | Scalability |
|-----------|------|--------|-------------|
| **NLP Graph Layer** | `nlp-graph-layer.js` (610 lines) | ✅ Solid | ❌ Single DB, no user isolation |
| **Message Proxy** | `message-proxy.js` (438 lines) | ✅ Working | ❌ Writes to single file |
| **Graph Sync Daemon** | `graph-sync-daemon.js` (340 lines) | ✅ Working | ❌ Polls single sessions dir |
| **Whisper Service** | `whisper/server.py` | ✅ Good | ⚠️ Single GPU, queue needed |
| **GPU Router** | `gpu-router/server.js` | ✅ Working | ⚠️ Single GPU time-sharing |
| **Context Output** | `memory/retrieved-context.md` | ❌ File-based | ❌ Cannot scale |
| **Graph DB** | `memory/unified.db` | ⚠️ Works | ❌ Single DB, no user isolation |

### 3.3 What Works Well

1. **Entity extraction pipeline** — The `extract()` function with local LLM (granite3.3:2b) is fast and cheap
2. **Hybrid retrieval** — Text search + semantic search + domain filtering + recency boost is sophisticated
3. **Embedding generation** — nomic-embed-text via Ollama is free and good quality
4. **Typo correction** — Dictionary-based approach is fast and handles Otto's patterns
5. **Metadata stripping** — Clean separation of Telegram/WebUI metadata from content
6. **Idle-aware polling** — Graph sync daemon adapts interval based on activity

### 3.4 What's Broken / Won't Scale

1. **`retrieved-context.md` as context output** — This file is:
   - Overwritten on every enrichment (race conditions with multiple users)
   - Loaded by OpenClaw as workspace context (one workspace = one user)
   - Not queryable (just markdown text)
   - Not per-user isolated

2. **Single `unified.db`** — All entities/facts/embeddings in one DB means:
   - No data isolation between users
   - Growing query latency as graph expands (already 16K entities, 56K facts)
   - No ability to delete one user's data cleanly (GDPR)

3. **Ollama dependency for extraction** — Requires GPU, which is shared with Whisper:
   - Extraction fails when Whisper owns the GPU
   - GPU Router helps but creates queuing delays
   - Solution: Use lightweight CPU model for extraction OR batch processing

4. **No temporal tracking** — Facts have timestamps but no validity ranges:
   - Can't answer "what did Otto think about X last week vs now?"
   - Old facts never expire or get superseded
   - No fact versioning

5. **Session-coupled extraction** — Graph sync watches OpenClaw JSONL files:
   - Tightly coupled to OpenClaw's session format
   - Can't process messages from other sources (WebUI direct, API)
   - No multi-agent awareness (only watches main agent)

### 3.5 Graph Quality Issues

Current stats: 16,532 entities, 32,236 relations, 56,534 facts, 24,596 embeddings.

Problems observed:
- Entity type pollution (Otto is "concept" not "person", ZenithCred is "concept" not "company")
- Duplicate entities with slightly different names
- Vague entities that shouldn't exist ("user", "dashboard", "AI")
- Facts with no useful signal ("Gateway restarting" — who cares in 6 months?)

---

## 4. Voice-Specific NLP Challenges

### 4.1 Whisper Output Quality

Whisper large-v3 gives us excellent raw transcription, but voice messages have unique challenges:

| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| Filler words ("um", "uh", "like") | Noise in entity extraction | Post-process disfluency removal |
| False starts ("I want to— actually let's") | Confused intent extraction | Sentence boundary detection |
| Code-switching (EN/NL/PT) | Whisper handles well, but NLP models may not | Language detection per segment |
| Background noise | Low WER with large-v3 | Already handled |
| Run-on speech | Single long sentence, hard to parse | Punctuation restoration |
| Proper noun errors | "OttoGen" → "auto gen", "ZenithCred" → "zenith cred" | Custom vocabulary/hotwords |

### 4.2 Multilingual Pipeline (Otto's Languages)

Otto speaks English (primary), Dutch (native), and Portuguese (Stella Vic's context).

**Current:** Whisper auto-detects language, transcribes correctly.  
**Gap:** Our typo dictionary is English-only. Entity extraction prompt is English-only.  
**Fix:** Language-aware processing path. Detect language from Whisper output, route to appropriate post-processor.

### 4.3 Post-Processing Pipeline

Recommended post-processing stack for voice transcriptions:

```
Whisper Output
    ↓
1. Disfluency Removal — strip "um", "uh", false starts, repetitions
    ↓
2. Punctuation Restoration — add periods, commas, question marks
    ↓  
3. Proper Noun Correction — "zenith cred" → "ZenithCred" (domain dictionary)
    ↓
4. Number Normalization — "five hundred" → "500", "twenty twenty six" → "2026"
    ↓
5. Sentence Segmentation — split into logical sentences for extraction
    ↓
Clean Text → NLP Pipeline
```

Steps 1-4 can be done with a lightweight LLM call or rule-based. Step 5 is critical for entity extraction quality.

**Estimated latency:** 200-500ms for rule-based, 1-2s with LLM call.

---

## 5. Database-Backed Context Systems

### 5.1 Why Database Over Files

| Aspect | File (`retrieved-context.md`) | Database (SQLite) |
|--------|-------------------------------|-------------------|
| Multi-user | ❌ One file, one user | ✅ Per-user DB or table |
| Querying | ❌ Full text read every time | ✅ Indexed queries |
| Concurrency | ❌ Race conditions | ✅ WAL mode handles it |
| GDPR deletion | ❌ Can't isolate user data | ✅ Drop user's DB |
| Caching | ❌ Full file every time | ✅ Query only what's needed |
| Versioning | ❌ Overwritten | ✅ Timestamped rows |

### 5.2 Per-User SQLite Isolation (Our Chosen Pattern)

We've already decided on per-user SQLite files for the dashboard (`data/users/<userId>/kira.db`). The NLP pipeline should follow the same pattern:

```
data/users/<userId>/
├── kira.db          # Projects, tasks, documents (existing)
├── memory.db        # Knowledge graph, embeddings, context (NEW)
├── vdr/             # Virtual data room files (existing)
└── chat.json        # Chat history (existing, migrate to DB)
```

**`memory.db` schema:**

```sql
-- Entities (people, companies, concepts mentioned by this user)
CREATE TABLE entities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,        -- person, company, project, concept, etc.
    name TEXT NOT NULL,
    description TEXT,
    confidence REAL DEFAULT 1.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    valid_from TEXT,           -- temporal: when fact became true
    valid_until TEXT           -- temporal: when fact stopped being true (NULL = still valid)
);

-- Relations (connections between entities)  
CREATE TABLE relations (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES entities(id),
    target_id TEXT NOT NULL REFERENCES entities(id),
    type TEXT NOT NULL,
    properties TEXT,           -- JSON
    confidence REAL DEFAULT 1.0,
    valid_from TEXT,
    valid_until TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Facts (subject-predicate-object triples)
CREATE TABLE facts (
    id TEXT PRIMARY KEY,
    subject_id TEXT REFERENCES entities(id),
    predicate TEXT NOT NULL,
    object TEXT NOT NULL,
    source TEXT,               -- message ID or document path
    confidence REAL DEFAULT 1.0,
    valid_from TEXT DEFAULT CURRENT_TIMESTAMP,
    valid_until TEXT,          -- NULL = still valid, set when superseded
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Embeddings (vector store for semantic search)
CREATE TABLE embeddings (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,  -- entity, fact, message, chunk
    source_id TEXT,
    text TEXT NOT NULL,
    vector BLOB NOT NULL,       -- Float32Array
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Context cache (pre-computed context for fast retrieval)
CREATE TABLE context_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_hash TEXT UNIQUE,     -- hash of the query that generated this
    context_text TEXT NOT NULL,  -- pre-formatted context string
    entities_used TEXT,          -- JSON array of entity IDs used
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT              -- auto-invalidate after N hours
);

-- Episodes (conversation segments for context continuity)
CREATE TABLE episodes (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    summary TEXT,
    entities_mentioned TEXT,     -- JSON array
    facts_extracted TEXT,        -- JSON array  
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Decisions (temporal — what the user decided and when)
CREATE TABLE decisions (
    id TEXT PRIMARY KEY,
    what TEXT NOT NULL,
    why TEXT,
    context TEXT,
    supersedes TEXT,            -- ID of previous decision this replaces
    made_at TEXT DEFAULT CURRENT_TIMESTAMP,
    valid_until TEXT
);

-- Preferences (learned user patterns)
CREATE TABLE preferences (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    context TEXT,
    confidence REAL DEFAULT 0.5,
    discovered_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_confirmed TEXT
);

-- Processing queue (replaces file watching)
CREATE TABLE processing_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_text TEXT NOT NULL,
    message_role TEXT DEFAULT 'user',
    source TEXT,                -- 'webui', 'telegram', 'voice', 'api'
    status TEXT DEFAULT 'pending',  -- pending, processing, done, error
    result TEXT,                -- JSON extraction result
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    processed_at TEXT
);

-- Indexes
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_facts_subject ON facts(subject_id);
CREATE INDEX idx_facts_valid ON facts(valid_from, valid_until);
CREATE INDEX idx_embeddings_source ON embeddings(source_type, source_id);
CREATE INDEX idx_context_cache_hash ON context_cache(query_hash);
CREATE INDEX idx_queue_status ON processing_queue(status);
CREATE INDEX idx_episodes_session ON episodes(session_id);
```

### 5.3 Temporal Fact Management (Inspired by Graphiti/Zep)

Key innovation from Zep's Graphiti: **bi-temporal modeling**.

Every fact has two time dimensions:
- **Event time (`valid_from`):** When the fact became true in the real world
- **Ingestion time (`created_at`):** When the system learned about it

When a fact is superseded:
```sql
-- User says "I'm switching from React to HTMX"
-- Step 1: Invalidate old fact
UPDATE facts SET valid_until = CURRENT_TIMESTAMP 
WHERE subject_id = 'ent-otto' AND predicate = 'prefers' AND object = 'React';

-- Step 2: Insert new fact
INSERT INTO facts (id, subject_id, predicate, object, valid_from)
VALUES ('fact-new', 'ent-otto', 'prefers', 'HTMX', CURRENT_TIMESTAMP);
```

This lets us answer temporal queries:
- "What does Otto prefer now?" → `WHERE valid_until IS NULL`
- "What did Otto prefer last month?" → `WHERE valid_from <= '2026-01-14' AND (valid_until IS NULL OR valid_until > '2026-01-14')`

### 5.4 Context Assembly (Replacing `retrieved-context.md`)

Instead of writing a file, the enrichment function returns a structured object:

```javascript
async function assembleContext(userId, query) {
    const db = getUserDb(userId);  // Opens data/users/<userId>/memory.db
    
    // 1. Direct entity match
    const entities = searchEntities(db, query);
    
    // 2. Graph traversal (1-2 hops from matched entities)
    const related = traverseGraph(db, entities, { maxHops: 2, limit: 20 });
    
    // 3. Temporal facts (only currently valid)
    const facts = getCurrentFacts(db, entities, related);
    
    // 4. Semantic search (embeddings)
    const similar = semanticSearch(db, query, { threshold: 0.65, limit: 8 });
    
    // 5. Recent decisions
    const decisions = getRecentDecisions(db, { days: 7 });
    
    // 6. Preferences
    const preferences = getPreferences(db);
    
    // 7. Check cache
    const cached = checkContextCache(db, query);
    if (cached && !isExpired(cached)) return cached;
    
    // 8. Format and cache
    const context = formatContext({ entities, related, facts, similar, decisions, preferences });
    cacheContext(db, query, context, { expiresInHours: 1 });
    
    db.close();
    return context;
}
```

**How the agent gets context:** Instead of reading a file, the WebUI/server calls `assembleContext()` and injects the result into the system prompt or a prepended context block before sending to OpenClaw.

---

## 6. Production Architecture Patterns

### 6.1 Real-Time Enrichment (Streaming vs Batch)

**Current:** Batch — graph sync daemon polls JSONL every 10-60 seconds.  
**V2:** Event-driven — messages trigger processing immediately.

```
User Message Arrives (WebUI/Telegram/Voice)
    ↓ (immediate, <50ms)
Processing Queue INSERT
    ↓ (async worker picks up, <100ms)
Entity Extraction (local LLM or rules)
    ↓ (200-2000ms depending on model)
Store to user's memory.db
    ↓ (immediate)
Embedding generation (async, non-blocking)
    ↓ (500-1500ms)
Context assembly for next query
```

### 6.2 Latency Budget

For our async voice message use case (not real-time conversation):

| Stage | Budget | Notes |
|-------|--------|-------|
| Audio upload | 200-500ms | Depends on message length |
| Whisper transcription | 500-3000ms | Depends on message length, GPU availability |
| Post-processing | 100-300ms | Disfluency removal, punctuation, proper nouns |
| Context assembly | 50-200ms | SQLite queries, cached when possible |
| Total enrichment overhead | 200-500ms | On top of transcription |
| Agent response | 2-10s | LLM dependent |
| **Total voice-to-response** | **3-14s** | Acceptable for async messages |

### 6.3 Concurrent Users Architecture

For thousands of users:

```
                     ┌─────────────────────────────────────┐
                     │           Load Balancer              │
                     └──────────────┬──────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
     ┌────────┴────────┐  ┌────────┴────────┐  ┌────────┴────────┐
     │  API Server 1   │  │  API Server 2   │  │  API Server N   │
     │  (Node.js)      │  │  (Node.js)      │  │  (Node.js)      │
     └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
              │                     │                     │
              ├── Per-user SQLite pool (LRU cache of open connections)
              │
     ┌────────┴────────┐
     │  data/users/    │
     │  ├── user1/     │   ← Each user has own memory.db
     │  │   └── memory.db
     │  ├── user2/     │
     │  │   └── memory.db
     │  └── userN/     │
     │      └── memory.db
     └─────────────────┘
              │
     ┌────────┴────────┐
     │  Shared Services │
     │  ├── Whisper GPU │   ← Queue-based, shared across users
     │  ├── Ollama      │   ← Extraction + embeddings
     │  └── GPU Router  │   ← VRAM time-sharing
     └─────────────────┘
```

**Connection pooling:** Keep an LRU cache of open SQLite connections (max ~100 concurrent). Open on demand, close after 5 min idle. SQLite handles this well — each DB is tiny.

### 6.4 Queue-Based GPU Access

GPU is the bottleneck. Multiple users sending voice messages simultaneously need queuing:

```javascript
// GPU job queue (Bull/BullMQ or simple in-memory for MVP)
const queue = {
    transcription: [],  // Whisper jobs (priority: high)
    extraction: [],     // Entity extraction (priority: medium)
    embedding: [],      // Embedding generation (priority: low)
};

// Process: transcription always first, then extraction, then embeddings
// Embeddings can be batched and run during idle time
```

---

## 7. V2 Architecture Design

### 7.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACES                          │
│  WebUI (:3847)  │  Telegram Bot  │  API  │  Voice (Whisper)     │
└────────┬────────┴───────┬────────┴───┬───┴────────┬────────────┘
         │                │            │            │
         └────────────────┴────────────┴────────────┘
                          │
                 ┌────────┴────────┐
                 │  Message Router  │  ← Identifies user, routes to pipeline
                 └────────┬────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
    ┌─────────┴─────────┐  ┌─────────┴─────────┐
    │  Voice Pipeline    │  │  Text Pipeline     │
    │  (if audio input)  │  │  (if text input)   │
    │  ┌───────────────┐ │  │  ┌───────────────┐ │
    │  │ Whisper ASR   │ │  │  │ Typo Fix      │ │
    │  │ Post-Process  │ │  │  │ NER           │ │
    │  │ Clean Text    │ │  │  │ Clean Text    │ │
    │  └───────────────┘ │  │  └───────────────┘ │
    └─────────┬──────────┘  └─────────┬──────────┘
              │                       │
              └───────────┬───────────┘
                          │
                 ┌────────┴────────┐
                 │ Context Engine   │  ← Per-user memory.db
                 │ ┌──────────────┐│
                 │ │ Graph Search ││  ← Entity match + traversal
                 │ │ Vector Search││  ← Semantic similarity
                 │ │ Temporal     ││  ← Current facts only
                 │ │ Preferences  ││  ← Learned patterns
                 │ │ Cache        ││  ← Avoid redundant work
                 │ └──────────────┘│
                 └────────┬────────┘
                          │
                 ┌────────┴────────┐
                 │ Prompt Assembly  │  ← Combines user message + context
                 └────────┬────────┘
                          │
                 ┌────────┴────────┐
                 │ Agent (OpenClaw) │
                 └────────┬────────┘
                          │
                 ┌────────┴────────┐
                 │ Response Handler │
                 │ ┌──────────────┐│
                 │ │ Extract      ││  ← Entities/facts from response
                 │ │ Update Graph ││  ← Store to user's memory.db
                 │ │ Embed        ││  ← Generate embeddings (async)
                 │ └──────────────┘│
                 └─────────────────┘
```

### 7.2 Key Design Decisions

1. **Context injection via system prompt, not file** — The context engine returns a string that gets prepended to the user message or injected as a system context block. No more file I/O.

2. **Processing queue in SQLite** — Each user's `memory.db` has a `processing_queue` table. Messages go in immediately, worker processes them async. No JSONL polling.

3. **Extraction uses CPU-friendly model** — Move from GPU-dependent Ollama to:
   - Rule-based NER for known entities (fast, no GPU)
   - Small CPU model for novel entity extraction (e.g., ONNX-exported model)
   - GPU LLM only for complex/ambiguous cases

4. **Embeddings generated lazily** — Don't block the request. Queue embedding generation, run during idle periods.

5. **Fact supersession is automatic** — When extraction finds a fact that contradicts an existing one (same subject + predicate), the old fact gets `valid_until` set.

### 7.3 API Contract

```javascript
// Context Engine API (internal, called by server-v2.js)

// Enrich a user message with context before sending to agent
POST /api/internal/enrich
Body: { userId, message, source: 'webui'|'telegram'|'voice' }
Response: { enrichedMessage, context, processingMs }

// Process agent response (extract entities, update graph)  
POST /api/internal/process-response
Body: { userId, message, role: 'assistant' }
Response: { extracted: { entities, relations, facts }, stored }

// Query context directly (for UI display)
GET /api/internal/context?userId=X&query=Y
Response: { entities, relations, facts, similar }

// Get user's graph stats
GET /api/internal/graph-stats?userId=X
Response: { entities, relations, facts, embeddings, lastUpdated }
```

---

## 8. Migration Plan

### Phase 1: Database Schema + Per-User Isolation (2-3 days)

1. Create `memory.db` schema (copy from Section 5.2)
2. Add `getUserMemoryDb(userId)` function with connection pooling
3. Migrate `nlp-graph-layer.js` to accept `db` parameter instead of opening global DB
4. Add temporal fields (`valid_from`, `valid_until`) to entity/fact operations
5. Keep `unified.db` running in parallel (read-only for existing data)

**Test:** Run extraction on a test message using per-user DB. Verify entities stored correctly.

### Phase 2: Context Engine (2-3 days)

1. Build `context-engine.js` — the `assembleContext()` function
2. Replace file-write in message-proxy with context engine call
3. Add context cache table + cache invalidation logic
4. Wire into `server-v2.js` — enrich messages before OpenClaw
5. Remove `retrieved-context.md` dependency

**Test:** Send message via WebUI, verify context assembled from DB not file. Compare quality with file-based approach.

### Phase 3: Voice Post-Processing (1-2 days)

1. Build `voice-postprocess.js`:
   - Disfluency removal (regex-based for common patterns)
   - Proper noun dictionary (project names, people)
   - Sentence boundary detection
   - Number normalization
2. Wire into transcription endpoint (between Whisper and enrichment)
3. Language detection routing (EN/NL/PT)

**Test:** Transcribe 10 voice messages with and without post-processing. Measure extraction quality improvement.

### Phase 4: Processing Queue (1-2 days)

1. Replace JSONL file watching with `processing_queue` table
2. Build queue worker that processes pending messages
3. Add extraction result storage for debugging/replay
4. Idle-aware processing (batch during low activity)

**Test:** Send 20 messages rapidly, verify all processed without loss. Verify idle mode engages after 2 min.

### Phase 5: Graph Quality (1-2 days)

1. Entity type enforcement (Otto = person, not concept)
2. Entity deduplication on insert (fuzzy match existing names)
3. Fact confidence decay (old unconfirmed facts lose confidence)
4. Prune low-value entities (below confidence threshold)
5. Migrate quality data from `unified.db` to per-user DBs

**Test:** Run extraction on 100 messages, verify entity types are correct. Check duplicate rate.

### Phase 6: Multi-User Data Migration (1 day)

1. Script to export Otto's data from `unified.db` into his `memory.db`
2. Verify entity/fact/embedding counts match
3. Switch message-proxy to use per-user DB
4. Keep `unified.db` as read-only backup for 30 days
5. Deprecate file-based context

**Test:** Full pipeline test — voice message → transcription → enrichment → agent response → extraction → graph update. All using per-user DB.

### Total Estimated Time: 8-13 days

---

## 9. Technology Choices

| Component | Current | V2 Choice | Reasoning |
|-----------|---------|-----------|-----------|
| **Graph Storage** | SQLite `unified.db` | Per-user SQLite `memory.db` | Aligns with existing pattern, GDPR-ready, simple |
| **Vector Search** | In-memory cosine scan | SQLite + in-memory scan | Good enough for per-user scale (<100K embeddings per user) |
| **Entity Extraction** | Ollama granite3.3:2b (GPU) | Rule-based + CPU model fallback | Remove GPU dependency for extraction |
| **Embeddings** | Ollama nomic-embed-text (GPU) | Same, but batched + async | Already works, just decouple from request path |
| **Typo Correction** | Dictionary lookup | Same + language detection | Works well, just needs NL/PT dictionaries |
| **Context Delivery** | File write → OpenClaw workspace | API call → system prompt injection | Eliminates file I/O bottleneck |
| **Message Processing** | JSONL polling (10-60s) | SQLite queue (event-driven) | Real-time, reliable, no file watching |
| **Voice Post-Processing** | None | Rule-based + small LLM | Essential for voice quality |
| **Temporal Facts** | Timestamps only | Bi-temporal (valid_from/valid_until) | Enables "what changed" queries |

### Why NOT Neo4j/PostgreSQL/FalkorDB?

- **Neo4j:** Overkill for per-user graphs of <50K nodes. Adds infrastructure complexity. Can't easily do per-user isolation without separate databases.
- **PostgreSQL:** Good for multi-tenant with row-level security, but we've decided on SQLite. Migration path exists if needed.
- **FalkorDB:** Redis-based graph DB, great for traversal but adds a service dependency. Not worth it at our scale.

**SQLite is the right choice** for v1.0. Each user's graph is small enough that in-memory operations are fast. If a user grows past 1M facts, we can shard or migrate that specific user to PostgreSQL.

---

## 10. Effort Estimates

| Phase | Effort | Priority | Dependencies |
|-------|--------|----------|-------------|
| 1. DB Schema + Isolation | 2-3 days | P0 | None |
| 2. Context Engine | 2-3 days | P0 | Phase 1 |
| 3. Voice Post-Processing | 1-2 days | P1 | None (parallel) |
| 4. Processing Queue | 1-2 days | P1 | Phase 1 |
| 5. Graph Quality | 1-2 days | P2 | Phase 1 |
| 6. Data Migration | 1 day | P0 | Phases 1-2 |
| **Total** | **8-13 days** | | |

### Quick Wins (do first, high impact):

1. **Context cache table** — Avoid re-computing context for similar queries. 2 hours.
2. **Fact supersession** — Mark old facts invalid when new ones contradict. 4 hours.
3. **Entity type enforcement** — Hard-code known entity types for known names. 2 hours.
4. **Voice proper noun dictionary** — "zenith cred" → "ZenithCred". 1 hour.

### What We're NOT Building (yet):

- Real-time voice conversation (sub-500ms) — We don't need it. Async voice messages are fine.
- Speaker diarization — Single user per message, not needed.
- TTS response — Text responses are fine for now (ElevenLabs exists when we want it).
- Graph visualization in WebUI — Already have this, just needs to read from per-user DB.
- Pipecat/LiveKit integration — For real-time voice agents in the future, not now.

---

## Appendix A: Key Sources

1. **Pipecat** — Open-source voice agent framework. https://docs.pipecat.ai
2. **Zep/Graphiti** — Temporal knowledge graphs. https://github.com/getzep/graphiti
3. **Mem0** — Agent memory system. https://github.com/mem0ai/mem0
4. **Letta/MemGPT** — Hierarchical memory management. https://www.letta.com
5. **Deepgram** — Voice AI workflow design. https://deepgram.com/learn/designing-voice-ai-workflows
6. **AssemblyAI** — Voice AI stack overview. https://www.assemblyai.com/blog/the-voice-ai-stack
7. **Whisper Post-Processing** — https://developers.openai.com/cookbook/examples/whisper_processing_guide
8. **LoCoMo Benchmark** — Long-context memory evaluation standard

## Appendix B: Current File Inventory

| File | Lines | Purpose | V2 Status |
|------|-------|---------|-----------|
| `nlp-graph-layer.js` | 610 | Core extract/enrich/embed | Refactor: add userId parameter |
| `message-proxy.js` | 438 | Typo fix + context enrichment | Refactor: DB-backed context |
| `graph-sync-daemon.js` | 340 | JSONL watcher | Replace: processing queue |
| `graph-improvements.js` | ~300 | Dedup, normalize, link orphans | Keep: runs per-user |
| `embeddings.js` | ~200 | Embedding utilities | Merge: into nlp-graph-layer |
| `memory/unified.db` | - | Single graph DB | Migrate: to per-user memory.db |
| `memory/retrieved-context.md` | 3KB | File-based context output | **DELETE** |

---

## 11. Current System Benchmarks (Live Results)

### 11.1 Graph Statistics (as of 2026-02-14)

| Metric | Count | Growth Rate |
|--------|-------|-------------|
| Entities | 16,784 | ~500/day |
| Relations | 33,756 | ~1000/day |
| Facts | 60,182 | ~2000/day |
| Embeddings | 24,874 | ~500/day |
| DB Size | 137 MB | ~5 MB/day |
| **Projected 1-year (1 user)** | **~500K facts** | **~2 GB** |
| **Projected 1000 users** | **~500M facts** | **~2 TB** |

At current per-user growth rates, SQLite per-user isolation is comfortable. Each user's `memory.db` would be ~2 GB after a year of heavy use. SQLite handles this easily — queries on 500K rows with proper indexes return in <10ms.

### 11.2 Enrichment Latency Benchmark

Tested 8 queries against the live graph (16.7K entities, 24.8K embeddings):

| Query | Latency | Entities Found | Semantic Matches | Context Size |
|-------|---------|---------------|-----------------|-------------|
| "What is ZenithCred?" | 251ms | **0** ❌ | 5 | 292 chars |
| "Tell me about Otto" | 201ms | **0** ❌ | 5 | 320 chars |
| "Chimera protocol architecture" | 186ms | **0** ❌ | 5 | 417 chars |
| "Stella Vic tax AI" | 169ms | **0** ❌ | 5 | 378 chars |
| "dashboard UI improvements" | 177ms | **0** ❌ | 5 | 467 chars |
| "voice recording pipeline" | 156ms | **0** ❌ | 5 | 486 chars |
| "NLP graph layer performance" | 230ms | **0** ❌ | 5 | 1234 chars |
| "investor pitch deck progress" | 261ms | **0** ❌ | 5 | 434 chars |

**Average latency: 209ms** — acceptable.
**Entity retrieval: 0/8** — CRITICAL BUG (see below).
**Semantic search working:** 5 matches per query — the only thing producing results.

### 11.3 🐛 CRITICAL BUG: Text Search Returns Nothing

**Bug:** The `enrich()` function in `nlp-graph-layer.js` uses the ENTIRE query string as a LIKE pattern:

```javascript
// Current (BROKEN):
const like = `%${query}%`;  // query = "What is ZenithCred?"
// Searches for: WHERE name LIKE '%What is ZenithCred?%'
// This NEVER matches because no entity name contains "What is ZenithCred?"

// Should be (FIXED):
// Extract keywords, search each individually
// "ZenithCred" → 139 entity matches
// "Otto" → many matches
// "Chimera" → many matches
```

**Impact:** The graph's 16,784 entities and 60,182 facts are **completely invisible** to the enrichment pipeline. The only retrieval working is embedding-based semantic search (which has a 0.65 threshold, so it's quite selective). This means:

1. The context file (`retrieved-context.md`) has been running on semantic search alone
2. Graph traversal (relations, connected facts) never fires because entities are never found
3. The "Known Entities", "Relationships", and "Known Facts" sections of context output are always empty
4. We've been getting ~30% of the retrieval quality we should be getting

**Fix (v2):**

```javascript
function extractKeywords(query) {
    // Remove stop words, extract meaningful terms
    const stopWords = new Set(['what', 'is', 'the', 'a', 'an', 'how', 'why', 'when',
        'where', 'who', 'which', 'tell', 'me', 'about', 'can', 'you', 'do', 'does',
        'did', 'will', 'would', 'could', 'should', 'have', 'has', 'had', 'be', 'been',
        'being', 'are', 'was', 'were', 'am', 'to', 'for', 'of', 'in', 'on', 'at',
        'by', 'with', 'from', 'and', 'or', 'not', 'this', 'that', 'these', 'those',
        'it', 'its', 'my', 'your', 'our', 'their', 'i', 'we', 'they', 'he', 'she']);
    
    return query
        .replace(/[?!.,;:'"()]/g, '')  // Strip punctuation
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
}

function searchEntities(db, query) {
    const keywords = extractKeywords(query);
    if (keywords.length === 0) return [];
    
    // Search each keyword independently, score by match count
    const entityScores = new Map();
    
    for (const kw of keywords) {
        const like = `%${kw}%`;
        const matches = db.prepare(`
            SELECT id, name, type, description FROM entities
            WHERE name LIKE ? OR description LIKE ?
            LIMIT 20
        `).all(like, like);
        
        for (const m of matches) {
            const existing = entityScores.get(m.id) || { ...m, score: 0 };
            existing.score += 1;  // Boost entities matching multiple keywords
            entityScores.set(m.id, existing);
        }
    }
    
    // Sort by score (most keyword matches first), then take top 10
    return Array.from(entityScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
}
```

**Estimated improvement:** 3-5x better context quality. Graph traversal will start working, providing relationship and fact data that was previously invisible.

### 11.4 Latency Breakdown

Where does the 209ms go?

| Operation | Time | Notes |
|-----------|------|-------|
| DB open + query entities | ~5ms | Fast, SQLite WAL mode |
| LIKE search (broken) | ~2ms | Returns 0 rows, so fast |
| Get relations + facts | ~0ms | Skipped (no entities found) |
| Generate query embedding | ~120ms | Ollama nomic-embed-text |
| Load all 24,874 embeddings | ~30ms | Read BLOB data from disk |
| Cosine similarity scan | ~40ms | Brute-force all 24K vectors |
| Build context string | ~2ms | String concatenation |

**The bottleneck is embedding generation (120ms) + brute-force scan (40ms).** For a single user with 25K embeddings, this is fine. For 1000 users, each with 25K embeddings, this is still fine because each user has their own DB.

**Future optimization:** Use `sqlite-vec` extension for native SIMD-accelerated vector search. Would reduce the cosine scan from 40ms to <5ms. Not critical for v1 but worth adding.

---

## 12. Context Assembly Algorithm (V2 Detailed Design)

### 12.1 The Problem

Currently: one markdown file, refreshed periodically, contains everything.
Needed: per-query, per-user, on-demand context with token budget management.

### 12.2 Token Budget Framework

The agent's context window has limited space. Context injection must be budget-aware:

```
Total Context Window: ~128K tokens (Claude)
├── System Prompt: ~2K tokens (fixed)
├── Conversation History: 10-50K tokens (variable)
├── Tools + Skills: ~5K tokens (fixed)
├── MEMORY.md + workspace: ~5K tokens (fixed)
└── Injected Context Budget: 500-2000 tokens (our enrichment)
```

Our budget is **500-2000 tokens** (~2000-8000 chars). Must be ruthlessly selective.

### 12.3 Context Relevance Scoring

Each piece of context gets a relevance score based on multiple signals:

```javascript
function scoreContext(item, query, userId) {
    let score = 0;
    
    // 1. Keyword match (0-0.3)
    const keywords = extractKeywords(query);
    const matchCount = keywords.filter(kw => 
        item.text.toLowerCase().includes(kw.toLowerCase())
    ).length;
    score += (matchCount / keywords.length) * 0.3;
    
    // 2. Semantic similarity (0-0.3)
    score += item.cosineSimilarity * 0.3;
    
    // 3. Recency (0-0.15)
    const ageHours = (Date.now() - new Date(item.timestamp).getTime()) / 3600000;
    score += Math.max(0, 0.15 * Math.exp(-ageHours / 168)); // Decays over 1 week
    
    // 4. Connection density (0-0.1)
    // Entities with more connections are more important
    score += Math.min(0.1, (item.connections || 0) / 100 * 0.1);
    
    // 5. Fact validity (0-0.1)
    // Currently valid facts score higher than expired ones
    if (item.valid_until === null) score += 0.1;
    else if (new Date(item.valid_until) > new Date()) score += 0.05;
    
    // 6. Confirmation count (0-0.05)
    // Facts mentioned multiple times are more reliable
    score += Math.min(0.05, (item.confirmations || 1) / 10 * 0.05);
    
    return score;
}
```

### 12.4 Hybrid Retrieval with RRF

Instead of scoring items individually, use Reciprocal Rank Fusion to merge results from multiple retrieval methods:

```javascript
async function hybridRetrieve(db, query, opts = {}) {
    const k = 60; // RRF constant
    const maxPerMethod = opts.maxPerMethod || 20;
    
    // Method 1: Keyword search (FTS5 or LIKE)
    const keywordResults = keywordSearch(db, query, maxPerMethod);
    
    // Method 2: Vector similarity search
    const queryVec = await getEmbedding(query);
    const vectorResults = vectorSearch(db, queryVec, maxPerMethod);
    
    // Method 3: Graph traversal (from keyword-matched entities)
    const graphResults = graphTraverse(db, keywordResults.map(r => r.id), { maxHops: 2 });
    
    // Method 4: Temporal relevance (recent facts)
    const temporalResults = recentFacts(db, { hours: 48, limit: maxPerMethod });
    
    // RRF Fusion
    const allMethods = [
        { name: 'keyword', results: keywordResults, weight: 1.0 },
        { name: 'vector', results: vectorResults, weight: 0.8 },
        { name: 'graph', results: graphResults, weight: 0.6 },
        { name: 'temporal', results: temporalResults, weight: 0.4 },
    ];
    
    const scores = new Map();
    
    for (const method of allMethods) {
        for (let rank = 0; rank < method.results.length; rank++) {
            const item = method.results[rank];
            const itemKey = item.id || item.text;
            const existing = scores.get(itemKey) || { item, score: 0, methods: [] };
            existing.score += method.weight * (1 / (k + rank + 1));
            existing.methods.push(method.name);
            scores.set(itemKey, existing);
        }
    }
    
    // Sort by fused score, return top results
    return Array.from(scores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, opts.maxResults || 15);
}
```

### 12.5 Context Formatting with Budget

```javascript
function formatContextWithBudget(results, budgetChars = 4000) {
    const sections = {
        entities: { header: '## Relevant Context', items: [], priority: 1 },
        facts: { header: '## Known Facts', items: [], priority: 2 },
        decisions: { header: '## Recent Decisions', items: [], priority: 3 },
        preferences: { header: '## Preferences', items: [], priority: 4 },
    };
    
    // Classify results into sections
    for (const r of results) {
        if (r.item.type === 'entity') {
            sections.entities.items.push(`- **${r.item.name}** (${r.item.entityType}): ${r.item.description || 'No description'}`);
        } else if (r.item.type === 'fact') {
            sections.facts.items.push(`- ${r.item.subject} ${r.item.predicate} ${r.item.object}`);
        } else if (r.item.type === 'decision') {
            sections.decisions.items.push(`- ${r.item.what} (${r.item.why || 'no reason recorded'})`);
        } else if (r.item.type === 'preference') {
            sections.preferences.items.push(`- ${r.item.key}: ${r.item.value}`);
        }
    }
    
    // Build output respecting budget
    let output = '';
    let remaining = budgetChars;
    
    const orderedSections = Object.values(sections)
        .filter(s => s.items.length > 0)
        .sort((a, b) => a.priority - b.priority);
    
    for (const section of orderedSections) {
        const sectionText = section.header + '\n' + section.items.join('\n') + '\n\n';
        if (sectionText.length <= remaining) {
            output += sectionText;
            remaining -= sectionText.length;
        } else {
            // Partial: add as many items as fit
            let partial = section.header + '\n';
            for (const item of section.items) {
                if (partial.length + item.length + 1 <= remaining) {
                    partial += item + '\n';
                } else break;
            }
            output += partial + '\n';
            break; // Budget exhausted
        }
    }
    
    return output.trim();
}
```

### 12.6 Context Delivery to Agent

Three options for how the assembled context reaches the agent:

**Option A: System Prompt Injection (Recommended for v1)**
```
WebUI message arrives
  → assembleContext(userId, message)
  → Prepend context to message: "[Context]\n{context}\n[/Context]\n\n{original message}"
  → Send to OpenClaw agent
```
- Pros: No OpenClaw modifications needed, works today
- Cons: Uses user message tokens, context visible in chat

**Option B: Workspace File (Current Approach, Improved)**
```
WebUI message arrives
  → assembleContext(userId, message)  
  → Write to per-user context file: data/users/{userId}/context.md
  → OpenClaw loads as workspace context
```
- Pros: Familiar pattern, OpenClaw already supports workspace files
- Cons: Still file-based, race conditions possible

**Option C: OpenClaw Plugin (Future)**
```
OpenClaw receives message
  → Plugin hook calls context engine API
  → Context injected into system prompt automatically
  → No file I/O, no message modification
```
- Pros: Cleanest architecture, no workarounds
- Cons: Requires OpenClaw plugin development

**Recommendation:** Start with Option A (message prepend). It's the simplest, works today, and the context is useful for the agent to see explicitly. Migrate to Option C when we build the OpenClaw plugin system.

---

## 13. Voice Post-Processing Implementation

### 13.1 Disfluency Removal

```javascript
function removeDisfluencies(text) {
    // Common filler words (EN/NL/PT)
    const fillers = {
        en: /\b(um|uh|er|ah|like|you know|I mean|basically|actually|sort of|kind of|well)\b/gi,
        nl: /\b(uhm|eh|nou|ja|eigenlijk|zeg maar|weet je|dus)\b/gi,
        pt: /\b(é|né|tipo|assim|então|bom|olha|sabe)\b/gi,
    };
    
    let cleaned = text;
    
    // Remove fillers for all languages (safe — these are noise in any context)
    for (const pattern of Object.values(fillers)) {
        cleaned = cleaned.replace(pattern, '');
    }
    
    // Remove false starts: "I want to— actually" → "actually"
    cleaned = cleaned.replace(/\b\w+\s+to[—–-]+\s*/g, '');
    
    // Remove word repetitions: "the the" → "the"
    cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');
    
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    
    return cleaned;
}
```

### 13.2 Proper Noun Correction (Domain Dictionary)

```javascript
// Auto-generated from knowledge graph entities + manual additions
const PROPER_NOUNS = {
    // From graph: entity names that Whisper might mis-transcribe
    'zenith cred': 'ZenithCred',
    'zenith credit': 'ZenithCred',
    'otto gen': 'OttoGen',
    'auto gen': 'OttoGen',
    'otto jen': 'OttoGen',
    'sentinel agro': 'SentinAgro',
    'sentin agro': 'SentinAgro',
    'chimera': 'Chimera',
    'kairos': 'Kira',  // Possible mishear
    'keira': 'Kira',
    'kiara': 'Kira',
    'interactive move': 'Interactive Move',
    'cutting edge': 'CuttingEdge',
    'stella vicks': "Stella Vic's",
    'stella vics': "Stella Vic's",
    'abura': 'Abura',
    'oopuo': 'Oopuo',
    'oo poo oh': 'Oopuo',
    'moltbook': 'Moltbook',
    'nexus': 'Nexus',
    'open claw': 'OpenClaw',
    'clawed bot': 'OpenClaw',  // Legacy name
};

function correctProperNouns(text) {
    let corrected = text;
    // Sort by length (longest first) to avoid partial replacements
    const sorted = Object.entries(PROPER_NOUNS)
        .sort((a, b) => b[0].length - a[0].length);
    
    for (const [wrong, right] of sorted) {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        corrected = corrected.replace(regex, right);
    }
    return corrected;
}

// Auto-generate dictionary from graph:
function generateProperNounDict(db) {
    const entities = db.prepare(`
        SELECT name FROM entities 
        WHERE type IN ('company', 'product', 'project', 'person')
        AND LENGTH(name) > 3
        ORDER BY (SELECT COUNT(*) FROM relations WHERE source_id = entities.id OR target_id = entities.id) DESC
        LIMIT 100
    `).all();
    
    // Generate common misspellings for each entity
    const dict = {};
    for (const { name } of entities) {
        // Split camelCase: "ZenithCred" → "zenith cred"
        const split = name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
        if (split !== name.toLowerCase()) {
            dict[split] = name;
        }
    }
    return dict;
}
```

### 13.3 Number Normalization

```javascript
const NUMBER_WORDS = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
    'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
    'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
    'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
    'eighty': '80', 'ninety': '90', 'hundred': '100', 'thousand': '1000',
    'million': '1000000', 'billion': '1000000000',
};

function normalizeNumbers(text) {
    // Handle "twenty twenty six" → "2026" (year pattern)
    text = text.replace(/twenty\s+(twenty\s+\w+)/gi, (match) => {
        // Delegate to more complex number parsing
        return match; // Keep simple for MVP
    });
    
    // Handle "five hundred" → "500"
    text = text.replace(/(\w+)\s+hundred/gi, (match, num) => {
        const n = NUMBER_WORDS[num.toLowerCase()];
        return n ? String(parseInt(n) * 100) : match;
    });
    
    // Handle "fifteen percent" → "15%"
    text = text.replace(/(\w+)\s+percent/gi, (match, num) => {
        const n = NUMBER_WORDS[num.toLowerCase()];
        return n ? `${n}%` : match;
    });
    
    // Handle currency: "thirty euros" → "€30"
    text = text.replace(/(\w+)\s+(euros?|dollars?|reais?)/gi, (match, num, currency) => {
        const n = NUMBER_WORDS[num.toLowerCase()];
        if (!n) return match;
        const symbol = currency.toLowerCase().startsWith('euro') ? '€' :
                       currency.toLowerCase().startsWith('dollar') ? '$' : 'R$';
        return `${symbol}${n}`;
    });
    
    return text;
}
```

### 13.4 Complete Post-Processing Pipeline

```javascript
async function postProcessVoiceTranscript(whisperOutput, options = {}) {
    const { language } = whisperOutput;  // Whisper provides detected language
    let text = whisperOutput.text;
    
    const pipeline = [
        { name: 'disfluency', fn: removeDisfluencies, },
        { name: 'properNouns', fn: correctProperNouns },
        { name: 'numbers', fn: normalizeNumbers },
        { name: 'typos', fn: fixTypos },  // Existing typo dictionary
        { name: 'punctuation', fn: restorePunctuation },  // LLM-based if needed
    ];
    
    const log = { original: text, steps: [] };
    
    for (const step of pipeline) {
        const before = text;
        text = step.fn(text, language);
        if (text !== before) {
            log.steps.push({ name: step.name, before, after: text });
        }
    }
    
    return { text, language, log };
}

// Punctuation restoration (rule-based for speed, LLM for quality)
function restorePunctuation(text) {
    // Add period at end if missing
    if (text && !text.match(/[.!?]$/)) text += '.';
    
    // Capitalize first letter of sentences
    text = text.replace(/(^|[.!?]\s+)([a-z])/g, (m, p, c) => p + c.toUpperCase());
    
    // Add question marks for question patterns
    text = text.replace(/\b(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does|did|will)\b[^.!?]*$/gim, 
        match => match + '?');
    
    return text;
}
```

---

## 14. FTS5 Integration for V2

### 14.1 Why FTS5

The current LIKE-based search is:
- Slow on large datasets (full table scan)
- Case-sensitive without explicit LOWER()
- No relevance ranking

FTS5 provides:
- Indexed full-text search (~100x faster than LIKE)
- BM25 ranking built-in
- Prefix matching, phrase queries
- Integration with SQLite (no external dependencies)

### 14.2 Schema Addition

```sql
-- FTS5 virtual table mirroring entity data
CREATE VIRTUAL TABLE entities_fts USING fts5(
    name, 
    description, 
    type,
    content='entities',
    content_rowid='rowid'
);

-- FTS5 for facts
CREATE VIRTUAL TABLE facts_fts USING fts5(
    subject_name,
    predicate,
    object,
    content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER entities_ai AFTER INSERT ON entities BEGIN
    INSERT INTO entities_fts(rowid, name, description, type) 
    VALUES (new.rowid, new.name, new.description, new.type);
END;

CREATE TRIGGER entities_ad AFTER DELETE ON entities BEGIN
    INSERT INTO entities_fts(entities_fts, rowid, name, description, type) 
    VALUES('delete', old.rowid, old.name, old.description, old.type);
END;

CREATE TRIGGER entities_au AFTER UPDATE ON entities BEGIN
    INSERT INTO entities_fts(entities_fts, rowid, name, description, type)
    VALUES('delete', old.rowid, old.name, old.description, old.type);
    INSERT INTO entities_fts(rowid, name, description, type)
    VALUES (new.rowid, new.name, new.description, new.type);
END;
```

### 14.3 FTS5 Search Function

```javascript
function ftsSearchEntities(db, query) {
    const keywords = extractKeywords(query);
    if (keywords.length === 0) return [];
    
    // Build FTS5 query: "ZenithCred" OR "pitch" OR "deck"
    const ftsQuery = keywords.map(kw => `"${kw}"`).join(' OR ');
    
    return db.prepare(`
        SELECT e.id, e.name, e.type, e.description,
               rank as relevance
        FROM entities_fts 
        JOIN entities e ON entities_fts.rowid = e.rowid
        WHERE entities_fts MATCH ?
        ORDER BY rank
        LIMIT 15
    `).all(ftsQuery);
}
```

---

## 15. sqlite-vec Integration for V2

### 15.1 Why sqlite-vec

Current approach: load ALL embeddings into memory, brute-force cosine similarity in JavaScript. This works at 25K embeddings (40ms) but doesn't scale.

`sqlite-vec` provides:
- Native SIMD-accelerated vector search
- No need to load all embeddings into memory
- KNN queries directly in SQL
- Works with `better-sqlite3` (our existing driver)

### 15.2 Installation

```bash
npm install sqlite-vec
```

### 15.3 Implementation

```javascript
const sqliteVec = require('sqlite-vec');

function createVectorDb(dbPath) {
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    sqliteVec.load(db);  // Load the extension
    
    // Create vector table (768 dimensions for nomic-embed-text)
    db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS vec_embeddings 
        USING vec0(
            embedding float[768],
            +source_type TEXT,
            +source_id TEXT,
            +text TEXT
        );
    `);
    
    return db;
}

function vectorSearch(db, queryVec, opts = {}) {
    const limit = opts.limit || 10;
    const queryBuf = Buffer.from(queryVec.buffer, queryVec.byteOffset, queryVec.byteLength);
    
    return db.prepare(`
        SELECT rowid, distance, source_type, source_id, text
        FROM vec_embeddings
        WHERE embedding MATCH ?
        AND k = ?
        ORDER BY distance
    `).all(queryBuf, limit);
}

// Migration: copy existing embeddings to vec_embeddings
async function migrateEmbeddings(db) {
    const old = db.prepare('SELECT source_type, source_id, text, vector FROM embeddings').all();
    const insert = db.prepare(`
        INSERT INTO vec_embeddings(embedding, source_type, source_id, text)
        VALUES (?, ?, ?, ?)
    `);
    
    const tx = db.transaction(() => {
        for (const row of old) {
            insert.run(row.vector, row.source_type, row.source_id, row.text);
        }
    });
    tx();
    
    console.log(`Migrated ${old.length} embeddings to vec_embeddings`);
}
```

### 15.4 Performance Expectations

| Embeddings Count | Current (JS brute-force) | With sqlite-vec | Speedup |
|-----------------|-------------------------|-----------------|---------|
| 1K | ~2ms | <1ms | 2x |
| 10K | ~15ms | ~2ms | 7x |
| 25K (current) | ~40ms | ~5ms | 8x |
| 100K (future) | ~160ms | ~10ms | 16x |
| 1M | ~1600ms ❌ | ~35ms | 45x |

**Verdict:** Not critical for v1 (40ms is fine), but essential for scaling past 100K embeddings per user. Add in Phase 5.

---

## 16. Entity Quality Improvements

### 16.1 Entity Type Enforcement

Current problem: extraction LLM assigns wrong types ("Otto" = "concept" instead of "person").

**Fix: Known Entity Registry**

```javascript
const KNOWN_ENTITIES = {
    'Otto': { type: 'person', description: 'CEO/Founder of Oopuo' },
    'Kira': { type: 'product', description: 'AI partner platform' },
    'ZenithCred': { type: 'company', description: 'Corporate wellness gamification' },
    'OttoGen': { type: 'company', description: 'AI services brand' },
    'Chimera': { type: 'project', description: 'Privacy-preserving distributed AI protocol' },
    'SentinAgro': { type: 'company', description: 'Drone cattle monitoring' },
    'IAM': { type: 'company', description: 'Interactive Move - projection hardware' },
    'CuttingEdge': { type: 'company', description: 'Interior design & project management' },
    'Abura': { type: 'company', description: 'Cosmetics sales' },
    'Oopuo': { type: 'company', description: 'Umbrella holding company' },
    'Nexus': { type: 'project', description: 'Personal AI OS' },
    'OpenClaw': { type: 'technology', description: 'AI agent platform' },
    'Moltbook': { type: 'product', description: 'Social network for AI agents' },
};

function enforceEntityType(entity) {
    const known = KNOWN_ENTITIES[entity.name];
    if (known) {
        entity.type = known.type;
        if (!entity.description || entity.description.length < 10) {
            entity.description = known.description;
        }
    }
    return entity;
}
```

### 16.2 Duplicate Detection on Insert

```javascript
function findDuplicateEntity(db, name) {
    // Exact match
    const exact = db.prepare('SELECT id, name FROM entities WHERE LOWER(name) = LOWER(?)').get(name);
    if (exact) return exact;
    
    // Fuzzy: check if name is a substring of existing or vice versa
    const partial = db.prepare(`
        SELECT id, name FROM entities 
        WHERE LOWER(name) LIKE '%' || LOWER(?) || '%'
        OR LOWER(?) LIKE '%' || LOWER(name) || '%'
        LIMIT 5
    `).all(name, name);
    
    // Check Levenshtein distance (if available) or simple ratio
    for (const p of partial) {
        const similarity = stringSimilarity(name.toLowerCase(), p.name.toLowerCase());
        if (similarity > 0.85) return p;  // 85% similar = likely duplicate
    }
    
    return null;
}

function stringSimilarity(a, b) {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 1.0;
    
    // Simple containment check
    if (longer.includes(shorter)) return shorter.length / longer.length;
    
    // Bigram similarity
    const bigramsA = new Set();
    for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));
    const bigramsB = new Set();
    for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));
    
    let intersection = 0;
    for (const bg of bigramsA) if (bigramsB.has(bg)) intersection++;
    
    return (2 * intersection) / (bigramsA.size + bigramsB.size);
}
```

### 16.3 Fact Confidence Decay

Facts that haven't been confirmed recently should lose confidence:

```javascript
function decayConfidence(db) {
    // Facts older than 30 days that haven't been re-confirmed lose 10% confidence
    db.prepare(`
        UPDATE facts 
        SET confidence = MAX(0.1, confidence * 0.9)
        WHERE created_at < datetime('now', '-30 days')
        AND valid_until IS NULL
        AND confidence > 0.1
    `).run();
    
    // Prune facts below 0.2 confidence (probably noise)
    const pruned = db.prepare(`
        DELETE FROM facts WHERE confidence < 0.2 AND valid_until IS NOT NULL
    `).run();
    
    return pruned.changes;
}
```

---

## 17. Immediate Fix: Patch Current Bug

While the full v2 migration is 8-13 days, the text search bug can be fixed in **30 minutes**:

```javascript
// In nlp-graph-layer.js, replace the enrich() LIKE search:

// BEFORE (line ~340):
const like = `%${query}%`;
const directEntities = db.prepare(`
    SELECT id, name, type, description FROM entities
    WHERE name LIKE ? OR description LIKE ?
    LIMIT 10
`).all(like, like);

// AFTER:
const keywords = query
    .replace(/[?!.,;:'"()]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['what','how','why','when','where','who','which',
        'tell','about','can','could','would','should','the','and','for','with',
        'from','this','that','are','was','were','has','have','had','does','did',
        'not','you','your','its','our','but'].includes(w.toLowerCase()));

let directEntities = [];
if (keywords.length > 0) {
    const entityScores = new Map();
    for (const kw of keywords) {
        const kwLike = `%${kw}%`;
        const matches = db.prepare(`
            SELECT id, name, type, description FROM entities
            WHERE name LIKE ? OR description LIKE ?
            LIMIT 20
        `).all(kwLike, kwLike);
        for (const m of matches) {
            const ex = entityScores.get(m.id) || { ...m, score: 0 };
            ex.score++;
            entityScores.set(m.id, ex);
        }
    }
    directEntities = Array.from(entityScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
}
```

This single change would immediately unlock the 16,784 entities and 60,182 facts that are currently invisible to the pipeline.

---

*End of research document. Updated 2026-02-14 with benchmarks, bug analysis, and implementation prototypes.*
*Ready for implementation when Otto gives the go-ahead.*
