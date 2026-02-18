#!/usr/bin/env node
/**
 * Message Enrichment Proxy
 * 
 * Sits between Telegram plugin and OpenClaw gateway.
 * Intercepts incoming messages, enriches them with graph context,
 * fixes typos, and forwards to OpenClaw.
 * 
 * Two tiers:
 *   INSTANT (~1s): Embedding search + simple typo fix + attach context
 *   DEEP (periodic): Full system context refresh via LLM
 * 
 * Architecture:
 *   Telegram Bot API → OpenClaw Telegram plugin (unchanged)
 *   OpenClaw calls agent → agent sees enriched system context
 *   
 * Implementation: Instead of proxying HTTP (complex, fragile),
 * we write enriched context to a file that OpenClaw loads as
 * workspace context, and we process messages via session log watcher.
 * 
 * Port 3850: Status + manual enrich API
 */

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { enrich, getDb, ensureSchema, postProcessVoice, extractKeywords, decayConfidence, backfillFTS, refineIntent } = require('./nlp-graph-layer');

const CONTEXT_FILE = path.join(__dirname, '../../memory/retrieved-context.md');
const ENRICHMENT_LOG = path.join(__dirname, '../../memory/enrichment-log.json');
const SESSION_DIR = path.join(process.env.HOME, '.openclaw/agents/main/sessions');
const PORT = 3850;
const OLLAMA_URL = 'http://localhost:11434';

// Typo correction dictionary (common Otto patterns + general)
const TYPO_MAP = {
  'teh': 'the', 'taht': 'that', 'adn': 'and', 'hte': 'the',
  'waht': 'what', 'shoudl': 'should', 'woudl': 'would', 'coudl': 'could',
  'dont': "don't", 'doesnt': "doesn't", 'cant': "can't", 'wont': "won't",
  'im': "I'm", 'ive': "I've", 'youre': "you're", 'theyre': "they're",
  'thier': 'their', 'recieve': 'receive', 'seperate': 'separate',
  'occured': 'occurred', 'untill': 'until', 'definately': 'definitely',
  'accomodate': 'accommodate', 'occurence': 'occurrence',
  'wierd': 'weird', 'beleive': 'believe', 'acheive': 'achieve',
  'enviroment': 'environment', 'goverment': 'government',
  'independant': 'independent', 'neccessary': 'necessary',
  'recomend': 'recommend', 'refered': 'referred',
  'mayb': 'maybe', 'mayby': 'maybe', 'billin': 'billing',
  'ur': 'your', 'u': 'you', 'pls': 'please', 'thx': 'thanks',
  'msg': 'message', 'msgs': 'messages', 'config': 'configuration',
  'idk': "I don't know", 'imo': 'in my opinion', 'tbh': 'to be honest',
  'rn': 'right now', 'prob': 'probably', 'probs': 'probably',
  'smth': 'something', 'sth': 'something', 'bc': 'because',
  'wo': 'without', 'w': 'with', 'b4': 'before',
  'havent': "haven't", 'didnt': "didn't", 'isnt': "isn't",
  'wasnt': "wasn't", 'couldnt': "couldn't", 'wouldnt': "wouldn't",
  'shouldnt': "shouldn't", 'whe': 'when', 'ni': 'I',
  'shoud': 'should', 'thi': 'this', 'tha': 'that',
  'als': 'also', 'abotu': 'about', 'beacuse': 'because',
  'kirra': 'Kira', 'kria': 'Kira', 'ottogen': 'OttoGen',
  'zenithcred': 'ZenithCred', 'sentinagro': 'SentinAgro',
  'chimrea': 'Chimera', 'chimeera': 'Chimera',
};

// ── TYPO FIXER ──────────────────────────────────────────

function fixTypos(text) {
  // Word-level typo correction
  return text.replace(/\b\w+\b/g, word => {
    const lower = word.toLowerCase();
    const fix = TYPO_MAP[lower];
    if (!fix) return word;
    // Preserve capitalization of first letter
    if (word[0] === word[0].toUpperCase() && fix[0] === fix[0].toLowerCase()) {
      return fix[0].toUpperCase() + fix.slice(1);
    }
    return fix;
  });
}

// ── INSTANT ENRICHMENT ──────────────────────────────────

