# Kira Memory System — Retrieval Pipeline

> How memory is retrieved, ranked, and injected into agent context.
> Date: 2026-02-11

---

## Overview

The retrieval pipeline answers: **given a user message, what stored memory is relevant?**

```
User Message
    │
    ▼
┌──────────────┐
│ Query Builder │── extracts keywords, entities, intent
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│         Parallel Retrieval           │
│                                      │
│  ┌─────────┐ ┌──────────┐ ┌───────┐ │
│  │ Keyword  │ │ Semantic │ │ Graph │ │
│  │ (FTS5)   │ │ (embed)  │ │ (hop) │ │
│  └────┬─────┘ └────┬─────┘ └───┬───┘ │
│       └──────┬──────┘───────────┘     │
│              ▼                        │
│       ┌────────────┐                  │
│       │   Merger    │                 │
│       │  & Ranker   │                 │
│       └─────┬──────┘                  │
└─────────────┼────────────────────────┘
              ▼
┌──────────────────┐
│ Token Budget Fit │── trim to budget
└──────┬───────────┘
       ▼
┌──────────────────┐
│ Context Injection │── format & inject into prompt
└──────────────────┘
```

---

## 1. Query Building

The first step extracts search signals from the current user message (and recent conversation):

```typescript
interface RetrievalQuery {
    keywords: string[];          // extracted content words
    entities: string[];          // recognized entity names
    intent: string;              // what the user wants (summarized)
    timeRange?: [string, string]; // if temporal ("last week", "yesterday")
    fullText: string;            // the raw message for embedding
}

function buildQuery(message: string, recentHistory: Message[]): RetrievalQuery {
    // 1. Extract keywords: remove stop words, keep nouns/verbs
    const keywords = extractKeywords(message);
    
    // 2. Entity recognition: match against known entity names/aliases
    const entities = matchEntities(message, entityIndex);
    
    // 3. Intent classification (lightweight, rule-based + LLM fallback)
    const intent = classifyIntent(message);
    
    // 4. Temporal parsing
    const timeRange = parseTimeReference(message);
    
    return { keywords, entities, intent, timeRange, fullText: message };
}
```

### Entity Matching

Fast entity recognition using a preloaded index:

```typescript
// Built at startup, refreshed when entities change
const entityIndex = new Map<string, string>(); // lowercase name/alias → entity_id

function matchEntities(text: string, index: Map<string, string>): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const matched = new Set<string>();
    
    // Single-word matches
    for (const word of words) {
        if (index.has(word)) matched.add(index.get(word)!);
    }
    
    // Multi-word matches (bigrams, trigrams)
    for (let n = 2; n <= 3; n++) {
        for (let i = 0; i <= words.length - n; i++) {
            const phrase = words.slice(i, i + n).join(' ');
            if (index.has(phrase)) matched.add(index.get(phrase)!);
        }
    }
    
    return [...matched];
}
```

---

## 2. Retrieval Strategies

Three strategies run in parallel and their results are merged.

### 2a. Keyword Search (FTS5)

Fast, exact matching. Best for specific names, terms, error messages.

```sql
-- Search episodes
SELECT e.id, e.summary, e.timestamp, e.importance, e.compression,
       bm25(episodes_fts, 1.0, 0.5, 0.3) AS fts_score
FROM episodes_fts
JOIN episodes e ON e.rowid = episodes_fts.rowid
WHERE episodes_fts MATCH :query
  AND e.timestamp > :min_time
ORDER BY fts_score
LIMIT 20;

-- Search facts
SELECT f.id, f.subject, f.predicate, f.object, f.confidence,
       bm25(facts_fts) AS fts_score
FROM facts_fts
JOIN facts f ON f.rowid = facts_fts.rowid
WHERE facts_fts MATCH :query
  AND f.valid_until IS NULL
ORDER BY fts_score
LIMIT 10;

-- Search entities
SELECT e.id, e.name, e.type, e.description,
       bm25(entities_fts) AS fts_score
FROM entities_fts
JOIN entities e ON e.rowid = entities_fts.rowid
WHERE entities_fts MATCH :query
ORDER BY fts_score
LIMIT 10;
```

