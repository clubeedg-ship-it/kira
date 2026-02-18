# Kira Memory System — SQLite Schema

> Complete database schema for all four memory layers.
> Database: SQLite 3.40+ with FTS5 and JSON1 extensions.
> Date: 2026-02-11

---

## Database Configuration

```sql
-- Performance pragmas (set on every connection)
PRAGMA journal_mode = WAL;          -- concurrent reads during writes
PRAGMA synchronous = NORMAL;        -- balance safety/speed
PRAGMA foreign_keys = ON;
PRAGMA cache_size = -64000;         -- 64MB cache
PRAGMA mmap_size = 268435456;       -- 256MB memory-mapped I/O
PRAGMA busy_timeout = 5000;
```

---

## Core Tables

### sessions

```sql
CREATE TABLE sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT,                                     -- FK → entities.id (nullable for system sessions)
    channel     TEXT NOT NULL DEFAULT 'cli',               -- telegram|discord|cli|api
    started_at  TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at    TEXT,
    summary     TEXT,
    episode_count INTEGER NOT NULL DEFAULT 0,
    metadata    TEXT,                                      -- JSON: channel-specific data
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_started ON sessions(started_at DESC);
CREATE INDEX idx_sessions_channel ON sessions(channel);
CREATE INDEX idx_sessions_user ON sessions(user_id);
```

### episodes

```sql
CREATE TABLE episodes (
    id              TEXT PRIMARY KEY,                      -- ULID
    timestamp       TEXT NOT NULL,                         -- ISO 8601 UTC
    session_id      TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK(type IN ('conversation','action','event','observation','system')),
    actor           TEXT NOT NULL,                         -- user|agent|system|tool:<name>
    summary         TEXT NOT NULL,
    details         TEXT,                                  -- full content (JSON or text)
    importance      INTEGER NOT NULL DEFAULT 5 CHECK(importance BETWEEN 1 AND 10),
    tags            TEXT DEFAULT '[]',                     -- JSON array
    outcome         TEXT CHECK(outcome IN ('success','failure','partial','pending') OR outcome IS NULL),
    parent_id       TEXT REFERENCES episodes(id) ON DELETE SET NULL,
    compression     TEXT NOT NULL DEFAULT 'raw' CHECK(compression IN ('raw','compressed','distilled')),
    token_count     INTEGER,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at      TEXT                                   -- NULL = never
);

CREATE INDEX idx_episodes_timestamp ON episodes(timestamp DESC);
CREATE INDEX idx_episodes_session ON episodes(session_id, timestamp ASC);
CREATE INDEX idx_episodes_type ON episodes(type);
CREATE INDEX idx_episodes_importance ON episodes(importance DESC);
CREATE INDEX idx_episodes_compression ON episodes(compression);
CREATE INDEX idx_episodes_expires ON episodes(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_episodes_tags ON episodes(tags);         -- for json_each queries
CREATE INDEX idx_episodes_actor ON episodes(actor);
```

### entities

```sql
CREATE TABLE entities (
    id              TEXT PRIMARY KEY,                      -- ULID
    name            TEXT NOT NULL,
    type            TEXT NOT NULL CHECK(type IN ('person','organization','project','concept','location','tool','event','other')),
    description     TEXT,
    aliases         TEXT DEFAULT '[]',                     -- JSON array
    metadata        TEXT DEFAULT '{}',                     -- JSON
    first_seen      TEXT NOT NULL DEFAULT (datetime('now')),
    last_referenced TEXT NOT NULL DEFAULT (datetime('now')),
    mention_count   INTEGER NOT NULL DEFAULT 1,
    importance      INTEGER NOT NULL DEFAULT 5 CHECK(importance BETWEEN 1 AND 10),
    embedding       BLOB,                                 -- 384-dim float32 = 1536 bytes
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_entities_name_type ON entities(name, type);
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_importance ON entities(importance DESC);
CREATE INDEX idx_entities_last_ref ON entities(last_referenced DESC);
CREATE INDEX idx_entities_mention ON entities(mention_count DESC);
```

### relationships

