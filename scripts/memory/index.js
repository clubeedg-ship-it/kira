'use strict';
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DB_PATH = path.join(__dirname, '../../memory/unified.db');
const Database = require('/home/adminuser/chimera/node_modules/better-sqlite3');

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  return db;
}

// ── STATUS ──────────────────────────────────────────────
function cmdStatus() {
  const db = getDb();
  const tables = ['entities', 'facts', 'relations', 'conversations', 'summaries', 'decisions', 'preferences', 'curated_segments', 'episodes', 'procedures', 'blackboard', 'embeddings'];
  console.log('╔══════════════════════════════════════╗');
  console.log('║     Kira Unified Memory Status       ║');
  console.log('╠══════════════════════════════════════╣');
  for (const t of tables) {
    try {
      const { count } = db.prepare(`SELECT COUNT(*) as count FROM ${t}`).get();
      console.log(`║  ${t.padEnd(20)} ${String(count).padStart(8)}  ║`);
    } catch(e) {
      console.log(`║  ${t.padEnd(20)} ${'N/A'.padStart(8)}  ║`);
    }
  }
  // DB file size
  const stats = fs.statSync(DB_PATH);
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  DB size            ${(stats.size / 1024).toFixed(0).padStart(6)} KB  ║`);
  console.log('╚══════════════════════════════════════╝');
  db.close();
}

// ── SEARCH ──────────────────────────────────────────────
function cmdSearch(query) {
  if (!query) { console.error('Usage: search <query>'); process.exit(1); }
  const db = getDb();
  const results = [];
  const like = `%${query}%`;

  // Search entities
  const entities = db.prepare(`SELECT id, name, type, description FROM entities WHERE name LIKE ? OR description LIKE ? OR properties LIKE ? LIMIT 10`).all(like, like, like);
  for (const e of entities) results.push({ layer: 'entity', id: e.id, name: e.name, type: e.type, text: e.description || e.name });

  // Search facts
  const facts = db.prepare(`SELECT f.id, f.predicate, f.object, f.confidence, e.name as subject FROM facts f LEFT JOIN entities e ON f.subject_id = e.id WHERE f.object LIKE ? OR f.predicate LIKE ? OR e.name LIKE ? LIMIT 10`).all(like, like, like);
  for (const f of facts) results.push({ layer: 'fact', id: f.id, text: `${f.subject || '?'} ${f.predicate} ${f.object}`, confidence: f.confidence });

  // Search episodes
  const episodes = db.prepare(`SELECT id, timestamp, type, summary, importance FROM episodes WHERE summary LIKE ? OR details LIKE ? ORDER BY importance DESC LIMIT 10`).all(like, like);
  for (const ep of episodes) results.push({ layer: 'episode', id: ep.id, text: ep.summary, type: ep.type, importance: ep.importance, time: ep.timestamp });

  // Search procedures
  const procs = db.prepare(`SELECT id, name, trigger_text FROM procedures WHERE name LIKE ? OR trigger_text LIKE ? OR steps LIKE ? LIMIT 5`).all(like, like, like);
  for (const p of procs) results.push({ layer: 'procedure', id: p.id, text: p.name, trigger: p.trigger_text });

  // Search blackboard
  const bbs = db.prepare(`SELECT id, type, topic, content FROM blackboard WHERE content LIKE ? OR topic LIKE ? LIMIT 5`).all(like, like);
  for (const b of bbs) results.push({ layer: 'blackboard', id: b.id, text: b.content, topic: b.topic });

  // Vector search if embeddings exist
  const embCount = db.prepare('SELECT COUNT(*) as c FROM embeddings').get().c;
  if (embCount > 0) {
    try {
      const vec = getEmbedding(query);
      if (vec) {
        const allEmb = db.prepare('SELECT id, source_type, source_id, text, vector FROM embeddings').all();
        const scored = allEmb.map(e => {
          const v = new Float32Array(e.vector.buffer, e.vector.byteOffset, e.vector.byteLength / 4);
          return { ...e, score: cosineSim(vec, v) };
        }).sort((a, b) => b.score - a.score).slice(0, 5);
        for (const s of scored) {
          if (s.score > 0.3) results.push({ layer: `vector:${s.source_type}`, id: s.source_id, text: s.text, score: s.score.toFixed(3) });
        }
      }
    } catch(e) { /* vector search optional */ }
  }

  if (results.length === 0) {
    console.log('No results found.');
  } else {
    console.log(`Found ${results.length} results for "${query}":\n`);
    for (const r of results) {
      const meta = [r.layer, r.type, r.importance ? `imp:${r.importance}` : null, r.score ? `sim:${r.score}` : null, r.confidence ? `conf:${r.confidence}` : null].filter(Boolean).join(' | ');
      console.log(`[${meta}] ${(r.text || '').substring(0, 120)}`);
    }
  }
  db.close();
}

// ── RECALL ──────────────────────────────────────────────
function cmdRecall(entity) {
  if (!entity) { console.error('Usage: recall <entity>'); process.exit(1); }
  const db = getDb();
  const like = `%${entity}%`;

  // Find entities
  const entities = db.prepare(`SELECT * FROM entities WHERE name LIKE ? LIMIT 5`).all(like);
  if (entities.length === 0) {
    console.log(`No entity found matching "${entity}"`);
    db.close();
    return;
  }

  for (const e of entities) {
    console.log(`\n═══ ${e.name} (${e.type}) ═══`);
    if (e.description) console.log(`Description: ${e.description}`);
    if (e.properties) {
      try { const p = JSON.parse(e.properties); console.log('Properties:', JSON.stringify(p, null, 2)); } catch(ex) { console.log('Properties:', e.properties); }
    }

    // Facts about this entity
    const facts = db.prepare(`SELECT predicate, object, confidence, timestamp FROM facts WHERE subject_id = ? ORDER BY timestamp DESC`).all(e.id);
    if (facts.length > 0) {
      console.log(`\nFacts (${facts.length}):`);
      for (const f of facts) console.log(`  • ${f.predicate}: ${f.object} (conf: ${f.confidence})`);
    }

    // Relations
    const relsOut = db.prepare(`SELECT r.type, e2.name as target FROM relations r JOIN entities e2 ON r.target_id = e2.id WHERE r.source_id = ?`).all(e.id);
    const relsIn = db.prepare(`SELECT r.type, e2.name as source FROM relations r JOIN entities e2 ON r.source_id = e2.id WHERE r.target_id = ?`).all(e.id);
    if (relsOut.length + relsIn.length > 0) {
      console.log(`\nRelations:`);
      for (const r of relsOut) console.log(`  → ${r.type} → ${r.target}`);
      for (const r of relsIn) console.log(`  ← ${r.type} ← ${r.source}`);
    }

    // Episodes mentioning entity
    const eps = db.prepare(`SELECT timestamp, type, summary, importance FROM episodes WHERE summary LIKE ? ORDER BY timestamp DESC LIMIT 5`).all(like);
    if (eps.length > 0) {
      console.log(`\nRecent episodes (${eps.length}):`);
      for (const ep of eps) console.log(`  [${ep.timestamp}] ${ep.summary.substring(0, 100)}`);
    }
  }
  db.close();
}

// ── LOG ─────────────────────────────────────────────────
function cmdLog(jsonStr) {
  if (!jsonStr) { console.error('Usage: log \'{"type":"task","summary":"..."}\''); process.exit(1); }
  const db = getDb();
  const ep = JSON.parse(jsonStr);
  const id = ep.id || crypto.randomUUID();
  db.prepare(`INSERT INTO episodes (id, timestamp, type, summary, details, outcome, importance, tags, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, ep.timestamp || new Date().toISOString(), ep.type || 'manual', ep.summary, ep.details || null, ep.outcome || null, ep.importance || 5, ep.tags ? JSON.stringify(ep.tags) : null, ep.source || 'cli'
  );
  console.log(`Logged episode: ${id}`);
  db.close();
}

