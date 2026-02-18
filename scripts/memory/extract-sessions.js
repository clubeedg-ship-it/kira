#!/usr/bin/env node
// Extract memories from session transcripts into unified.db
// Usage: node extract-sessions.js <start_index> <end_index>

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SESSIONS_DIR = path.join(process.env.HOME, '.openclaw/agents/main/sessions');
const DB_PATH = path.join(process.env.HOME, 'kira/memory/unified.db');

const startIdx = parseInt(process.argv[2] || '0');
const endIdx = parseInt(process.argv[3] || '999');

const files = fs.readdirSync(SESSIONS_DIR)
  .filter(f => f.endsWith('.jsonl'))
  .sort()
  .slice(startIdx, endIdx);

console.log(`Processing ${files.length} sessions (${startIdx}-${endIdx})`);

function sqlEscape(s) {
  if (!s) return '';
  return String(s).replace(/'/g, "''").substring(0, 10000);
}

function insertEpisode(ep) {
  const id = `ext-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const sql = `INSERT OR IGNORE INTO episodes (id, timestamp, type, summary, details, outcome, importance, tags, source) VALUES ('${id}', '${sqlEscape(ep.timestamp)}', '${sqlEscape(ep.type)}', '${sqlEscape(ep.summary)}', '${sqlEscape(ep.details || '')}', '${sqlEscape(ep.outcome || 'unknown')}', ${ep.importance || 5}, '${sqlEscape(JSON.stringify(ep.tags || []))}', 'session-extract');`;
  try { execSync(`sqlite3 "${DB_PATH}" "${sql}"`); } catch(e) {}
}

function insertFact(fact) {
  const sql = `INSERT OR IGNORE INTO facts (subject, predicate, object, confidence, source) VALUES ('${sqlEscape(fact.subject)}', '${sqlEscape(fact.predicate)}', '${sqlEscape(fact.object)}', ${fact.confidence || 0.8}, 'session-extract');`;
  try { execSync(`sqlite3 "${DB_PATH}" "${sql}"`); } catch(e) {}
}

function insertEntity(entity) {
  const sql = `INSERT OR IGNORE INTO entities (name, type, metadata) VALUES ('${sqlEscape(entity.name)}', '${sqlEscape(entity.type || 'concept')}', '${sqlEscape(JSON.stringify(entity.metadata || {}))}');`;
  try { execSync(`sqlite3 "${DB_PATH}" "${sql}"`); } catch(e) {}
}

// Export for sub-agents to read session content
for (const file of files) {
  const filepath = path.join(SESSIONS_DIR, file);
  const lines = fs.readFileSync(filepath, 'utf8').split('\n').filter(Boolean);
  
  // Extract user/assistant messages only (skip tool calls)
  const messages = [];
  for (const line of lines) {
    try {
      const msg = JSON.parse(line);
      if (msg.role === 'user' || msg.role === 'assistant') {
        const text = typeof msg.content === 'string' ? msg.content : 
          (Array.isArray(msg.content) ? msg.content.filter(c => c.type === 'text').map(c => c.text).join('\n') : '');
        if (text && text.length > 10 && !text.includes('HEARTBEAT_OK')) {
          messages.push({ role: msg.role, text: text.substring(0, 2000), ts: msg.timestamp });
        }
      }
    } catch(e) {}
  }
  
  // Write condensed transcript for LLM processing
  const outPath = path.join('/tmp/session-extracts', file.replace('.jsonl', '.txt'));
  fs.mkdirSync('/tmp/session-extracts', { recursive: true });
  const condensed = messages.map(m => `[${m.role}] ${m.text}`).join('\n---\n');
  fs.writeFileSync(outPath, condensed);
  console.log(`${file}: ${messages.length} messages → ${outPath}`);
}

console.log('Done extracting transcripts to /tmp/session-extracts/');
