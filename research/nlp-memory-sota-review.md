# NLP Extraction & Memory Systems: Current Implementation vs SOTA (March 2026)

## Executive Summary

Kira has a surprisingly complete memory architecture — 4-layer memory (working → short-term → knowledge graph → procedural), dual extraction pipelines, episodic memory, reflections, blackboard for multi-agent coordination, and vector embeddings. The unified SQLite DB holds **44K entities, 208K facts, 134K relations, 57K embeddings** — this is a serious knowledge base.

**The core gap is not architecture — it's extraction quality.** Our heuristic regex-based NLP extraction is fast (<10ms) but misses the majority of implicit facts in conversation. SOTA systems (Mem0, Zep, Letta) use LLM-based extraction as default and achieve 26%+ better accuracy. Our system has an `extractWithLLM` function but it's not wired as default.

**TL;DR Priorities:**
1. Switch NLP extraction to LLM-based (hybrid: heuristics for speed, LLM for accuracy)
2. Add semantic search to memory retrieval (we have embeddings but graph-query.ts uses LIKE)
3. Adopt Zep-style temporal knowledge graph (our graph lacks temporal awareness)
4. Implement proper memory consolidation (our decay is simplistic linear, not importance-weighted)

---

## Part 1: Current Implementation Inventory

### 1.1 NLP Extraction Layer

#### `nlp-extract.ts` (420 lines) — Heuristic Entity/Fact/Relation Extraction
- **Entities**: Regex-based detection of capitalized phrases, emails, URLs, dates, money, @mentions, #hashtags, keyword-triggered types ("project X", "company Y")
- **Facts**: Pattern matching for "X is Y", "X uses Y", "X costs Y", "X prefers Y", deadlines, task creation
- **Relations**: 8 fixed patterns: works_at, created, depends_on, part_of, manages, owns, reports_to, member_of
- **LLM fallback**: `extractWithLLM()` exists — calls OpenAI-compatible API, merges with heuristic results. **Not used by default.**
- **Performance**: <10ms, truncates at 5000 chars
- **Strengths**: Zero-cost, deterministic, fast
- **Weaknesses**: 
  - Misses implicit facts ("I've been working late" → stress/workload signal)
  - Requires capitalization (misses "otto said..." or casual chat)
  - Only 8 relation types — real conversations have dozens
  - No coreference resolution ("he", "it", "that project")
  - No negation handling ("I don't like X" → extracts preference for X)
  - No temporal reasoning ("I used to work at X" vs "I work at X")

#### `classifier.ts` — Task Classification
- 6 regex rules mapping keywords → executor_type (agent/human/ambiguous) + requires_input
- Simple but effective for its scope. No ML, no context awareness.

#### `nlp-store.ts` — Storage Layer
- Upserts entities/facts/relations to PostgreSQL via Drizzle ORM
- Per-user isolation (userId on everything)
- Confidence-based updates (higher confidence overwrites lower)
- Fire-and-forget after chat messages
- **Solid implementation**, no major issues

#### `gateway-bridge.ts` — WebSocket Bridge
- Connects to OpenClaw gateway, subscribes to chat events
- Captures assistant responses via `onFinalMessage` callback
- SSE broadcast to dashboard clients
- Activity state tracking (idle/thinking/streaming/tool_call)
- **Well-engineered**, clean separation of concerns

### 1.2 Memory System (App Layer — TypeScript)

#### `memory/manager.ts` — Maintenance Orchestrator
- Runs short-term decay & promotion
- Decays knowledge graph facts (30-day stale → 0.9× confidence)
- Auto-approves high-confidence staging entries (>0.8)
- Clean but basic — no adaptive scheduling

#### `memory/extractor.ts` — Memory-Specific Fact Extraction
- Separate from nlp-extract.ts (duplicated concern!)
- Patterns for: names, preferences, decisions, dates, emails, locations
- Simpler than nlp-extract.ts, importance-scored (0.0–1.0)
- **Should be merged with or replaced by nlp-extract.ts**