// ── EMBED ───────────────────────────────────────────────
function getEmbedding(text) {
  try {
    const res = execSync(`curl -s http://localhost:11434/api/embeddings -d '${JSON.stringify({ model: 'nomic-embed-text', prompt: text }).replace(/'/g, "'\\''")}'`, { timeout: 30000 });
    const data = JSON.parse(res.toString());
    if (data.embedding) return new Float32Array(data.embedding);
  } catch(e) { return null; }
  return null;
}

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

function cmdEmbed() {
  const db = getDb();
  const existing = new Set(db.prepare('SELECT source_type || ":" || source_id as key FROM embeddings').all().map(r => r.key));
  let count = 0;

  // Embed facts
  const facts = db.prepare(`SELECT f.id, f.predicate, f.object, e.name as subject FROM facts f LEFT JOIN entities e ON f.subject_id = e.id`).all();
  const insertEmb = db.prepare(`INSERT OR REPLACE INTO embeddings (id, source_type, source_id, text, vector, model) VALUES (?, ?, ?, ?, ?, ?)`);

  for (const f of facts) {
    const key = `fact:${f.id}`;
    if (existing.has(key)) continue;
    const text = `${f.subject || ''} ${f.predicate} ${f.object}`;
    const vec = getEmbedding(text);
    if (vec) {
      insertEmb.run(crypto.randomUUID(), 'fact', f.id, text, Buffer.from(vec.buffer), 'nomic-embed-text');
      count++;
      if (count % 50 === 0) console.log(`Embedded ${count} items...`);
    }
  }

  // Embed episodes
  const episodes = db.prepare('SELECT id, summary FROM episodes WHERE summary IS NOT NULL').all();
  for (const ep of episodes) {
    const key = `episode:${ep.id}`;
    if (existing.has(key)) continue;
    const vec = getEmbedding(ep.summary);
    if (vec) {
      insertEmb.run(crypto.randomUUID(), 'episode', ep.id, ep.summary, Buffer.from(vec.buffer), 'nomic-embed-text');
      count++;
      if (count % 50 === 0) console.log(`Embedded ${count} items...`);
    }
  }

  // Embed entities
  const entities = db.prepare('SELECT id, name, description FROM entities').all();
  for (const e of entities) {
    const key = `entity:${e.id}`;
    if (existing.has(key)) continue;
    const text = `${e.name}: ${e.description || ''}`;
    const vec = getEmbedding(text);
    if (vec) {
      insertEmb.run(crypto.randomUUID(), 'entity', e.id, text, Buffer.from(vec.buffer), 'nomic-embed-text');
      count++;
      if (count % 50 === 0) console.log(`Embedded ${count} items...`);
    }
  }

  console.log(`Embedded ${count} new items. Total: ${db.prepare('SELECT COUNT(*) as c FROM embeddings').get().c}`);
  db.close();
}

