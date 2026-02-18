/**
 * Self-Improvement Loop — Improvement Proposer
 * Uses LLM to generate concrete, actionable improvement proposals.
 */

const { getDb } = require('./db');
const { getLatestAnalysis, getAnalysis } = require('./analyzer');
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KIRA_ROOT = path.resolve(__dirname, '../..');

// Files that the self-improvement loop is allowed to modify
const MODIFIABLE_FILES = [
  'AGENTS.md',
  'HEARTBEAT.md',
  'TOOLS.md',
  'SOUL.md',
  'scripts/self-improve/task-bank.js',
  'scripts/context-summary.js',
  'scripts/memory/index.js',
];

// Files to include as context for the LLM
const CONTEXT_FILES = [
  'AGENTS.md',
  'SOUL.md',
  'HEARTBEAT.md',
  'TOOLS.md',
];

/**
 * Generate a config hash from current modifiable files.
 * @returns {string} SHA-256 hash
 */
function getCurrentConfigHash() {
  const hash = crypto.createHash('sha256');
  for (const file of MODIFIABLE_FILES) {
    const fullPath = path.join(KIRA_ROOT, file);
    if (fs.existsSync(fullPath)) {
      hash.update(fs.readFileSync(fullPath, 'utf8'));
    }
  }
  return hash.digest('hex').slice(0, 16);
}

/**
 * Build the LLM prompt for generating improvement proposals.
 * @param {Object} analysis - Analysis result
 * @returns {string} Prompt
 */
function buildPrompt(analysis) {
  // Read current config files for context
  const context = {};
  for (const file of CONTEXT_FILES) {
    const fullPath = path.join(KIRA_ROOT, file);
    if (fs.existsSync(fullPath)) {
      context[file] = fs.readFileSync(fullPath, 'utf8');
    }
  }

  return `You are the self-improvement engine for Kira, an AI agent. Your job is to analyze failure patterns and propose CONCRETE changes to Kira's configuration files that will reduce failures.

## Current Configuration Files

${Object.entries(context).map(([f, c]) => `### ${f}\n\`\`\`\n${c.slice(0, 2000)}\n\`\`\``).join('\n\n')}

## Failure Analysis (last ${analysis.period_days} days)

Total tasks: ${analysis.total_tasks}
Failures: ${analysis.failure_count}
Patterns found: ${JSON.stringify(analysis.patterns, null, 2)}
Focus areas: ${JSON.stringify(analysis.focus_areas, null, 2)}

## Your Task

Propose 1-3 concrete improvements. For each proposal, provide:

1. **description**: What you're changing and why (one paragraph)
2. **target_file**: Which file to modify (must be one of: ${MODIFIABLE_FILES.join(', ')})
3. **change_type**: "replace" (old text → new text) or "append" (add to end)
4. **old_text**: (for replace) Exact text to find
5. **new_text**: The new text
6. **expected_improvement**: What metric should improve and by how much
7. **risk**: "low", "medium", or "high"

Rules:
- Only propose changes to files in the modifiable list
- Changes must be specific — exact text, not vague suggestions
- Each change should address a specific failure pattern
- Prefer small, targeted changes over large rewrites
- If no meaningful improvement can be proposed, say so

Respond in JSON format:
\`\`\`json
{
  "proposals": [
    {
      "description": "...",
      "target_file": "...",
      "change_type": "replace|append",
      "old_text": "...",
      "new_text": "...",
      "expected_improvement": "...",
      "risk": "low|medium|high"
    }
  ],
  "reasoning": "..."
}
\`\`\``;
}

/**
 * Call LLM to generate proposals.
 * @param {string} prompt
 * @param {string} [model='qwen3:14b']
 * @returns {Object} Parsed LLM response
 */
function callLLM(prompt, model = 'qwen3:14b') {
  const escapedPrompt = prompt.replace(/'/g, "'\\''");

  try {
    const result = execSync(
      `ollama run ${model} '${escapedPrompt}' 2>/dev/null`,
      {
        maxBuffer: 1024 * 1024,
        timeout: 120000,
        encoding: 'utf8'
      }
    );

    // Extract JSON from response
    const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/) || result.match(/\{[\s\S]*"proposals"[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('LLM response did not contain valid JSON');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
  } catch (err) {
    if (err.message.includes('did not contain valid JSON')) throw err;
    throw new Error(`LLM call failed: ${err.message}`);
  }
}

/**
 * Generate improvement proposals from analysis.
 * @param {Object} [opts]
 * @param {number} [opts.analysisId] - Specific analysis ID (default: latest)
 * @param {string} [opts.model='qwen3:14b'] - LLM model to use
 * @returns {Array} Created proposals
 */
function propose({ analysisId, model = 'qwen3:14b' } = {}) {
  const db = getDb();

  const analysis = analysisId ? getAnalysis(analysisId) : getLatestAnalysis();
  if (!analysis) {
    console.log('[self-improve] No analysis found. Run analyze first.');
    return [];
  }

  if (analysis.patterns.length === 0) {
    console.log('[self-improve] No failure patterns to address. System is performing well.');
    return [];
  }

  console.log(`[self-improve] Generating proposals for analysis #${analysis.id} using ${model}...`);

  const prompt = buildPrompt(analysis);
  const response = callLLM(prompt, model);

  if (!response.proposals || response.proposals.length === 0) {
    console.log('[self-improve] LLM found no actionable improvements.');
    return [];
  }

  const configHash = getCurrentConfigHash();
  const created = [];

  for (const p of response.proposals) {
    // Validate target file
    if (!MODIFIABLE_FILES.includes(p.target_file)) {
      console.warn(`[self-improve] Skipping proposal targeting non-modifiable file: ${p.target_file}`);
      continue;
    }

    // Validate risk level
    const risk = ['low', 'medium', 'high'].includes(p.risk) ? p.risk : 'medium';

    const changes = JSON.stringify({
      type: p.change_type || 'replace',
      old_text: p.old_text || null,
      new_text: p.new_text
    });

    const result = db.prepare(`
      INSERT INTO proposals (analysis_id, description, target_files, changes, expected_improvement, risk, parent_config_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      analysis.id,
      p.description,
      JSON.stringify([p.target_file]),
      changes,
      p.expected_improvement,
      risk,
      configHash
    );

    const record = db.prepare('SELECT * FROM proposals WHERE id = ?').get(result.lastInsertRowid);
    created.push(record);
    console.log(`[self-improve] Proposal #${record.id}: ${record.description.slice(0, 80)}...`);
  }

  if (response.reasoning) {
    console.log(`[self-improve] LLM reasoning: ${response.reasoning}`);
  }

  return created;
}

/**
 * Get proposals by status.
 * @param {string} [status] - Filter by status
 * @returns {Array}
 */
function getProposals(status) {
  const db = getDb();
  if (status) {
    return db.prepare('SELECT * FROM proposals WHERE status = ? ORDER BY id DESC').all(status);
  }
  return db.prepare('SELECT * FROM proposals ORDER BY id DESC LIMIT 20').all();
}

/**
 * Get a specific proposal.
 * @param {number} id
 * @returns {Object|null}
 */
function getProposal(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
}

module.exports = { propose, getProposals, getProposal, getCurrentConfigHash, MODIFIABLE_FILES };
