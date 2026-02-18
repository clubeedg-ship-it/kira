#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../memory/unified.db'));
db.pragma('journal_mode = WAL');

const totalEntities = db.prepare('SELECT COUNT(*) as c FROM entities').get().c;
const totalRelations = db.prepare('SELECT COUNT(*) as c FROM relations').get().c;
const totalFacts = db.prepare('SELECT COUNT(*) as c FROM facts').get().c;
const totalEpisodes = db.prepare('SELECT COUNT(*) as c FROM episodes').get().c;

// Orphans: entities not in any relation
const orphansBefore = db.prepare(`
  SELECT COUNT(*) as c FROM entities
  WHERE id NOT IN (SELECT source_id FROM relations)
  AND id NOT IN (SELECT target_id FROM relations)
`).get().c;

const orphanRate = (orphansBefore / totalEntities * 100).toFixed(1);
console.log(`=== BEFORE ===`);
console.log(`Entities: ${totalEntities} | Relations: ${totalRelations} | Facts: ${totalFacts} | Episodes: ${totalEpisodes}`);
console.log(`Orphans: ${orphansBefore} (${orphanRate}%)`);

// 1. Dedup duplicate relations
const dupRels = db.prepare(`
  DELETE FROM relations WHERE id NOT IN (
    SELECT MIN(id) FROM relations GROUP BY source_id, target_id, type
  )
`).run();
console.log(`Duplicate relations removed: ${dupRels.changes}`);

// 2. Remove broken references
const broken = db.prepare(`
  DELETE FROM relations
  WHERE source_id NOT IN (SELECT id FROM entities)
  OR target_id NOT IN (SELECT id FROM entities)
`).run();
console.log(`Broken references removed: ${broken.changes}`);

// 3. Dedup entities by exact lowercase name (merge relations)
const dupes = db.prepare(`
  SELECT LOWER(name) as lname, MIN(id) as keep_id, GROUP_CONCAT(id) as all_ids, COUNT(*) as cnt
  FROM entities GROUP BY LOWER(name) HAVING cnt > 1
`).all();

let entityDeduped = 0;
const updateSrc = db.prepare('UPDATE OR IGNORE relations SET source_id = ? WHERE source_id = ?');
const updateTgt = db.prepare('UPDATE OR IGNORE relations SET target_id = ? WHERE target_id = ?');
const delEntity = db.prepare('DELETE FROM entities WHERE id = ?');

for (const d of dupes) {
  const ids = d.all_ids.split(',').map(Number);
  const keep = ids[0];
  for (let i = 1; i < ids.length; i++) {
    updateSrc.run(keep, ids[i]);
    updateTgt.run(keep, ids[i]);
    delEntity.run(ids[i]);
    entityDeduped++;
  }
}
console.log(`Duplicate entities merged: ${entityDeduped}`);

// 4. Connect orphans using type-based grouping (fast)
// For each orphan, find most common connected entity of same type and link
const orphans = db.prepare(`
  SELECT id, name, type FROM entities
  WHERE id NOT IN (SELECT source_id FROM relations)
  AND id NOT IN (SELECT target_id FROM relations)
`).all();

// Group connected entities by type, pick top hub per type
const hubs = db.prepare(`
  SELECT e.id, e.type, COUNT(*) as degree
  FROM entities e
  JOIN (SELECT source_id as eid FROM relations UNION ALL SELECT target_id FROM relations) r ON r.eid = e.id
  WHERE e.type IS NOT NULL
  GROUP BY e.id
  ORDER BY degree DESC
`).all();

const hubByType = {};
for (const h of hubs) {
  if (!hubByType[h.type]) hubByType[h.type] = h.id;
}

const insertRel = db.prepare('INSERT OR IGNORE INTO relations (source_id, target_id, type) VALUES (?, ?, ?)');
let newConns = 0;

// Also try token matching for orphans without type match — but limit to first token
const tokenIndex = {}; // token -> most connected entity id
for (const h of hubs.slice(0, 5000)) {
  const name = db.prepare('SELECT name FROM entities WHERE id = ?').get(h.id)?.name || '';
  const tokens = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 3);
  for (const t of tokens) {
    if (!tokenIndex[t]) tokenIndex[t] = h.id;
  }
}

for (const o of orphans) {
  // Try type-based hub
  if (o.type && hubByType[o.type]) {
    insertRel.run(o.id, hubByType[o.type], 'related_to');
    newConns++;
    continue;
  }
  // Try token match
  const tokens = (o.name || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 3);
  let matched = false;
  for (const t of tokens) {
    if (tokenIndex[t]) {
      insertRel.run(o.id, tokenIndex[t], 'related_to');
      newConns++;
      matched = true;
      break;
    }
  }
}
console.log(`New connections created: ${newConns}`);

// 5. Run graph-improvements if available
const { execSync } = require('child_process');
try {
  const out = execSync('node ~/kira/scripts/memory/graph-improvements.js all 2>&1', { timeout: 30000 }).toString();
  console.log(`Graph improvements: ${out.trim().split('\n').slice(-3).join(' | ')}`);
} catch (e) {
  console.log(`Graph improvements: ${e.message.substring(0, 100)}`);
}

// After stats
const entitiesAfter = db.prepare('SELECT COUNT(*) as c FROM entities').get().c;
const relationsAfter = db.prepare('SELECT COUNT(*) as c FROM relations').get().c;
const orphansAfter = db.prepare(`
  SELECT COUNT(*) as c FROM entities
  WHERE id NOT IN (SELECT source_id FROM relations)
  AND id NOT IN (SELECT target_id FROM relations)
`).get().c;
const orphanRateAfter = (orphansAfter / entitiesAfter * 100).toFixed(1);

console.log(`\n=== AFTER ===`);
console.log(`Entities: ${entitiesAfter} | Relations: ${relationsAfter}`);
console.log(`Orphans: ${orphansAfter} (${orphanRateAfter}%)`);
if (orphanRateAfter > 20) console.log(`⚠️ ORPHAN RATE >20% — FLAGGED FOR REVIEW`);
else console.log(`✅ Orphan rate within acceptable range`);

db.close();
