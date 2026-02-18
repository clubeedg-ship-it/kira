#!/usr/bin/env node
/**
 * Blackboard System - Shared Medium for Multi-Agent Coordination
 * 
 * Agents post discoveries, insights, and requests to the blackboard.
 * Other agents can query and respond based on their expertise.
 */

const fs = require('fs');
const path = require('path');

const BLACKBOARD_PATH = path.join(process.env.HOME, 'clawd/memory/blackboard.jsonl');

// Ensure directory exists
const dir = path.dirname(BLACKBOARD_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Post a message to the blackboard
 */
function post(entry) {
  const record = {
    id: `bb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    agent: entry.agent || 'kira',
    type: entry.type || 'discovery', // discovery, request, response, fact, procedure
    priority: entry.priority || 'normal', // low, normal, high, urgent
    topic: entry.topic || 'general',
    content: entry.content,
    metadata: entry.metadata || {},
    resolved: false
  };
  
  fs.appendFileSync(BLACKBOARD_PATH, JSON.stringify(record) + '\n');
  console.log(`Posted: ${record.id} [${record.type}] ${record.topic}`);
  return record.id;
}

/**
 * Query the blackboard
 */
function query(filters = {}) {
  if (!fs.existsSync(BLACKBOARD_PATH)) return [];
  
  const lines = fs.readFileSync(BLACKBOARD_PATH, 'utf8').trim().split('\n').filter(Boolean);
  let entries = lines.map(l => JSON.parse(l));
  
  if (filters.type) entries = entries.filter(e => e.type === filters.type);
  if (filters.topic) entries = entries.filter(e => e.topic === filters.topic);
  if (filters.agent) entries = entries.filter(e => e.agent === filters.agent);
  if (filters.unresolved) entries = entries.filter(e => !e.resolved);
  if (filters.since) entries = entries.filter(e => new Date(e.timestamp) > new Date(filters.since));
  if (filters.limit) entries = entries.slice(-filters.limit);
  
  return entries;
}

/**
 * Mark an entry as resolved
 */
function resolve(id) {
  if (!fs.existsSync(BLACKBOARD_PATH)) return false;
  
  const lines = fs.readFileSync(BLACKBOARD_PATH, 'utf8').trim().split('\n').filter(Boolean);
  const updated = lines.map(l => {
    const entry = JSON.parse(l);
    if (entry.id === id) entry.resolved = true;
    return JSON.stringify(entry);
  });
  
  fs.writeFileSync(BLACKBOARD_PATH, updated.join('\n') + '\n');
  return true;
}

/**
 * Get summary of blackboard state
 */
function summary() {
  const entries = query({});
  const unresolved = entries.filter(e => !e.resolved);
  const byType = {};
  const byTopic = {};
  
  entries.forEach(e => {
    byType[e.type] = (byType[e.type] || 0) + 1;
    byTopic[e.topic] = (byTopic[e.topic] || 0) + 1;
  });
  
  return {
    total: entries.length,
    unresolved: unresolved.length,
    byType,
    byTopic,
    recent: entries.slice(-5)
  };
}

// CLI interface
const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === 'post') {
  const type = args[1] || 'discovery';
  const topic = args[2] || 'general';
  const content = args[3] || 'No content';
  post({ type, topic, content });
} else if (cmd === 'query') {
  const filter = args[1] ? JSON.parse(args[1]) : { limit: 10 };
  console.log(JSON.stringify(query(filter), null, 2));
} else if (cmd === 'resolve') {
  resolve(args[1]);
  console.log('Resolved:', args[1]);
} else if (cmd === 'summary') {
  console.log(JSON.stringify(summary(), null, 2));
} else {
  console.log('Usage: blackboard.js [post|query|resolve|summary] [args]');
  console.log('  post <type> <topic> <content>');
  console.log('  query \'{"type":"discovery","limit":10}\'');
  console.log('  resolve <id>');
  console.log('  summary');
}

module.exports = { post, query, resolve, summary };
