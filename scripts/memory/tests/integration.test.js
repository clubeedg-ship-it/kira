'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('/home/adminuser/chimera/node_modules/better-sqlite3');

const TEST_DB_PATH = path.join(__dirname, 'test-memory.db');

/** Create a fresh test DB with the unified schema */
function createTestDb() {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  const db = new Database(TEST_DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE entities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      properties TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_accessed TEXT
    );
    CREATE INDEX idx_entities_type ON entities(type);
    CREATE INDEX idx_entities_name ON entities(name);

    CREATE TABLE facts (
      id TEXT PRIMARY KEY,
      subject_id TEXT REFERENCES entities(id),
      predicate TEXT NOT NULL,
      object TEXT NOT NULL,
      source TEXT,
      confidence REAL DEFAULT 1.0,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_facts_subject ON facts(subject_id);
    CREATE INDEX idx_facts_predicate ON facts(predicate);

    CREATE TABLE relations (
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
    CREATE INDEX idx_relations_source ON relations(source_id);
    CREATE INDEX idx_relations_target ON relations(target_id);

    CREATE TABLE episodes (
      id TEXT PRIMARY KEY,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      type TEXT,
      summary TEXT,
      details TEXT,
      outcome TEXT,
      importance INTEGER DEFAULT 5,
      tags TEXT,
      source TEXT
    );

    CREATE TABLE procedures (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_text TEXT,
      steps TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE blackboard (
      id TEXT PRIMARY KEY,
      type TEXT,
      topic TEXT,
      content TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE embeddings (
      id TEXT PRIMARY KEY,
      source_type TEXT,
      source_id TEXT,
      text TEXT,
      vector BLOB,
      model TEXT
    );

    CREATE TABLE conversations (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      entities TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE summaries (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      start_line INTEGER,
      end_line INTEGER,
      token_count INTEGER,
      summary TEXT NOT NULL,
      topics TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE decisions (
      id TEXT PRIMARY KEY,
      what TEXT NOT NULL,
      why TEXT,
      context TEXT,
      made_at TEXT DEFAULT CURRENT_TIMESTAMP,
      source_session TEXT
    );

    CREATE TABLE preferences (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      context TEXT,
      confidence REAL DEFAULT 1.0,
      discovered_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(key, context)
    );
  `);
  return db;
}

// ── Helpers ─────────────────────────────────────────────

function uuid() { return crypto.randomUUID(); }

function insertEntity(db, overrides = {}) {
  const e = { id: uuid(), type: 'person', name: 'Test Entity', description: 'A test entity', properties: '{}', ...overrides };
  db.prepare('INSERT INTO entities (id, type, name, description, properties) VALUES (?, ?, ?, ?, ?)').run(e.id, e.type, e.name, e.description, e.properties);
  return e;
}

function insertFact(db, subjectId, predicate, object, overrides = {}) {
  const f = { id: uuid(), subject_id: subjectId, predicate, object, source: 'test', confidence: 1.0, ...overrides };
  db.prepare('INSERT INTO facts (id, subject_id, predicate, object, source, confidence) VALUES (?, ?, ?, ?, ?, ?)').run(f.id, f.subject_id, f.predicate, f.object, f.source, f.confidence);
  return f;
}

function insertRelation(db, sourceId, targetId, type, overrides = {}) {
  const r = { id: uuid(), source_id: sourceId, target_id: targetId, type, properties: '{}', ...overrides };
  db.prepare('INSERT INTO relations (id, source_id, target_id, type, properties) VALUES (?, ?, ?, ?, ?)').run(r.id, r.source_id, r.target_id, r.type, r.properties);
  return r;
}

// ── Tests ───────────────────────────────────────────────

let db;
before(() => { db = createTestDb(); });
after(() => { db.close(); try { fs.unlinkSync(TEST_DB_PATH); fs.unlinkSync(TEST_DB_PATH + '-wal'); fs.unlinkSync(TEST_DB_PATH + '-shm'); } catch {} });

describe('Entity storage and retrieval', () => {
  it('inserts and retrieves an entity by id', () => {
    const e = insertEntity(db, { name: 'Otto', type: 'person', description: 'CEO of Oopuo' });
    const row = db.prepare('SELECT * FROM entities WHERE id = ?').get(e.id);
    assert.equal(row.name, 'Otto');
    assert.equal(row.type, 'person');
    assert.equal(row.description, 'CEO of Oopuo');
  });

  it('retrieves entities by name LIKE', () => {
    insertEntity(db, { name: 'Chimera Project', type: 'project' });
    insertEntity(db, { name: 'ChimeraDB', type: 'tool' });
    const rows = db.prepare('SELECT * FROM entities WHERE name LIKE ?').all('%Chimera%');
    assert.ok(rows.length >= 2, `Expected >=2, got ${rows.length}`);
  });

  it('retrieves entities by type', () => {
    const before = db.prepare("SELECT COUNT(*) as c FROM entities WHERE type = 'person'").get().c;
    insertEntity(db, { name: 'Alice', type: 'person' });
    const after = db.prepare("SELECT COUNT(*) as c FROM entities WHERE type = 'person'").get().c;
    assert.equal(after, before + 1);
  });

  it('stores and parses JSON properties', () => {
    const props = JSON.stringify({ role: 'COO', location: 'Netherlands' });
    const e = insertEntity(db, { name: 'PropTest', properties: props });
    const row = db.prepare('SELECT properties FROM entities WHERE id = ?').get(e.id);
    const parsed = JSON.parse(row.properties);
    assert.equal(parsed.role, 'COO');
    assert.equal(parsed.location, 'Netherlands');
  });

  it('enforces unique primary key', () => {
    const id = uuid();
    insertEntity(db, { id, name: 'First' });
    assert.throws(() => insertEntity(db, { id, name: 'Duplicate' }));
  });
});

describe('Relation creation and querying', () => {
  let e1, e2, e3;
  before(() => {
    e1 = insertEntity(db, { name: 'Rel-Otto', type: 'person' });
    e2 = insertEntity(db, { name: 'Rel-Oopuo', type: 'company' });
    e3 = insertEntity(db, { name: 'Rel-Kira', type: 'agent' });
    insertRelation(db, e1.id, e2.id, 'founded');
    insertRelation(db, e3.id, e2.id, 'works_at');
    insertRelation(db, e1.id, e3.id, 'created');
  });

  it('queries outgoing relations', () => {
    const rels = db.prepare('SELECT r.type, e.name as target FROM relations r JOIN entities e ON r.target_id = e.id WHERE r.source_id = ?').all(e1.id);
    assert.equal(rels.length, 2);
    const types = rels.map(r => r.type).sort();
    assert.deepEqual(types, ['created', 'founded']);
  });

  it('queries incoming relations', () => {
    const rels = db.prepare('SELECT r.type, e.name as source FROM relations r JOIN entities e ON r.source_id = e.id WHERE r.target_id = ?').all(e2.id);
    assert.equal(rels.length, 2);
  });

  it('follows a 2-hop path', () => {
    // Otto -> created -> Kira -> works_at -> Oopuo
    const hops = db.prepare(`
      SELECT e3.name as destination FROM relations r1
      JOIN relations r2 ON r1.target_id = r2.source_id
      JOIN entities e3 ON r2.target_id = e3.id
      WHERE r1.source_id = ? AND r1.type = 'created' AND r2.type = 'works_at'
    `).all(e1.id);
    assert.equal(hops.length, 1);
    assert.equal(hops[0].destination, 'Rel-Oopuo');
  });

  it('enforces foreign key on source_id', () => {
    assert.throws(() => insertRelation(db, 'nonexistent-id', e2.id, 'broken'));
  });
});

describe('Fact storage and retrieval', () => {
  let entity;
  before(() => {
    entity = insertEntity(db, { name: 'Fact-Subject', type: 'person' });
    insertFact(db, entity.id, 'lives_in', 'Netherlands');
    insertFact(db, entity.id, 'age', '20', { confidence: 0.9 });
    insertFact(db, entity.id, 'likes', 'AI', { confidence: 0.8 });
  });

  it('retrieves facts by subject', () => {
    const facts = db.prepare('SELECT * FROM facts WHERE subject_id = ? ORDER BY predicate').all(entity.id);
    assert.equal(facts.length, 3);
  });

  it('filters by predicate', () => {
    const facts = db.prepare("SELECT * FROM facts WHERE subject_id = ? AND predicate = 'age'").all(entity.id);
    assert.equal(facts.length, 1);
    assert.equal(facts[0].object, '20');
    assert.equal(facts[0].confidence, 0.9);
  });

  it('joins facts with entity names', () => {
    const rows = db.prepare(`
      SELECT e.name as subject, f.predicate, f.object 
      FROM facts f JOIN entities e ON f.subject_id = e.id 
      WHERE e.name = 'Fact-Subject'
    `).all();
    assert.ok(rows.length >= 3);
    assert.ok(rows.every(r => r.subject === 'Fact-Subject'));
  });

  it('supports confidence-based ranking', () => {
    const facts = db.prepare('SELECT * FROM facts WHERE subject_id = ? ORDER BY confidence DESC').all(entity.id);
    assert.ok(facts[0].confidence >= facts[facts.length - 1].confidence);
  });
});

describe('Embedding storage and similarity search', () => {
  function fakeVector(seed) {
    const v = new Float32Array(4);
    for (let i = 0; i < 4; i++) v[i] = Math.sin(seed + i);
    // Normalize
    let norm = 0;
    for (let i = 0; i < 4; i++) norm += v[i] * v[i];
    norm = Math.sqrt(norm);
    for (let i = 0; i < 4; i++) v[i] /= norm;
    return v;
  }

  function cosineSim(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
  }

  before(() => {
    const insert = db.prepare('INSERT INTO embeddings (id, source_type, source_id, text, vector, model) VALUES (?, ?, ?, ?, ?, ?)');
    insert.run(uuid(), 'fact', 'f1', 'Otto lives in Netherlands', Buffer.from(fakeVector(1).buffer), 'test');
    insert.run(uuid(), 'fact', 'f2', 'Kira is COO of Oopuo', Buffer.from(fakeVector(2).buffer), 'test');
    insert.run(uuid(), 'episode', 'e1', 'Built the memory graph system', Buffer.from(fakeVector(3).buffer), 'test');
    insert.run(uuid(), 'episode', 'e2', 'Fixed CI pipeline for Chimera', Buffer.from(fakeVector(1.05).buffer), 'test'); // close to seed=1
  });

  it('stores and retrieves embeddings', () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM embeddings').get().c;
    assert.ok(count >= 4);
  });

  it('performs similarity search via cosine similarity', () => {
    const query = fakeVector(1); // should be closest to seed=1 and seed=1.05
    const all = db.prepare('SELECT source_type, source_id, text, vector FROM embeddings').all();
    const scored = all.map(row => {
      const v = new Float32Array(row.vector.buffer, row.vector.byteOffset, row.vector.byteLength / 4);
      return { text: row.text, score: cosineSim(query, v) };
    }).sort((a, b) => b.score - a.score);

    // Top result should be the exact match (seed=1)
    assert.ok(scored[0].score > 0.99, `Expected >0.99, got ${scored[0].score}`);
    assert.ok(scored[0].text.includes('Netherlands'));
    // Second should be close neighbor (seed=1.05)
    assert.ok(scored[1].score > 0.95, `Expected >0.95, got ${scored[1].score}`);
  });

  it('filters embeddings by source_type', () => {
    const facts = db.prepare("SELECT * FROM embeddings WHERE source_type = 'fact'").all();
    const episodes = db.prepare("SELECT * FROM embeddings WHERE source_type = 'episode'").all();
    assert.ok(facts.length >= 2);
    assert.ok(episodes.length >= 2);
  });
});

describe('Graph maintenance operations', () => {
  it('counts all table rows (status check)', () => {
    const tables = ['entities', 'facts', 'relations', 'episodes', 'procedures', 'blackboard', 'embeddings'];
    for (const t of tables) {
      const { c } = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get();
      assert.ok(typeof c === 'number');
    }
  });

  it('search by LIKE across entities, facts, episodes', () => {
    insertEntity(db, { name: 'SearchTarget', type: 'concept', description: 'unique-marker-xyz' });
    insertFact(db, null, 'contains', 'unique-marker-xyz');
    db.prepare('INSERT INTO episodes (id, type, summary) VALUES (?, ?, ?)').run(uuid(), 'test', 'Found unique-marker-xyz in logs');

    const like = '%unique-marker-xyz%';
    const entities = db.prepare('SELECT * FROM entities WHERE name LIKE ? OR description LIKE ?').all(like, like);
    const facts = db.prepare('SELECT * FROM facts WHERE object LIKE ? OR predicate LIKE ?').all(like, like);
    const episodes = db.prepare('SELECT * FROM episodes WHERE summary LIKE ?').all(like);

    assert.ok(entities.length >= 1);
    assert.ok(facts.length >= 1);
    assert.ok(episodes.length >= 1);
  });

  it('entity dedup detection (normalized name matching)', () => {
    insertEntity(db, { name: 'Telegram Otto', type: 'person' });
    insertEntity(db, { name: 'person: Otto', type: 'person' });
    insertEntity(db, { name: 'otto', type: 'person' });

    // Normalize function from graph-improvements.js
    function normalizeEntityName(name) {
      return name.toLowerCase()
        .replace(/^(telegram\s+|person:\s*|concept:\s*|project:\s*|tool:\s*)/i, '')
        .replace(/[_\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const all = db.prepare("SELECT name FROM entities WHERE type = 'person'").all();
    const groups = {};
    for (const e of all) {
      const norm = normalizeEntityName(e.name);
      if (!groups[norm]) groups[norm] = [];
      groups[norm].push(e.name);
    }
    const dupes = Object.entries(groups).filter(([_, g]) => g.length > 1);
    assert.ok(dupes.length >= 1, 'Should detect duplicate entity names');
    const ottoGroup = dupes.find(([k]) => k === 'otto');
    assert.ok(ottoGroup, 'Should find otto duplicates');
    assert.ok(ottoGroup[1].length >= 2);
  });

  it('cascade-safe: deleting entity removes dependent facts and relations', () => {
    const e = insertEntity(db, { name: 'Deletable', type: 'temp' });
    const e2 = insertEntity(db, { name: 'DeletableTarget', type: 'temp' });
    insertFact(db, e.id, 'test', 'value');
    insertRelation(db, e.id, e2.id, 'test_rel');

    // Manual cascade (as the app would do)
    db.prepare('DELETE FROM facts WHERE subject_id = ?').run(e.id);
    db.prepare('DELETE FROM relations WHERE source_id = ? OR target_id = ?').run(e.id, e.id);
    db.prepare('DELETE FROM entities WHERE id = ?').run(e.id);

    assert.equal(db.prepare('SELECT COUNT(*) as c FROM facts WHERE subject_id = ?').get(e.id).c, 0);
    assert.equal(db.prepare('SELECT COUNT(*) as c FROM relations WHERE source_id = ?').get(e.id).c, 0);
    assert.equal(db.prepare('SELECT COUNT(*) as c FROM entities WHERE id = ?').get(e.id).c, 0);
  });

  it('episode logging with all fields', () => {
    const id = uuid();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO episodes (id, timestamp, type, summary, details, outcome, importance, tags, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, now, 'task', 'Deployed memory system', 'Full integration test', 'success', 8, '["memory","deploy"]', 'test'
    );
    const ep = db.prepare('SELECT * FROM episodes WHERE id = ?').get(id);
    assert.equal(ep.type, 'task');
    assert.equal(ep.importance, 8);
    assert.equal(ep.outcome, 'success');
    assert.deepEqual(JSON.parse(ep.tags), ['memory', 'deploy']);
  });
});