```sql
CREATE TABLE relationships (
    id              TEXT PRIMARY KEY,                      -- ULID
    source_id       TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_id       TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,                         -- works_at, knows, uses, prefers, part_of, etc.
    properties      TEXT DEFAULT '{}',                     -- JSON
    confidence      REAL NOT NULL DEFAULT 1.0 CHECK(confidence BETWEEN 0.0 AND 1.0),
    source_episode  TEXT REFERENCES episodes(id) ON DELETE SET NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_rel_unique ON relationships(source_id, target_id, type);
CREATE INDEX idx_rel_source ON relationships(source_id);
CREATE INDEX idx_rel_target ON relationships(target_id);
CREATE INDEX idx_rel_type ON relationships(type);
CREATE INDEX idx_rel_confidence ON relationships(confidence DESC);
```

### facts

```sql
CREATE TABLE facts (
    id              TEXT PRIMARY KEY,                      -- ULID
    entity_id       TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    subject         TEXT NOT NULL,
    predicate       TEXT NOT NULL,
    object          TEXT NOT NULL,
    confidence      REAL NOT NULL DEFAULT 1.0 CHECK(confidence BETWEEN 0.0 AND 1.0),
    source_episode  TEXT REFERENCES episodes(id) ON DELETE SET NULL,
    source_type     TEXT NOT NULL DEFAULT 'inferred' CHECK(source_type IN ('stated','inferred','observed','corrected')),
    valid_from      TEXT,
    valid_until     TEXT,                                  -- NULL = still true
    superseded_by   TEXT REFERENCES facts(id) ON DELETE SET NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_facts_entity ON facts(entity_id);
CREATE INDEX idx_facts_subject ON facts(subject);
CREATE INDEX idx_facts_predicate ON facts(predicate);
CREATE INDEX idx_facts_confidence ON facts(confidence DESC);
CREATE INDEX idx_facts_valid ON facts(valid_until) WHERE valid_until IS NULL; -- current facts
CREATE INDEX idx_facts_source_type ON facts(source_type);
```

### procedures

```sql
CREATE TABLE procedures (
    id              TEXT PRIMARY KEY,                      -- ULID
    name            TEXT NOT NULL,
    trigger         TEXT NOT NULL,                         -- when to invoke
    steps           TEXT NOT NULL DEFAULT '[]',            -- JSON array of step objects
    context         TEXT,                                  -- conditions for applicability
    source_episode  TEXT REFERENCES episodes(id) ON DELETE SET NULL,
    success_count   INTEGER NOT NULL DEFAULT 0,
    failure_count   INTEGER NOT NULL DEFAULT 0,
    last_used       TEXT,
    last_outcome    TEXT CHECK(last_outcome IN ('success','failure','partial') OR last_outcome IS NULL),
    confidence      REAL NOT NULL DEFAULT 0.5 CHECK(confidence BETWEEN 0.0 AND 1.0),
    superseded_by   TEXT REFERENCES procedures(id) ON DELETE SET NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_proc_confidence ON procedures(confidence DESC);
CREATE INDEX idx_proc_last_used ON procedures(last_used DESC);
CREATE INDEX idx_proc_name ON procedures(name);
```

### preferences

```sql
CREATE TABLE preferences (
    id              TEXT PRIMARY KEY,                      -- ULID
    category        TEXT NOT NULL CHECK(category IN ('communication','formatting','workflow','tools','scheduling','other')),
    key             TEXT NOT NULL,
    value           TEXT NOT NULL,                         -- can be JSON for complex values
    strength        REAL NOT NULL DEFAULT 0.5 CHECK(strength BETWEEN 0.0 AND 1.0),
    evidence_count  INTEGER NOT NULL DEFAULT 1,
    source_type     TEXT NOT NULL DEFAULT 'inferred' CHECK(source_type IN ('stated','inferred','corrected')),
    source_episodes TEXT DEFAULT '[]',                     -- JSON array of episode IDs
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_pref_unique ON preferences(category, key);
CREATE INDEX idx_pref_category ON preferences(category);
CREATE INDEX idx_pref_strength ON preferences(strength DESC);
```

---

## Full-Text Search (FTS5)

