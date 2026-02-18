# NLP Graph Layer — Message Enrichment & Contextual Retrieval

> Real-time intelligence layer that enriches every message with knowledge graph context, fixes input quality, and maintains retrieval accuracy through domain-aware scoring.
> Date: 2026-02-12

---

## Overview

The NLP Graph Layer sits between user input and agent processing. It intercepts every message, enriches it with relevant memory context, and writes that context to a file the agent loads on each turn.

```
User Message (Telegram/Web)
    │
    ▼
┌─────────────────────────────────┐
│       Message Proxy (3850)      │
│                                 │
│  ┌───────────┐  ┌────────────┐  │
│  │ Typo Fix  │→ │  Instant   │  │
│  │ (dict)    │  │  Enrich    │  │
│  └───────────┘  └─────┬──────┘  │
│                       │         │
│           ┌───────────┼─────┐   │
│           ▼           ▼     ▼   │
│     ┌──────────┐ ┌────────┐ ┌───┐
│     │ Text     │ │Semantic│ │DOM│
│     │ Search   │ │ Embed  │ │FLT│
│     └────┬─────┘ └───┬────┘ └─┬─┘
│          └─────┬─────┘────────┘ │
│                ▼                │
│         ┌────────────┐          │
│         │  Scorer    │          │
│         │ sim+rec+dom│          │
│         └─────┬──────┘          │
│               ▼                 │
│      retrieved-context.md       │
└─────────────────────────────────┘
    │
    ▼
Agent sees enriched context on next turn
```

---

## Architecture

### Components

| Component | File | Port | Role |
|-----------|------|------|------|
| **Message Proxy** | `scripts/memory/message-proxy.js` | 3850 | Session watcher, HTTP API, orchestrator |
| **NLP Graph Layer** | `scripts/memory/nlp-graph-layer.js` | — | Entity extraction, embedding, enrichment |
| **Graph Sync** | `scripts/memory/graph-sync.js` | — | Continuous extraction from session logs |
| **Graph Improvements** | `scripts/memory/graph-improvements.js` | — | Dedup, normalize, confidence decay |

### Process Management

All components run as PM2 services:
```bash
pm2 start msg-proxy     # Message enrichment proxy
pm2 start graph-sync    # Continuous entity extraction
```

### Data Flow

```
Session Log (.jsonl)
    │
    ├──→ graph-sync (PM2) ──→ Extract entities/relations/facts ──→ SQLite graph.db
    │
    └──→ msg-proxy (PM2)
            │
            ├── Watch for new user messages (every 2s)
            ├── Instant enrich: typo fix → embed query → score results → write context
            ├── Deep refresh: every 5 min rebuild full context from graph
            └── Maintenance: every 2h dedup/normalize/decay
```

---

## 1. Message Proxy

### 1.1 Session Watcher

Polls the latest OpenClaw session log every 2 seconds. On new user message:

1. Strip Telegram metadata (sender info, message IDs)
2. Skip non-messages (heartbeats, system events, short messages <10 chars)
3. Run instant enrichment pipeline
4. Write results to `memory/retrieved-context.md`
5. Log enrichment to `memory/enrichment-log.json`

### 1.2 HTTP API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Graph counts, recent enrichments, last refresh time |
| `/enrich` | POST | Manual enrichment: `{ "message": "..." }` → enriched context |
| `/refresh` | GET | Trigger deep context refresh |

### 1.3 Deep Context Refresh

Every 5 minutes, rebuilds the static context from the full graph:

```markdown
# Retrieved Context (Auto-generated)
## Key Entities          ← Top 20 by connection count
## Recent Decisions      ← Last 10 decisions
## Known Preferences     ← Last 15 preferences
## Recent Facts (24h)    ← Facts from last 24 hours
## Live Context          ← Instant enrichment from last message
```

---

## 2. Typo Correction

Dictionary-based word replacement. Runs before enrichment to improve embedding quality.

### Categories
- **Common typos**: teh→the, taht→that, waht→what
- **Contractions**: dont→don't, doesnt→doesn't, cant→can't
- **Abbreviations**: idk→I don't know, imo→in my opinion, rn→right now
- **Brand names**: chimrea→Chimera, kirra→Kira, ottogen→OttoGen

