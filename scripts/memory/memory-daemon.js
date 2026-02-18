#!/usr/bin/env node
/**
 * Memory Daemon - LLM-powered memory extraction
 * 
 * Reads recent session logs, sends to GLM-4.7-Flash via Ollama,
 * extracts structured knowledge, and stores to all memory layers.
 * 
 * Run on heartbeat or as standalone:
 *   node memory-daemon.js
 *   node memory-daemon.js --force   # ignore checkpoint, reprocess last 50 messages
 * 
 * Requires: Ollama running with glm-4.7-flash:latest
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const episodes = require('./episodes');

const SESSION_DIR = path.join(process.env.HOME, '.clawdbot/agents/main/sessions');
const CHECKPOINT_FILE = path.join(process.env.HOME, 'clawd/memory/.daemon-checkpoint.json');
const GRAPH_DB = path.join(process.env.HOME, 'chimera/memory/graph.db');
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.DAEMON_MODEL || 'glm-4.7-flash:latest';
const BATCH_SIZE = 30; // messages per extraction batch

// ── Ollama Client ──────────────────────────────────────────────

function ollamaGenerate(prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 4096,
        ...options
      }
    });

    const url = new URL(OLLAMA_URL + '/api/generate');
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.response || '');
        } catch (e) {
          reject(new Error(`Failed to parse Ollama response: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Ollama timeout')); });
    req.write(payload);
    req.end();
  });
}

// ── Graph DB (direct SQLite via better-sqlite3 or fallback) ────

let db = null;

function openGraph() {
  try {
    // Use better-sqlite3 from chimera's node_modules
    const Database = require(path.join(process.env.HOME, 'chimera/node_modules/better-sqlite3'));
    db = new Database(GRAPH_DB);
    db.pragma('journal_mode = WAL');
    return true;
  } catch (e) {
    console.warn('⚠️  Could not open graph.db directly:', e.message);
    return false;
  }
}

function storeEntity(name, type) {
  if (!db) return null;
  const id = `ent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    // Check if exists
    const existing = db.prepare('SELECT id FROM entities WHERE name = ? AND type = ?').get(name, type);
    if (existing) return existing.id;
    
    db.prepare('INSERT INTO entities (id, name, type) VALUES (?, ?, ?)').run(id, name, type);
    return id;
  } catch (e) {
    // might be duplicate or schema issue
    try {
      const existing = db.prepare('SELECT id FROM entities WHERE name = ? AND type = ?').get(name, type);
      return existing?.id || null;
    } catch { return null; }
  }
}

function storeFact(subjectId, predicate, object, source) {
  if (!db || !subjectId) return;
  const factId = `fact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    // Check for duplicate
    const existing = db.prepare(
      'SELECT id FROM facts WHERE subject_id = ? AND predicate = ? AND object = ?'
    ).get(subjectId, predicate, object);
    if (existing) return;
    
    db.prepare(
      'INSERT INTO facts (id, subject_id, predicate, object, source, confidence) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(factId, subjectId, predicate, object, source || 'memory-daemon', 1.0);
  } catch (e) {
    // skip duplicates silently
  }
}

function closeGraph() {
  if (db) { try { db.close(); } catch {} }
}

// ── Session Log Reader ─────────────────────────────────────────

function getLatestSession() {
  const files = fs.readdirSync(SESSION_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .sort()
    .reverse();
  return files[0] ? path.join(SESSION_DIR, files[0]) : null;
}

function getAllSessions() {
  return fs.readdirSync(SESSION_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .sort()
    .map(f => path.join(SESSION_DIR, f));
}

function readMessages(sessionFile, fromLine = 0, limit = BATCH_SIZE) {
  const content = fs.readFileSync(sessionFile, 'utf8');
  const lines = content.trim().split('\n');
  const slice = lines.slice(fromLine, fromLine + limit);
  
  const messages = [];
  for (const line of slice) {
    try {
      const entry = JSON.parse(line);
      
      // OpenClaw session log format: {type: "message", message: {role, content}}
      const msg = entry.message || entry;
      const role = msg.role;
      const rawContent = msg.content;
      
      if (!role || !rawContent) continue;
      
      // Extract text from content (can be string or array of {type, text})
      let text;
      if (typeof rawContent === 'string') {
        text = rawContent;
      } else if (Array.isArray(rawContent)) {
        text = rawContent.map(c => c.text || '').join(' ').trim();
      } else {
        continue;
      }
      
      // Skip tool results and very short messages
      if (role === 'tool') continue;
      if (text.length < 10) continue;
      // Skip tool_use blocks from assistant
      if (role === 'assistant' && text.includes('"type":"tool_use"')) continue;
      
      // Truncate long messages
      const truncated = text.length > 2000 ? text.substring(0, 2000) + '...[truncated]' : text;
      
      messages.push({
        role,
        content: truncated,
        timestamp: entry.timestamp || msg.timestamp || null
      });
    } catch { /* skip malformed */ }
  }
  
  return { messages, linesRead: fromLine + slice.length, totalLines: lines.length };
}