```sql
-- Episode search (summary + details)
CREATE VIRTUAL TABLE episodes_fts USING fts5(
    summary,
    details,
    tags,
    content='episodes',
    content_rowid='rowid',
    tokenize='porter unicode61 remove_diacritics 2'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER episodes_ai AFTER INSERT ON episodes BEGIN
    INSERT INTO episodes_fts(rowid, summary, details, tags)
    VALUES (new.rowid, new.summary, new.details, new.tags);
END;

CREATE TRIGGER episodes_ad AFTER DELETE ON episodes BEGIN
    INSERT INTO episodes_fts(episodes_fts, rowid, summary, details, tags)
    VALUES ('delete', old.rowid, old.summary, old.details, old.tags);
END;

CREATE TRIGGER episodes_au AFTER UPDATE ON episodes BEGIN
    INSERT INTO episodes_fts(episodes_fts, rowid, summary, details, tags)
    VALUES ('delete', old.rowid, old.summary, old.details, old.tags);
    INSERT INTO episodes_fts(rowid, summary, details, tags)
    VALUES (new.rowid, new.summary, new.details, new.tags);
END;

-- Entity search (name + description + aliases)
CREATE VIRTUAL TABLE entities_fts USING fts5(
    name,
    description,
    aliases,
    content='entities',
    content_rowid='rowid',
    tokenize='porter unicode61 remove_diacritics 2'
);

CREATE TRIGGER entities_ai AFTER INSERT ON entities BEGIN
    INSERT INTO entities_fts(rowid, name, description, aliases)
    VALUES (new.rowid, new.name, new.description, new.aliases);
END;

CREATE TRIGGER entities_ad AFTER DELETE ON entities BEGIN
    INSERT INTO entities_fts(entities_fts, rowid, name, description, aliases)
    VALUES ('delete', old.rowid, old.name, old.description, old.aliases);
END;

CREATE TRIGGER entities_au AFTER UPDATE ON entities BEGIN
    INSERT INTO entities_fts(entities_fts, rowid, name, description, aliases)
    VALUES ('delete', old.rowid, old.name, old.description, old.aliases);
    INSERT INTO entities_fts(rowid, name, description, aliases)
    VALUES (new.rowid, new.name, new.description, new.aliases);
END;

-- Fact search (subject + predicate + object)
CREATE VIRTUAL TABLE facts_fts USING fts5(
    subject,
    predicate,
    object,
    content='facts',
    content_rowid='rowid',
    tokenize='porter unicode61 remove_diacritics 2'
);

CREATE TRIGGER facts_ai AFTER INSERT ON facts BEGIN
    INSERT INTO facts_fts(rowid, subject, predicate, object)
    VALUES (new.rowid, new.subject, new.predicate, new.object);
END;

CREATE TRIGGER facts_ad AFTER DELETE ON facts BEGIN
    INSERT INTO facts_fts(facts_fts, rowid, subject, predicate, object)
    VALUES ('delete', old.rowid, old.subject, old.predicate, old.object);
END;

CREATE TRIGGER facts_au AFTER UPDATE ON facts BEGIN
    INSERT INTO facts_fts(facts_fts, rowid, subject, predicate, object)
    VALUES ('delete', old.rowid, old.subject, old.predicate, old.object);
    INSERT INTO facts_fts(rowid, subject, predicate, object)
    VALUES (new.rowid, new.subject, new.predicate, new.object);
END;

-- Procedure search
CREATE VIRTUAL TABLE procedures_fts USING fts5(
    name,
    trigger,
    steps,
    content='procedures',
    content_rowid='rowid',
    tokenize='porter unicode61 remove_diacritics 2'
);

CREATE TRIGGER procedures_ai AFTER INSERT ON procedures BEGIN
    INSERT INTO procedures_fts(rowid, name, trigger, steps)
    VALUES (new.rowid, new.name, new.trigger, new.steps);
END;

CREATE TRIGGER procedures_ad AFTER DELETE ON procedures BEGIN
    INSERT INTO procedures_fts(procedures_fts, rowid, name, trigger, steps)
    VALUES ('delete', old.rowid, old.name, old.trigger, old.steps);
END;

CREATE TRIGGER procedures_au AFTER UPDATE ON procedures BEGIN
    INSERT INTO procedures_fts(procedures_fts, rowid, name, trigger, steps)
    VALUES ('delete', old.rowid, old.name, old.trigger, old.steps);
    INSERT INTO procedures_fts(rowid, name, trigger, steps)
    VALUES (new.rowid, new.name, new.trigger, new.steps);
END;
```

