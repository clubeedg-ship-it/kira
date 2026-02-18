#!/usr/bin/env node
/**
 * Memory Core - Unified Memory Interface
 * 
 * Integrates all memory layers:
 * - Blackboard (multi-agent coordination)
 * - Episodes (what happened)
 * - Procedures (how to do things)
 * - Graph (semantic facts from ~/chimera/memory/graph.db)
 */

const path = require('path');
const blackboard = require('./blackboard');
const episodes = require('./episodes');
const procedures = require('./procedures');

// For graph queries, we use the existing chimera memory system
const GRAPH_DB = path.join(process.env.HOME, 'chimera/memory/graph.db');

/**
 * Log a significant event across all relevant memory layers
 */
function logEvent(event) {
  const results = {};
  
  // Log to episodes
  results.episode = episodes.log({
    type: event.type || 'interaction',
    summary: event.summary,
    details: event.details,
    outcome: event.outcome,
    importance: event.importance || 5,
    tags: event.tags || []
  });
  
  // Post to blackboard if it's a discovery or request
  if (event.type === 'discovery' || event.type === 'request') {
    results.blackboard = blackboard.post({
      type: event.type,
      topic: event.topic || 'general',
      content: event.summary,
      metadata: event.metadata
    });
  }
  
  // If task completed successfully, consider extracting procedure
  if (event.outcome === 'success' && event.procedure) {
    results.procedure = procedures.save(event.procedure);
  }
  
  return results;
}

/**
 * Query memory for relevant context
 */
function recall(query) {
  const results = {
    episodes: [],
    procedures: [],
    blackboard: [],
    facts: []
  };
  
  // Search episodes
  if (query.text || query.tags) {
    results.episodes = episodes.search({
      text: query.text,
      tag: query.tags?.[0],
      limit: query.limit || 10
    });
  }
  
  // Find relevant procedures
  if (query.task) {
    results.procedures = procedures.findBest(query.task, query.tags || []);
  }
  
  // Check blackboard for relevant posts
  if (query.topic) {
    results.blackboard = blackboard.query({
      topic: query.topic,
      unresolved: true,
      limit: 10
    });
  }
  
  return results;
}

/**
 * Get memory status
 */
function status() {
  return {
    episodes: episodes.summary(),
    procedures: procedures.list().length,
    blackboard: blackboard.summary(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Consolidate memories (run periodically)
 * - Extract learnings from episodes
 * - Promote important discoveries
 * - Archive old resolved blackboard items
 */
function consolidate() {
  const learnings = episodes.extractLearnings();
  const important = episodes.getImportant(7, 8);
  
  // Log consolidation event
  episodes.log({
    type: 'consolidation',
    summary: `Consolidated ${important.length} important episodes`,
    details: { learnings },
    importance: 3,
    tags: ['system', 'memory']
  });
  
  return {
    importantEpisodes: important.length,
    learnings,
    timestamp: new Date().toISOString()
  };
}

// CLI interface
const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === 'log') {
  const event = JSON.parse(args[1] || '{}');
  console.log(JSON.stringify(logEvent(event), null, 2));
} else if (cmd === 'recall') {
  const query = JSON.parse(args[1] || '{}');
  console.log(JSON.stringify(recall(query), null, 2));
} else if (cmd === 'status') {
  console.log(JSON.stringify(status(), null, 2));
} else if (cmd === 'consolidate') {
  console.log(JSON.stringify(consolidate(), null, 2));
} else {
  console.log('Usage: memory-core.js [log|recall|status|consolidate]');
  console.log('');
  console.log('Examples:');
  console.log('  log \'{"type":"task","summary":"Built IAM sales system","outcome":"success","importance":8}\'');
  console.log('  recall \'{"text":"sales","task":"cold email","limit":5}\'');
  console.log('  status');
  console.log('  consolidate');
}

module.exports = { logEvent, recall, status, consolidate };
