#!/usr/bin/env node
/**
 * Graph Sync Daemon
 * 
 * Watches OpenClaw session JSONL files for new messages and:
 * 1. Extracts entities/relations/facts via local LLM
 * 2. Generates embeddings via nomic-embed-text
 * 3. Stores everything in unified.db
 * 
 * Runs as a PM2 process, polls every 10 seconds.
 * Extraction happens asynchronously — never blocks conversation.
 * 
 * Usage: node graph-sync-daemon.js [--once] [--backfill N]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { processMessage, getDb, ensureSchema } = require('./nlp-graph-layer');

const SESSIONS_DIR = path.join(process.env.HOME, '.openclaw/agents/main/sessions');
const ISOLATED_SESSIONS_DIR = path.join(process.env.HOME, '.openclaw/agents');
const DOCS_DIRS = [
  path.join(__dirname, '../../deliverables'),
  path.join(__dirname, '../../design'),
  path.join(__dirname, '../../design-v2'),
  path.join(__dirname, '../../internal-docs'),
  path.join(__dirname, '../../memory'),
  path.join(__dirname, '../../vdr'),
  path.join(process.env.HOME, 'chimera/memory'),
  path.join(process.env.HOME, 'chimera/memory/summaries'),
];
const STATE_FILE = path.join(__dirname, '../../memory/graph-sync-state.json');
const POLL_INTERVAL = 10000; // 10 seconds
const IDLE_POLL_INTERVAL = 60000; // 60 seconds when idle
const IDLE_THRESHOLD = 120000; // 2 min no new messages = idle
const MIN_MESSAGE_LENGTH = 30; // Skip short messages

// Messages to skip
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
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { sessions: {}, totalProcessed: 0, lastRun: null };
  }
}

function saveState(state) {
  state.lastRun = new Date().toISOString();
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getAllSessions() {
  const sessions = [];
  
  // Main sessions
  try {
    const files = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({
        name: f,
        path: path.join(SESSIONS_DIR, f),
        mtime: fs.statSync(path.join(SESSIONS_DIR, f)).mtimeMs,
        source: 'main'
      }));
    sessions.push(...files);
  } catch { /* no main sessions */ }
  
  // Sub-agent / isolated sessions
  try {
    const agentDirs = fs.readdirSync(ISOLATED_SESSIONS_DIR);
    for (const agent of agentDirs) {
      if (agent === 'main') continue;
      const sessDir = path.join(ISOLATED_SESSIONS_DIR, agent, 'sessions');
      try {
        const files = fs.readdirSync(sessDir)
          .filter(f => f.endsWith('.jsonl'))
          .map(f => ({
            name: `${agent}/${f}`,
            path: path.join(sessDir, f),
            mtime: fs.statSync(path.join(sessDir, f)).mtimeMs,
            source: `agent:${agent}`
          }));
        sessions.push(...files);
      } catch { /* no sessions for this agent */ }
    }
  } catch { /* no isolated sessions */ }
  
  return sessions.sort((a, b) => b.mtime - a.mtime);
}

function getLatestSession() {
  const sessions = getAllSessions();
  return sessions[0] || null;
}

function parseSessionMessages(filePath, startLine = 0) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  const messages = [];
  
  for (let i = startLine; i < lines.length; i++) {
    try {
      const entry = JSON.parse(lines[i]);
      // Only process user and assistant text messages
      if (entry.type !== 'message') continue;
      const role = entry.message?.role;
      if (role !== 'user' && role !== 'assistant') continue;
      
      // Get text content
      let text = '';
      const content = entry.message?.content;
      if (typeof content === 'string') {
        text = content;
      } else if (Array.isArray(content)) {
        text = content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('\n');
      }
      
      if (!text || text.length < MIN_MESSAGE_LENGTH) continue;
      
      // Check skip patterns
      if (SKIP_PATTERNS.some(p => p.test(text))) continue;
      
      messages.push({
        line: i,
        role,
        text: text.slice(0, 4000), // Limit for extraction
        id: `${path.basename(filePath)}-L${i}`
      });
    } catch { /* skip malformed lines */ }
  }
  
  return messages;
}

// processNewMessages replaced by processAllSessions + processDocuments

// ── DOCUMENT INGESTION ──────────────────────────────────