### 2b. Semantic Search (Embedding Similarity)

Finds conceptually related content even without keyword overlap. "How to ship the product" matches "deployment pipeline" even though no words overlap.

```typescript
async function semanticRetrieve(query: string, topK: number = 20): Promise<ScoredResult[]> {
    const queryEmbedding = await embed(query);
    const results: ScoredResult[] = [];
    
    // Search episodes (only compressed/distilled — too many raw)
    const episodeEmbeddings = embeddingCache.get('episodes'); // preloaded
    for (const [id, emb] of episodeEmbeddings) {
        results.push({
            id, table: 'episodes',
            score: cosineSimilarity(queryEmbedding, emb)
        });
    }
    
    // Search entities
    const entityEmbeddings = embeddingCache.get('entities');
    for (const [id, emb] of entityEmbeddings) {
        results.push({
            id, table: 'entities',
            score: cosineSimilarity(queryEmbedding, emb)
        });
    }
    
    // Search facts (via entity embeddings — facts inherit entity embedding)
    // ... similar pattern
    
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
}
```

### 2c. Graph Traversal

When entities are identified, walk the knowledge graph for related context.

```typescript
async function graphRetrieve(entityIds: string[], maxDepth: number = 2): Promise<GraphResult[]> {
    const results: GraphResult[] = [];
    const visited = new Set<string>();
    
    for (const entityId of entityIds) {
        await walkGraph(entityId, 0, maxDepth, visited, results);
    }
    
    return results;
}

async function walkGraph(
    entityId: string, depth: number, maxDepth: number,
    visited: Set<string>, results: GraphResult[]
) {
    if (depth > maxDepth || visited.has(entityId)) return;
    visited.add(entityId);
    
    // Get entity
    const entity = db.get('SELECT * FROM entities WHERE id = ?', [entityId]);
    if (!entity) return;
    
    results.push({ type: 'entity', data: entity, depth });
    
    // Get facts about this entity (current only)
    const facts = db.all(
        'SELECT * FROM facts WHERE entity_id = ? AND valid_until IS NULL ORDER BY confidence DESC LIMIT 10',
        [entityId]
    );
    for (const fact of facts) {
        results.push({ type: 'fact', data: fact, depth });
    }
    
    // Get relationships (both directions)
    const rels = db.all(`
        SELECT r.*, e.id as related_id, e.name as related_name, e.type as related_type
        FROM relationships r
        JOIN entities e ON (e.id = CASE WHEN r.source_id = ? THEN r.target_id ELSE r.source_id END)
        WHERE (r.source_id = ? OR r.target_id = ?)
          AND r.confidence > 0.3
        ORDER BY r.confidence DESC
        LIMIT 10
    `, [entityId, entityId, entityId]);
    
    for (const rel of rels) {
        results.push({ type: 'relationship', data: rel, depth });
        // Recurse to related entities (next depth)
        if (depth + 1 <= maxDepth) {
            await walkGraph(rel.related_id, depth + 1, maxDepth, visited, results);
        }
    }
}
```

---

## 3. Merging & Ranking

Results from all three strategies are merged using Reciprocal Rank Fusion (RRF):