function stripTelegramMeta(text) {
  let clean = text.replace(/^\[Telegram\s+[^\]]+\]\s*/i, '');
  clean = clean.replace(/\[message_id:\s*\d+\]\s*/g, '');
  clean = clean.replace(/\[Queued messages[^\]]*\]\s*/g, '');
  return clean.trim();
}

async function instantEnrich(message, opts = {}) {
  const start = Date.now();
  
  // 1. Strip metadata
  const stripped = stripTelegramMeta(message);
  
  // 2. Fix typos (Legacy regex - we keep it for speed as first pass)
  const fixed = fixTypos(stripped);
  
  // 3. Voice post-processing (if flagged as voice)
  let processed = fixed;
  let voiceSteps = [];
  if (opts.isVoice) {
    const pp = postProcessVoice(fixed, opts.language);
    processed = pp.text;
    voiceSteps = pp.steps;
  }
  
  // 4. Get raw search results (fast)
  let searchResults = {};
  try {
    // budgetChars=4000 is for the context formatted string, but we want raw objects here
    // enrich() returns { entities, facts, ... } which we need
    searchResults = await enrich(processed, { maxResults: 5, budgetChars: 2000 });
  } catch (e) {
    console.error('[proxy] Search failed:', e.message);
  }

  // 5. Refine intent using LLM (The "1-2 sentences" requirement)
  let refinedContext = '';
  try {
    refinedContext = await refineIntent(processed, searchResults);
  } catch (e) {
    console.error('[proxy] Refine failed:', e.message);
    refinedContext = processed; // Fallback
  }
  
  const elapsed = Date.now() - start;
  
  return {
    original: message,
    fixed: processed,
    context: refinedContext, // This is now the SHORT refined message/context
    elapsed,
    tier: 'instant',
    voiceSteps,
    timing: searchResults?.timing || {},
    results: {
      entities: searchResults?.entities?.length || 0,
      relations: searchResults?.relations?.length || 0,
      facts: searchResults?.facts?.length || 0,
      similar: searchResults?.similar?.length || 0,
    },
  };
}

// ── DEEP CONTEXT REFRESH ────────────────────────────────

