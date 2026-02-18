#!/usr/bin/env node
/**
 * Episodic Memory - What Happened
 * 
 * Logs interactions with temporal context, importance scoring,
 * and searchable metadata.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EPISODES_DIR = path.join(process.env.HOME, 'clawd/memory/episodes');

// Ensure directory exists
if (!fs.existsSync(EPISODES_DIR)) {
  fs.mkdirSync(EPISODES_DIR, { recursive: true });
}

/**
 * Get today's episode file
 */
function getTodayFile() {
  const date = new Date().toISOString().split('T')[0];
  return path.join(EPISODES_DIR, `${date}.jsonl`);
}

/**
 * Log an episode
 */
function log(episode) {
  const record = {
    id: `ep-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    type: episode.type || 'interaction', // interaction, task, decision, learning, error
    participants: episode.participants || ['kira', 'otto'],
    summary: episode.summary,
    details: episode.details || null,
    outcome: episode.outcome || null, // success, failure, partial, pending
    importance: episode.importance || 5, // 1-10 scale
    tags: episode.tags || [],
    linkedFacts: episode.linkedFacts || [],
    linkedProcedures: episode.linkedProcedures || []
  };
  
  fs.appendFileSync(getTodayFile(), JSON.stringify(record) + '\n');
  return record.id;
}

/**
 * Search episodes across all days
 */
function search(query = {}) {
  const files = fs.readdirSync(EPISODES_DIR).filter(f => f.endsWith('.jsonl')).sort().reverse();
  let results = [];
  
  const limit = query.limit || 50;
  const minImportance = query.minImportance || 0;
  
  for (const file of files) {
    if (results.length >= limit) break;
    
    const lines = fs.readFileSync(path.join(EPISODES_DIR, file), 'utf8')
      .trim().split('\n').filter(Boolean);
    
    for (const line of lines.reverse()) {
      if (results.length >= limit) break;
      
      const ep = JSON.parse(line);
      
      if (ep.importance < minImportance) continue;
      if (query.type && ep.type !== query.type) continue;
      if (query.outcome && ep.outcome !== query.outcome) continue;
      if (query.tag && !ep.tags.includes(query.tag)) continue;
      if (query.text && !ep.summary.toLowerCase().includes(query.text.toLowerCase())) continue;
      if (query.since && new Date(ep.timestamp) < new Date(query.since)) continue;
      
      results.push(ep);
    }
  }
  
  return results;
}

/**
 * Get high-importance episodes for memory consolidation
 */
function getImportant(days = 7, minImportance = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return search({ since, minImportance, limit: 100 });
}

/**
 * Extract learnings from episodes
 */
function extractLearnings() {
  const successes = search({ outcome: 'success', limit: 20 });
  const failures = search({ outcome: 'failure', limit: 20 });
  
  return {
    patterns: {
      successful: successes.map(e => ({ summary: e.summary, tags: e.tags })),
      failed: failures.map(e => ({ summary: e.summary, tags: e.tags }))
    },
    recommendation: "Review failed patterns to avoid, reinforce successful patterns"
  };
}

/**
 * Summary stats
 */
function summary() {
  const files = fs.readdirSync(EPISODES_DIR).filter(f => f.endsWith('.jsonl'));
  let total = 0;
  let byType = {};
  let byOutcome = {};
  
  for (const file of files) {
    const lines = fs.readFileSync(path.join(EPISODES_DIR, file), 'utf8')
      .trim().split('\n').filter(Boolean);
    
    total += lines.length;
    lines.forEach(l => {
      const ep = JSON.parse(l);
      byType[ep.type] = (byType[ep.type] || 0) + 1;
      if (ep.outcome) byOutcome[ep.outcome] = (byOutcome[ep.outcome] || 0) + 1;
    });
  }
  
  return { total, days: files.length, byType, byOutcome };
}

// CLI interface
const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === 'log') {
  const type = args[1] || 'interaction';
  const summary = args[2] || 'No summary';
  const importance = parseInt(args[3]) || 5;
  const id = log({ type, summary, importance });
  console.log('Logged:', id);
} else if (cmd === 'search') {
  const filter = args[1] ? JSON.parse(args[1]) : { limit: 10 };
  console.log(JSON.stringify(search(filter), null, 2));
} else if (cmd === 'important') {
  console.log(JSON.stringify(getImportant(), null, 2));
} else if (cmd === 'learnings') {
  console.log(JSON.stringify(extractLearnings(), null, 2));
} else if (cmd === 'summary') {
  console.log(JSON.stringify(summary(), null, 2));
} else {
  console.log('Usage: episodes.js [log|search|important|learnings|summary]');
}

module.exports = { log, search, getImportant, extractLearnings, summary };