#### `memory/short-term.ts` — Short-Term Memory
- 7-day TTL entries in PostgreSQL
- LIKE-based search (no semantic search)
- Decay & promote cycle: expired + importance > 0.7 → promoted to knowledge graph entities/facts
- **Key weakness**: Promotion creates entities with content as name (up to 200 chars) — pollutes entity namespace

#### `memory/working.ts` (Working Memory)
- In-memory Map per conversation session (lost on restart!)
- Assembles: active tasks summary + recent user messages
- No true summarization — just truncated recent messages
- **Critical gap**: Volatile — restarts lose all working context

#### `memory/session-store.ts` (Session Storage)
- In-memory per-session facts with promotion to short-term
- 50 entries max per session, promotes at importance ≥ 0.7
- Clean design, but again volatile

#### `memory/procedural.ts` — Procedural Memory
- Stores prompt patterns (scored) and user preferences
- `learnPreference()` with explicit vs inferred confidence
- Pattern retrieval by score ranking (not by relevance to input)
- **No actual procedure learning** — just preferences and templates

#### `memory/decay.ts` — Memory Decay
- Short-term: −0.1 importance/day after 7 days, delete below 0.1
- Knowledge graph facts: −0.05 confidence for entries >30 days old
- **Linear decay is naive** — SOTA uses access-frequency-weighted decay (more accessed = slower decay)

#### `memory/graph-query.ts` — Graph Queries
- Keyword extraction (stopword removal) → LIKE search on entity names
- For each matched entity: fetch all facts + relations
- **No semantic search**, no graph traversal (1-hop only), no ranking
- Top 5 keywords, 3 entities per keyword — fixed budget, not adaptive

#### `memory/context-builder.ts` — Context Assembly
- 4-layer budget: Working 40%, Knowledge Graph 30%, Short-Term 20%, Procedural 10%
- Fixed 4000 char cap (~1000 tokens)
- Simple truncation strategy
- **No relevance scoring** — just dumps everything within budget
- **No query-aware retrieval** — doesn't use current input to weight what's important

### 1.3 Standalone Memory Scripts (Node.js)

#### `scripts/memory/index.js` — Unified CLI
- Commands: status, search, maintain, reflect, etc.
- Uses `~/kira/memory/unified.db` (SQLite via better-sqlite3)
- **Separate DB from the app's PostgreSQL!** Two truth sources.

#### `scripts/memory/memory-core.js` — Unified Memory Interface
- Integrates blackboard, episodes, procedures, graph
- `logEvent()` → routes to appropriate layer
- `recall()` → searches episodes, procedures, blackboard, facts
- Clean multi-layer query architecture

#### `scripts/memory/embeddings.js` — Vector Search
- Ollama (nomic-embed-text) for local embeddings, BOW fallback
- JSON file cache at `~/clawd/memory/embeddings.json`
- Cosine similarity search
- **Paths reference ~/clawd/ (old name)** — partially migrated

#### `scripts/memory/episodes.js` — Episodic Memory
- JSONL files per day in `~/clawd/memory/episodes/`
- Importance scoring (1-10), tags, outcomes
- Text search across all days
- **Good design** — temporal, searchable, lightweight

#### `scripts/memory/reflection.js` — Self-Reflection
- Analyzes episodes: success/failure patterns, tag analysis
- Generates insights, success rates by type
- Weekly reflection summaries
- **Unique feature** — most SOTA systems don't have this

#### `scripts/memory/graph-improvements.js` — Graph Maintenance
- Re-embed (fix metadata contamination)
- Dedup entities (merge duplicates)
- Confidence decay
- Relationship normalization
- **Good maintenance tooling**

### 1.4 Database State

| Store | Records |
|-------|---------|
| Entities (unified.db) | 44,080 |
| Facts | 208,441 |
| Relations | 134,462 |
| Embeddings | 57,743 |
| Episodes | 496 |
| Procedures | 113 |
| Blackboard | 5 |
| chimera/graph.db entities | 635 |
| chimera/graph.db facts | 1,053 |