### FTS5 Query Examples

```sql
-- Search episodes for "deploy vercel"
SELECT e.id, e.summary, e.timestamp, e.importance,
       rank AS relevance
FROM episodes_fts
JOIN episodes e ON e.rowid = episodes_fts.rowid
WHERE episodes_fts MATCH 'deploy AND vercel'
ORDER BY rank
LIMIT 10;

-- Fuzzy search entities
SELECT e.id, e.name, e.type, rank
FROM entities_fts
JOIN entities e ON e.rowid = entities_fts.rowid
WHERE entities_fts MATCH 'oto OR otto'  -- handles typos via OR
ORDER BY rank
LIMIT 5;

-- Search facts about preferences
SELECT f.subject, f.predicate, f.object, f.confidence
FROM facts_fts
JOIN facts f ON f.rowid = facts_fts.rowid
WHERE facts_fts MATCH 'prefers OR likes OR dislikes'
  AND f.valid_until IS NULL
ORDER BY f.confidence DESC;
```

---

## Vector Embeddings Storage

SQLite doesn't natively support vector operations, but we store embeddings as BLOBs and compute similarity in application code (or via `sqlite-vss` extension if available).

### Embedding Storage

Embeddings are stored as packed float32 arrays in BLOB columns:

```javascript
// Writing an embedding
const embedding = await embed("Otto's Kira project");  // float32[384]
const buffer = Buffer.from(new Float32Array(embedding).buffer);
db.run('UPDATE entities SET embedding = ? WHERE id = ?', [buffer, entityId]);

// Reading an embedding
const row = db.get('SELECT embedding FROM entities WHERE id = ?', [entityId]);
const embedding = new Float32Array(row.embedding.buffer);
```

### Dedicated Embedding Table (for items without their own table)

```sql
CREATE TABLE embeddings (
    id          TEXT PRIMARY KEY,
    source_table TEXT NOT NULL,        -- episodes|entities|facts|procedures
    source_id   TEXT NOT NULL,
    embedding   BLOB NOT NULL,         -- 384-dim float32 = 1536 bytes
    model       TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_emb_source ON embeddings(source_table, source_id);
CREATE INDEX idx_emb_table ON embeddings(source_table);
```

### Similarity Search (Application Layer)

```javascript
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function semanticSearch(query: string, table: string, topK: number = 10) {
    const queryEmb = await embed(query);
    
    // Load all embeddings for the table (cached in memory for small datasets)
    const rows = db.all(
        'SELECT source_id, embedding FROM embeddings WHERE source_table = ?',
        [table]
    );
    
    const scored = rows.map(row => ({
        id: row.source_id,
        score: cosineSimilarity(queryEmb, new Float32Array(row.embedding.buffer))
    }));
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
}
```

### sqlite-vss (Optional, for Larger Datasets)

If datasets grow beyond ~10K rows, use the `sqlite-vss` extension:

```sql
-- Create virtual table for vector search
CREATE VIRTUAL TABLE entities_vss USING vss0(embedding(384));

-- Insert embeddings
INSERT INTO entities_vss(rowid, embedding)
SELECT rowid, embedding FROM entities WHERE embedding IS NOT NULL;

-- Query nearest neighbors
SELECT rowid, distance
FROM entities_vss
WHERE vss_search(embedding, :query_embedding)
LIMIT 10;
```

---

## Migration Strategy

### Current State (file-based)

```
~/kira/
├── MEMORY.md               → long-term curated memory
├── memory/
│   ├── YYYY-MM-DD.md       → daily notes
│   ├── context-buffer.md   → conversation summary
│   ├── retrieved-context.md → retrieved memory
│   └── heartbeat-state.json
├── USER.md                  → user profile
└── SOUL.md                  → agent identity
```