// ── Checkpoint ─────────────────────────────────────────────────

function loadCheckpoint() {
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
  } catch {
    return { lastFile: null, lastLine: 0, lastRun: null };
  }
}

function saveCheckpoint(cp) {
  fs.mkdirSync(path.dirname(CHECKPOINT_FILE), { recursive: true });
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2));
}

// ── Extraction Prompt ──────────────────────────────────────────

function buildExtractionPrompt(messages) {
  const conversation = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
  
  return `Extract facts and events from this conversation. Return JSON only.

Conversation:
${conversation}

Rules:
- Only extract REAL information, do not invent
- Facts: specific info (names, numbers, URLs, dates, relationships)
- Episodes: significant events only (importance >= 5)
- Procedures: only if a reusable multi-step process was shown
- Empty array if nothing to extract for a section
- Normalize entity names (e.g. "ZenithCred" not "zenithcred")

Format:
\`\`\`json
{"facts":[{"entity":"Name","entity_type":"person|project|company|tool|concept","predicate":"verb","object":"value"}],"episodes":[{"type":"task|decision|learning|milestone|failure","summary":"what happened","importance":5,"tags":["keyword"]}],"procedures":[{"name":"action","trigger":"when","steps":["step1"]}]}
\`\`\``;
}

// ── Parse LLM Response ─────────────────────────────────────────

function parseExtraction(response) {
  // Try to find JSON in the response
  let jsonStr = response.trim();
  
  // Remove markdown code fences if present
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  
  // Try to find a JSON object
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (!match) {
    console.warn('⚠️  No JSON found in LLM response');
    return { episodes: [], facts: [], procedures: [] };
  }
  
  try {
    const parsed = JSON.parse(match[0]);
    return {
      episodes: Array.isArray(parsed.episodes) ? parsed.episodes : [],
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      procedures: Array.isArray(parsed.procedures) ? parsed.procedures : []
    };
  } catch (e) {
    console.warn('⚠️  Failed to parse JSON:', e.message);
    return { episodes: [], facts: [], procedures: [] };
  }
}

// ── Store Extracted Data ───────────────────────────────────────