**Key observation**: The unified.db is the real knowledge store. chimera/graph.db appears to be an older, smaller copy. The app's PostgreSQL (via Drizzle) is a third store. **Three databases for one memory system.**

---

## Part 2: State of the Art (2026)

### 2.1 AI Agent Memory Platforms

#### Letta (formerly MemGPT) — "Stateful Agents"
- **Core idea**: LLM manages its own memory via tool calls (read/write/search memory blocks)
- **Memory blocks**: Labeled, editable context blocks ("human", "persona", custom)
- **Self-improving**: Agent decides what to remember, forget, and update
- **Architecture**: Memory as first-class tool, not passive storage
- **Key insight**: The LLM is the memory manager, not a separate system
- **Model-agnostic**, recommends Opus 4.5 / GPT-5.2

#### Zep — "Context Engineering Platform"
- **Temporal knowledge graph**: Automatically builds graph from conversations with time-awareness
- **Graph RAG**: Relationship-aware retrieval combining graph structure + vector search
- **Sub-200ms latency**: Production-grade performance
- **Multi-source**: Chat history + business data + documents + app events
- **Key insight**: Context assembly (right info, right time) > raw memory storage
- **Enterprise**: SOC2 Type 2 / HIPAA compliant

#### Mem0 — "Universal Memory Layer"
- **Multi-level**: User, Session, and Agent memory tiers
- **+26% accuracy** over OpenAI Memory on LOCOMO benchmark
- **91% faster**, 90% fewer tokens than full-context approaches
- **Graph memory**: Entities + relations extracted via LLM
- **OpenMemory**: Open standard for agent memory interop
- **Key insight**: Selective memory (what to keep) is more important than storing everything

### 2.2 SOTA Extraction Approaches

#### LLM-Based Extraction (2025–2026 Standard)
- **Default approach**: Use the LLM itself (or a smaller fine-tuned model) for entity/relation/fact extraction
- **Structured output**: JSON mode / function calling for reliable extraction
- **Multi-pass**: Fast heuristic filter → LLM for candidate validation → confidence scoring
- **Coreference resolution**: LLMs handle "he", "it", "that thing" natively
- **Negation & temporal**: "I used to work at X" vs "I work at X" correctly distinguished
- **Cost**: ~$0.001–0.01 per extraction (small models like GPT-4o-mini, Claude Haiku)

#### Hybrid Extraction (Best Practice)
- Regex/heuristic for high-confidence patterns (emails, dates, money, URLs)
- LLM for everything else (implicit facts, sentiments, decisions, temporal changes)
- Confidence merging: max(heuristic_conf, llm_conf)
- **This is exactly what our `extractWithLLM` function does** — just needs to be default

### 2.3 Knowledge Graph Construction

#### Automatic Graph Building (SOTA)
- **Entity resolution**: LLM-based deduplication ("Otto", "otto", "@coringa_dfato" → same entity)
- **Temporal edges**: Relations have valid_from/valid_to timestamps
- **Incremental updates**: New conversations update existing graph, not rebuild
- **Schema evolution**: Graph schema adapts as new entity/relation types emerge
- **Multi-hop reasoning**: Queries traverse 2-3 hops (A→B→C) for indirect connections

#### Our Graph vs SOTA
- We have temporal fields (valid_from/valid_to) in chimera/graph.db relations — **good**
- We don't populate them — **bad**
- We have entity dedup in graph-improvements.js — **good, but manual**
- No multi-hop queries — graph-query.ts does 1-hop only

### 2.4 Memory Consolidation (SOTA)

#### Importance-Weighted Decay
- Access frequency × recency × emotional valence × user-relevance
- Spaced repetition principles: accessed memories decay slower
- Contradiction detection: new facts that contradict old ones trigger review
- **Our decay**: Linear -0.1/day (short-term) and -0.05/month (facts). No access tracking.

#### Consolidation Patterns
- **Summarization**: Long conversations → compressed summaries (LLM-generated)
- **Abstraction**: Specific facts → general patterns ("Otto always asks about X on Mondays")
- **Contradiction resolution**: When "X works at A" conflicts with "X works at B" → mark temporal, keep both
- **Our system**: Promotes high-importance short-term → knowledge graph. No summarization, no abstraction.