function ollamaRequest(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch { reject(new Error('Parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

async function deepContextRefresh() {
  const db = getDb();
  ensureSchema(db);
  
  // Get recent entities (last 24h) - REDUCED to 5
  const recentEntities = db.prepare(`
    SELECT name, type, description FROM entities 
    WHERE updated_at > datetime('now', '-24 hours')
    ORDER BY updated_at DESC LIMIT 5
  `).all();
  
  // Get recent facts - REDUCED to 5
  const recentFacts = db.prepare(`
    SELECT e.name as subject, f.predicate, f.object 
    FROM facts f 
    LEFT JOIN entities e ON f.subject_id = e.id
    WHERE f.timestamp > datetime('now', '-24 hours')
    ORDER BY f.timestamp DESC LIMIT 5
  `).all();
  
  // Get recent decisions - REDUCED to 3
  const decisions = db.prepare(`
    SELECT what, why, context FROM decisions
    ORDER BY made_at DESC LIMIT 3
  `).all();

  // Get recent preferences - REDUCED to 5
  const preferences = db.prepare(`
    SELECT key, value, context FROM preferences
    ORDER BY discovered_at DESC LIMIT 5
  `).all();

  // Get top connected entities (most relations) - REDUCED to 5
  const topEntities = db.prepare(`
    SELECT e.name, e.type, e.description, COUNT(r.id) as connections
    FROM entities e
    LEFT JOIN relations r ON r.source_id = e.id OR r.target_id = e.id
    GROUP BY e.id
    ORDER BY connections DESC
    LIMIT 5
  `).all();
  
  db.close();
  
  // Build context document - Minimal Header
  const lines = [
    '# Context',
    `*Updated: ${new Date().toISOString()}*`,
    '',
  ];
  
  if (topEntities.length > 0) {
    lines.push('## Key Entities');
    for (const e of topEntities) {
      lines.push(`- **${e.name}** (${e.type})`);
    }
    lines.push('');
  }
  
  if (decisions.length > 0) {
    lines.push('## Recent Decisions');
    for (const d of decisions) {
      lines.push(`- ${d.what}`);
    }
    lines.push('');
  }
  
  if (preferences.length > 0) {
    lines.push('## Preferences');
    for (const p of preferences) {
      lines.push(`- ${p.key}: ${p.value}`);
    }
    lines.push('');
  }
  
  if (recentFacts.length > 0) {
    lines.push('## Recent');
    const seen = new Set();
    for (const f of recentFacts) {
      const key = `${f.subject}-${f.predicate}-${f.object}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`- ${f.subject} ${f.predicate} ${f.object}`);
    }
    lines.push('');
  }
  
  // Preserve existing Refined Context if present
  try {
    if (fs.existsSync(CONTEXT_FILE)) {
      const existing = fs.readFileSync(CONTEXT_FILE, 'utf8');
      const match = existing.match(/## Refined Context[\s\S]*$/);
      if (match) {
        lines.push(match[0]);
      }
    }
  } catch (e) {
    console.error('[proxy] Preserve context failed:', e.message);
  }
  
  const content = lines.join('\n');
  fs.writeFileSync(CONTEXT_FILE, content);
  console.log(`[proxy] Deep context refreshed (minimal): ${topEntities.length} entities, ${decisions.length} decisions, ${preferences.length} preferences, ${recentFacts.length} facts`);
  
  return content;
}

// ── SESSION WATCHER — Enrich messages as they arrive ────

let lastSessionLine = 0;
let lastSessionFile = '';

function getLatestSession() {
  try {
    const files = fs.readdirSync(SESSION_DIR)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({ name: f, path: path.join(SESSION_DIR, f), mtime: fs.statSync(path.join(SESSION_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    return files[0] || null;
  } catch { return null; }
}

async function watchAndEnrich() {
  const session = getLatestSession();
  if (!session) return;
  
  // Reset line counter if session changed
  if (session.name !== lastSessionFile) {
    lastSessionFile = session.name;
    const lines = fs.readFileSync(session.path, 'utf8').split('\n').filter(Boolean);
    lastSessionLine = lines.length; // Start from current position
    return;
  }
  
  const lines = fs.readFileSync(session.path, 'utf8').split('\n').filter(Boolean);
  const newLines = lines.slice(lastSessionLine);
  lastSessionLine = lines.length;
  
  for (const line of newLines) {
    try {
      const entry = JSON.parse(line);
      if (entry.type !== 'message') continue;
      if (entry.message?.role !== 'user') continue;
      
      let text = '';
      const content = entry.message?.content;
      if (typeof content === 'string') text = content;
      else if (Array.isArray(content)) text = content.filter(c => c.type === 'text').map(c => c.text).join('\n');
      
      if (!text || text.length < 10) continue;
      if (/^(HEARTBEAT_OK|NO_REPLY|Read HEARTBEAT|System:)/.test(text)) continue;
      
      // Enrich this message and write context for the next response
      const enriched = await instantEnrich(text);
      
      if (enriched.context) {
        // Append live context to retrieved-context.md (REFINED)
        // Note: enriched.context is now just the 1-2 sentence refined query/context
        const liveSection = `\n## Refined Context\n${enriched.context}\n`;
        
        try {
          let existing = '';
          if (fs.existsSync(CONTEXT_FILE)) {
            existing = fs.readFileSync(CONTEXT_FILE, 'utf8');
            // Remove previous live context section
            existing = existing.replace(/\n## Refined Context[\s\S]*$/, '');
          }
          fs.writeFileSync(CONTEXT_FILE, existing + liveSection);
        } catch (e) {
          console.error('[proxy] Write context failed:', e.message);
        }
        
        console.log(`[proxy] Refined "${text.slice(0, 50)}..." → ${enriched.context.length} chars (${enriched.elapsed}ms)`);
      }
      
      // Log enrichment
      try {
        const log = fs.existsSync(ENRICHMENT_LOG) ? JSON.parse(fs.readFileSync(ENRICHMENT_LOG, 'utf8')) : [];
        log.push({
          timestamp: new Date().toISOString(),
          original: text.slice(0, 500),
          fixed: enriched.fixed.slice(0, 500),
          context: enriched.context || '',
          contextLines: enriched.context.split('\n').length,
          elapsed: enriched.elapsed
        });
        // Keep last 100 entries
        if (log.length > 100) log.splice(0, log.length - 100);
        fs.writeFileSync(ENRICHMENT_LOG, JSON.stringify(log, null, 2));
      } catch { /* log write failed, non-critical */ }
      
    } catch { /* skip parse errors */ }
  }
}

// ── HTTP STATUS SERVER ──────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  if (url.pathname === '/status') {
    const db = getDb();
    ensureSchema(db);
    const counts = {
      entities: db.prepare('SELECT COUNT(*) as c FROM entities').get().c,
      relations: db.prepare('SELECT COUNT(*) as c FROM relations').get().c,
      facts: db.prepare('SELECT COUNT(*) as c FROM facts').get().c,
      validFacts: db.prepare('SELECT COUNT(*) as c FROM facts WHERE valid_until IS NULL').get().c,
      embeddings: db.prepare('SELECT COUNT(*) as c FROM embeddings').get().c,
    };
    let ftsCount = 0;
    try { ftsCount = db.prepare('SELECT COUNT(*) as c FROM entities_fts').get().c; } catch {}
    counts.ftsEntities = ftsCount;
    db.close();
    
    let enrichLog = [];
    try { enrichLog = JSON.parse(fs.readFileSync(ENRICHMENT_LOG, 'utf8')); } catch {}
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      graph: counts,
      recentEnrichments: enrichLog.slice(-5),
      contextFile: CONTEXT_FILE,
      lastRefresh: fs.existsSync(CONTEXT_FILE) ? fs.statSync(CONTEXT_FILE).mtime : null
    }, null, 2));
    return;
  }
  
  if (url.pathname === '/enrich' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);
        const result = await instantEnrich(message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result, null, 2));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  if (url.pathname === '/refresh') {
    try {
      const content = await deepContextRefresh();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, lines: content.split('\n').length }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

// ── MAIN ────────────────────────────────────────────────

const WATCH_INTERVAL = 2000;      // Check for new messages every 2s
const DEEP_REFRESH_INTERVAL = 300000; // Deep refresh every 5 min

server.listen(PORT, () => {
  console.log(`[proxy] Message enrichment proxy running on port ${PORT}`);
  console.log(`[proxy] Status: http://localhost:${PORT}/status`);
  console.log(`[proxy] Session watcher: every ${WATCH_INTERVAL / 1000}s`);
  console.log(`[proxy] Deep refresh: every ${DEEP_REFRESH_INTERVAL / 60000}min`);
});

// Initial deep context refresh
deepContextRefresh().catch(e => console.error('[proxy] Initial refresh failed:', e.message));

// Watch for new messages
setInterval(() => {
  watchAndEnrich().catch(e => console.error('[proxy] Watch error:', e.message));
}, WATCH_INTERVAL);

// Periodic deep refresh
setInterval(() => {
  deepContextRefresh().catch(e => console.error('[proxy] Deep refresh error:', e.message));
}, DEEP_REFRESH_INTERVAL);

// Graph quality maintenance (every 2 hours)
const MAINTENANCE_INTERVAL = 7200000;
async function runMaintenance() {
  try {
    const { dedup, normalize, decay } = require('./graph-improvements');
    console.log('[proxy] Running graph maintenance...');
    await dedup();
    await normalize();
    await decay();
    console.log('[proxy] Maintenance complete');
  } catch (e) {
    console.error('[proxy] Maintenance error:', e.message);
  }

  // Also run fact confidence decay from v2
  try {
    const db = getDb();
    const result = decayConfidence(db);
    db.close();
    if (result.decayed > 0 || result.pruned > 0) {
      console.log(`[proxy] Fact decay: ${result.decayed} decayed, ${result.pruned} pruned`);
    }
  } catch (e) {
    console.error('[proxy] Fact decay error:', e.message);
  }
}
setTimeout(() => runMaintenance(), 60000);
setInterval(runMaintenance, MAINTENANCE_INTERVAL);

// FTS backfill on startup (ensure index is current)
setTimeout(() => {
  try {
    const db = getDb();
    ensureSchema(db);
    backfillFTS(db);
    db.close();
  } catch (e) {
    console.error('[proxy] FTS backfill error:', e.message);
  }
}, 5000);