function storeExtracted(data) {
  const stats = { episodes: 0, facts: 0, procedures: 0 };
  
  // Store episodes
  for (const ep of data.episodes) {
    if (ep.importance && ep.importance < 5) continue; // skip low importance
    try {
      episodes.log({
        type: ep.type || 'interaction',
        summary: ep.summary,
        outcome: ep.outcome || null,
        importance: ep.importance || 5,
        tags: ep.tags || []
      });
      stats.episodes++;
    } catch (e) {
      console.warn('  Episode store error:', e.message);
    }
  }
  
  // Store facts to graph
  for (const fact of data.facts) {
    if (!fact.entity || !fact.predicate || !fact.object) continue;
    const entityId = storeEntity(fact.entity, fact.entity_type || 'concept');
    if (entityId) {
      storeFact(entityId, fact.predicate, fact.object, 'memory-daemon');
      stats.facts++;
    }
  }
  
  // Store procedures
  if (data.procedures.length > 0) {
    try {
      const procedures = require('./procedures');
      for (const proc of data.procedures) {
        if (proc.name && proc.steps && proc.steps.length > 0) {
          procedures.save({
            name: proc.name,
            trigger: proc.trigger || '',
            steps: proc.steps,
            tags: [],
            source: 'memory-daemon'
          });
          stats.procedures++;
        }
      }
    } catch (e) {
      console.warn('  Procedure store error:', e.message);
    }
  }
  
  return stats;
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  const force = process.argv.includes('--force');
  const verbose = process.argv.includes('--verbose');
  
  console.log('🧠 Memory Daemon starting...');
  console.log(`   Model: ${MODEL}`);
  console.log(`   Ollama: ${OLLAMA_URL}`);
  
  // Open graph DB
  const graphOk = openGraph();
  if (!graphOk) {
    console.error('❌ Cannot open graph database. Continuing with episodes only.');
  }
  
  // Load checkpoint
  let checkpoint = loadCheckpoint();
  
  // Determine which sessions to process
  let sessionsToProcess = [];
  
  if (force) {
    // Process all sessions from scratch
    sessionsToProcess = getAllSessions().map(f => ({ file: f, startLine: 0 }));
    console.log(`   Force mode: processing ${sessionsToProcess.length} session files`);
  } else {
    // Normal mode: only process latest session from checkpoint
    const sessionFile = getLatestSession();
    if (!sessionFile) {
      console.log('No session files found. Exiting.');
      closeGraph();
      return;
    }
    
    // Check if we have unprocessed sessions
    const allSessions = getAllSessions();
    const processedFiles = checkpoint.processedFiles || {};
    
    for (const sf of allSessions) {
      const basename = path.basename(sf);
      const lastLine = processedFiles[basename] || 0;
      const content = fs.readFileSync(sf, 'utf8');
      const totalLines = content.trim().split('\n').length;
      
      if (lastLine < totalLines) {
        sessionsToProcess.push({ file: sf, startLine: lastLine });
      }
    }
    
    if (sessionsToProcess.length === 0) {
      console.log('   All sessions up to date.');
      closeGraph();
      console.log('\n✅ Memory Daemon complete (nothing to process)');
      console.log(JSON.stringify({ action: 'memory_daemon', batches: 0, episodes: 0, facts: 0, procedures: 0 }));
      return;
    }
    console.log(`   ${sessionsToProcess.length} session(s) have new content`);
  }
  
  // Read messages in batches across sessions
  let totalStats = { episodes: 0, facts: 0, procedures: 0 };
  let batchCount = 0;
  const maxBatchesPerRun = force ? 50 : 3;
  const processedFiles = checkpoint.processedFiles || {};
  
  for (const { file: sessionFile, startLine } of sessionsToProcess) {
    if (batchCount >= maxBatchesPerRun) {
      console.log('\n⏸  Max batches reached, will continue next run');
      break;
    }
    
    console.log(`\n📂 Session: ${path.basename(sessionFile)}`);
    let currentLine = startLine;
    
    while (batchCount < maxBatchesPerRun) {
      const { messages, linesRead, totalLines } = readMessages(sessionFile, currentLine, BATCH_SIZE);
      
      if (messages.length < 3) {
        currentLine = linesRead;
        break;
      }
      
      batchCount++;
      console.log(`\n📦 Batch ${batchCount}: ${messages.length} messages (lines ${currentLine}-${linesRead})`);
      
      const prompt = buildExtractionPrompt(messages);
      
      if (verbose) {
        console.log('   Prompt length:', prompt.length, 'chars');
      }
      
      try {
        console.log('   🤖 Calling GLM-4.7-Flash...');
        const response = await ollamaGenerate(prompt);
        
        if (verbose) {
          console.log('   Response:', response.substring(0, 500));
        }
        
        const extracted = parseExtraction(response);
        console.log(`   Extracted: ${extracted.episodes.length} episodes, ${extracted.facts.length} facts, ${extracted.procedures.length} procedures`);
        
        const batchStats = storeExtracted(extracted);
        totalStats.episodes += batchStats.episodes;
        totalStats.facts += batchStats.facts;
        totalStats.procedures += batchStats.procedures;
        
        console.log(`   Stored: ${batchStats.episodes} episodes, ${batchStats.facts} facts, ${batchStats.procedures} procedures`);
        
      } catch (e) {
        console.error(`   ❌ LLM error: ${e.message}`);
        break;
      }
      
      currentLine = linesRead;
    }
    
    processedFiles[path.basename(sessionFile)] = currentLine;
  }
  
  // Save checkpoint
  saveCheckpoint({
    lastFile: sessionsToProcess[sessionsToProcess.length - 1]?.file || null,
    lastLine: 0, // deprecated, using processedFiles now
    processedFiles,
    lastRun: new Date().toISOString()
  });
  
  // Summary
  closeGraph();
  console.log(`\n✅ Memory Daemon complete`);
  console.log(`   Batches processed: ${batchCount}`);
  console.log(`   Episodes stored: ${totalStats.episodes}`);
  console.log(`   Facts stored: ${totalStats.facts}`);
  console.log(`   Procedures stored: ${totalStats.procedures}`);
  console.log(`   Sessions processed: ${Object.keys(processedFiles).length}`);
  
  // Output JSON for integration with memory-manager
  const result = {
    action: 'memory_daemon',
    batches: batchCount,
    ...totalStats,
    processedFiles
  };
  console.log('\n' + JSON.stringify(result));
}

main().catch(e => {
  console.error('❌ Memory Daemon fatal error:', e);
  closeGraph();
  process.exit(1);
});