### Implementation
```typescript
function fixTypos(text: string): string {
  // Word-boundary replacement, preserves capitalization
  return text.replace(/\b\w+\b/g, word => {
    const fix = TYPO_MAP[word.toLowerCase()];
    if (!fix) return word;
    // Preserve first-letter case
    if (word[0] === word[0].toUpperCase()) {
      return fix[0].toUpperCase() + fix.slice(1);
    }
    return fix;
  });
}
```

### Adding New Entries
Add to `TYPO_MAP` in `message-proxy.js`. Format: `'typo': 'correction'`.
Restart msg-proxy after changes: `pm2 restart msg-proxy`

---

## 3. Instant Enrichment Pipeline

### 3.1 Multi-Source Retrieval

Four retrieval sources, run in parallel:

| Source | Method | Speed | Best For |
|--------|--------|-------|----------|
| **Text Search** | SQL LIKE on entity names/descriptions | <1ms | Exact name matches |
| **Relation Lookup** | Join on found entity IDs | <1ms | Known connections |
| **Fact Lookup** | Join on found entity IDs | <1ms | Stored predicates |
| **Semantic Search** | Cosine similarity on embeddings | ~100ms | Fuzzy/conceptual matches |

### 3.2 Embedding Model

- **Model**: `nomic-embed-text` via Ollama (`localhost:11434`)
- **Dimensions**: 768
- **Storage**: Binary buffer in SQLite `embeddings` table
- **Sources embedded**: Messages (full text), entities (type + name + description)

### 3.3 Scoring Algorithm

Each semantic result receives a composite score:

```
final_score = base_similarity + recency_boost + domain_score
```

#### Base Similarity (Cosine)
Standard cosine similarity between query embedding and stored embeddings. Range: 0.0–1.0.

#### Recency Boost
Exponential decay over 14 days:
```javascript
recencyBoost = max(-0.05, 0.15 * exp(-ageDays / 7))
```

| Age | Boost |
|-----|-------|
| Today | +15% |
| 1 day | +13% |
| 3 days | +10% |
| 7 days | +5% |
| 14 days | ~0% |
| 30+ days | -5% (floor) |

**Rationale**: Recent conversations are more likely relevant than old ones. Without this, a 2-month-old discussion about "nodes" would score equally to today's conversation about the same topic.

#### Domain Score (Context Filtering)

Detects the semantic domain of the query using regex patterns, then boosts/penalizes results accordingly:

**Detected Domains:**

| Domain | Pattern Examples | Trigger Words |
|--------|-----------------|---------------|
| `graph` | graph, node, edge, entity, orphan, neo4j | Knowledge graph, entity relations |
| `network` | firewall, port, ufw, ssh, ip, dns, proxy | Infrastructure networking |
| `code` | function, script, bug, module, api, class | Software development |
| `business` | investor, revenue, pitch, funding, sales | Business operations |
| `infra` | docker, pm2, systemd, service, deploy | DevOps infrastructure |

**Scoring:**

| Match | Score |
|-------|-------|
| Result matches query domain | +8% |
| Result matches different domain | -10% |
| No domain detected | 0% |

**Example**: Query about "orphan nodes in the graph" → domain = `graph`
- Result about entity clustering → +8% (same domain)
- Result about UFW firewall → -10% (network domain, not graph)
- Result about investor pitch → -10% (business domain, not graph)

### 3.4 Threshold

**Minimum score: 0.65** (was 0.30, raised 2026-02-12)

Results below this threshold are discarded. This filters out the long tail of vaguely-related content that pollutes context.

| Threshold | Behavior |
|-----------|----------|
| 0.30 (old) | Returns almost everything, mostly noise |
| 0.50 | Some relevant, still noisy |
| 0.65 (current) | Good precision, occasionally misses edge cases |
| 0.80 | Very precise but may miss relevant results |

### 3.5 Output Format

Results are formatted as markdown and appended to `retrieved-context.md`:

```markdown
## Semantically Related
- [93% (sim:71% rec:+14% dom:+8%)] Tool node in the interactive connection hub
- [88% (sim:75% rec:+5% dom:+8%)] Entity clustering by shared properties
```

The breakdown `(sim:X% rec:±Y% dom:±Z%)` is included for transparency and debugging.

### 3.6 Token Budget

Context is capped at ~500 tokens (2000 chars) to avoid blowing the agent's context window. If enriched context exceeds this, it's truncated line-by-line with a `[... context truncated]` marker.

