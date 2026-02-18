#!/usr/bin/env node
/**
 * Embeds treaty corpus into chunks with nomic-embed-text via Ollama.
 * Stores embeddings in a SQLite database for RAG retrieval.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const CORPUS_DIR = path.join(__dirname, '..', 'corpus', 'treaties-text');
const DB_PATH = path.join(__dirname, '..', 'data', 'embeddings.db');
const OLLAMA_URL = 'http://localhost:11434';
const MODEL = 'nomic-embed-text';
const CHUNK_SIZE = 800; // chars per chunk
const CHUNK_OVERLAP = 200;

// Ensure data dir exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

function initDB() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country TEXT NOT NULL,
      source_file TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      embedding BLOB,
      metadata TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_country ON chunks(country);
  `);
  return db;
}

function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  // Split by paragraphs first, then combine
  const paragraphs = text.split(/\n\n+/);
  let current = '';
  
  for (const para of paragraphs) {
    if (current.length + para.length > size && current.length > 0) {
      chunks.push(current.trim());
      // Keep overlap
      const words = current.split(/\s+/);
      const overlapWords = Math.ceil(overlap / 5); // rough word count
      current = words.slice(-overlapWords).join(' ') + '\n\n' + para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function embed(text) {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input: text })
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  return data.embeddings[0];
}

function float32ToBuffer(arr) {
  return Buffer.from(new Float32Array(arr).buffer);
}

async function main() {
  const db = initDB();
  
  // Get already processed countries
  const existing = new Set(db.prepare('SELECT DISTINCT country FROM chunks').all().map(r => r.country));
  
  const files = fs.readdirSync(CORPUS_DIR).filter(f => f.endsWith('.md'));
  console.log(`Processing ${files.length} treaty files...`);
  
  const insert = db.prepare(`
    INSERT INTO chunks (country, source_file, chunk_index, text, embedding, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  let totalChunks = 0;
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(CORPUS_DIR, file), 'utf-8');
    const country = file.replace('.md', '');
    if (existing.has(country)) { console.log(`  ${country}: SKIP (already embedded)`); continue; }
    
    // Extract frontmatter metadata
    let metadata = {};
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
      for (const line of fmMatch[1].split('\n')) {
        const [k, ...v] = line.split(':');
        if (k && v.length) metadata[k.trim()] = v.join(':').trim().replace(/^["']|["']$/g, '');
      }
    }
    
    // Remove frontmatter for chunking
    const body = content.replace(/^---[\s\S]*?---\n*/, '');
    const chunks = chunkText(body);
    
    console.log(`  ${country}: ${chunks.length} chunks`);
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        const emb = await embed(chunks[i]);
        insert.run(
          country,
          file,
          i,
          chunks[i],
          float32ToBuffer(emb),
          JSON.stringify(metadata)
        );
        totalChunks++;
      } catch (e) {
        console.error(`  ERROR embedding chunk ${i} of ${country}: ${e.message}`);
      }
    }
  }
  
  console.log(`\nDone! ${totalChunks} chunks embedded across ${files.length} files.`);
  db.close();
}

main().catch(console.error);
