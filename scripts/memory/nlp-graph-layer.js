#!/usr/bin/env node
/**
 * NLP + Graph Retrieval Layer for Kira — V2
 * 
 * V2 Changes (2026-02-14):
 *   - FIXED: Text search now extracts keywords instead of using full query as LIKE pattern
 *   - NEW: FTS5 full-text search with BM25 ranking
 *   - NEW: Reciprocal Rank Fusion (RRF) for hybrid retrieval
 *   - NEW: Known entity registry with type enforcement
 *   - NEW: Duplicate entity detection (bigram similarity)
 *   - NEW: Fact confidence decay + temporal validity (valid_from/valid_until)
 *   - NEW: Fact supersession (old contradicting facts auto-invalidated)
 *   - NEW: Voice post-processing pipeline (disfluency, proper nouns, numbers)
 *   - NEW: Context budget management (token-aware formatting)
 *   - NEW: Per-user DB support via getDb(dbPath) parameter
 *   - IMPROVED: Domain filtering with query-aware boosting
 *   - IMPROVED: Recency bias with exponential decay
 * 
 * Architecture:
 *   Message → postProcess() → extract() → enforceTypes() → dedup() → store() → graph.db
 *   Query   → extractKeywords() → hybridRetrieve() → RRF → formatContext() → LLM
 *   Text    → embed() → embeddings table (cosine similarity search)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const Database = require('/home/adminuser/chimera/node_modules/better-sqlite3');

const DB_PATH = path.join(__dirname, '../../memory/unified.db');
const OLLAMA_URL = 'http://localhost:11434';
const EMBED_MODEL = 'nomic-embed-text';
const EXTRACT_MODEL = process.env.EXTRACT_MODEL || 'granite3.3:2b';

// ── KNOWN ENTITY REGISTRY ───────────────────────────────
// Enforces correct types for entities the LLM frequently misclassifies

const KNOWN_ENTITIES = {
  'otto': { type: 'person', description: 'CEO/Founder of Oopuo' },
  'kira': { type: 'product', description: 'AI partner platform' },
  'zenithcred': { type: 'company', description: 'Corporate wellness gamification' },
  'ottogen': { type: 'company', description: 'AI services brand' },
  'chimera': { type: 'project', description: 'Privacy-preserving distributed AI protocol' },
  'sentinagro': { type: 'company', description: 'Drone cattle monitoring' },
  'iam': { type: 'company', description: 'Interactive Move — projection hardware' },
  'interactive move': { type: 'company', description: 'Interactive floor/wall projectors' },
  'cuttingedge': { type: 'company', description: 'Interior design & project management' },
  'abura': { type: 'company', description: 'Cosmetics sales' },
  'oopuo': { type: 'company', description: 'Umbrella holding company' },
  'nexus': { type: 'project', description: 'Personal AI OS' },
  'openclaw': { type: 'technology', description: 'AI agent platform' },
  'moltbook': { type: 'product', description: 'Social network for AI agents' },
  'nova': { type: 'product', description: 'AI life partner demo agent' },
  'hannelore': { type: 'person', description: 'Nova agent user' },
  'stella vic': { type: 'product', description: 'Tax AI for Brazilian attorneys' },
  'stella debts': { type: 'product', description: 'Debt management learning agent' },
  'pipecat': { type: 'technology', description: 'Voice agent framework' },
  'whisper': { type: 'technology', description: 'OpenAI speech recognition model' },
  'telegram': { type: 'tool', description: 'Messaging platform' },
  'notion': { type: 'product', description: 'Collaboration tool' },
  'ollama': { type: 'technology', description: 'Local LLM runtime' },
};

// ── STOP WORDS ──────────────────────────────────────────

const STOP_WORDS = new Set([
  'what', 'is', 'the', 'a', 'an', 'how', 'why', 'when', 'where', 'who', 'which',
  'tell', 'me', 'about', 'can', 'you', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'have', 'has', 'had', 'be', 'been', 'being', 'are', 'was',
  'were', 'am', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'from',
  'and', 'or', 'not', 'this', 'that', 'these', 'those', 'it', 'its', 'my',
  'your', 'our', 'their', 'i', 'we', 'they', 'he', 'she', 'if', 'but', 'so',
  'than', 'then', 'just', 'also', 'very', 'too', 'more', 'most', 'some', 'any',
  'all', 'each', 'every', 'both', 'few', 'many', 'much', 'such', 'no', 'nor',
  'own', 'same', 'other', 'only', 'into', 'up', 'out', 'over', 'after', 'before',
  'between', 'under', 'again', 'further', 'once', 'here', 'there', 'really',
  'please', 'thanks', 'right', 'now', 'get', 'got', 'let', 'make', 'made',
  'know', 'think', 'want', 'need', 'like', 'look', 'use', 'find', 'give',
  'going', 'way', 'may', 'still', 'see', 'well', 'back', 'new', 'first',
]);

// ── DATABASE ────────────────────────────────────────────

function getDb(dbPath) {
  const p = dbPath || DB_PATH;
  const db = new Database(p);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  return db;
}

function ensureSchema(db) {
  // Core tables (if not exist)
  db.exec(`
    CREATE TABLE IF NOT EXISTS embeddings (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT,
      text TEXT NOT NULL,
      vector BLOB NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id);
  `);

  // Add temporal columns if missing
  const cols = db.prepare("PRAGMA table_info(entities)").all().map(c => c.name);
  if (!cols.includes('confidence')) {
    try { db.exec('ALTER TABLE entities ADD COLUMN confidence REAL DEFAULT 1.0'); } catch {}
  }
  if (!cols.includes('valid_from')) {
    try { db.exec('ALTER TABLE entities ADD COLUMN valid_from TEXT'); } catch {}
  }
  if (!cols.includes('valid_until')) {
    try { db.exec('ALTER TABLE entities ADD COLUMN valid_until TEXT'); } catch {}
  }

  const factCols = db.prepare("PRAGMA table_info(facts)").all().map(c => c.name);
  if (!factCols.includes('confidence')) {
    try { db.exec('ALTER TABLE facts ADD COLUMN confidence REAL DEFAULT 1.0'); } catch {}
  }
  if (!factCols.includes('valid_from')) {
    try {
      db.exec('ALTER TABLE facts ADD COLUMN valid_from TEXT');
      // Backfill valid_from from timestamp
      db.exec('UPDATE facts SET valid_from = timestamp WHERE valid_from IS NULL');
    } catch {}
  }
  if (!factCols.includes('valid_until')) {
    try { db.exec('ALTER TABLE facts ADD COLUMN valid_until TEXT'); } catch {}
  }

  // FTS5 tables
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
        name, description, type,
        content='entities', content_rowid='rowid',
        tokenize='porter unicode61'
      );
    `);
  } catch (e) {
    // FTS5 table may already exist or schema mismatch — that's fine
    if (!e.message.includes('already exists')) {
      console.error('[schema] FTS5 entities_fts error:', e.message);
    }
  }

  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts USING fts5(
        subject_name, predicate, object,
        tokenize='porter unicode61'
      );
    `);
  } catch (e) {
    if (!e.message.includes('already exists')) {
      console.error('[schema] FTS5 facts_fts error:', e.message);
    }
  }

  // Context cache table
  db.exec(`
    CREATE TABLE IF NOT EXISTS context_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query_hash TEXT UNIQUE,
      context_text TEXT NOT NULL,
      entities_used TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_context_cache_hash ON context_cache(query_hash);
  `);
}

// Backfill FTS5 from existing data (run once)
function backfillFTS(db) {
  // Check if FTS has data
  let ftsCount = 0;
  try { ftsCount = db.prepare('SELECT COUNT(*) as c FROM entities_fts').get().c; } catch { return; }
  const entityCount = db.prepare('SELECT COUNT(*) as c FROM entities').get().c;

  if (ftsCount < entityCount * 0.5) {
    console.log(`[fts] Backfilling FTS5: ${ftsCount} indexed / ${entityCount} entities`);
    try {
      // Rebuild FTS from scratch
      db.exec("INSERT INTO entities_fts(entities_fts) VALUES('rebuild')");
      console.log('[fts] entities_fts rebuilt');
    } catch (e) {
      // If content= sync fails, manually insert
      console.log('[fts] Content sync failed, manually inserting...');
      try {
        db.exec('DELETE FROM entities_fts');
        const entities = db.prepare('SELECT rowid, name, COALESCE(description, \'\') as description, type FROM entities').all();
        const insert = db.prepare('INSERT INTO entities_fts(rowid, name, description, type) VALUES(?, ?, ?, ?)');
        const tx = db.transaction(() => {
          for (const e of entities) {
            try { insert.run(e.rowid, e.name, e.description, e.type); } catch {}
          }
        });
        tx();
        console.log(`[fts] Manually inserted ${entities.length} entities into FTS`);
      } catch (e2) {
        console.error('[fts] Manual insert failed:', e2.message);
      }
    }
  }

  // Backfill facts FTS
  let factsFtsCount = 0;
  try { factsFtsCount = db.prepare('SELECT COUNT(*) as c FROM facts_fts').get().c; } catch { return; }
  const factsCount = db.prepare('SELECT COUNT(*) as c FROM facts').get().c;

  if (factsFtsCount < factsCount * 0.5) {
    console.log(`[fts] Backfilling facts FTS: ${factsFtsCount} indexed / ${factsCount} facts`);
    try {
      const facts = db.prepare(`
        SELECT f.rowid, COALESCE(e.name, f.subject_id) as subject_name, f.predicate, f.object
        FROM facts f LEFT JOIN entities e ON f.subject_id = e.id
      `).all();
      const insert = db.prepare('INSERT OR IGNORE INTO facts_fts(rowid, subject_name, predicate, object) VALUES(?, ?, ?, ?)');
      const tx = db.transaction(() => {
        for (const f of facts) {
          try { insert.run(f.rowid, f.subject_name, f.predicate, f.object); } catch {}
        }
      });
      tx();
      console.log(`[fts] Inserted ${facts.length} facts into FTS`);
    } catch (e) {
      console.error('[fts] Facts FTS backfill failed:', e.message);
    }
  }
}

// ── OLLAMA HELPERS ──────────────────────────────────────

function ollamaRequest(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`${OLLAMA_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch { reject(new Error(`Ollama parse error: ${buf.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Ollama timeout')); });
    req.write(data);
    req.end();
  });
}

async function getEmbedding(text) {
  const trimmed = text.slice(0, 8000);
  const res = await ollamaRequest('/api/embeddings', { model: EMBED_MODEL, prompt: trimmed });
  if (!res.embedding) throw new Error('No embedding returned');
  return new Float32Array(res.embedding);
}

async function llmExtract(systemPrompt, userMessage) {
  const res = await ollamaRequest('/api/chat', {
    model: EXTRACT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    stream: false,
    options: { temperature: 0.1, num_predict: 2048 }
  });
  return res.message?.content || '';
}

// ── VECTOR OPERATIONS ───────────────────────────────────

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

function vectorToBuffer(vec) {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

function bufferToVector(buf) {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

// ── TEXT PROCESSING ─────────────────────────────────────

function stripMessageMeta(text) {
  let clean = text.replace(/^\[Telegram\s+[^\]]+\]\s*/i, '');
  clean = clean.replace(/\[message_id:\s*\d+\]\s*/g, '');
  clean = clean.replace(/\[Queued messages[^\]]*\]\s*/g, '');
  clean = clean.replace(/^System:\s*/i, '');
  clean = clean.replace(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}[^\]]*\]\s*/, '');
  clean = clean.replace(/^\[WebUI\]\s*/i, '');
  clean = clean.replace(/^\[\w+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+\w+\]\s*/i, '');
  return clean.trim();
}

