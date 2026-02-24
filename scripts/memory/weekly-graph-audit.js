#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../memory/unified.db');
const db = new Database(DB_PATH, { readonly: false });
db.pragma('journal_mode = WAL');

// --- Schema detection ---
const entityTable = 'entities', relationTable = 'relations', factTable = 'facts';
const eIdCol = 'id', eNameCol = 'name', eTypeCol = 'type', eDescCol = 'description';
const rSourceCol = 'source_id', rTargetCol = 'target_id', rTypeCol = 'type';

const totalEntities = db.prepare(`SELECT COUNT(*) as c FROM entities`).get().c;
const totalRelations = db.prepare(`SELECT COUNT(*) as c FROM relations`).get().c;
const totalFacts = db.prepare(`SELECT COUNT(*) as c FROM facts`).get().c;

// --- Orphans ---
const orphansBefore = db.prepare(`SELECT COUNT(*) as c FROM entities WHERE id NOT IN (SELECT source_id FROM relations) AND id NOT IN (SELECT target_id FROM relations)`).get().c;

console.log(`--- BEFORE ---`);
console.log(`Entities: ${totalEntities} | Relations: ${totalRelations} | Facts: ${totalFacts}`);
console.log(`Orphans: ${orphansBefore} (${(orphansBefore/totalEntities*100).toFixed(1)}%)`);

// --- Connect orphans using inverted token index ---
// Build token→entity index from connected entities only
const connectedIds = new Set();
for (const r of db.prepare(`SELECT source_id FROM relations UNION SELECT target_id FROM relations`).all()) {
  connectedIds.add(r.source_id);
}

function tokens(s) {
  return (s||'').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().split(/\s+/).filter(t => t.length > 2);
}

// Build index: token → Set of connected entity ids, and id→type map
const tokenIndex = new Map(); // token → [entityId, ...]
const typeIndex = new Map();  // type → [entityId, ...]
const entityNames = new Map();

// Stream connected entities in batches
const BATCH = 5000;
let offset = 0;
while (true) {
  const batch = db.prepare(`SELECT id, name, type FROM entities LIMIT ? OFFSET ?`).all(BATCH, offset);
  if (batch.length === 0) break;
  for (const e of batch) {
    if (!connectedIds.has(e.id)) continue;
    entityNames.set(e.id, (e.name||'').toLowerCase());
    const toks = tokens(e.name);
    for (const t of toks) {
      if (!tokenIndex.has(t)) tokenIndex.set(t, []);
      tokenIndex.get(t).push(e.id);
    }
    if (e.type) {
      if (!typeIndex.has(e.type)) typeIndex.set(e.type, []);
      typeIndex.get(e.type).push(e.id);
    }
  }
  offset += BATCH;
}

console.log(`Token index: ${tokenIndex.size} tokens, ${connectedIds.size} connected entities indexed`);

// Process orphans in batches
const insertRel = db.prepare(`INSERT INTO relations (source_id, target_id, type, timestamp) VALUES (?, ?, 'related_to', datetime('now'))`);
let newConnections = 0;

const orphanBatch = 2000;
let oOffset = 0;
const txn = db.transaction(() => {
  while (true) {
    const orphans = db.prepare(`SELECT id, name, type FROM entities WHERE id NOT IN (SELECT source_id FROM relations) AND id NOT IN (SELECT target_id FROM relations) LIMIT ? OFFSET ?`).all(orphanBatch, 0); // always offset 0 since we're inserting
    if (orphans.length === 0) break;
    
    let matched = 0;
    for (const o of orphans) {
      const oToks = tokens(o.name);
      if (oToks.length === 0) continue;
      
      // Find candidates via token overlap
      const candidateScores = new Map();
      for (const t of oToks) {
        const matches = tokenIndex.get(t);
        if (!matches) continue;
        // Limit per token to avoid memory explosion
        for (let i = 0; i < Math.min(matches.length, 100); i++) {
          const cid = matches[i];
          candidateScores.set(cid, (candidateScores.get(cid) || 0) + 1);
        }
      }
      
      // Also check type matches (limit)
      if (o.type && typeIndex.has(o.type)) {
        const typeMatches = typeIndex.get(o.type);
        for (let i = 0; i < Math.min(typeMatches.length, 50); i++) {
          const cid = typeMatches[i];
          candidateScores.set(cid, (candidateScores.get(cid) || 0) + 0.5);
        }
      }
      
      // Find best
      let bestId = null, bestScore = 0;
      for (const [cid, score] of candidateScores) {
        // Normalize by token count
        const normalizedScore = score / Math.max(oToks.length, 1);
        if (normalizedScore > bestScore) {
          bestScore = normalizedScore;
          bestId = cid;
        }
      }
      
      // Threshold: at least 50% token overlap or type+token match
      if (bestId && bestScore >= 0.5) {
        insertRel.run(o.id, bestId);
        newConnections++;
        matched++;
      }
    }
    
    if (matched === 0) break; // No more matches possible
    oOffset += orphanBatch;
    if (oOffset > 50000) break; // Safety
  }
});
txn();

// --- Validation ---
const duplicates = db.prepare(`SELECT SUM(cnt-1) as d FROM (SELECT source_id, target_id, type, COUNT(*) as cnt FROM relations GROUP BY source_id, target_id, type HAVING cnt > 1)`).get().d || 0;
const brokenRefs = db.prepare(`SELECT COUNT(*) as c FROM relations WHERE source_id NOT IN (SELECT id FROM entities) OR target_id NOT IN (SELECT id FROM entities)`).get().c;

const orphansAfter = db.prepare(`SELECT COUNT(*) as c FROM entities WHERE id NOT IN (SELECT source_id FROM relations) AND id NOT IN (SELECT target_id FROM relations)`).get().c;
const totalRelationsAfter = db.prepare(`SELECT COUNT(*) as c FROM relations`).get().c;

db.close();

console.log(`\n--- AFTER ENRICHMENT ---`);
console.log(`New connections: ${newConnections}`);
console.log(`Relations: ${totalRelationsAfter}`);
console.log(`Orphans: ${orphansAfter} (${totalEntities > 0 ? (orphansAfter/totalEntities*100).toFixed(1) : 0}%)`);
console.log(`\n--- VALIDATION ---`);
console.log(`Duplicate relations: ${duplicates}`);
console.log(`Broken references: ${brokenRefs}`);

const orphanRate = (orphansAfter/totalEntities*100);
if (orphanRate > 20) {
  console.log(`\n⚠️ ORPHAN RATE ${orphanRate.toFixed(1)}% > 20% — FLAGGED FOR REVIEW`);
}
console.log('\nDone.');