// ── MAINTAIN ────────────────────────────────────────────
function cmdMaintain() {
  console.log('[maintain] Starting memory maintenance...');
  
  // 1. Run extraction daemon if available
  const daemonPath = path.join(__dirname, 'memory-daemon.js');
  if (fs.existsSync(daemonPath)) {
    try {
      console.log('[maintain] Running extraction daemon...');
      execSync(`node "${daemonPath}" --unified`, { timeout: 120000, stdio: 'inherit', env: { ...process.env, UNIFIED_DB: DB_PATH } });
    } catch(e) {
      console.log('[maintain] Daemon skipped or errored:', e.message?.substring(0, 80));
    }
  }

  // 2. Generate context file
  generateContext();
  
  // 3. Quick status
  cmdStatus();
  console.log('[maintain] Done.');
}

function generateContext() {
  const db = getDb();
  const lines = [];
  lines.push('# Retrieved Memory Context');
  lines.push(`*Auto-generated: ${new Date().toISOString()}*\n`);

  // Recent episodes (48h)
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const recentEps = db.prepare(`SELECT timestamp, type, summary, importance FROM episodes WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 20`).all(cutoff);
  if (recentEps.length > 0) {
    lines.push('## Recent Episodes (48h)');
    for (const ep of recentEps) {
      lines.push(`- **[${ep.type || 'note'}]** ${ep.summary} _(imp: ${ep.importance})_`);
    }
    lines.push('');
  }

  // High importance facts
  const topFacts = db.prepare(`SELECT f.predicate, f.object, f.confidence, e.name as subject FROM facts f LEFT JOIN entities e ON f.subject_id = e.id WHERE f.confidence >= 0.8 ORDER BY f.timestamp DESC LIMIT 30`).all();
  if (topFacts.length > 0) {
    lines.push('## Key Facts');
    for (const f of topFacts) {
      lines.push(`- ${f.subject || '?'} → ${f.predicate}: ${f.object}`);
    }
    lines.push('');
  }

  // Active blackboard
  const bbs = db.prepare(`SELECT type, topic, content FROM blackboard WHERE resolved = 0 ORDER BY created_at DESC LIMIT 10`).all();
  if (bbs.length > 0) {
    lines.push('## Active Blackboard');
    for (const b of bbs) {
      lines.push(`- [${b.type || 'note'}] **${b.topic}**: ${b.content.substring(0, 150)}`);
    }
    lines.push('');
  }

  const contextPath = path.join(__dirname, '../../memory/retrieved-context.md');
  fs.writeFileSync(contextPath, lines.join('\n'));
  console.log(`[maintain] Wrote ${contextPath}`);
  db.close();
}

// ── MAIN ────────────────────────────────────────────────
const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case 'status': cmdStatus(); break;
  case 'search': cmdSearch(args.join(' ')); break;
  case 'recall': cmdRecall(args.join(' ')); break;
  case 'log': cmdLog(args.join(' ')); break;
  case 'embed': cmdEmbed(); break;
  case 'maintain': cmdMaintain(); break;
  default:
    console.log('Kira Memory System - Unified CLI');
    console.log('Usage: node index.js <command> [args]\n');
    console.log('Commands:');
    console.log('  status          Show memory store counts');
    console.log('  search <query>  Search across all memory layers');
    console.log('  recall <entity> Recall everything about an entity');
    console.log('  log <json>      Log an episode');
    console.log('  embed           Generate embeddings for unembedded items');
    console.log('  maintain        Run extraction + consolidation + context generation');
}