### 2.5 RAG vs Structured Memory

#### When to Use What
| Approach | Best For | Our Usage |
|----------|----------|-----------|
| **Vector RAG** | Large document corpus, fuzzy queries | Have embeddings, not used in app layer |
| **Structured Graph** | Relationships, facts, precise queries | Primary approach in unified.db |
| **Hybrid (Graph RAG)** | Best of both — Zep's approach | **Not implemented** |
| **Episodic** | "What happened", temporal reasoning | episodes.js — good |
| **Procedural** | "How to do X", learned workflows | procedures.js — underused |

**SOTA consensus**: Hybrid Graph RAG is the winner. Use vector search for fuzzy recall, graph for precise relationships, combine results with relevance scoring.

### 2.6 Multi-Agent Shared Memory

#### SOTA Patterns
- **Blackboard architecture**: Shared space where agents post discoveries (we have this!)
- **Scoped access**: Agent A sees only relevant portions of shared memory
- **Event bus**: Memory changes publish events for interested agents
- **Conflict resolution**: When agents disagree on facts, explicit reconciliation

#### Our Status
- Blackboard exists (5 entries — barely used)
- No scoped access (everything is per-userId)
- No event bus for memory changes
- No conflict resolution

---

## Part 3: Gap Analysis

### Extraction Accuracy

| Dimension | Our System | SOTA | Gap |
|-----------|-----------|------|-----|
| **Explicit facts** ("X works at Y") | ✅ Good (regex) | ✅ Good (LLM) | Small |
| **Implicit facts** ("been stressed lately") | ❌ Missed | ✅ LLM captures | **Large** |
| **Coreference** ("he said that...") | ❌ No support | ✅ Native in LLMs | **Large** |
| **Negation** ("don't like X") | ❌ Wrong extraction | ✅ Handled | **Large** |
| **Temporal** ("used to work at") | ❌ No distinction | ✅ Temporal edges | **Medium** |
| **Sentiment/emotion** | ❌ Not extracted | ✅ Importance signal | **Medium** |
| **Cost per message** | $0 | ~$0.001–0.01 | Trade-off |

### Memory Retrieval Quality

| Dimension | Our System | SOTA | Gap |
|-----------|-----------|------|-----|
| **Search method** | LIKE '%keyword%' | Vector + Graph + BM25 | **Critical** |
| **Semantic understanding** | ❌ None in app layer | ✅ Embedding similarity | **Large** |
| **Graph traversal** | 1-hop only | 2-3 hop reasoning | **Medium** |
| **Relevance ranking** | None (fixed budget) | Score-based ranking | **Large** |
| **Temporal awareness** | ❌ None | ✅ Recency weighting | **Medium** |

### Scalability

| Dimension | Our System | SOTA | Gap |
|-----------|-----------|------|-----|
| **Data volume** | 208K facts, 44K entities | Similar scale | ✅ OK |
| **Query performance** | LIKE on indexed SQLite | Vector ANN + graph index | **Medium** |
| **Extraction throughput** | <10ms heuristic | 100-500ms LLM | Trade-off |
| **Storage** | 3 separate databases | Unified store | **Medium** |

### Context Window Optimization

| Dimension | Our System | SOTA | Gap |
|-----------|-----------|------|-----|
| **Budget** | Fixed 4000 chars | Dynamic, model-aware | **Medium** |
| **Allocation** | Fixed % per layer | Query-adaptive | **Large** |
| **Relevance filtering** | None — dump all | Score & filter | **Large** |
| **Summarization** | Truncation only | LLM summarization | **Large** |

### Cross-Session Continuity

| Dimension | Our System | SOTA | Gap |
|-----------|-----------|------|-----|
| **Working memory** | In-memory (lost on restart) | Persistent | **Critical** |
| **Session handoff** | None | Context transfer | **Large** |
| **Long-term recall** | Graph query (LIKE) | Semantic + graph | **Medium** |

### Multi-Agent Memory

