'use strict';
const path = require('path');
const Database = require('/home/adminuser/chimera/node_modules/better-sqlite3');
const fs = require('fs');

const UNIFIED_PATH = path.join(__dirname, '../../memory/unified.db');
const GRAPH_PATH = '/home/adminuser/chimera/memory/graph.db';
const EPISODES_DIR = path.join(__dirname, '../../memory/episodes');
const PROCEDURES_DIR = path.join(__dirname, '../../memory/procedures');
const BLACKBOARD_PATH = path.join(__dirname, '../../memory/blackboard.jsonl');

// Create unified.db
const db = new Database(UNIFIED_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
-- From graph.db schema (actual columns)
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  properties TEXT,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_accessed TEXT
);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);

CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY,
  subject_id TEXT REFERENCES entities(id),
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  source TEXT,
  confidence REAL DEFAULT 1.0,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_facts_subject ON facts(subject_id);
CREATE INDEX IF NOT EXISTS idx_facts_predicate ON facts(predicate);
CREATE INDEX IF NOT EXISTS idx_facts_timestamp ON facts(timestamp);

CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  type TEXT NOT NULL,
  properties TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  valid_from DATETIME,
  valid_to DATETIME,
  FOREIGN KEY (source_id) REFERENCES entities(id),
  FOREIGN KEY (target_id) REFERENCES entities(id)
);
CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id);
CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  entities TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);

CREATE TABLE IF NOT EXISTS summaries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  start_line INTEGER,
  end_line INTEGER,
  token_count INTEGER,
  summary TEXT NOT NULL,
  topics TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  what TEXT NOT NULL,
  why TEXT,
  context TEXT,
  made_at TEXT DEFAULT CURRENT_TIMESTAMP,
  source_session TEXT
);

CREATE TABLE IF NOT EXISTS preferences (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  context TEXT,
  confidence REAL DEFAULT 1.0,
  discovered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(key, context)
);

CREATE TABLE IF NOT EXISTS curated_segments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  curated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, start_line, end_line)
);

-- New tables
CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  type TEXT,
  summary TEXT NOT NULL,
  details TEXT,
  outcome TEXT,
  importance INTEGER DEFAULT 5,
  tags TEXT,
  source TEXT DEFAULT 'manual'
);
CREATE INDEX IF NOT EXISTS idx_episodes_timestamp ON episodes(timestamp);
CREATE INDEX IF NOT EXISTS idx_episodes_type ON episodes(type);
CREATE INDEX IF NOT EXISTS idx_episodes_importance ON episodes(importance);