```typescript
function mergeAndRank(
    keywordResults: ScoredResult[],
    semanticResults: ScoredResult[],
    graphResults: GraphResult[],
    query: RetrievalQuery
): RankedResult[] {
    const scores = new Map<string, number>(); // id → combined score
    const k = 60; // RRF constant
    
    // RRF for keyword results
    keywordResults.forEach((r, rank) => {
        const key = `${r.table}:${r.id}`;
        scores.set(key, (scores.get(key) || 0) + 1 / (k + rank + 1));
    });
    
    // RRF for semantic results
    semanticResults.forEach((r, rank) => {
        const key = `${r.table}:${r.id}`;
        scores.set(key, (scores.get(key) || 0) + 1 / (k + rank + 1));
    });
    
    // Graph results get bonus based on depth and confidence
    for (const r of graphResults) {
        const key = `${r.type}:${r.data.id}`;
        const depthPenalty = 1 / (1 + r.depth * 0.5);
        const confidence = r.data.confidence || 1.0;
        scores.set(key, (scores.get(key) || 0) + 0.02 * depthPenalty * confidence);
    }
    
    // Apply boosts
    for (const [key, score] of scores) {
        let boosted = score;
        const item = lookupItem(key); // fetch from DB
        
        // Recency boost: recent items score higher
        if (item.timestamp) {
            const ageHours = (Date.now() - new Date(item.timestamp).getTime()) / 3600000;
            boosted *= 1 + Math.max(0, 1 - ageHours / 168); // decays over 1 week
        }
        
        // Importance boost
        if (item.importance) {
            boosted *= 0.8 + (item.importance / 10) * 0.4; // 0.8x to 1.2x
        }
        
        // Confidence boost (for facts/relationships)
        if (item.confidence) {
            boosted *= item.confidence;
        }
        
        scores.set(key, boosted);
    }
    
    // Sort and return
    return [...scores.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([key, score]) => ({ key, score, ...lookupItem(key) }));
}
```

---

## 4. Token Budget Management

### Budget Calculation

```typescript
function calculateRetrievalBudget(workingMemory: WorkingMemory): number {
    const total = workingMemory.tokenBudget.total;
    const used = 
        workingMemory.tokenBudget.systemPrompt +
        workingMemory.tokenBudget.userProfile +
        workingMemory.tokenBudget.preferences +
        countTokens(workingMemory.conversationHistory) +
        workingMemory.tokenBudget.responseReserve;
    
    const available = total - used;
    const buffer = total * 0.05; // 5% safety margin
    
    return Math.max(0, available - buffer);
}
```

### Fitting Results to Budget

```typescript
function fitToBudget(ranked: RankedResult[], budgetTokens: number): RankedResult[] {
    const selected: RankedResult[] = [];
    let usedTokens = 0;
    
    for (const result of ranked) {
        const tokens = estimateTokens(result);
        if (usedTokens + tokens > budgetTokens) {
            // Try a compressed version
            const compressed = compress(result);
            const compTokens = estimateTokens(compressed);
            if (usedTokens + compTokens <= budgetTokens) {
                selected.push(compressed);
                usedTokens += compTokens;
            }
            continue; // skip if still doesn't fit
        }
        selected.push(result);
        usedTokens += tokens;
    }
    
    return selected;
}
```

### Allocation Priority

Within the retrieval budget, allocate tokens by category:

| Priority | Category | Max % of retrieval budget |
|----------|----------|---------------------------|
| 1 | User profile & preferences | 15% (always injected) |
| 2 | Directly referenced entities/facts | 30% |
| 3 | Recent relevant episodes | 30% |
| 4 | Related context (graph neighbors) | 15% |
| 5 | Relevant procedures | 10% |

---

## 5. Context Injection

### Injection Format

Retrieved context is formatted as a structured block prepended to the conversation:

```typescript
function formatInjectedContext(results: RankedResult[], prefs: Preference[]): string {
    const sections: string[] = [];
    
    // User preferences (always first)
    if (prefs.length > 0) {
        sections.push('### Preferences');
        for (const p of prefs) {
            sections.push(`- ${p.category}.${p.key}: ${p.value}`);
        }
    }
    
    // Entities and facts
    const entities = results.filter(r => r.type === 'entity' || r.type === 'fact');
    if (entities.length > 0) {
        sections.push('### Known Context');
        for (const e of entities) {
            if (e.type === 'entity') {
                sections.push(`- **${e.data.name}** (${e.data.type}): ${e.data.description || 'no description'}`);
            } else {
                sections.push(`- ${e.data.subject} ${e.data.predicate} ${e.data.object} (confidence: ${e.data.confidence})`);
            }
        }
    }
    
    // Episodes
    const episodes = results.filter(r => r.type === 'episode');
    if (episodes.length > 0) {
        sections.push('### Relevant History');
        for (const ep of episodes) {
            const age = formatAge(ep.data.timestamp);
            sections.push(`- [${age}] ${ep.data.summary}`);
        }
    }
    
    // Procedures
    const procs = results.filter(r => r.type === 'procedure');
    if (procs.length > 0) {
        sections.push('### Learned Procedures');
        for (const p of procs) {
            sections.push(`- **${p.data.name}** (confidence: ${p.data.confidence}): ${p.data.trigger}`);
        }
    }
    
    return sections.join('\n');
}
```