| Dimension | Our System | SOTA | Gap |
|-----------|-----------|------|-----|
| **Shared state** | Blackboard (5 entries) | Active shared memory | **Large** |
| **Scoped access** | Per-user only | Per-agent + shared | **Medium** |
| **Event propagation** | None | Pub/sub on changes | **Medium** |

### Cost Efficiency

| Dimension | Our System | SOTA | Gap |
|-----------|-----------|------|-----|
| **Extraction cost** | $0 (regex) | ~$0.005/msg (LLM) | Our advantage |
| **Storage cost** | SQLite (free) | Vector DB ($) | Our advantage |
| **Retrieval cost** | $0 (SQL) | $0–0.001 (vector search) | Comparable |
| **Total per 10K msgs** | ~$0 | ~$50 | Trade-off |

---

## Part 4: Recommendations

### Keep (Our Strengths)

1. **4-layer memory architecture** — Working → Short-Term → Knowledge Graph → Procedural is solid, mirrors cognitive science. Keep the layered approach.

2. **Episodic memory + self-reflection** — Unique feature. Most SOTA systems don't have introspective reflection loops. Enhance, don't replace.

3. **Blackboard pattern** — Right architecture for multi-agent coordination. Just needs to be actually used.

4. **Heuristic extraction as fast path** — Keep for high-confidence patterns (emails, dates, money, URLs). Zero cost, deterministic.

5. **Graph maintenance tooling** — Dedup, re-embed, decay, normalize. This is operational excellence most systems lack.

6. **SQLite for graph storage** — At our scale (200K facts), SQLite with WAL mode is faster than any external DB. Don't move to Neo4j/etc unless we hit millions.

### Replace

1. **Primary extraction: Regex → LLM-based hybrid** (Priority: **P0**)
   - Wire `extractWithLLM()` as default, with heuristic as fast pre-filter
   - Use Claude Haiku or GPT-4o-mini (~$0.005/message)
   - Add: coreference resolution, negation handling, temporal tagging, sentiment
   - **Estimated lift**: 40-60% more facts captured per conversation

2. **Graph retrieval: LIKE → Vector + Graph hybrid** (Priority: **P0**)
   - We already have 57K embeddings in unified.db — use them!
   - Replace `graph-query.ts` LIKE search with: embed query → cosine similarity on embeddings → fetch related graph nodes
   - Add 2-hop graph traversal for relationship discovery
   - **Estimated lift**: 3-5× better recall on relevant context

3. **Working memory: In-memory Map → Persistent store** (Priority: **P1**)
   - Move session-store.ts from Map to Redis or SQLite
   - Survive restarts, enable session handoff between agents
   - Add LLM-generated conversation summaries (replace truncated recent messages)

4. **Context builder: Fixed allocation → Relevance-scored** (Priority: **P1**)
   - Score each memory item against current query (embedding similarity)
   - Dynamic budget: if knowledge graph has highly relevant results, give it 60% instead of fixed 30%
   - Increase cap from 4000 chars to model-aware (use 8K for large context models)

5. **Memory decay: Linear → Access-weighted** (Priority: **P2**)
   - Track last_accessed timestamp on entities/facts
   - Decay formula: `confidence × (0.95 ^ days_since_access)` instead of flat subtraction
   - Frequently accessed memories persist longer (spaced repetition)

6. **Database consolidation: 3 DBs → 1** (Priority: **P2**)
   - unified.db (SQLite) should be the single source of truth
   - Deprecate chimera/graph.db (635 entities → merge into unified.db)
   - App's PostgreSQL entities/facts tables → either sync to unified.db or make unified.db the primary
   - One DB = one truth = no drift

### Adopt from SOTA

1. **Zep's temporal knowledge graph pattern** (Priority: **P1**)
   - Populate valid_from/valid_to on relations (schema already supports it!)
   - When "X works at Y" conflicts with "X works at Z" → set valid_to on old, valid_from on new
   - Enables temporal queries: "Where did Otto work in 2024?"

