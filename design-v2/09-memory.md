# 09 — Memory System

Per-user, 4-layer SQLite memory in `/data/users/{id}/memory.db`.

## Layers

| Layer | Purpose | Storage |
|-------|---------|---------|
| **Episodic** | What happened (conversations, events) | Timestamped entries |
| **Semantic** | Facts, entities, relationships | Knowledge graph (nodes + edges) |
| **Procedural** | How-to knowledge (user preferences, patterns) | Key-value procedures |
| **Working** | Current context, active focus | Temporary blackboard |

## Schema

```sql
-- Episodic
CREATE TABLE episodes (
  id TEXT PRIMARY KEY, content TEXT, type TEXT,
  importance INTEGER DEFAULT 5, tags TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Semantic (Knowledge Graph)
CREATE TABLE entities (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
  properties TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE relationships (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES entities(id),
  target_id TEXT REFERENCES entities(id),
  type TEXT NOT NULL, properties TEXT,
  created_at TEXT
);

-- Procedural
CREATE TABLE procedures (
  id TEXT PRIMARY KEY, key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL, category TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Working Memory
CREATE TABLE working (
  key TEXT PRIMARY KEY, value TEXT,
  expires_at TEXT
);
```

## API

```
GET  /api/knowledge/entities?type=person&q=otto
GET  /api/knowledge/entities/:id
GET  /api/knowledge/search?q=meeting+notes
GET  /api/knowledge/stats
```

## Integration with Chat

Before each LLM call, retrieve relevant memory:
1. Search episodic memory for similar context
2. Pull related entities from semantic layer
3. Check procedural memory for user preferences
4. Inject as system prompt context (max 2000 tokens of memory)
