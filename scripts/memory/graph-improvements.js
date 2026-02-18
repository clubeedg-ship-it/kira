#!/usr/bin/env node
/**
 * Graph Quality Improvements
 * 
 * 1. Re-embed: Clean old embeddings that contain Telegram metadata
 * 2. Deduplicate: Merge duplicate entities (Otto, Telegram Otto, person: Otto)
 * 3. Confidence decay: Add decay scores to facts based on age
 * 4. Relationship normalization: Collapse verb variants to canonical types
 * 
 * Usage:
 *   node graph-improvements.js all          Run all improvements
 *   node graph-improvements.js re-embed     Fix metadata-contaminated embeddings
 *   node graph-improvements.js dedup        Merge duplicate entities
 *   node graph-improvements.js decay        Apply confidence decay
 *   node graph-improvements.js normalize    Normalize relationship types
 *   node graph-improvements.js stats        Show improvement stats
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const Database = require('/home/adminuser/chimera/node_modules/better-sqlite3');

const DB_PATH = path.join(__dirname, '../../memory/unified.db');
const OLLAMA_URL = 'http://localhost:11434';
const EMBED_MODEL = 'nomic-embed-text';

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  return db;
}

async function getEmbedding(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ model: EMBED_MODEL, prompt: text.slice(0, 8000) });
    const req = http.request(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try {
          const r = JSON.parse(buf);
          if (!r.embedding) reject(new Error('No embedding'));
          else resolve(new Float32Array(r.embedding));
        } catch { reject(new Error('Parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

function vectorToBuffer(vec) {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

// ── 1. RE-EMBED: Fix metadata-contaminated embeddings ───

async function reEmbed() {
  const db = getDb();
  
  // Find embeddings with Telegram metadata in text
  const dirty = db.prepare(`
    SELECT id, source_type, source_id, text FROM embeddings
    WHERE text LIKE '%[Telegram%' OR text LIKE '%message_id:%' OR text LIKE '%@coringa%'
  `).all();
  
  console.log(`[re-embed] Found ${dirty.length} metadata-contaminated embeddings`);
  
  let fixed = 0;
  const update = db.prepare('UPDATE embeddings SET text = ?, vector = ? WHERE id = ?');
  
  for (const row of dirty) {
    // Strip metadata
    let clean = row.text
      .replace(/^\[Telegram\s+[^\]]+\]\s*/i, '')
      .replace(/\[message_id:\s*\d+\]\s*/g, '')
      .replace(/\[Queued messages[^\]]*\][\s\S]*?(?=\n\n|\n[^\[])*/g, '')
      .replace(/^---\s*$/gm, '')
      .trim();
    
    if (clean.length < 10) {
      // Too short after cleanup, delete
      db.prepare('DELETE FROM embeddings WHERE id = ?').run(row.id);
      continue;
    }
    
    try {
      const vec = await getEmbedding(clean);
      update.run(clean, vectorToBuffer(vec), row.id);
      fixed++;
      if (fixed % 20 === 0) console.log(`[re-embed] ${fixed}/${dirty.length} fixed...`);
    } catch (e) {
      console.error(`[re-embed] Failed:`, e.message);
    }
  }
  
  db.close();
  console.log(`[re-embed] Done: ${fixed} embeddings cleaned`);
  return fixed;
}

// ── 2. DEDUPLICATE: Merge duplicate entities ────────────

