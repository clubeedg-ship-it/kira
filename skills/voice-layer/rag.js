/**
 * RAG Module - Query memory graph for context
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.MEMORY_DB || path.join(process.env.HOME, 'chimera/memory/graph.db');

let db = null;

export function initRAG() {
  if (!db) {
    try {
      db = new Database(DB_PATH, { readonly: true });
    } catch (e) {
      console.error('RAG: Could not open memory database:', e.message);
      return false;
    }
  }
  return true;
}

export function queryMemory(topic) {
  if (!db && !initRAG()) return { facts: [], decisions: [], preferences: [] };
  
  const keywords = topic.toLowerCase().split(/\s+/).filter(k => k.length > 2);
  const results = { facts: [], decisions: [], preferences: [], summaries: [] };
  
  // Search facts
  for (const kw of keywords) {
    try {
      const facts = db.prepare(`
        SELECT e.name as subject, f.predicate, f.object
        FROM facts f
        LEFT JOIN entities e ON f.subject_id = e.id
        WHERE LOWER(e.name) LIKE ? OR LOWER(f.object) LIKE ? OR LOWER(f.predicate) LIKE ?
        LIMIT 10
      `).all(`%${kw}%`, `%${kw}%`, `%${kw}%`);
      results.facts.push(...facts);
    } catch (e) {
      // Table might not exist
    }
  }
  
  // Search decisions
  for (const kw of keywords) {
    try {
      const decisions = db.prepare(`
        SELECT what, why, context, made_at
        FROM decisions
        WHERE LOWER(what) LIKE ? OR LOWER(context) LIKE ?
        ORDER BY made_at DESC
        LIMIT 5
      `).all(`%${kw}%`, `%${kw}%`);
      results.decisions.push(...decisions);
    } catch (e) {
      // Table might not exist
    }
  }
  
  // Get user preferences
  try {
    const prefs = db.prepare(`
      SELECT key, value, context
      FROM preferences
      LIMIT 20
    `).all();
    results.preferences = prefs;
  } catch (e) {
    // Table might not exist
  }
  
  // Search summaries
  for (const kw of keywords) {
    try {
      const summaries = db.prepare(`
        SELECT summary, created_at
        FROM summaries
        WHERE LOWER(summary) LIKE ?
        ORDER BY created_at DESC
        LIMIT 3
      `).all(`%${kw}%`);
      results.summaries.push(...summaries);
    } catch (e) {
      // Table might not exist
    }
  }
  
  // Deduplicate
  results.facts = [...new Map(results.facts.map(f => 
    [`${f.subject}-${f.predicate}-${f.object}`, f]
  )).values()];
  
  return results;
}

export function getRecentContext(days = 3) {
  if (!db && !initRAG()) return {};
  
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();
  
  const context = {};
  
  try {
    context.decisions = db.prepare(`
      SELECT what, why, context, made_at
      FROM decisions
      WHERE made_at > ?
      ORDER BY made_at DESC
      LIMIT 10
    `).all(cutoffStr);
  } catch (e) {
    context.decisions = [];
  }
  
  try {
    context.summaries = db.prepare(`
      SELECT summary, created_at
      FROM summaries
      WHERE created_at > ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(cutoffStr);
  } catch (e) {
    context.summaries = [];
  }
  
  return context;
}

export function formatRAGResults(results) {
  const lines = [];
  
  if (results.facts?.length > 0) {
    lines.push('**Facts:**');
    for (const f of results.facts.slice(0, 5)) {
      lines.push(`- ${f.subject || 'Unknown'} ${f.predicate} ${f.object}`);
    }
  }
  
  if (results.decisions?.length > 0) {
    lines.push('\n**Recent Decisions:**');
    for (const d of results.decisions.slice(0, 3)) {
      lines.push(`- ${d.what}${d.context ? ` (${d.context})` : ''}`);
    }
  }
  
  if (results.summaries?.length > 0) {
    lines.push('\n**Related Context:**');
    for (const s of results.summaries.slice(0, 2)) {
      lines.push(`- ${s.summary.slice(0, 200)}...`);
    }
  }
  
  return lines.join('\n');
}

export function closeRAG() {
  if (db) {
    db.close();
    db = null;
  }
}
