#!/usr/bin/env node
/**
 * RAG search over treaty embeddings.
 * Usage: node search.js "query text" [topK]
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'embeddings.db');
const OLLAMA_URL = 'http://localhost:11434';
const MODEL = 'nomic-embed-text';

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

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function bufferToFloat32(buf) {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

async function search(query, topK = 5) {
  const db = new Database(DB_PATH, { readonly: true });
  const queryEmb = await embed(query);
  
  const rows = db.prepare('SELECT id, country, text, embedding, metadata FROM chunks WHERE embedding IS NOT NULL').all();
  
  const scored = rows.map(row => {
    const emb = bufferToFloat32(row.embedding);
    const score = cosineSimilarity(queryEmb, emb);
    return { ...row, score, embedding: undefined };
  });
  
  scored.sort((a, b) => b.score - a.score);
  db.close();
  
  return scored.slice(0, topK);
}

async function main() {
  const query = process.argv[2];
  const topK = parseInt(process.argv[3]) || 5;
  
  if (!query) {
    console.log('Usage: node search.js "query" [topK]');
    process.exit(1);
  }
  
  console.log(`Searching for: "${query}" (top ${topK})\n`);
  const results = await search(query, topK);
  
  for (const r of results) {
    const meta = JSON.parse(r.metadata || '{}');
    console.log(`--- [${r.country}] score: ${r.score.toFixed(4)} ---`);
    console.log(`  ${meta.decreto || ''}`);
    console.log(`  ${r.text.substring(0, 200)}...`);
    console.log();
  }
}

// Export for use as module
module.exports = { search };

if (require.main === module) main().catch(console.error);