### Migration Plan

**Phase 1: Parallel Operation**
- Create SQLite database alongside existing files
- New writes go to both files and SQLite
- Reads still primarily from files
- Run migration script to backfill existing data

**Phase 2: SQLite Primary**
- Reads switch to SQLite
- Files become generated exports (for human readability)
- `MEMORY.md` auto-generated from high-importance facts + recent episode summaries

**Phase 3: Files as Views**
- Files are read-only views of the database
- Generated on-demand or periodically
- Human can still read them but edits go through an import pipeline

### Migration Script

```javascript
// migrate-files-to-sqlite.js
async function migrate() {
    // 1. Parse MEMORY.md → entities + facts
    const memoryContent = await fs.readFile('MEMORY.md', 'utf-8');
    const facts = extractFacts(memoryContent);  // LLM-assisted extraction
    for (const fact of facts) {
        await insertFact(db, fact);
    }
    
    // 2. Parse USER.md → user entity + preferences
    const userContent = await fs.readFile('USER.md', 'utf-8');
    const userEntity = extractUserEntity(userContent);
    await insertEntity(db, userEntity);
    
    // 3. Parse daily notes → episodes
    const dailyFiles = glob.sync('memory/????-??-??.md');
    for (const file of dailyFiles) {
        const date = path.basename(file, '.md');
        const content = await fs.readFile(file, 'utf-8');
        const episodes = parseDaily(content, date);
        for (const ep of episodes) {
            await insertEpisode(db, ep);
        }
    }
    
    // 4. Generate embeddings for all entities and episodes
    await generateEmbeddings(db);
}
```

### Schema Versioning

```sql
CREATE TABLE schema_version (
    version     INTEGER PRIMARY KEY,
    applied_at  TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT
);

INSERT INTO schema_version(version, description) VALUES (1, 'Initial schema');
```

Each migration is a numbered SQL file:

```
migrations/
├── 001_initial_schema.sql
├── 002_add_embeddings_table.sql
├── 003_add_session_metadata.sql
```

Applied via:

```javascript
async function applyMigrations(db: Database) {
    const current = db.get('SELECT MAX(version) as v FROM schema_version')?.v || 0;
    const migrations = glob.sync('migrations/*.sql').sort();
    
    for (const file of migrations) {
        const version = parseInt(path.basename(file));
        if (version > current) {
            const sql = await fs.readFile(file, 'utf-8');
            db.exec(sql);
            db.run('INSERT INTO schema_version(version, description) VALUES (?, ?)',
                [version, path.basename(file)]);
        }
    }
}
```

---

## Entity-Relationship Diagram

```
sessions 1──────┤ episodes
                      │
                      │ source_episode
                      ├──────────────┤ facts
                      ├──────────────┤ relationships
                      └──────────────┤ procedures

entities 1──┤ facts
entities 1──┤ relationships (source)
entities 1──┤ relationships (target)

episodes ──── episodes_fts
entities ──── entities_fts
facts    ──── facts_fts
procedures ── procedures_fts

embeddings → (source_table, source_id) → any table
```

---

## Maintenance Queries

```sql
-- Database size check
SELECT page_count * page_size AS size_bytes FROM pragma_page_count, pragma_page_size;

-- Table row counts
SELECT 'episodes' AS t, COUNT(*) FROM episodes
UNION ALL SELECT 'entities', COUNT(*) FROM entities
UNION ALL SELECT 'facts', COUNT(*) FROM facts
UNION ALL SELECT 'relationships', COUNT(*) FROM relationships
UNION ALL SELECT 'procedures', COUNT(*) FROM procedures
UNION ALL SELECT 'preferences', COUNT(*) FROM preferences;

-- Rebuild FTS indexes
INSERT INTO episodes_fts(episodes_fts) VALUES('rebuild');
INSERT INTO entities_fts(entities_fts) VALUES('rebuild');

-- Vacuum (reclaim space after deletions)
VACUUM;

-- Integrity check
PRAGMA integrity_check;
```
