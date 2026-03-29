# Temporal Graph

> **Status:** ✅ DESIGNED | **Phase:** 4
> **Purpose:** Add temporal dimensions to the knowledge graph. Every entity and relationship has a time range. Enables time-travel queries ("what did we know about X in Q3?") and temporal reasoning ("how has our understanding of X changed?").

---

## 1. The Problem

Kira's current knowledge graph stores entities and relationships as static facts. But facts change: "Client X uses Mailchimp" was true in January, then they switched to Brevo in March. Without temporal awareness, the graph returns stale data and can't answer time-scoped questions.

---

## 2. Temporal Schema Extension

### Entity Temporal Fields
```sql
ALTER TABLE entities ADD COLUMN valid_from TEXT;     -- ISO datetime when fact became known
ALTER TABLE entities ADD COLUMN valid_until TEXT;     -- ISO datetime when fact was superseded (NULL = still current)
ALTER TABLE entities ADD COLUMN observed_at TEXT;     -- when Kira first learned this
ALTER TABLE entities ADD COLUMN source_context TEXT;  -- conversation_id or document_id that established this
```

### Relationship Temporal Fields
```sql
ALTER TABLE relationships ADD COLUMN valid_from TEXT;
ALTER TABLE relationships ADD COLUMN valid_until TEXT;
ALTER TABLE relationships ADD COLUMN observed_at TEXT;
ALTER TABLE relationships ADD COLUMN source_context TEXT;
```

### Temporal Index
```sql
CREATE INDEX idx_entities_temporal ON entities(valid_from, valid_until);
CREATE INDEX idx_relationships_temporal ON relationships(valid_from, valid_until);
```

---

## 3. Time-Travel Queries

### Query Types

| Query | SQL Pattern | Example |
|-------|------------|----------|
| Current facts | `valid_until IS NULL` | "What email platform does Client X use?" |
| Point-in-time | `valid_from <= :date AND (valid_until IS NULL OR valid_until > :date)` | "What did we know about Client X in January?" |
| Change history | `entity_id = :id ORDER BY valid_from` | "How has our understanding of Client X changed?" |
| Recently learned | `observed_at >= :since ORDER BY observed_at DESC` | "What have we learned this week?" |
| Superseded facts | `valid_until IS NOT NULL ORDER BY valid_until DESC` | "What facts have changed recently?" |

### API Endpoints
```
GET /api/v1/knowledge/entities/:id/history          -- Full timeline for entity
GET /api/v1/knowledge/snapshot?date=2026-01-15       -- Graph state at date
GET /api/v1/knowledge/changes?since=2026-02-01       -- Changes since date
GET /api/v1/knowledge/query?q=...&as_of=2026-01-15   -- Semantic search at point in time
```

---

## 4. Temporal Lifecycle

### When a new fact is learned:
1. Create entity/relationship with `valid_from = now`, `valid_until = NULL`
2. Set `observed_at = now`, `source_context = conversation_id`

### When a fact is updated:
1. Set `valid_until = now` on the old record
2. Create new record with `valid_from = now`, `valid_until = NULL`
3. Link old → new via `superseded_by` reference

### When a fact is contradicted:
1. Same as update, but flag old record with `contradiction = true`
2. Log to decision log if significant

---

## 5. UI Integration

The Knowledge Graph Explorer gets a **temporal slider** (see knowledge-graph updates). Drag to any date to see the graph as it was. Entity detail panels show a timeline of changes.

---

*Temporal graph turns Kira's memory from a snapshot into a film. Every fact has a when, and the whole graph can be rewound.*