---

## 4. Graph Extraction (graph-sync)

### 4.1 Entity Extraction

Uses Ollama LLM to extract structured data from messages:

```typescript
interface Extracted {
  entities: Array<{
    name: string;
    type: EntityType;
    description?: string;
  }>;
  relations: Array<{
    source: string;
    target: string;
    type: string;
    properties?: Record<string, any>;
  }>;
  facts: Array<{
    subject: string;
    predicate: string;
    object: string;
  }>;
}
```

### 4.2 Storage Schema

```sql
-- Core tables (in graph.db)
entities (id, type, name, description, created_at, updated_at)
relations (id, source_id, target_id, type, properties, created_at)
facts (id, subject_id, predicate, object, confidence, timestamp)
decisions (id, what, why, context, made_at)
preferences (id, key, value, context, discovered_at)

-- Retrieval tables
embeddings (id, source_type, source_id, text, vector, created_at)
```

### 4.3 Embedding Pipeline

New entities and messages are automatically embedded:

1. Message arrives → `processMessage()` extracts entities/relations/facts
2. Message text → embedded, stored as `source_type='message'`
3. New entities → embedded as `source_type='entity'`, text = `"{type}: {name}. {description}"`
4. Embeddings stored as binary buffers (768-dim float32)

---

## 5. Graph Maintenance

Runs every 2 hours via msg-proxy:

### 5.1 Deduplication
Merges entities with similar names (Levenshtein distance < 2 or exact lowercase match).

### 5.2 Normalization
Standardizes entity types, trims whitespace, fixes casing.

### 5.3 Confidence Decay
Facts older than 30 days with no reinforcement have their confidence reduced. Facts below 0.1 confidence are pruned.

---

## 6. App Integration

### 6.1 API Endpoints

For the Kira app dashboard, the NLP layer exposes:

```typescript
// GET /api/memory/graph/status
// Returns graph health metrics
interface GraphStatus {
  entities: number;
  relations: number;
  facts: number;
  embeddings: number;
  lastRefresh: string;       // ISO timestamp
  recentEnrichments: EnrichmentLog[];
}

// POST /api/memory/graph/enrich
// Manual enrichment for testing/debugging
interface EnrichRequest {
  message: string;
}
interface EnrichResponse {
  original: string;
  fixed: string;              // typo-corrected
  context: string;            // formatted markdown
  elapsed: number;            // ms
  entities: Entity[];
  relations: Relation[];
  facts: Fact[];
  similar: ScoredResult[];
}

// GET /api/memory/graph/entities
// List entities with optional filters
interface EntityListParams {
  type?: EntityType;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'connections' | 'updated' | 'name';
}

// GET /api/memory/graph/entity/:id
// Full entity detail with relations and facts
interface EntityDetail {
  entity: Entity;
  relations: Relation[];
  facts: Fact[];
  recentMentions: Message[];
}

// GET /api/memory/graph/search
// Semantic search across all memory
interface SearchParams {
  query: string;
  threshold?: number;         // default 0.65
  maxResults?: number;        // default 15
  recencyBias?: boolean;      // default true
  domainFilter?: boolean;     // default true
}
interface SearchResponse {
  results: ScoredResult[];
  query: {
    original: string;
    fixed: string;
    detectedDomains: string[];
  };
  timing: {
    textSearch: number;
    semanticSearch: number;
    total: number;
  };
}

// POST /api/memory/graph/extract
// Manually trigger extraction from text
interface ExtractRequest {
  text: string;
  role?: 'user' | 'assistant';
}

// GET /api/memory/graph/maintenance
// Trigger graph cleanup
interface MaintenanceResponse {
  dedup: { merged: number };
  normalize: { fixed: number };
  decay: { pruned: number };
}
```

### 6.2 Dashboard Components

#### Knowledge Graph Visualizer (existing spec: `dashboard/knowledge-graph.md`)
- Add **enrichment debugger panel**: shows last N enrichments with scoring breakdown
- Add **domain filter toggles**: let user see which domains are detected
- Add **threshold slider**: adjust similarity threshold in real-time for testing

