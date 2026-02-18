#!/usr/bin/env node
/**
 * Procedural Memory - How To Do Things
 * 
 * Stores validated workflows extracted from successful task completions.
 * Allows agent to learn "recipes" for common tasks.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROCEDURES_DIR = path.join(process.env.HOME, 'clawd/memory/procedures');

// Ensure directory exists
if (!fs.existsSync(PROCEDURES_DIR)) {
  fs.mkdirSync(PROCEDURES_DIR, { recursive: true });
}

/**
 * Save a procedure
 */
function save(procedure) {
  const id = procedure.id || `proc-${crypto.randomBytes(6).toString('hex')}`;
  const record = {
    id,
    name: procedure.name,
    description: procedure.description,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    version: procedure.version || 1,
    trigger: procedure.trigger, // When to use this procedure
    steps: procedure.steps, // Array of { action, params, expected }
    successRate: procedure.successRate || null,
    timesUsed: procedure.timesUsed || 0,
    lastUsed: null,
    tags: procedure.tags || [],
    relatedProcedures: procedure.relatedProcedures || []
  };
  
  const filePath = path.join(PROCEDURES_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  console.log(`Saved procedure: ${id} - ${record.name}`);
  return id;
}

/**
 * Get a procedure by ID
 */
function get(id) {
  const filePath = path.join(PROCEDURES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * List all procedures
 */
function list(filters = {}) {
  const files = fs.readdirSync(PROCEDURES_DIR).filter(f => f.endsWith('.json'));
  let procedures = files.map(f => JSON.parse(fs.readFileSync(path.join(PROCEDURES_DIR, f), 'utf8')));
  
  if (filters.tag) {
    procedures = procedures.filter(p => p.tags.includes(filters.tag));
  }
  if (filters.minSuccessRate) {
    procedures = procedures.filter(p => p.successRate >= filters.minSuccessRate);
  }
  
  return procedures.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    successRate: p.successRate,
    timesUsed: p.timesUsed,
    tags: p.tags
  }));
}

/**
 * Record procedure usage and outcome
 */
function recordUsage(id, success) {
  const proc = get(id);
  if (!proc) return false;
  
  proc.timesUsed++;
  proc.lastUsed = new Date().toISOString();
  
  // Update success rate
  if (proc.successRate === null) {
    proc.successRate = success ? 1.0 : 0.0;
  } else {
    // Moving average
    proc.successRate = proc.successRate * 0.9 + (success ? 0.1 : 0);
  }
  
  proc.updated = new Date().toISOString();
  fs.writeFileSync(path.join(PROCEDURES_DIR, `${id}.json`), JSON.stringify(proc, null, 2));
  return true;
}

/**
 * Find best procedure for a task description
 */
function findBest(taskDescription, tags = []) {
  const all = list();
  
  // Simple keyword matching (could be enhanced with embeddings)
  const keywords = taskDescription.toLowerCase().split(/\s+/);
  
  const scored = all.map(p => {
    let score = 0;
    
    // Tag match
    tags.forEach(t => {
      if (p.tags.includes(t)) score += 10;
    });
    
    // Keyword match in name/description
    keywords.forEach(kw => {
      if (p.name.toLowerCase().includes(kw)) score += 5;
      if (p.description.toLowerCase().includes(kw)) score += 2;
    });
    
    // Success rate bonus
    if (p.successRate) score += p.successRate * 10;
    
    // Usage bonus (proven procedures)
    score += Math.min(p.timesUsed, 10);
    
    return { ...p, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}

// CLI interface
const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === 'save') {
  const name = args[1] || 'Unnamed Procedure';
  const description = args[2] || 'No description';
  const steps = args[3] ? JSON.parse(args[3]) : [];
  save({ name, description, steps });
} else if (cmd === 'get') {
  console.log(JSON.stringify(get(args[1]), null, 2));
} else if (cmd === 'list') {
  console.log(JSON.stringify(list(), null, 2));
} else if (cmd === 'find') {
  const task = args[1] || '';
  console.log(JSON.stringify(findBest(task), null, 2));
} else if (cmd === 'usage') {
  recordUsage(args[1], args[2] === 'true');
  console.log('Recorded usage');
} else {
  console.log('Usage: procedures.js [save|get|list|find|usage]');
}

module.exports = { save, get, list, recordUsage, findBest };