CREATE TABLE IF NOT EXISTS procedures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_text TEXT,
  steps TEXT NOT NULL,
  success_rate REAL,
  times_used INTEGER DEFAULT 0,
  last_used TEXT,
  tags TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blackboard (
  id TEXT PRIMARY KEY,
  agent TEXT DEFAULT 'kira',
  type TEXT,
  topic TEXT DEFAULT 'general',
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  resolved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blackboard_resolved ON blackboard(resolved);

CREATE TABLE IF NOT EXISTS focus (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  type TEXT,
  item_id TEXT,
  title TEXT,
  data TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  source_type TEXT,
  source_id TEXT,
  text TEXT,
  vector BLOB,
  model TEXT DEFAULT 'nomic-embed-text',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id);
`);

console.log('Schema created.');

// Migrate from graph.db
if (fs.existsSync(GRAPH_PATH)) {
  const graphDb = new Database(GRAPH_PATH, { readonly: true });
  
  // Entities - graph.db has different columns than schema.sql
  const entities = graphDb.prepare('SELECT * FROM entities').all();
  const insertEntity = db.prepare(`INSERT OR IGNORE INTO entities (id, type, name, properties, description, created_at, updated_at, last_accessed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertEntities = db.transaction((rows) => {
    for (const r of rows) {
      insertEntity.run(r.id, r.type, r.name, r.properties, r.description || null, r.created_at, r.updated_at, r.last_accessed);
    }
  });
  insertEntities(entities);
  console.log(`Migrated ${entities.length} entities`);

  // Facts
  const facts = graphDb.prepare('SELECT * FROM facts').all();
  const insertFact = db.prepare(`INSERT OR IGNORE INTO facts (id, subject_id, predicate, object, source, confidence, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  db.transaction((rows) => { for (const r of rows) insertFact.run(r.id, r.subject_id, r.predicate, r.object, r.source, r.confidence, r.timestamp); })(facts);
  console.log(`Migrated ${facts.length} facts`);

  // Relations
  const relations = graphDb.prepare('SELECT * FROM relations').all();
  const insertRel = db.prepare(`INSERT OR IGNORE INTO relations (id, source_id, target_id, type, properties, timestamp, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  db.transaction((rows) => { for (const r of rows) insertRel.run(r.id, r.source_id, r.target_id, r.type, r.properties, r.timestamp, r.valid_from, r.valid_to); })(relations);
  console.log(`Migrated ${relations.length} relations`);

  // Conversations
  const convos = graphDb.prepare('SELECT * FROM conversations').all();
  const insertConvo = db.prepare(`INSERT OR IGNORE INTO conversations (id, session_id, role, content, summary, entities, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  db.transaction((rows) => { for (const r of rows) insertConvo.run(r.id, r.session_id, r.role, r.content, r.summary, r.entities, r.timestamp); })(convos);
  console.log(`Migrated ${convos.length} conversations`);

  // Curated segments
  const segments = graphDb.prepare('SELECT * FROM curated_segments').all();
  const insertSeg = db.prepare(`INSERT OR IGNORE INTO curated_segments (id, session_id, start_line, end_line, curated_at) VALUES (?, ?, ?, ?, ?)`);
  db.transaction((rows) => { for (const r of rows) insertSeg.run(r.id, r.session_id, r.start_line, r.end_line, r.curated_at); })(segments);
  console.log(`Migrated ${segments.length} curated_segments`);

  // Summaries, decisions, preferences (likely empty but migrate anyway)
  for (const table of ['summaries', 'decisions', 'preferences']) {
    try {
      const rows = graphDb.prepare(`SELECT * FROM ${table}`).all();
      if (rows.length > 0) console.log(`${table}: ${rows.length} rows (manual migration needed)`);
      else console.log(`${table}: 0 rows`);
    } catch(e) { console.log(`${table}: table not found`); }
  }

  graphDb.close();
}

// Migrate episodes from JSONL
if (fs.existsSync(EPISODES_DIR)) {
  const crypto = require('crypto');
  const insertEp = db.prepare(`INSERT OR IGNORE INTO episodes (id, timestamp, type, summary, details, outcome, importance, tags, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  let epCount = 0;
  const files = fs.readdirSync(EPISODES_DIR).filter(f => f.endsWith('.jsonl'));
  const txn = db.transaction(() => {
    for (const file of files) {
      const lines = fs.readFileSync(path.join(EPISODES_DIR, file), 'utf8').trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const ep = JSON.parse(line);
          const id = ep.id || crypto.randomUUID();
          const ts = ep.timestamp || ep.time || file.replace('.jsonl', '');
          insertEp.run(id, ts, ep.type || null, ep.summary || ep.content || JSON.stringify(ep), ep.details || null, ep.outcome || null, ep.importance || 5, ep.tags ? JSON.stringify(ep.tags) : null, ep.source || 'episode-file');
          epCount++;
        } catch(e) { /* skip bad lines */ }
      }
    }
  });
  txn();
  console.log(`Migrated ${epCount} episodes`);
}

// Migrate procedures from JSON files
if (fs.existsSync(PROCEDURES_DIR)) {
  const insertProc = db.prepare(`INSERT OR IGNORE INTO procedures (id, name, trigger_text, steps, success_rate, times_used, last_used, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  let procCount = 0;
  const txn = db.transaction(() => {
    const files = fs.readdirSync(PROCEDURES_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const proc = JSON.parse(fs.readFileSync(path.join(PROCEDURES_DIR, file), 'utf8'));
        const id = proc.id || file.replace('.json', '');
        insertProc.run(id, proc.name || id, proc.trigger || null, JSON.stringify(proc.steps || []), proc.success_rate || null, proc.times_used || 0, proc.last_used || null, proc.tags ? JSON.stringify(proc.tags) : null, proc.created_at || null, proc.updated_at || null);
        procCount++;
      } catch(e) { /* skip bad files */ }
    }
  });
  txn();
  console.log(`Migrated ${procCount} procedures`);
}

// Migrate blackboard from JSONL
if (fs.existsSync(BLACKBOARD_PATH)) {
  const crypto = require('crypto');
  const insertBb = db.prepare(`INSERT OR IGNORE INTO blackboard (id, agent, type, topic, content, priority, resolved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  let bbCount = 0;
  const lines = fs.readFileSync(BLACKBOARD_PATH, 'utf8').trim().split('\n');
  const txn = db.transaction(() => {
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const bb = JSON.parse(line);
        const id = bb.id || crypto.randomUUID();
        insertBb.run(id, bb.agent || 'kira', bb.type || null, bb.topic || 'general', bb.content || JSON.stringify(bb), bb.priority || 'normal', bb.resolved ? 1 : 0, bb.created_at || bb.timestamp || null);
        bbCount++;
      } catch(e) { /* skip */ }
    }
  });
  txn();
  console.log(`Migrated ${bbCount} blackboard entries`);
}

db.close();
console.log('\nDone! unified.db created at:', UNIFIED_PATH);