2. **Mem0's selective memory** (Priority: **P1**)
   - Not everything is worth remembering. Add an importance classifier:
     - Trivial ("ok", "thanks", "lol") → don't extract
     - Informational ("The meeting is at 3pm") → extract with medium importance
     - Identity-defining ("I just got promoted") → extract with high importance
   - Reduces noise in graph (44K entities is already a lot — how many are garbage?)

3. **Letta's memory-as-tool pattern** (Priority: **P2**)
   - Let the agent decide what to remember via tool calls: `remember()`, `forget()`, `search_memory()`
   - Agent can explicitly store important facts instead of relying on passive extraction
   - Complements automated extraction with intentional memory

4. **Graph RAG (Zep pattern)** (Priority: **P1**)
   - For context assembly: vector search → get top-K similar → expand via graph neighbors → re-rank
   - Combines semantic fuzzy matching with structural relationship awareness
   - Our embeddings + graph already support this — just needs the query pipeline

### Implementation Priority

| # | Change | Effort | Impact | Priority |
|---|--------|--------|--------|----------|
| 1 | LLM extraction as default | 1 week | Very High | P0 |
| 2 | Vector+Graph hybrid retrieval | 1 week | Very High | P0 |
| 3 | Persistent working memory | 3 days | High | P1 |
| 4 | Relevance-scored context builder | 1 week | High | P1 |
| 5 | Temporal knowledge graph | 3 days | Medium-High | P1 |
| 6 | Selective memory (importance filter) | 3 days | Medium-High | P1 |
| 7 | Graph RAG query pipeline | 1 week | High | P1 |
| 8 | Access-weighted decay | 2 days | Medium | P2 |
| 9 | Database consolidation | 1 week | Medium | P2 |
| 10 | Memory-as-tool for agents | 1 week | Medium | P2 |

### Integration with Paperclip Task/Session Model

- **Task context**: When a task is active, context-builder should auto-inject task description, related entities, and previous task notes into memory context
- **Session continuity**: Working memory should persist per-session in Paperclip's session store, not in-memory Maps
- **Agent handoff**: When a sub-agent completes, its working memory findings should be promoted to the parent session's short-term memory
- **Task-linked memories**: Facts extracted during task execution should link back to the task ID for audit trail

---

## Appendix: Architecture Diagram (Current)

```
Chat Message
    │
    ├── nlp-extract.ts (regex) ──→ nlp-store.ts ──→ PostgreSQL (entities/facts/relations)
    │
    ├── memory/extractor.ts (regex) ──→ session-store.ts (in-memory) ──→ short-term.ts (PostgreSQL)
    │                                                                         │
    │                                                  decay & promote ←──────┘
    │                                                         │
    │                                                         ▼
    │                                              Knowledge Graph (PostgreSQL)
    │
    ├── scripts/memory/ ──→ unified.db (SQLite) ← embeddings, episodes, procedures, blackboard
    │
    └── chimera/graph.db (SQLite) ← older graph store
```

## Appendix: Proposed Architecture

```
Chat Message
    │
    ├── Fast heuristic filter (emails, dates, URLs, money)
    │
    ├── LLM extraction (Haiku/4o-mini) ──→ entities, facts, relations, sentiment, temporal
    │         │
    │         ├── Importance classifier (trivial/informational/identity-defining)
    │         │
    │         └── Merge with heuristic results
    │
    ▼
Unified Memory Store (SQLite unified.db)
    │
    ├── Entities (with embeddings)
    ├── Facts (with temporal validity, access tracking)
    ├── Relations (with valid_from/valid_to)
    ├── Episodes (JSONL → SQLite)
    ├── Procedures
    └── Blackboard (multi-agent)
    
Context Assembly (query-time)
    │
    ├── Embed current query
    ├── Vector search → top-K similar entities/facts
    ├── Graph expansion → 2-hop neighbors
    ├── Recency + access-frequency weighting
    ├── Relevance scoring against current input
    └── Dynamic budget allocation → formatted context block
```

---

*Report generated 2026-03-11. Based on full source review of Kira's codebase and current SOTA from Letta, Zep, Mem0, and academic literature.*
