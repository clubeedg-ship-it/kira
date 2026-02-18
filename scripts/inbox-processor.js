#!/usr/bin/env node
// Brain dump inbox processor
// 1. Store raw input (text, links, ideas) in unified.db inbox table
// 2. Immediately fetch URLs if present
// 3. Queue for batch LLM extraction (facts, entities, relations)

const Database = require('better-sqlite3');
const https = require('https');
const http = require('http');
const path = require('path');
const { execSync } = require('child_process');

const DB_PATH = path.join(__dirname, '..', 'memory', 'unified.db');

function store(content, type = 'text') {
  const db = new Database(DB_PATH);
  
  // Extract URLs
  const urlMatch = content.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g);
  const url = urlMatch ? urlMatch[0] : null;
  
  // Auto-detect type
  if (url && type === 'text') type = 'link';
  
  const stmt = db.prepare('INSERT INTO inbox (type, raw_content, url) VALUES (?, ?, ?)');
  const result = stmt.run(type, content, url);
  const id = result.lastInsertRowid;
  
  console.log(`[inbox] Stored #${id} (${type})${url ? ': ' + url : ''}`);
  
  // If URL, fetch content immediately (no LLM, just raw fetch)
  if (url) {
    try {
      const fetched = execSync(`curl -sL --max-time 15 "${url}" | head -c 50000`, { encoding: 'utf8', timeout: 20000 });
      // Strip HTML tags for basic readability
      const text = fetched.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                         .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                         .replace(/<[^>]+>/g, ' ')
                         .replace(/\s+/g, ' ')
                         .trim()
                         .substring(0, 20000);
      db.prepare('UPDATE inbox SET fetched_content = ? WHERE id = ?').run(text, id);
      console.log(`[inbox] Fetched ${text.length} chars from URL`);
    } catch (e) {
      console.error(`[inbox] Fetch failed: ${e.message}`);
    }
  }
  
  db.close();
  return id;
}

function processUnprocessed() {
  // Batch process unprocessed items using local LLM
  const db = new Database(DB_PATH);
  const items = db.prepare('SELECT * FROM inbox WHERE processed = 0 ORDER BY timestamp ASC LIMIT 10').all();
  
  if (items.length === 0) {
    console.log('[inbox] Nothing to process');
    db.close();
    return;
  }
  
  console.log(`[inbox] Processing ${items.length} items...`);
  
  for (const item of items) {
    const content = item.fetched_content || item.raw_content;
    const prompt = `Extract facts from this input. Return ONLY a JSON object with:
{"facts": [{"subject": "...", "predicate": "...", "object": "..."}], "tags": ["..."], "importance": 1-10, "summary": "one line"}

Input: ${content.substring(0, 4000)}`;

    try {
      const result = execSync(`curl -s http://localhost:11434/api/generate -d '${JSON.stringify({
        model: 'glm4:latest',
        prompt: prompt,
        stream: false,
        options: { temperature: 0.1, num_predict: 1000 }
      }).replace(/'/g, "'\\''")}'`, { encoding: 'utf8', timeout: 120000 });
      
      const response = JSON.parse(result);
      const text = response.response || '';
      
      // Try to parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        
        db.prepare('UPDATE inbox SET extracted_facts = ?, tags = ?, importance = ?, processed = 1 WHERE id = ?')
          .run(JSON.stringify(extracted.facts || []), JSON.stringify(extracted.tags || []), extracted.importance || 5, item.id);
        
        // Store facts in main facts table
        if (extracted.facts) {
          const insertFact = db.prepare('INSERT INTO facts (id, subject_id, predicate, object, source, confidence) VALUES (?, ?, ?, ?, ?, ?)');
          for (const fact of extracted.facts) {
            const factId = 'inbox-' + item.id + '-' + Math.random().toString(36).slice(2, 8);
            // Find or create subject entity
            let subjectId = db.prepare('SELECT id FROM entities WHERE name = ? COLLATE NOCASE').get(fact.subject)?.id;
            if (!subjectId) {
              subjectId = 'e-' + Math.random().toString(36).slice(2, 10);
              db.prepare('INSERT INTO entities (id, type, name, description) VALUES (?, ?, ?, ?)').run(subjectId, 'concept', fact.subject, '');
            }
            insertFact.run(factId, subjectId, fact.predicate, fact.object, 'inbox-' + item.id, 0.8);
          }
        }
        
        console.log(`[inbox] #${item.id}: ${extracted.facts?.length || 0} facts, importance=${extracted.importance}`);
      } else {
        db.prepare('UPDATE inbox SET processed = 1 WHERE id = ?').run(item.id);
        console.log(`[inbox] #${item.id}: No JSON extracted, marked done`);
      }
    } catch (e) {
      console.error(`[inbox] #${item.id} processing failed: ${e.message}`);
      // Don't mark as processed, will retry
    }
  }
  
  db.close();
}

function status() {
  const db = new Database(DB_PATH, { readonly: true });
  const total = db.prepare('SELECT COUNT(*) as c FROM inbox').get().c;
  const unprocessed = db.prepare('SELECT COUNT(*) as c FROM inbox WHERE processed = 0').get().c;
  const today = db.prepare("SELECT COUNT(*) as c FROM inbox WHERE timestamp >= date('now')").get().c;
  console.log(`Inbox: ${total} total, ${unprocessed} unprocessed, ${today} today`);
  
  const recent = db.prepare('SELECT id, type, substr(raw_content, 1, 80) as preview, processed, timestamp FROM inbox ORDER BY timestamp DESC LIMIT 5').all();
  recent.forEach(r => {
    console.log(`  #${r.id} [${r.type}] ${r.processed ? '✅' : '⬜'} ${r.preview}...`);
  });
  db.close();
}

const cmd = process.argv[2];
if (cmd === 'store') {
  const type = process.argv[3] || 'text';
  const content = process.argv.slice(4).join(' ');
  if (!content) { console.error('Usage: inbox-processor.js store [type] <content>'); process.exit(1); }
  store(content, type);
} else if (cmd === 'process') {
  processUnprocessed();
} else if (cmd === 'status') {
  status();
} else {
  console.log('Usage: inbox-processor.js [store|process|status]');
  console.log('  store [type] <content>  — Store new item (text/link/idea/research)');
  console.log('  process                 — Batch-extract facts from unprocessed items');
  console.log('  status                  — Show inbox stats');
}
