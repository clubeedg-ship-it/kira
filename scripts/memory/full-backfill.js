#!/usr/bin/env node
/**
 * Full Historical Backfill
 * 
 * Processes ALL past sessions and documents into the knowledge graph.
 * Run once, then the daemon keeps everything current.
 * 
 * Usage: node full-backfill.js [--sessions-only] [--docs-only]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { processMessage, getDb, ensureSchema } = require('./nlp-graph-layer');

const SESSIONS_DIR = path.join(process.env.HOME, '.openclaw/agents/main/sessions');
const STATE_FILE = path.join(__dirname, '../../memory/graph-sync-state.json');

const SKIP_PATTERNS = [
  /^HEARTBEAT_OK$/,
  /^NO_REPLY$/,
  /^Read HEARTBEAT/,
  /^\[worklog\]/,
  /^System:/,
  /^⚠️/,
  /^MEDIA:/,
];

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { sessions: {}, totalProcessed: 0, lastRun: null }; }
}

function saveState(state) {
  state.lastRun = new Date().toISOString();
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function parseSessionMessages(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  const messages = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.type !== 'message') continue;
      const role = entry.message?.role;
      if (role !== 'user' && role !== 'assistant') continue;
      let text = '';
      const content = entry.message?.content;
      if (typeof content === 'string') text = content;
      else if (Array.isArray(content)) text = content.filter(c => c.type === 'text').map(c => c.text).join('\n');
      if (!text || text.length < 30) continue;
      if (SKIP_PATTERNS.some(p => p.test(text))) continue;
      messages.push({ line: i, role, text: text.slice(0, 4000), id: `${path.basename(filePath)}-L${i}` });
    } catch { /* skip */ }
  }
  return messages;
}

async function backfillSessions() {
  const state = loadState();
  const files = fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({ name: f, path: path.join(SESSIONS_DIR, f), size: fs.statSync(path.join(SESSIONS_DIR, f)).size }))
    .sort((a, b) => a.size - b.size); // Process smallest first for quick wins

  console.log(`[backfill] Found ${files.length} sessions`);
  
  let totalMessages = 0, totalProcessed = 0;
  let totalE = 0, totalR = 0, totalF = 0;

  for (let si = 0; si < files.length; si++) {
    const session = files[si];
    const lastLine = state.sessions[session.name] || 0;
    
    // Skip already-processed sessions
    if (lastLine > 0) {
      const lineCount = fs.readFileSync(session.path, 'utf8').split('\n').length;
      if (lastLine >= lineCount - 5) { // within 5 lines = done
        continue;
      }
    }
    
    const messages = parseSessionMessages(session.path);
    const unprocessed = messages.filter(m => m.line >= lastLine);
    
    if (unprocessed.length === 0) {
      state.sessions[session.name] = messages.length > 0 ? messages[messages.length - 1].line + 1 : 0;
      saveState(state);
      continue;
    }
    
    totalMessages += unprocessed.length;
    console.log(`[backfill] Session ${si + 1}/${files.length}: ${session.name.slice(0, 8)}... (${unprocessed.length} messages, ${(session.size / 1024).toFixed(0)}KB)`);
    
    for (const msg of unprocessed) {
      try {
        const result = await processMessage(msg.text, msg.role, msg.id);
        totalProcessed++;
        totalE += result.stored.entities;
        totalR += result.stored.relations;
        totalF += result.stored.facts;
        
        state.sessions[session.name] = msg.line + 1;
        state.totalProcessed = (state.totalProcessed || 0) + 1;
        
        // Save state every 10 messages
        if (totalProcessed % 10 === 0) {
          saveState(state);
          console.log(`[backfill] Progress: ${totalProcessed} messages → ${totalE}E/${totalR}R/${totalF}F`);
        }
      } catch (e) {
        console.error(`[backfill] Error:`, e.message);
        state.sessions[session.name] = msg.line + 1;
      }
    }
    
    saveState(state);
  }
  
  console.log(`\n[backfill] SESSIONS COMPLETE`);
  console.log(`  Processed: ${totalProcessed}/${totalMessages} messages`);
  console.log(`  Extracted: ${totalE} entities, ${totalR} relations, ${totalF} facts`);
}

async function main() {
  const args = process.argv.slice(2);
  const sessionsOnly = args.includes('--sessions-only');
  const docsOnly = args.includes('--docs-only');
  
  const db = getDb();
  ensureSchema(db);
  const before = {
    e: db.prepare('SELECT COUNT(*) as c FROM entities').get().c,
    r: db.prepare('SELECT COUNT(*) as c FROM relations').get().c,
    f: db.prepare('SELECT COUNT(*) as c FROM facts').get().c,
    em: db.prepare('SELECT COUNT(*) as c FROM embeddings').get().c,
  };
  db.close();
  
  console.log(`[backfill] Starting full historical backfill`);
  console.log(`[backfill] Before: ${before.e}E / ${before.r}R / ${before.f}F / ${before.em} embeddings`);
  console.log(`[backfill] Started: ${new Date().toISOString()}\n`);
  
  if (!docsOnly) await backfillSessions();
  
  const db2 = getDb();
  const after = {
    e: db2.prepare('SELECT COUNT(*) as c FROM entities').get().c,
    r: db2.prepare('SELECT COUNT(*) as c FROM relations').get().c,
    f: db2.prepare('SELECT COUNT(*) as c FROM facts').get().c,
    em: db2.prepare('SELECT COUNT(*) as c FROM embeddings').get().c,
  };
  db2.close();
  
  console.log(`\n[backfill] DONE`);
  console.log(`  Before: ${before.e}E / ${before.r}R / ${before.f}F / ${before.em}emb`);
  console.log(`  After:  ${after.e}E / ${after.r}R / ${after.f}F / ${after.em}emb`);
  console.log(`  New:    +${after.e - before.e}E / +${after.r - before.r}R / +${after.f - before.f}F / +${after.em - before.em}emb`);
}

main().catch(e => { console.error('[backfill] Fatal:', e); process.exit(1); });