function normalizeEntityName(name) {
  return name
    .toLowerCase()
    .replace(/^(telegram\s+|person:\s*|concept:\s*|project:\s*|tool:\s*)/i, '')
    .replace(/[_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function dedup() {
  const db = getDb();
  
  const entities = db.prepare('SELECT id, name, type, description, created_at, updated_at FROM entities').all();
  
  // Group by normalized name
  const groups = {};
  for (const e of entities) {
    const norm = normalizeEntityName(e.name);
    if (!groups[norm]) groups[norm] = [];
    groups[norm].push(e);
  }
  
  // Find groups with duplicates
  const dupes = Object.entries(groups).filter(([_, g]) => g.length > 1);
  console.log(`[dedup] Found ${dupes.length} duplicate entity groups`);
  
  let merged = 0;
  
  for (const [normName, group] of dupes) {
    // Pick the "best" entity: prefer one with description, most recent update, shortest id
    group.sort((a, b) => {
      if (a.description && !b.description) return -1;
      if (!a.description && b.description) return 1;
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    });
    
    const keep = group[0];
    const remove = group.slice(1);
    
    // Merge descriptions
    const descriptions = group.map(e => e.description).filter(Boolean);
    const bestDesc = descriptions.sort((a, b) => b.length - a.length)[0] || null;
    if (bestDesc) {
      db.prepare('UPDATE entities SET description = ? WHERE id = ?').run(bestDesc, keep.id);
    }
    
    for (const dup of remove) {
      // Redirect relations
      db.prepare('UPDATE relations SET source_id = ? WHERE source_id = ?').run(keep.id, dup.id);
      db.prepare('UPDATE relations SET target_id = ? WHERE target_id = ?').run(keep.id, dup.id);
      
      // Redirect facts
      db.prepare('UPDATE facts SET subject_id = ? WHERE subject_id = ?').run(keep.id, dup.id);
      
      // Redirect embeddings
      db.prepare('UPDATE embeddings SET source_id = ? WHERE source_type = ? AND source_id = ?').run(keep.id, 'entity', dup.id);
      
      // Delete duplicate entity
      db.prepare('DELETE FROM entities WHERE id = ?').run(dup.id);
      merged++;
    }
  }
  
  // Remove duplicate relations (same source, target, type after merging)
  const dupRelations = db.prepare(`
    SELECT MIN(id) as keep_id, source_id, target_id, type, COUNT(*) as cnt
    FROM relations
    GROUP BY source_id, target_id, type
    HAVING cnt > 1
  `).all();
  
  let relsMerged = 0;
  for (const dr of dupRelations) {
    db.prepare('DELETE FROM relations WHERE source_id = ? AND target_id = ? AND type = ? AND id != ?')
      .run(dr.source_id, dr.target_id, dr.type, dr.keep_id);
    relsMerged++;
  }
  
  // Remove self-referential relations
  const selfRels = db.prepare('DELETE FROM relations WHERE source_id = target_id').run();
  
  db.close();
  console.log(`[dedup] Done: ${merged} entities merged, ${relsMerged} duplicate relations removed, ${selfRels.changes} self-refs removed`);
  return merged;
}

// ── 3. CONFIDENCE DECAY ─────────────────────────────────

async function decay() {
  const db = getDb();
  
  // Ensure confidence column exists
  try {
    db.prepare('SELECT confidence FROM facts LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE facts ADD COLUMN confidence REAL DEFAULT 1.0');
  }
  
  // Decay formula: confidence = max(0.1, 1.0 - (days_old * 0.005))
  // A fact 100 days old has confidence 0.5
  // A fact 200 days old has confidence 0.1 (floor)
  const result = db.prepare(`
    UPDATE facts SET confidence = MAX(0.1, 
      1.0 - (CAST((julianday('now') - julianday(COALESCE(timestamp, '2026-01-01'))) AS REAL) * 0.005)
    )
  `).run();
  
  // Also add decay_score to entities based on last access
  try {
    db.prepare('SELECT decay_score FROM entities LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE entities ADD COLUMN decay_score REAL DEFAULT 1.0');
  }
  
  db.prepare(`
    UPDATE entities SET decay_score = MAX(0.1,
      1.0 - (CAST((julianday('now') - julianday(COALESCE(updated_at, created_at, '2026-01-01'))) AS REAL) * 0.003)
    )
  `).run();
  
  // Stats
  const factStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      AVG(confidence) as avg_conf,
      SUM(CASE WHEN confidence >= 0.8 THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN confidence >= 0.4 AND confidence < 0.8 THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN confidence < 0.4 THEN 1 ELSE 0 END) as low
    FROM facts
  `).get();
  
  db.close();
  console.log(`[decay] Applied to ${result.changes} facts`);
  console.log(`[decay] Confidence distribution: ${factStats.high} high (≥0.8), ${factStats.medium} medium (0.4-0.8), ${factStats.low} low (<0.4)`);
  console.log(`[decay] Average confidence: ${(factStats.avg_conf * 100).toFixed(1)}%`);
  return result.changes;
}

// ── 4. RELATIONSHIP NORMALIZATION ───────────────────────

const RELATION_CANONICAL = {
  // builds/building/built → builds
  'builds': 'builds', 'building': 'builds', 'built': 'builds', 'is building': 'builds',
  'build': 'builds', 'built_by': 'built_by',
  
  // uses/using/used → uses
  'uses': 'uses', 'using': 'uses', 'used': 'uses', 'utilizes': 'uses',
  'uses for billing': 'uses', 'uses for': 'uses',
  
  // creates/creating/created → creates
  'creates': 'creates', 'creating': 'creates', 'created': 'creates',
  
  // works at/works for/employed by → works_at
  'works at': 'works_at', 'works for': 'works_at', 'employed by': 'works_at',
  'works_at': 'works_at',
  
  // owns/owned/ownership → owns
  'owns': 'owns', 'owned': 'owns', 'owner of': 'owns', 'owned by': 'owned_by',
  
  // contains/has/includes → contains
  'contains': 'contains', 'has': 'has', 'includes': 'contains',
  'consists of': 'contains', 'is part of': 'part_of', 'part of': 'part_of',
  
  // manages/managing → manages
  'manages': 'manages', 'managing': 'manages', 'managed by': 'managed_by',
  
  // depends on/requires → depends_on
  'depends on': 'depends_on', 'requires': 'depends_on', 'needs': 'depends_on',
  
  // relates to/related → related_to
  'relates to': 'related_to', 'related': 'related_to', 'related to': 'related_to',
  'associated with': 'related_to',
  
  // operates/runs → operates
  'operates': 'operates', 'runs': 'operates', 'operates_as_coo': 'operates_as_coo',
  
  // communicates/talks/discusses → communicates
  'communicates': 'communicates', 'discusses': 'discusses', 'mentions': 'mentions',
  
  // wants/desires/intends → wants
  'wants': 'wants', 'wants for': 'wants', 'intends': 'wants', 'plans': 'plans',
};

async function normalize() {
  const db = getDb();
  
  const relations = db.prepare('SELECT DISTINCT type FROM relations').all();
  console.log(`[normalize] Found ${relations.length} unique relation types`);
  
  let normalized = 0;
  
  for (const { type } of relations) {
    const lower = type.toLowerCase().trim();
    const canonical = RELATION_CANONICAL[lower];
    
    if (canonical && canonical !== type) {
      // Check if normalizing would create duplicates
      const affected = db.prepare('SELECT id, source_id, target_id FROM relations WHERE type = ?').all(type);
      
      for (const rel of affected) {
        // Check if canonical version already exists
        const existing = db.prepare(
          'SELECT id FROM relations WHERE source_id = ? AND target_id = ? AND type = ?'
        ).get(rel.source_id, rel.target_id, canonical);
        
        if (existing) {
          // Duplicate would be created, delete this one
          db.prepare('DELETE FROM relations WHERE id = ?').run(rel.id);
        } else {
          // Safe to rename
          db.prepare('UPDATE relations SET type = ? WHERE id = ?').run(canonical, rel.id);
        }
        normalized++;
      }
    }
  }
  
  // Stats after normalization
  const afterTypes = db.prepare('SELECT COUNT(DISTINCT type) as c FROM relations').get().c;
  
  db.close();
  console.log(`[normalize] Done: ${normalized} relations normalized, ${afterTypes} unique types remaining`);
  return normalized;
}

// ── STATS ───────────────────────────────────────────────

function stats() {
  const db = getDb();
  
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║         Knowledge Graph Quality Report       ║');
  console.log('╠══════════════════════════════════════════════╣');
  
  const counts = {
    entities: db.prepare('SELECT COUNT(*) as c FROM entities').get().c,
    relations: db.prepare('SELECT COUNT(*) as c FROM relations').get().c,
    facts: db.prepare('SELECT COUNT(*) as c FROM facts').get().c,
    embeddings: db.prepare('SELECT COUNT(*) as c FROM embeddings').get().c,
  };
  
  console.log(`║  Entities:    ${String(counts.entities).padStart(6)}                     ║`);
  console.log(`║  Relations:   ${String(counts.relations).padStart(6)}                     ║`);
  console.log(`║  Facts:       ${String(counts.facts).padStart(6)}                     ║`);
  console.log(`║  Embeddings:  ${String(counts.embeddings).padStart(6)}                     ║`);
  
  // Top entity types
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  Top Entity Types                            ║');
  const types = db.prepare('SELECT type, COUNT(*) as c FROM entities GROUP BY type ORDER BY c DESC LIMIT 8').all();
  for (const t of types) {
    console.log(`║    ${t.type.padEnd(20)} ${String(t.c).padStart(5)}              ║`);
  }
  
  // Top relation types
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  Top Relation Types                          ║');
  const relTypes = db.prepare('SELECT type, COUNT(*) as c FROM relations GROUP BY type ORDER BY c DESC LIMIT 8').all();
  for (const t of relTypes) {
    console.log(`║    ${t.type.padEnd(20)} ${String(t.c).padStart(5)}              ║`);
  }
  
  // Embedding coverage
  console.log('╠══════════════════════════════════════════════╣');
  const embByType = db.prepare('SELECT source_type, COUNT(*) as c FROM embeddings GROUP BY source_type ORDER BY c DESC').all();
  console.log('║  Embedding Coverage                          ║');
  for (const t of embByType) {
    console.log(`║    ${t.source_type.padEnd(20)} ${String(t.c).padStart(5)}              ║`);
  }
  
  // Dirty embeddings (still have metadata)
  const dirty = db.prepare(`SELECT COUNT(*) as c FROM embeddings WHERE text LIKE '%[Telegram%'`).get().c;
  console.log(`║    metadata-dirty:   ${String(dirty).padStart(5)}              ║`);
  
  // Duplicate entities
  const dupeCount = db.prepare(`
    SELECT COUNT(*) as c FROM (
      SELECT LOWER(REPLACE(REPLACE(name, '_', ' '), '-', ' ')) as norm, COUNT(*) as cnt 
      FROM entities GROUP BY norm HAVING cnt > 1
    )
  `).get().c;
  console.log(`║    duplicate groups: ${String(dupeCount).padStart(5)}              ║`);
  
  console.log('╚══════════════════════════════════════════════╝');
  
  db.close();
}

// ── MAIN ────────────────────────────────────────────────

async function main() {
  const cmd = process.argv[2] || 'stats';
  
  switch (cmd) {
    case 'all':
      console.log('=== Running all improvements ===\n');
      console.log('--- 1/4: Deduplication ---');
      await dedup();
      console.log('\n--- 2/4: Relationship normalization ---');
      await normalize();
      console.log('\n--- 3/4: Confidence decay ---');
      await decay();
      console.log('\n--- 4/4: Re-embedding dirty entries ---');
      await reEmbed();
      console.log('\n=== All improvements complete ===');
      stats();
      break;
    case 're-embed': await reEmbed(); break;
    case 'dedup': await dedup(); break;
    case 'decay': await decay(); break;
    case 'normalize': await normalize(); break;
    case 'stats': stats(); break;
    default:
      console.log('Usage: graph-improvements.js <all|re-embed|dedup|decay|normalize|stats>');
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

module.exports = { reEmbed, dedup, decay, normalize };