/**
 * Extract meaningful keywords from a query, filtering stop words.
 * This is the FIX for the critical bug where the entire query was used as a LIKE pattern.
 */
function extractKeywords(query) {
  return query
    .replace(/[?!.,;:'"()\[\]{}<>\/\\@#$%^&*+=~`|]/g, '') // Strip punctuation
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()));
}

// ── VOICE POST-PROCESSING ───────────────────────────────

const DISFLUENCY_PATTERNS = {
  en: /\b(um+|uh+|er+|ah+|like|you know|I mean|basically|actually|sort of|kind of)\b/gi,
  nl: /\b(uhm+|eh+|nou|ja+|eigenlijk|zeg maar|weet je|dus)\b/gi,
  pt: /\b(é+|né|tipo|assim|então|bom|olha|sabe)\b/gi,
};

function removeDisfluencies(text, language) {
  let cleaned = text;
  // Apply all language patterns (safe — these are noise in any context)
  for (const pattern of Object.values(DISFLUENCY_PATTERNS)) {
    cleaned = cleaned.replace(pattern, '');
  }
  // Remove word repetitions: "the the" → "the"
  cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned;
}

// Proper noun dictionary — auto-generated + manual overrides
const PROPER_NOUNS = {
  'zenith cred': 'ZenithCred', 'zenith credit': 'ZenithCred', 'zenith cread': 'ZenithCred',
  'otto gen': 'OttoGen', 'auto gen': 'OttoGen', 'otto jen': 'OttoGen',
  'sentinel agro': 'SentinAgro', 'sentin agro': 'SentinAgro',
  'kairos': 'Kira', 'keira': 'Kira', 'kiara': 'Kira', 'kiera': 'Kira',
  'interactive move': 'Interactive Move',
  'cutting edge': 'CuttingEdge',
  'stella vicks': "Stella Vic's", 'stella vics': "Stella Vic's", 'stella fix': "Stella Vic's",
  'abura': 'Abura', 'aboura': 'Abura',
  'oopuo': 'Oopuo', 'oo poo oh': 'Oopuo', 'oopoo oh': 'Oopuo',
  'moltbook': 'Moltbook', 'molt book': 'Moltbook',
  'open claw': 'OpenClaw', 'clawed bot': 'OpenClaw', 'clawdbot': 'OpenClaw',
  'chimera': 'Chimera', 'chimerea': 'Chimera', 'chimra': 'Chimera',
};