async function processDocuments() {
  const state = loadState();
  if (!state.docs) state.docs = {};
  let processed = 0;

  function findMdFiles(dir, maxDepth = 3, depth = 0) {
    if (depth > maxDepth || !fs.existsSync(dir)) return [];
    let results = [];
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          results.push(...findMdFiles(full, maxDepth, depth + 1));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          results.push(full);
        }
      }
    } catch { /* permission error etc */ }
    return results;
  }

  for (const dir of DOCS_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const allFiles = findMdFiles(dir);
    const files = allFiles.map(f => path.relative(dir, f));
    
    for (const file of allFiles) {
      const filePath = file;
      const stat = fs.statSync(filePath);
      const key = filePath;
      const lastMtime = state.docs[key] || 0;
      
      // Skip if not modified since last process
      if (stat.mtimeMs <= lastMtime) continue;
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.length < 50) continue;
        
        // Split into chunks of ~2000 chars for extraction
        const chunks = [];
        const lines = content.split('\n');
        let chunk = '';
        for (const line of lines) {
          if (chunk.length + line.length > 2000 && chunk.length > 200) {
            chunks.push(chunk);
            chunk = '';
          }
          chunk += line + '\n';
        }
        if (chunk.length > 50) chunks.push(chunk);
        
        for (let i = 0; i < chunks.length; i++) {
          const msgId = `doc:${path.basename(file)}:chunk${i}`;
          await processMessage(chunks[i], 'document', msgId);
          processed++;
        }
        
        state.docs[key] = stat.mtimeMs;
        saveState(state);
        console.log(`[graph-sync] Doc: ${path.basename(file)} → ${chunks.length} chunks processed`);
      } catch (e) {
        console.error(`[graph-sync] Doc error ${file}:`, e.message);
      }
    }
  }
  
  if (processed > 0) console.log(`[graph-sync] Documents: ${processed} chunks processed`);
  return processed;
}

// ── MULTI-SESSION PROCESSING ────────────────────────────

async function processAllSessions(once = false, backfill = 0) {
  const sessions = getAllSessions();
  let totalNew = 0;
  
  for (const session of sessions) {
    const state = loadState();
    const sessionId = session.name;
    const lastLine = state.sessions[sessionId] || 0;
    
    // Skip sessions with no new data (check mtime vs last processed time)
    if (!once && !backfill) {
      const lastProcessedTime = state.sessionMtimes?.[sessionId] || 0;
      if (session.mtime <= lastProcessedTime) continue;
    }
    
    const startLine = backfill > 0 ? Math.max(0, lastLine - backfill) : lastLine;
    const messages = parseSessionMessages(session.path, startLine);
    
    if (messages.length === 0) {
      // Update mtime even if no new messages
      if (!state.sessionMtimes) state.sessionMtimes = {};
      state.sessionMtimes[sessionId] = session.mtime;
      saveState(state);
      continue;
    }
    
    console.log(`[graph-sync] ${session.source}: ${messages.length} new messages from ${sessionId}`);
    totalNew += messages.length;
    
    for (const msg of messages) {
      try {
        const result = await processMessage(msg.text, msg.role, msg.id);
        state.sessions[sessionId] = msg.line + 1;
        state.totalProcessed = (state.totalProcessed || 0) + 1;
        if (!state.sessionMtimes) state.sessionMtimes = {};
        state.sessionMtimes[sessionId] = session.mtime;
        saveState(state);
      } catch (e) {
        console.error(`[graph-sync] Error ${sessionId} L${msg.line}:`, e.message);
        state.sessions[sessionId] = msg.line + 1;
        saveState(state);
      }
    }
  }
  
  return totalNew;
}

// ── IDLE-AWARE DAEMON ───────────────────────────────────

let lastActivity = Date.now();
let isProcessing = false;

async function tick(once, backfill) {
  if (isProcessing) return; // Prevent overlapping runs
  isProcessing = true;
  
  try {
    const msgCount = await processAllSessions(once, backfill);
    
    if (msgCount > 0) {
      lastActivity = Date.now();
    }
    
    // Process documents periodically (every 10 minutes worth of ticks, or if idle)
    const state = loadState();
    const lastDocRun = state.lastDocRun || 0;
    const docInterval = 600000; // 10 minutes
    if (Date.now() - lastDocRun > docInterval) {
      await processDocuments();
      state.lastDocRun = Date.now();
      saveState(state);
    }
  } catch (e) {
    console.error('[graph-sync] Tick error:', e.message);
  } finally {
    isProcessing = false;
  }
}

// ── MAIN ────────────────────────────────────────────────

const args = process.argv.slice(2);
const once = args.includes('--once');
const backfillIdx = args.indexOf('--backfill');
const backfill = backfillIdx >= 0 ? parseInt(args[backfillIdx + 1]) || 50 : 0;

if (once) {
  (async () => {
    await processAllSessions(true, backfill);
    await processDocuments();
  })().catch(e => { console.error('[graph-sync] Fatal:', e); process.exit(1); });
} else {
  console.log('[graph-sync] Daemon started (idle-aware)');
  console.log(`  Active poll: ${POLL_INTERVAL / 1000}s | Idle poll: ${IDLE_POLL_INTERVAL / 1000}s | Idle after: ${IDLE_THRESHOLD / 1000}s`);
  console.log(`  Sources: main sessions + sub-agents + ${DOCS_DIRS.length} doc dirs`);
  
  // Initial run
  tick(false, backfill);
  
  // Adaptive polling: fast when active, slow when idle
  function schedule() {
    const isIdle = (Date.now() - lastActivity) > IDLE_THRESHOLD;
    const interval = isIdle ? IDLE_POLL_INTERVAL : POLL_INTERVAL;
    setTimeout(() => {
      tick(false, 0).then(schedule);
    }, interval);
  }
  
  // Start polling after initial tick settles
  setTimeout(schedule, POLL_INTERVAL);
}