#### Memory Settings Page (extend `dashboard/settings.md`)
- **Retrieval settings**:
  - Similarity threshold (slider, 0.30–0.95, default 0.65)
  - Recency bias toggle + decay rate (slider, 3–30 days, default 7)
  - Domain filtering toggle
  - Max semantic results (1–30, default 15)
  - Token budget for context (500–4000 tokens, default 500)
- **Typo dictionary editor**: add/remove/edit typo corrections
- **Graph maintenance**: manual trigger buttons for dedup/normalize/decay
- **Embedding status**: count, last generation time, re-embed all button

#### Enrichment Debug Widget
A collapsible panel in the chat UI showing:
```
Last enrichment:
  Query: "orphan nodes in the graph"
  Domains detected: [graph]
  Results: 5 (threshold: 0.65)
  Top: [93%] entity clustering (sim:71% rec:+14% dom:+8%)
  Elapsed: 255ms
```

### 6.3 Configuration

All NLP layer settings stored in the app's SQLite settings table:

```typescript
interface NlpConfig {
  // Retrieval
  similarityThreshold: number;    // 0.65
  maxSemanticResults: number;     // 15
  recencyBiasEnabled: boolean;    // true
  recencyDecayDays: number;       // 7
  domainFilterEnabled: boolean;   // true
  domainBoostPct: number;         // 8
  domainPenaltyPct: number;       // 10
  tokenBudget: number;            // 500

  // Proxy
  watchIntervalMs: number;        // 2000
  deepRefreshIntervalMs: number;  // 300000
  maintenanceIntervalMs: number;  // 7200000

  // Extraction
  extractionModel: string;        // 'qwen3:14b'
  embeddingModel: string;         // 'nomic-embed-text'

  // Typo correction
  typoCorrectionEnabled: boolean; // true
}
```

Settings are read at startup and on config change events. No restart required for threshold/bias changes — they take effect on next enrichment.

### 6.4 Event Bus Integration

The NLP layer emits events for the app's real-time dashboard:

```typescript
type NlpEvent =
  | { type: 'enrichment'; query: string; results: number; elapsed: number }
  | { type: 'extraction'; entities: number; relations: number; facts: number }
  | { type: 'maintenance'; action: string; affected: number }
  | { type: 'embedding'; source: string; count: number }
  ;

// SSE endpoint: GET /api/memory/graph/events
// Dashboard subscribes for live updates
```

---

## 7. Performance

### Current Benchmarks
| Operation | Time | Notes |
|-----------|------|-------|
| Typo fix | <1ms | Dictionary lookup |
| Text search | <5ms | SQLite LIKE query |
| Embedding query | ~100ms | Ollama nomic-embed |
| Cosine scoring (1000 embeddings) | ~10ms | In-memory float ops |
| Total enrichment | ~150-300ms | Dominated by embedding generation |
| Deep refresh | ~500ms | Multiple SQL queries, file write |

### Scaling Considerations
- Embeddings table grows ~10-20 rows/day with normal use
- At 10,000 embeddings, cosine scoring takes ~100ms (still fast)
- Beyond 50,000: consider approximate nearest neighbors (FAISS or hnswlib)
- Graph maintenance keeps entity count manageable through dedup

---

## 8. Relationship to Other Design Docs

| Doc | Relationship |
|-----|-------------|
| `memory/retrieval-pipeline.md` | NLP layer implements the semantic retrieval stage |
| `memory/4-layer-system.md` | NLP layer bridges episodic→semantic→working memory |
| `memory/sqlite-schema.md` | Shares graph.db schema, adds embeddings table |
| `dashboard/knowledge-graph.md` | NLP layer feeds the graph visualizer |
| `agents/self-evolution.md` | Self-improvement loop can modify NLP config |
| `architecture/data-flow.md` | NLP layer is the enrichment stage in the data flow |

---

## 9. Future Improvements

1. **Hybrid search**: Combine FTS5 keyword scoring with embedding similarity (RRF fusion)
2. **Query expansion**: Use LLM to expand ambiguous queries before embedding
3. **Negative feedback loop**: Track when agent ignores retrieved context → lower those results' scores
4. **Per-entity embeddings update**: Re-embed entities when their facts change significantly
5. **Multi-hop graph traversal**: For queries like "who knows someone at Google", traverse 2+ hops
6. **Conversation-aware retrieval**: Weight results by relevance to the full conversation, not just last message
7. **Configurable domain patterns**: Allow users to define custom domains via the settings UI