### Injection Triggers

| Trigger | What Happens |
|---------|--------------|
| **Session start** | Full retrieval: user profile, top prefs, recent episodes |
| **Each user message** | Incremental retrieval based on new message content |
| **Topic change** | Flush topic-specific context, retrieve for new topic |
| **Entity mention** | Pull entity + facts + 1-hop relationships |
| **"Remember when..."** | Deep temporal search + high token budget |
| **Token budget 75%** | Compaction: summarize old turns, keep retrieved context |

### Topic Change Detection

```typescript
function detectTopicChange(current: string, recent: Message[]): boolean {
    if (recent.length < 2) return false;
    
    const recentText = recent.slice(-3).map(m => m.content).join(' ');
    const similarity = cosineSimilarity(
        await embed(current),
        await embed(recentText)
    );
    
    return similarity < 0.3; // low similarity = topic change
}
```

---

## 6. Caching

### Embedding Cache

All embeddings are loaded into memory at startup (for datasets < 50K rows):

```typescript
class EmbeddingCache {
    private cache: Map<string, Map<string, Float32Array>> = new Map();
    
    async load(db: Database) {
        for (const table of ['episodes', 'entities', 'facts']) {
            const rows = db.all(
                'SELECT source_id, embedding FROM embeddings WHERE source_table = ?',
                [table]
            );
            const tableCache = new Map<string, Float32Array>();
            for (const row of rows) {
                tableCache.set(row.source_id, new Float32Array(row.embedding.buffer));
            }
            this.cache.set(table, tableCache);
        }
    }
    
    // Invalidate on write
    update(table: string, id: string, embedding: Float32Array) {
        this.cache.get(table)?.set(id, embedding);
    }
}
```

### Query Result Cache

Recent retrieval results are cached with a short TTL:

```typescript
const queryCache = new LRUCache<string, RankedResult[]>({
    max: 100,
    ttl: 60_000, // 1 minute — context changes fast
});

function getCacheKey(query: RetrievalQuery): string {
    return crypto.createHash('md5')
        .update(JSON.stringify(query.keywords.sort()))
        .digest('hex');
}
```

### Entity Index Cache

Refreshed every 5 minutes or on entity writes:

```typescript
let entityIndexLastRefresh = 0;
const ENTITY_INDEX_TTL = 300_000; // 5 minutes

function getEntityIndex(): Map<string, string> {
    if (Date.now() - entityIndexLastRefresh > ENTITY_INDEX_TTL) {
        refreshEntityIndex();
    }
    return entityIndex;
}
```

---

## 7. Compaction Triggers & Process

### When Compaction Triggers

| Condition | Action |
|-----------|--------|
| Conversation tokens > 75% of budget | Summarize oldest 50% of turns |
| Raw episodes older than 24h | Compress (daily job) |
| Compressed episodes older than 7d | Distill (weekly job) |
| Distilled episodes past `expires_at` | Delete |
| Database size > threshold | VACUUM + aggressive compression |

### Compaction Process

```typescript
async function compactConversation(workingMemory: WorkingMemory): Promise<void> {
    const turns = workingMemory.conversationHistory;
    const totalTokens = countTokens(turns);
    const budget = workingMemory.tokenBudget.conversation;
    
    if (totalTokens < budget * 0.75) return; // not needed
    
    // Split: keep recent verbatim, summarize old
    const keepCount = Math.min(10, Math.floor(turns.length * 0.3));
    const toSummarize = turns.slice(0, turns.length - keepCount);
    const toKeep = turns.slice(turns.length - keepCount);
    
    // Summarize via LLM (cheap model)
    const summary = await summarize(toSummarize);
    
    // Replace conversation history
    workingMemory.conversationHistory = [
        { role: 'system', content: `[Conversation summary: ${summary}]` },
        ...toKeep
    ];
    
    // Store the summarized turns as a compressed episode
    await insertEpisode({
        type: 'conversation',
        actor: 'system',
        summary: summary,
        details: JSON.stringify(toSummarize),
        compression: 'compressed',
        importance: 5,
        tags: ['auto-compaction']
    });
}
```

