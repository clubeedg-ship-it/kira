#!/usr/bin/env node
/**
 * Embeddings & Vector Search
 * 
 * Generates embeddings for memory entries and enables semantic search.
 * Uses local models when 4090 is available, falls back to API otherwise.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EMBEDDINGS_DB = path.join(process.env.HOME, 'clawd/memory/embeddings.json');
const EPISODES_DIR = path.join(process.env.HOME, 'clawd/memory/episodes');

// Simple embedding cache
let embeddingsCache = {};

function loadCache() {
  if (fs.existsSync(EMBEDDINGS_DB)) {
    embeddingsCache = JSON.parse(fs.readFileSync(EMBEDDINGS_DB, 'utf8'));
  }
}

function saveCache() {
  fs.writeFileSync(EMBEDDINGS_DB, JSON.stringify(embeddingsCache, null, 2));
}

/**
 * Generate embedding using Ollama (local) or fallback to simple hash
 */
async function embed(text) {
  const hash = simpleHash(text);
  if (embeddingsCache[hash]) return embeddingsCache[hash];
  
  try {
    // Try Ollama first (local, fast if available)
    const result = execSync(
      `curl -s http://localhost:11434/api/embeddings -d '${JSON.stringify({
        model: "nomic-embed-text",
        prompt: text.slice(0, 2000)
      })}'`,
      { encoding: 'utf8', timeout: 10000 }
    );
    const parsed = JSON.parse(result);
    if (parsed.embedding) {
      embeddingsCache[hash] = { text: text.slice(0, 200), vector: parsed.embedding };
      saveCache();
      return embeddingsCache[hash];
    }
  } catch (e) {
    // Fallback: simple bag-of-words vector (works without GPU)
  }
  
  // Fallback: TF-IDF-like simple vector
  const vector = simpleBOW(text);
  embeddingsCache[hash] = { text: text.slice(0, 200), vector };
  saveCache();
  return embeddingsCache[hash];
}

/**
 * Simple hash for cache key
 */
function simpleHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Simple bag-of-words vector (fallback when no embedding model)
 */
function simpleBOW(text) {
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const vector = new Array(256).fill(0);
  words.forEach(word => {
    const idx = Math.abs(simpleHash(word)) % 256;
    vector[idx] += 1;
  });
  // Normalize
  const mag = Math.sqrt(vector.reduce((s, v) => s + v*v, 0)) || 1;
  return vector.map(v => v / mag);
}

/**
 * Cosine similarity
 */
function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

/**
 * Search embeddings for similar content
 */
async function search(query, limit = 10) {
  loadCache();
  const queryEmbed = await embed(query);
  
  const results = Object.entries(embeddingsCache)
    .map(([hash, entry]) => ({
      text: entry.text,
      score: cosineSim(queryEmbed.vector, entry.vector)
    }))
    .filter(r => r.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return results;
}

/**
 * Index all episodes
 */
async function indexEpisodes() {
  loadCache();
  
  if (!fs.existsSync(EPISODES_DIR)) return { indexed: 0 };
  
  const files = fs.readdirSync(EPISODES_DIR).filter(f => f.endsWith('.jsonl'));
  let indexed = 0;
  
  for (const file of files) {
    const lines = fs.readFileSync(path.join(EPISODES_DIR, file), 'utf8')
      .trim().split('\n').filter(Boolean);
    
    for (const line of lines) {
      try {
        const ep = JSON.parse(line);
        if (ep.summary && ep.summary !== 'No summary') {
          await embed(`${ep.summary} ${ep.tags?.join(' ') || ''}`);
          indexed++;
        }
      } catch (e) {}
    }
  }
  
  saveCache();
  return { indexed, total: Object.keys(embeddingsCache).length };
}

/**
 * Check if Ollama is available
 */
function checkOllama() {
  try {
    const result = execSync('curl -s http://localhost:11434/api/tags', { 
      encoding: 'utf8', 
      timeout: 2000 
    });
    const models = JSON.parse(result);
    return { available: true, models: models.models?.map(m => m.name) || [] };
  } catch (e) {
    return { available: false, models: [] };
  }
}

// CLI
const args = process.argv.slice(2);
const cmd = args[0];

loadCache();

if (cmd === 'embed') {
  embed(args[1] || 'test').then(r => console.log(JSON.stringify(r, null, 2)));
} else if (cmd === 'search') {
  search(args[1] || 'test', parseInt(args[2]) || 10)
    .then(r => console.log(JSON.stringify(r, null, 2)));
} else if (cmd === 'index') {
  indexEpisodes().then(r => console.log(JSON.stringify(r, null, 2)));
} else if (cmd === 'check') {
  console.log(JSON.stringify(checkOllama(), null, 2));
} else if (cmd === 'status') {
  console.log(JSON.stringify({
    cached: Object.keys(embeddingsCache).length,
    ollama: checkOllama()
  }, null, 2));
} else {
  console.log('Usage: embeddings.js [embed|search|index|check|status]');
}

module.exports = { embed, search, indexEpisodes, checkOllama };