function correctProperNouns(text) {
  let corrected = text;
  // Sort by length descending to avoid partial replacements
  const sorted = Object.entries(PROPER_NOUNS)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [wrong, right] of sorted) {
    const regex = new RegExp(`\\b${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    corrected = corrected.replace(regex, right);
  }
  return corrected;
}

const NUMBER_WORDS = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
  'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
  'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
  'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
  'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
  'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
  'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000,
};

function normalizeNumbers(text) {
  // "five hundred" → "500"
  text = text.replace(/(\w+)\s+hundred/gi, (match, num) => {
    const n = NUMBER_WORDS[num.toLowerCase()];
    return n !== undefined ? String(n * 100) : match;
  });
  // "fifteen percent" → "15%"
  text = text.replace(/(\w+)\s+percent/gi, (match, num) => {
    const n = NUMBER_WORDS[num.toLowerCase()];
    return n !== undefined ? `${n}%` : match;
  });
  // "thirty euros" → "€30"
  text = text.replace(/(\w+)\s+(euros?|dollars?|reais?)/gi, (match, num, currency) => {
    const n = NUMBER_WORDS[num.toLowerCase()];
    if (n === undefined) return match;
    const symbol = currency.toLowerCase().startsWith('euro') ? '€' :
                   currency.toLowerCase().startsWith('dollar') ? '$' : 'R$';
    return `${symbol}${n}`;
  });
  return text;
}

function restorePunctuation(text) {
  if (!text) return text;
  // Add period at end if missing
  if (!text.match(/[.!?]$/)) text += '.';
  // Capitalize first letter
  text = text.replace(/(^|[.!?]\s+)([a-z])/g, (m, p, c) => p + c.toUpperCase());
  return text;
}

/**
 * Full voice post-processing pipeline.
 * Takes raw Whisper output text, returns cleaned text ready for NLP.
 */
function postProcessVoice(text, language) {
  if (!text || text.length < 3) return { text, steps: [] };
  const steps = [];
  let current = text;

  const pipeline = [
    { name: 'disfluency', fn: t => removeDisfluencies(t, language) },
    { name: 'properNouns', fn: correctProperNouns },
    { name: 'numbers', fn: normalizeNumbers },
    { name: 'punctuation', fn: restorePunctuation },
  ];

  for (const step of pipeline) {
    const before = current;
    current = step.fn(current);
    if (current !== before) {
      steps.push({ name: step.name, before: before.slice(0, 200), after: current.slice(0, 200) });
    }
  }

  return { text: current, steps };
}

// ── ENTITY QUALITY ──────────────────────────────────────

/**
 * Enforce correct entity types using the known entity registry.
 */
function enforceEntityType(entity) {
  const known = KNOWN_ENTITIES[entity.name.toLowerCase()];
  if (known) {
    entity.type = known.type;
    if (!entity.description || entity.description.length < 10) {
      entity.description = known.description;
    }
  }
  return entity;
}

/**
 * Bigram similarity for fuzzy duplicate detection.
 */
function stringSimilarity(a, b) {
  if (a === b) return 1.0;
  const al = a.toLowerCase(), bl = b.toLowerCase();
  if (al === bl) return 1.0;
  if (al.includes(bl) || bl.includes(al)) {
    return Math.min(al.length, bl.length) / Math.max(al.length, bl.length);
  }
  const bigramsA = new Set();
  for (let i = 0; i < al.length - 1; i++) bigramsA.add(al.slice(i, i + 2));
  const bigramsB = new Set();
  for (let i = 0; i < bl.length - 1; i++) bigramsB.add(bl.slice(i, i + 2));
  let intersection = 0;
  for (const bg of bigramsA) if (bigramsB.has(bg)) intersection++;
  return (2 * intersection) / (bigramsA.size + bigramsB.size || 1);
}

/**
 * Find a duplicate entity in the DB by fuzzy name match.
 * Returns the existing entity if found, null otherwise.
 */
function findDuplicateEntity(db, name) {
  // Exact case-insensitive match
  const exact = db.prepare('SELECT id, name, type FROM entities WHERE LOWER(name) = LOWER(?)').get(name);
  if (exact) return exact;

  // Fuzzy: check similar names
  const candidates = db.prepare(`
    SELECT id, name, type FROM entities
    WHERE LOWER(name) LIKE '%' || LOWER(?) || '%'
    OR LOWER(?) LIKE '%' || LOWER(name) || '%'
    LIMIT 10
  `).all(name, name);

  for (const c of candidates) {
    if (stringSimilarity(name, c.name) > 0.85) return c;
  }
  return null;
}

// ── EXTRACT — Entity + Relationship extraction ─────────

const EXTRACT_PROMPT = `You are an entity/relationship extractor. Given a conversation message, extract structured data.

Rules:
- Extract ONLY concrete entities (people, companies, products, technologies, locations, concepts with specific names)
- Extract relationships between entities mentioned in the SAME message
- Extract facts (subject-predicate-object triples)
- Skip vague references ("it", "this", "that")
- Skip common words that aren't named entities
- Skip generic terms like "user", "dashboard", "system", "AI", "agent" unless they refer to a SPECIFIC product
- Be precise: use exact names as mentioned

Respond ONLY with valid JSON, no explanation:
{
  "entities": [
    {"name": "exact name", "type": "person|company|product|technology|concept|location|project|tool|event", "description": "one line"}
  ],
  "relations": [
    {"source": "entity name", "target": "entity name", "type": "relationship type", "description": "one line"}
  ],
  "facts": [
    {"subject": "entity name", "predicate": "verb/relationship", "object": "value or entity"}
  ]
}

If nothing meaningful to extract, return: {"entities":[],"relations":[],"facts":[]}

Message:
`;

// Low-value entity names to skip during extraction
const SKIP_ENTITY_NAMES = new Set([
  'user', 'system', 'dashboard', 'ai', 'agent', 'bot', 'app', 'tool',
  'server', 'client', 'database', 'file', 'message', 'task', 'goal',
  'project', 'document', 'page', 'button', 'modal', 'form', 'api',
  'endpoint', 'function', 'module', 'script', 'test', 'error', 'bug',
  'fix', 'update', 'change', 'config', 'setting', 'option', 'feature',
]);

async function extract(message, role = 'user') {
  if (!message || message.length < 10) return { entities: [], relations: [], facts: [] };

  if (message.startsWith('Read HEARTBEAT') || message === 'HEARTBEAT_OK' || message === 'NO_REPLY') {
    return { entities: [], relations: [], facts: [] };
  }

  const cleanMsg = stripMessageMeta(message);
  if (cleanMsg.length < 10) return { entities: [], relations: [], facts: [] };

  let raw;
  try {
    raw = await llmExtract(EXTRACT_PROMPT, `[${role}]: ${cleanMsg.slice(0, 4000)}`);
  } catch (e) {
    console.error('[extract] LLM error:', e.message);
    return { entities: [], relations: [], facts: [] };
  }

  let parsed;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { entities: [], relations: [], facts: [] };
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('[extract] Parse error:', raw.slice(0, 200));
    return { entities: [], relations: [], facts: [] };
  }

  // Post-process: enforce types, filter low-value entities
  let entities = Array.isArray(parsed.entities) ? parsed.entities : [];
  entities = entities
    .filter(e => e.name && e.type && !SKIP_ENTITY_NAMES.has(e.name.toLowerCase()))
    .map(enforceEntityType);

  return {
    entities,
    relations: Array.isArray(parsed.relations) ? parsed.relations : [],
    facts: Array.isArray(parsed.facts) ? parsed.facts : []
  };
}

function storeExtracted(db, extracted, messageId) {
  const now = new Date().toISOString();
  let stored = { entities: 0, relations: 0, facts: 0, deduped: 0 };

  const upsertEntity = db.prepare(`
    INSERT INTO entities (id, type, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      updated_at = excluded.updated_at,
      type = excluded.type,
      description = COALESCE(NULLIF(excluded.description, ''), entities.description)
  `);

  const insertRelation = db.prepare(`
    INSERT OR IGNORE INTO relations (id, source_id, target_id, type, properties, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertFact = db.prepare(`
    INSERT OR IGNORE INTO facts (id, subject_id, predicate, object, source, timestamp, valid_from, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1.0)
  `);

  // FTS insert helpers (fail silently if FTS not available)
  let insertEntityFts, insertFactFts;
  try {
    insertEntityFts = db.prepare('INSERT OR IGNORE INTO entities_fts(rowid, name, description, type) VALUES(?, ?, ?, ?)');
  } catch {}
  try {
    insertFactFts = db.prepare('INSERT OR IGNORE INTO facts_fts(rowid, subject_name, predicate, object) VALUES(?, ?, ?, ?)');
  } catch {}

  // Store entities (with dedup + type enforcement)
  for (const e of extracted.entities) {
    if (!e.name || !e.type) continue;

    // Check for duplicate
    const existing = findDuplicateEntity(db, e.name);
    if (existing && existing.name.toLowerCase() !== e.name.toLowerCase()) {
      // Merge: use existing entity ID, update if our type is better
      const known = KNOWN_ENTITIES[e.name.toLowerCase()];
      if (known) {
        try {
          db.prepare('UPDATE entities SET type = ?, updated_at = ? WHERE id = ?')
            .run(known.type, now, existing.id);
        } catch {}
      }
      stored.deduped++;
      continue;
    }

    const id = 'ent-' + crypto.createHash('md5').update(e.name.toLowerCase()).digest('hex').slice(0, 12);
    try {
      upsertEntity.run(id, e.type, e.name, e.description || null, now, now);
      stored.entities++;

      // Update FTS
      if (insertEntityFts) {
        const rowid = db.prepare('SELECT rowid FROM entities WHERE id = ?').get(id)?.rowid;
        if (rowid) {
          try { insertEntityFts.run(rowid, e.name, e.description || '', e.type); } catch {}
        }
      }
    } catch (err) { /* skip */ }
  }

  // Store relations
  for (const r of extracted.relations) {
    if (!r.source || !r.target || !r.type) continue;
    const srcId = 'ent-' + crypto.createHash('md5').update(r.source.toLowerCase()).digest('hex').slice(0, 12);
    const tgtId = 'ent-' + crypto.createHash('md5').update(r.target.toLowerCase()).digest('hex').slice(0, 12);
    const relId = 'rel-' + crypto.createHash('md5').update(`${srcId}-${r.type}-${tgtId}`).digest('hex').slice(0, 12);
    try {
      insertRelation.run(relId, srcId, tgtId, r.type, JSON.stringify({ description: r.description }), now);
      stored.relations++;
    } catch (err) { /* skip duplicates */ }
  }

  // Store facts (with supersession)
  for (const f of extracted.facts) {
    if (!f.subject || !f.predicate || !f.object) continue;
    const subId = 'ent-' + crypto.createHash('md5').update(f.subject.toLowerCase()).digest('hex').slice(0, 12);
    const factId = 'fact-' + crypto.createHash('md5').update(`${f.subject}-${f.predicate}-${f.object}`).digest('hex').slice(0, 12);

    // Check for supersession: same subject + predicate with different object
    try {
      const existingFacts = db.prepare(`
        SELECT id, object FROM facts
        WHERE subject_id = ? AND predicate = ? AND valid_until IS NULL AND object != ?
      `).all(subId, f.predicate, f.object);

      // Invalidate old facts that this one supersedes
      for (const old of existingFacts) {
        db.prepare('UPDATE facts SET valid_until = ? WHERE id = ?').run(now, old.id);
      }
    } catch {}

    try {
      insertFact.run(factId, subId, f.predicate, f.object, messageId || 'live', now, now);
      stored.facts++;

      // Update facts FTS
      if (insertFactFts) {
        const rowid = db.prepare('SELECT rowid FROM facts WHERE id = ?').get(factId)?.rowid;
        if (rowid) {
          try { insertFactFts.run(rowid, f.subject, f.predicate, f.object); } catch {}
        }
      }
    } catch (err) { /* skip duplicates */ }
  }

  return stored;
}

// ── EMBED ───────────────────────────────────────────────

async function embedAll(db) {
  ensureSchema(db);
  let count = 0;

  const entities = db.prepare(`
    SELECT e.id, e.name, e.type, e.description FROM entities e
    WHERE NOT EXISTS (SELECT 1 FROM embeddings em WHERE em.source_type = 'entity' AND em.source_id = e.id)
  `).all();

  const insertEmbed = db.prepare(`
    INSERT OR REPLACE INTO embeddings (id, source_type, source_id, text, vector, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const e of entities) {
    const text = `${e.type}: ${e.name}. ${e.description || ''}`.trim();
    try {
      const vec = await getEmbedding(text);
      const id = 'emb-' + crypto.createHash('md5').update(text).digest('hex').slice(0, 12);
      insertEmbed.run(id, 'entity', e.id, text, vectorToBuffer(vec), new Date().toISOString());
      count++;
      if (count % 20 === 0) console.log(`[embed] ${count} entities embedded...`);
    } catch (err) {
      console.error(`[embed] Failed to embed entity ${e.name}:`, err.message);
    }
  }

  const facts = db.prepare(`
    SELECT f.id, f.subject_id, f.predicate, f.object FROM facts f
    WHERE NOT EXISTS (SELECT 1 FROM embeddings em WHERE em.source_type = 'fact' AND em.source_id = f.id)
    LIMIT 500
  `).all();

  for (const f of facts) {
    const entity = db.prepare('SELECT name FROM entities WHERE id = ?').get(f.subject_id);
    const text = `${entity?.name || f.subject_id} ${f.predicate} ${f.object}`;
    try {
      const vec = await getEmbedding(text);
      const id = 'emb-' + crypto.createHash('md5').update(text).digest('hex').slice(0, 12);
      insertEmbed.run(id, 'fact', f.id, text, vectorToBuffer(vec), new Date().toISOString());
      count++;
    } catch (err) {
      console.error(`[embed] Failed to embed fact:`, err.message);
    }
  }

  return count;
}

// ── ENRICH V2 — Hybrid Retrieval with RRF ───────────────

/**
 * Search entities using keyword extraction + FTS5 + LIKE fallback.
 * This is the FIX for the critical bug where the full query was used as a single LIKE pattern.
 */
function keywordSearchEntities(db, query) {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

  // Try FTS5 first (fast, BM25 ranked)
  try {
    const ftsQuery = keywords.map(kw => `"${kw.replace(/"/g, '')}"*`).join(' OR ');
    const ftsResults = db.prepare(`
      SELECT e.id, e.name, e.type, e.description, rank as relevance
      FROM entities_fts
      JOIN entities e ON entities_fts.rowid = e.rowid
      WHERE entities_fts MATCH ?
      ORDER BY rank
      LIMIT 20
    `).all(ftsQuery);
    if (ftsResults.length > 0) return ftsResults;
  } catch (e) {
    // FTS5 may not be available or query may be invalid
  }

  // Fallback: LIKE search per keyword (the fixed version)
  const entityScores = new Map();
  for (const kw of keywords) {
    const kwLike = `%${kw}%`;
    const matches = db.prepare(`
      SELECT id, name, type, description FROM entities
      WHERE name LIKE ? OR description LIKE ?
      LIMIT 20
    `).all(kwLike, kwLike);
    for (const m of matches) {
      const ex = entityScores.get(m.id) || { ...m, score: 0 };
      ex.score++;
      entityScores.set(m.id, ex);
    }
  }
  return Array.from(entityScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
}

/**
 * Search facts using keywords.
 */
function keywordSearchFacts(db, query) {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

  // Try FTS5
  try {
    const ftsQuery = keywords.map(kw => `"${kw.replace(/"/g, '')}"*`).join(' OR ');
    return db.prepare(`
      SELECT f.id, facts_fts.subject_name, f.predicate, f.object, f.confidence, f.valid_until, rank as relevance
      FROM facts_fts
      JOIN facts f ON facts_fts.rowid = f.rowid
      WHERE facts_fts MATCH ?
      AND f.valid_until IS NULL
      ORDER BY rank
      LIMIT 20
    `).all(ftsQuery);
  } catch {}

  // Fallback
  const factScores = new Map();
  for (const kw of keywords) {
    const kwLike = `%${kw}%`;
    const matches = db.prepare(`
      SELECT f.id, e.name as subject_name, f.predicate, f.object, f.confidence, f.valid_until
      FROM facts f LEFT JOIN entities e ON f.subject_id = e.id
      WHERE (e.name LIKE ? OR f.predicate LIKE ? OR f.object LIKE ?)
      AND f.valid_until IS NULL
      LIMIT 20
    `).all(kwLike, kwLike, kwLike);
    for (const m of matches) {
      const ex = factScores.get(m.id) || { ...m, score: 0 };
      ex.score++;
      factScores.set(m.id, ex);
    }
  }
  return Array.from(factScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
}

/**
 * Graph traversal: find connected entities and their facts.
 */
function graphTraverse(db, entityIds, opts = {}) {
  if (entityIds.length === 0) return { relations: [], facts: [], connectedEntities: [] };
  const maxHops = opts.maxHops || 2;

  // Hop 1: direct relations
  const placeholders = entityIds.map(() => '?').join(',');
  const relations = db.prepare(`
    SELECT r.type, r.properties,
      s.name as source_name, s.type as source_type,
      t.name as target_name, t.type as target_type,
      s.id as source_id, t.id as target_id
    FROM relations r
    JOIN entities s ON r.source_id = s.id
    JOIN entities t ON r.target_id = t.id
    WHERE r.source_id IN (${placeholders}) OR r.target_id IN (${placeholders})
    LIMIT 30
  `).all(...entityIds, ...entityIds);

  // Get facts for found entities (only currently valid)
  const facts = db.prepare(`
    SELECT f.predicate, f.object, e.name as subject_name, f.confidence
    FROM facts f
    LEFT JOIN entities e ON f.subject_id = e.id
    WHERE f.subject_id IN (${placeholders})
    AND f.valid_until IS NULL
    AND f.confidence > 0.3
    ORDER BY f.confidence DESC
    LIMIT 25
  `).all(...entityIds);

  // Hop 2: connected entities (if requested)
  let connectedEntities = [];
  if (maxHops >= 2) {
    const connectedIds = new Set();
    for (const r of relations) {
      if (!entityIds.includes(r.source_id)) connectedIds.add(r.source_id);
      if (!entityIds.includes(r.target_id)) connectedIds.add(r.target_id);
    }
    if (connectedIds.size > 0) {
      const cp = Array.from(connectedIds).map(() => '?').join(',');
      connectedEntities = db.prepare(`
        SELECT id, name, type, description FROM entities WHERE id IN (${cp}) LIMIT 10
      `).all(...connectedIds);
    }
  }

  return { relations, facts, connectedEntities };
}

/**
 * Semantic (vector) search.
 */
async function vectorSearch(db, query, opts = {}) {
  const maxResults = opts.maxResults || 15;

  try {
    const queryVec = await getEmbedding(query);
    const allEmbeddings = db.prepare('SELECT source_type, source_id, text, vector, created_at FROM embeddings').all();

    // Domain detection for boosting
    const queryLower = query.toLowerCase();
    const domainHints = {
      graph: /\b(graph|node|edge|entity|relation|knowledge|orphan|connect|cluster|neo4j|sqlite)\b/,
      network: /\b(network|firewall|port|ufw|ssh|ip|dns|server|proxy|tunnel)\b/,
      code: /\b(code|function|script|bug|error|module|import|class|api|endpoint)\b/,
      business: /\b(company|investor|revenue|pitch|client|customer|sales|funding|valuation)\b/,
      infra: /\b(docker|pm2|systemd|service|daemon|process|container|deploy)\b/,
    };
    const activeDomains = Object.entries(domainHints)
      .filter(([, re]) => re.test(queryLower))
      .map(([domain]) => domain);

    const domainBoost = {
      graph: /\b(graph|node|entity|relation|edge|triple|knowledge|orphan|connected|cluster)\b/i,
      network: /\b(firewall|ufw|port|ssh|ip|0\.0\.0\.0|127\.0\.0\.1|tunnel|dns|network)\b/i,
      code: /\b(function|class|module|import|require|script|error|bug|test|commit)\b/i,
      business: /\b(investor|revenue|pitch|company|client|funding|valuation|seed|round)\b/i,
      infra: /\b(docker|pm2|systemd|service|daemon|container|deploy|restart)\b/i,
    };

    const now = Date.now();
    const DAY_MS = 86400000;

    const scored = allEmbeddings.map(row => {
      const baseSimilarity = cosineSimilarity(queryVec, bufferToVector(row.vector));

      const createdAt = row.created_at ? new Date(row.created_at).getTime() : now - (14 * DAY_MS);
      const ageDays = Math.max(0, now - createdAt) / DAY_MS;
      const recencyBoost = Math.max(-0.05, 0.15 * Math.exp(-ageDays / 7));

      let domainScore = 0;
      if (activeDomains.length > 0) {
        const textLower = row.text.toLowerCase();
        let matchesQueryDomain = false;
        let matchesOtherDomain = false;

        for (const domain of activeDomains) {
          if (domainBoost[domain]?.test(textLower)) matchesQueryDomain = true;
        }
        for (const [domain, re] of Object.entries(domainBoost)) {
          if (!activeDomains.includes(domain) && re.test(textLower)) {
            matchesOtherDomain = true;
          }
        }

        if (matchesQueryDomain) domainScore = 0.08;
        else if (matchesOtherDomain) domainScore = -0.10;
      }

      return {
        type: row.source_type,
        id: row.source_id,
        text: row.text,
        score: baseSimilarity + recencyBoost + domainScore,
        rawSimilarity: baseSimilarity,
        recencyBoost,
        domainScore,
      };
    })
    .filter(s => s.score > 0.60)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

    return scored;
  } catch (e) {
    console.error('[enrich] Vector search failed:', e.message);
    return [];
  }
}

/**
 * Reciprocal Rank Fusion: merge results from multiple retrieval methods.
 */
function reciprocalRankFusion(methodResults, opts = {}) {
  const k = opts.k || 60;
  const scores = new Map();

  for (const method of methodResults) {
    for (let rank = 0; rank < method.results.length; rank++) {
      const item = method.results[rank];
      const itemKey = item.id || item.text || JSON.stringify(item).slice(0, 100);
      const existing = scores.get(itemKey) || { item, score: 0, methods: [] };
      existing.score += method.weight * (1 / (k + rank + 1));
      existing.methods.push(method.name);
      scores.set(itemKey, existing);
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score);
}

/**
 * Format context with token budget awareness.
 */
function formatContextWithBudget(entities, graphData, vectorResults, opts = {}) {
  const budgetChars = opts.budgetChars || 4000; // ~1000 tokens
  const lines = [];
  let used = 0;

  function addLine(line) {
    if (used + line.length + 1 > budgetChars) return false;
    lines.push(line);
    used += line.length + 1;
    return true;
  }

  // Section 1: Matched entities (highest priority)
  if (entities.length > 0) {
    addLine('## Relevant Context');
    for (const e of entities.slice(0, 8)) {
      if (!addLine(`- **${e.name}** (${e.type})${e.description ? ': ' + e.description : ''}`)) break;
    }
  }

  // Section 2: Relationships
  if (graphData.relations.length > 0) {
    addLine('');
    addLine('## Relationships');
    const seen = new Set();
    for (const r of graphData.relations.slice(0, 10)) {
      const key = `${r.source_name}-${r.type}-${r.target_name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!addLine(`- ${r.source_name} —[${r.type}]→ ${r.target_name}`)) break;
    }
  }

  // Section 3: Facts (only currently valid, high confidence)
  if (graphData.facts.length > 0) {
    addLine('');
    addLine('## Known Facts');
    const seen = new Set();
    for (const f of graphData.facts.slice(0, 12)) {
      const key = `${f.subject_name}-${f.predicate}-${f.object}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!addLine(`- ${f.subject_name || '?'} ${f.predicate} ${f.object}`)) break;
    }
  }

  // Section 4: Semantic matches (lowest priority, fills remaining budget)
  if (vectorResults.length > 0) {
    addLine('');
    addLine('## Related');
    for (const s of vectorResults.slice(0, 6)) {
      const pct = (s.score * 100).toFixed(0);
      if (!addLine(`- [${pct}%] ${s.text}`)) break;
    }
  }

  return lines.join('\n');
}

/**
 * ENRICH V2 — Main entry point for context assembly.
 * Uses keyword search + FTS5 + graph traversal + vector search + RRF.
 */
async function enrich(query, opts = {}) {
  const db = getDb(opts.dbPath);
  ensureSchema(db);
  query = stripMessageMeta(query);
  const maxResults = opts.maxResults || 15;
  const budgetChars = opts.budgetChars || 4000;

  const result = {
    entities: [],
    relations: [],
    facts: [],
    similar: [],
    context: '',
    methods: [],
    timing: {},
  };

  const t0 = Date.now();

  // 1. Keyword search for entities (FIXED — was using full query as LIKE pattern)
  const t1 = Date.now();
  const keywordEntities = keywordSearchEntities(db, query);
  result.timing.keywordSearch = Date.now() - t1;
  result.entities.push(...keywordEntities);

  // 2. Keyword search for facts
  const keywordFacts = keywordSearchFacts(db, query);

  // 3. Graph traversal from found entities
  const t2 = Date.now();
  const entityIds = result.entities.map(e => e.id);
  const graphData = graphTraverse(db, entityIds, { maxHops: 2 });
  result.relations.push(...graphData.relations);
  result.facts.push(...graphData.facts);
  result.timing.graphTraverse = Date.now() - t2;

  // 4. Vector/semantic search
  const t3 = Date.now();
  const vectorResults = await vectorSearch(db, query, { maxResults });
  result.similar = vectorResults;
  result.timing.vectorSearch = Date.now() - t3;

  // 5. RRF fusion for ranking (used for logging/analysis)
  const rrfResults = reciprocalRankFusion([
    { name: 'keyword', results: keywordEntities.map(e => ({ id: e.id, text: e.name, ...e })), weight: 1.0 },
    { name: 'vector', results: vectorResults.map(v => ({ id: v.id, text: v.text, ...v })), weight: 0.8 },
    { name: 'facts', results: keywordFacts.map(f => ({ id: f.id, text: `${f.subject_name} ${f.predicate} ${f.object}`, ...f })), weight: 0.6 },
  ]);
  result.methods = rrfResults.slice(0, 5).map(r => ({ text: r.item.text?.slice(0, 80), methods: r.methods, score: r.score }));

  // 6. Format context with budget
  result.context = formatContextWithBudget(result.entities, graphData, vectorResults, { budgetChars });

  result.timing.total = Date.now() - t0;

  db.close();
  return result;
}

// ── FACT CONFIDENCE DECAY ───────────────────────────────

function decayConfidence(db) {
  let decayed = 0, pruned = 0;
  try {
    // Facts older than 30 days that haven't been re-confirmed lose 10% confidence
    const r1 = db.prepare(`
      UPDATE facts
      SET confidence = MAX(0.1, confidence * 0.9)
      WHERE created_at < datetime('now', '-30 days')
      AND valid_until IS NULL
      AND confidence > 0.2
    `).run();
    decayed = r1.changes;

    // Prune superseded facts below 0.2 confidence
    const r2 = db.prepare(`
      DELETE FROM facts WHERE confidence < 0.2 AND valid_until IS NOT NULL
    `).run();
    pruned = r2.changes;
  } catch (e) {
    console.error('[decay] Error:', e.message);
  }
  return { decayed, pruned };
}

// ── REFINE INTENT — LLM-based query rewriting ──────────

const REFINE_PROMPT = `You are a query refinement AI.
Your goal is to rewrite the user's message to be precise, unambiguous, and contextually complete based on the provided background facts.
- Fix typos and grammar.
- Resolve "it", "this", "that" using the context.
- Keep the tone commanding and direct.
- Output ONLY the rewritten message (1-2 sentences max). Do not explain.

User Message: "{query}"

Background Context:
{context}

Refined Message:`;

async function refineIntent(query, searchResults) {
  // Format context for the LLM
  const contextLines = [];
  if (searchResults.entities) contextLines.push(...searchResults.entities.slice(0, 3).map(e => `- ${e.name} (${e.type}): ${e.description}`));
  if (searchResults.facts) contextLines.push(...searchResults.facts.slice(0, 3).map(f => `- ${f.subject_name} ${f.predicate} ${f.object}`));
  
  const contextBlock = contextLines.length > 0 ? contextLines.join('\n') : "No specific context found.";
  const filledPrompt = REFINE_PROMPT.replace('{query}', query).replace('{context}', contextBlock);

  try {
    // reusing llmExtract: (systemPrompt, userMessage)
    // We'll put the instruction in system and the data in user for better adherence
    const system = "You are a query refinement AI. Rewrite the user's message to be precise, unambiguous, and contextually complete. Fix typos. Resolve references. Output ONLY the rewritten message (1-2 sentences).";
    const user = `Context:\n${contextBlock}\n\nOriginal Message: "${query}"\n\nRefined Message:`;
    
    const refined = await llmExtract(system, user);
    return refined.trim().replace(/^["']|["']$/g, '');
  } catch (e) {
    console.error('[refine] LLM error:', e.message);
    return query;
  }
}

// ── PROCESS MESSAGE — Full pipeline ─────────────────────

async function processMessage(message, role = 'user', messageId = null, opts = {}) {
  const db = getDb(opts.dbPath);
  ensureSchema(db);
  const ts = Date.now();

  // 1. Extract entities/relations/facts
  const extracted = await extract(message, role);
  const stored = storeExtracted(db, extracted, messageId);

  // 2. Embed the message itself
  const cleanMessage = stripMessageMeta(message);
  if (cleanMessage.length > 20) {
    try {
      const vec = await getEmbedding(cleanMessage.slice(0, 4000));
      const id = 'emb-msg-' + (messageId || crypto.createHash('md5').update(message).digest('hex').slice(0, 12));
      const insertEmbed = db.prepare(`
        INSERT OR REPLACE INTO embeddings (id, source_type, source_id, text, vector, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertEmbed.run(id, 'message', messageId || id, message.slice(0, 2000), vectorToBuffer(vec), new Date().toISOString());
    } catch (e) {
      console.error('[process] Embed message failed:', e.message);
    }
  }

  // 3. Embed new entities
  for (const e of extracted.entities) {
    if (!e.name) continue;
    const entId = 'ent-' + crypto.createHash('md5').update(e.name.toLowerCase()).digest('hex').slice(0, 12);
    const text = `${e.type}: ${e.name}. ${e.description || ''}`.trim();
    try {
      const existing = db.prepare('SELECT 1 FROM embeddings WHERE source_type = ? AND source_id = ?').get('entity', entId);
      if (!existing) {
        const vec = await getEmbedding(text);
        const embId = 'emb-' + crypto.createHash('md5').update(text).digest('hex').slice(0, 12);
        db.prepare(`INSERT OR REPLACE INTO embeddings (id, source_type, source_id, text, vector, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(embId, 'entity', entId, text, vectorToBuffer(vec), new Date().toISOString());
      }
    } catch (e2) { /* skip */ }
  }

  db.close();
  const elapsed = Date.now() - ts;

  return {
    extracted,
    stored,
    elapsed,
    summary: `Extracted ${stored.entities}E/${stored.relations}R/${stored.facts}F (${stored.deduped} deduped) in ${elapsed}ms`
  };
}

// ── CLI ─────────────────────────────────────────────────

async function main() {
  const cmd = process.argv[2];
  const arg = process.argv.slice(3).join(' ');

  switch (cmd) {
    case 'extract': {
      const result = await extract(arg);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'process': {
      const result = await processMessage(arg);
      console.log(result.summary);
      console.log(JSON.stringify(result.extracted, null, 2));
      break;
    }
    case 'enrich': {
      const result = await enrich(arg);
      console.log(result.context || 'No relevant context found.');
      console.error(`\n[timing] keyword:${result.timing.keywordSearch}ms graph:${result.timing.graphTraverse}ms vector:${result.timing.vectorSearch}ms total:${result.timing.total}ms`);
      console.error(`[results] entities:${result.entities.length} relations:${result.relations.length} facts:${result.facts.length} similar:${result.similar.length}`);
      if (result.methods.length > 0) {
        console.error('[rrf] Top results:');
        for (const m of result.methods) {
          console.error(`  ${m.methods.join('+')} → ${m.text}`);
        }
      }
      break;
    }
    case 'refine': {
      // Simulate the pipeline
      console.log(`Original: "${arg}"`);
      const searchResults = await enrich(arg, { maxResults: 5 });
      const refined = await refineIntent(arg, searchResults);
      console.log(`Refined:  "${refined}"`);
      break;
    }
    case 'embed-all': {
      const db = getDb();
      const count = await embedAll(db);
      console.log(`Embedded ${count} items`);
      db.close();
      break;
    }
    case 'status': {
      const db = getDb();
      ensureSchema(db);
      const entities = db.prepare('SELECT COUNT(*) as c FROM entities').get().c;
      const relations = db.prepare('SELECT COUNT(*) as c FROM relations').get().c;
      const facts = db.prepare('SELECT COUNT(*) as c FROM facts').get().c;
      const validFacts = db.prepare('SELECT COUNT(*) as c FROM facts WHERE valid_until IS NULL').get().c;
      const embeddings = db.prepare('SELECT COUNT(*) as c FROM embeddings').get().c;
      let ftsEntities = 0;
      try { ftsEntities = db.prepare('SELECT COUNT(*) as c FROM entities_fts').get().c; } catch {}
      console.log(`Entities: ${entities} | Relations: ${relations} | Facts: ${facts} (${validFacts} valid) | Embeddings: ${embeddings} | FTS: ${ftsEntities}`);
      db.close();
      break;
    }
    case 'backfill-fts': {
      const db = getDb();
      ensureSchema(db);
      backfillFTS(db);
      db.close();
      break;
    }
    case 'decay': {
      const db = getDb();
      const result = decayConfidence(db);
      console.log(`Decayed: ${result.decayed} facts, Pruned: ${result.pruned} facts`);
      db.close();
      break;
    }
    case 'post-process': {
      const result = postProcessVoice(arg);
      console.log('Result:', result.text);
      if (result.steps.length > 0) {
        console.log('Steps:', JSON.stringify(result.steps, null, 2));
      }
      break;
    }
    case 'benchmark': {
      const queries = [
        'What is ZenithCred?',
        'Tell me about Otto',
        'Chimera protocol architecture',
        'Stella Vic tax AI',
        'dashboard UI improvements',
        'voice recording pipeline',
        'NLP graph layer performance',
        'investor pitch deck progress',
      ];
      console.log('Running enrichment benchmark...\n');
      for (const q of queries) {
        const r = await enrich(q);
        console.log(`"${q}"`);
        console.log(`  entities: ${r.entities.length} | relations: ${r.relations.length} | facts: ${r.facts.length} | similar: ${r.similar.length}`);
        console.log(`  timing: kw=${r.timing.keywordSearch}ms graph=${r.timing.graphTraverse}ms vec=${r.timing.vectorSearch}ms total=${r.timing.total}ms`);
        console.log(`  context: ${r.context.length} chars\n`);
      }
      break;
    }
    default:
      console.log('Usage: nlp-graph-layer.js <command> [args]');
      console.log('Commands:');
      console.log('  extract <message>     Extract entities/relations/facts from text');
      console.log('  process <message>     Full pipeline: extract + store + embed');
      console.log('  enrich <query>        Retrieve relevant context (V2: keyword+FTS+graph+vector+RRF)');
      console.log('  embed-all             Generate embeddings for all unembedded content');
      console.log('  status                Show counts (incl. FTS, valid facts)');
      console.log('  backfill-fts          Rebuild FTS5 indexes from existing data');
      console.log('  decay                 Run confidence decay on old facts');
      console.log('  post-process <text>   Run voice post-processing pipeline');
      console.log('  benchmark             Run enrichment benchmark on 8 test queries');
  }
}

main().catch(e => { console.error(e); process.exit(1); });

// Backwards-compatible export (ensureEmbeddingsTable → ensureSchema)
module.exports = {
  extract, enrich, processMessage, embedAll, getDb,
  ensureEmbeddingsTable: ensureSchema, ensureSchema,
  postProcessVoice, extractKeywords, keywordSearchEntities,
  decayConfidence, backfillFTS, enforceEntityType,
  stringSimilarity, findDuplicateEntity, reciprocalRankFusion, refineIntent,
  KNOWN_ENTITIES, PROPER_NOUNS, STOP_WORDS,
};