### Episode Compaction (Background Job)

```typescript
async function compactEpisodes(): Promise<{ compressed: number, distilled: number, deleted: number }> {
    let compressed = 0, distilled = 0, deleted = 0;
    
    // 1. Compress raw episodes > 24h old
    const rawOld = db.all(`
        SELECT * FROM episodes 
        WHERE compression = 'raw' 
          AND timestamp < datetime('now', '-1 day')
        ORDER BY session_id, timestamp
    `);
    
    // Group by session, summarize each group
    const bySession = groupBy(rawOld, 'session_id');
    for (const [sessionId, episodes] of Object.entries(bySession)) {
        const summary = await summarizeEpisodes(episodes);
        // Create compressed episode
        await insertEpisode({
            ...summary,
            compression: 'compressed',
            session_id: sessionId,
            expires_at: addDays(90)
        });
        // Extract facts before deleting raw
        for (const ep of episodes) {
            await extractAndStoreFacts(ep);
        }
        // Mark raw for deletion
        for (const ep of episodes) {
            if (ep.importance < 8) {
                db.run('UPDATE episodes SET expires_at = datetime("now", "+6 days") WHERE id = ?', [ep.id]);
            }
        }
        compressed += episodes.length;
    }
    
    // 2. Distill compressed episodes > 7d old
    const compOld = db.all(`
        SELECT * FROM episodes
        WHERE compression = 'compressed'
          AND timestamp < datetime('now', '-7 days')
    `);
    for (const ep of compOld) {
        const distilled_summary = await distillEpisode(ep);
        db.run(`
            UPDATE episodes SET
                summary = ?, details = NULL, compression = 'distilled',
                token_count = ?, expires_at = NULL
            WHERE id = ?
        `, [distilled_summary, estimateTokens(distilled_summary), ep.id]);
        distilled++;
    }
    
    // 3. Delete expired episodes
    const result = db.run('DELETE FROM episodes WHERE expires_at < datetime("now")');
    deleted = result.changes;
    
    return { compressed, distilled, deleted };
}
```

---

## End-to-End Example

User sends: "Can you deploy the Kira app like we did last time?"

**1. Query Building:**
```json
{
    "keywords": ["deploy", "kira", "app"],
    "entities": ["kira_project_id"],
    "intent": "deploy_application",
    "timeRange": null,
    "fullText": "Can you deploy the Kira app like we did last time?"
}
```

**2. Parallel Retrieval:**

- **FTS5**: Finds 3 episodes mentioning "deploy" + "kira"
- **Semantic**: Finds 5 episodes about deployment (including ones saying "ship" or "push to prod")
- **Graph**: Kira → deployed_on → Vercel; Kira → uses → edge_functions; Otto → prefers → no_docker

**3. Merged & Ranked:**
1. Episode: "Deployed Kira to Vercel using edge functions" (score: 0.85)
2. Fact: Otto dislikes Docker (score: 0.72)
3. Procedure: "Deploy to Vercel" with 5 steps (score: 0.68)
4. Fact: Kira deployed on Vercel hobby plan (score: 0.55)
5. Episode: "Configured vercel.json for edge runtime" (score: 0.45)

**4. Injected Context (850 tokens):**
```markdown
### Known Context
- **Kira** (project): AI partner product, deployed on Vercel
- Otto dislikes Docker (confidence: 0.95)
- Kira runs on Vercel hobby plan (confidence: 0.9)

### Relevant History
- [3 days ago] Deployed Kira to Vercel using edge functions successfully
- [3 days ago] Configured vercel.json for edge runtime

### Learned Procedures
- **Deploy to Vercel** (confidence: 0.8): Check vercel.json → run tests → vercel --prod → verify URL
```

**5. Agent responds** following the learned procedure, avoiding Docker, targeting Vercel.
