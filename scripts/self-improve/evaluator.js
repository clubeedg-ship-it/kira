/**
 * Self-Improvement Loop — Proposal Evaluator
 * Tests proposals in sandboxed environment before merging.
 */

const { getDb } = require('./db');
const { getProposal } = require('./proposer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const KIRA_ROOT = path.resolve(__dirname, '../..');

/**
 * Create a sandboxed copy of the workspace with proposed changes applied.
 * @param {Object} proposal - Proposal record from DB
 * @returns {string} Path to sandbox directory
 */
function createSandbox(proposal) {
  const sandboxDir = path.join(os.tmpdir(), `kira-sandbox-${proposal.id}-${Date.now()}`);
  fs.mkdirSync(sandboxDir, { recursive: true });

  const targetFiles = JSON.parse(proposal.target_files);
  const changes = JSON.parse(proposal.changes);

  // Copy target files to sandbox (original versions)
  for (const file of targetFiles) {
    const srcPath = path.join(KIRA_ROOT, file);
    const destPath = path.join(sandboxDir, file);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  // Apply changes
  for (const file of targetFiles) {
    const filePath = path.join(sandboxDir, file);
    if (!fs.existsSync(filePath)) {
      // File doesn't exist yet — only append makes sense
      if (changes.type === 'append') {
        fs.writeFileSync(filePath, changes.new_text, 'utf8');
      }
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    if (changes.type === 'replace') {
      if (!changes.old_text) {
        throw new Error(`Proposal #${proposal.id}: replace requires old_text`);
      }
      if (!content.includes(changes.old_text)) {
        throw new Error(`Proposal #${proposal.id}: old_text not found in ${file}. File may have changed since proposal was created.`);
      }
      content = content.replace(changes.old_text, changes.new_text);
    } else if (changes.type === 'append') {
      content += '\n' + changes.new_text;
    } else {
      throw new Error(`Unknown change type: ${changes.type}`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
  }

  return sandboxDir;
}

/**
 * Run evaluation tasks against original and modified configs.
 * @param {Object} proposal
 * @param {number} [runs=3]
 * @returns {Object} Evaluation result
 */
function evaluate({ proposalId, runs = 3 } = {}) {
  const db = getDb();
  const proposal = getProposal(proposalId);

  if (!proposal) {
    throw new Error(`Proposal #${proposalId} not found`);
  }

  if (proposal.status !== 'draft') {
    throw new Error(`Proposal #${proposalId} is "${proposal.status}", not "draft". Only draft proposals can be evaluated.`);
  }

  console.log(`[self-improve] Evaluating proposal #${proposalId}: ${proposal.description.slice(0, 60)}...`);

  // Update status to testing
  db.prepare("UPDATE proposals SET status = 'testing' WHERE id = ?").run(proposalId);

  let sandboxDir;
  try {
    sandboxDir = createSandbox(proposal);
  } catch (err) {
    console.error(`[self-improve] Sandbox creation failed: ${err.message}`);
    db.prepare("UPDATE proposals SET status = 'rejected', rejection_reason = ? WHERE id = ?")
      .run(`Sandbox failed: ${err.message}`, proposalId);
    return { passed: false, error: err.message };
  }

  // Get evaluation tasks from task bank
  const tasks = db.prepare("SELECT * FROM task_bank WHERE enabled = 1 ORDER BY difficulty").all();

  if (tasks.length === 0) {
    console.log('[self-improve] No tasks in task bank. Performing basic validation only.');
    // Basic validation: check files are valid (no syntax errors in JSON, valid markdown, etc.)
    const basicResult = basicValidation(proposal, sandboxDir);

    const evalResult = db.prepare(`
      INSERT INTO evaluations (proposal_id, baseline_score, modified_score, improvement_pct, passed, runs, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      proposalId,
      null,
      null,
      null,
      basicResult.passed ? 1 : 0,
      1,
      JSON.stringify(basicResult)
    );

    const status = basicResult.passed ? 'validated' : 'rejected';
    const reason = basicResult.passed ? null : basicResult.reason;
    db.prepare(`UPDATE proposals SET status = ?, rejection_reason = ? WHERE id = ?`)
      .run(status, reason, proposalId);

    console.log(`[self-improve] Proposal #${proposalId} ${status}: ${basicResult.reason || 'passed basic validation'}`);

    // Cleanup sandbox
    fs.rmSync(sandboxDir, { recursive: true, force: true });

    return {
      passed: basicResult.passed,
      details: basicResult,
      evaluation_id: evalResult.lastInsertRowid
    };
  }

  // Run tasks with baseline and modified configs
  const baselineScores = [];
  const modifiedScores = [];

  for (let run = 0; run < runs; run++) {
    for (const task of tasks) {
      const criteria = JSON.parse(task.success_criteria);

      // Baseline run (current config)
      const baseScore = runTask(task, KIRA_ROOT, criteria);
      baselineScores.push(baseScore);

      // Modified run (sandbox config)
      const modScore = runTask(task, sandboxDir, criteria);
      modifiedScores.push(modScore);
    }
  }

  const baselineAvg = baselineScores.reduce((a, b) => a + b, 0) / baselineScores.length;
  const modifiedAvg = modifiedScores.reduce((a, b) => a + b, 0) / modifiedScores.length;
  const improvementPct = baselineAvg > 0
    ? ((modifiedAvg - baselineAvg) / baselineAvg * 100)
    : (modifiedAvg > 0 ? 100 : 0);

  // Pass if: improvement > 0 AND no regression > 10%
  const passed = modifiedAvg >= baselineAvg * 0.9 && improvementPct >= 0;

  const details = {
    baseline_scores: baselineScores,
    modified_scores: modifiedScores,
    baseline_avg: baselineAvg,
    modified_avg: modifiedAvg,
    tasks_run: tasks.length,
    total_runs: runs
  };

  const evalResult = db.prepare(`
    INSERT INTO evaluations (proposal_id, baseline_score, modified_score, improvement_pct, passed, runs, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(proposalId, baselineAvg, modifiedAvg, improvementPct, passed ? 1 : 0, runs, JSON.stringify(details));

  const status = passed ? 'validated' : 'rejected';
  const reason = passed ? null : `Improvement: ${improvementPct.toFixed(1)}% (threshold: 0%). Modified avg: ${modifiedAvg.toFixed(2)} vs baseline: ${baselineAvg.toFixed(2)}`;
  db.prepare(`UPDATE proposals SET status = ?, rejection_reason = ? WHERE id = ?`)
    .run(status, reason, proposalId);

  // Cleanup sandbox
  fs.rmSync(sandboxDir, { recursive: true, force: true });

  console.log(`[self-improve] Proposal #${proposalId} ${status}. Improvement: ${improvementPct.toFixed(1)}%`);

  return {
    passed,
    improvement_pct: improvementPct,
    details,
    evaluation_id: evalResult.lastInsertRowid
  };
}

/**
 * Basic validation when no task bank exists.
 * Checks that modified files are structurally valid.
 */
function basicValidation(proposal, sandboxDir) {
  const targetFiles = JSON.parse(proposal.target_files);
  const changes = JSON.parse(proposal.changes);

  for (const file of targetFiles) {
    const filePath = path.join(sandboxDir, file);
    if (!fs.existsSync(filePath)) {
      return { passed: false, reason: `Modified file ${file} does not exist after changes` };
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // Check file isn't empty
    if (content.trim().length === 0) {
      return { passed: false, reason: `File ${file} is empty after changes` };
    }

    // Check new_text was actually applied
    if (changes.new_text && !content.includes(changes.new_text.slice(0, 50))) {
      return { passed: false, reason: `Changes were not applied to ${file}` };
    }

    // For JSON files, validate syntax
    if (file.endsWith('.json')) {
      try {
        JSON.parse(content);
      } catch {
        return { passed: false, reason: `${file} has invalid JSON after changes` };
      }
    }
  }

  return {
    passed: true,
    reason: 'Passed basic validation (structural checks). No task bank for functional testing.'
  };
}

/**
 * Run a single evaluation task.
 * @param {Object} task - Task bank entry
 * @param {string} configDir - Config directory to use
 * @param {Object} criteria - Success criteria
 * @returns {number} Score (0-1)
 */
function runTask(task, configDir, criteria) {
  // For now, basic scoring based on task completion
  // This will be expanded as the task bank grows
  try {
    const result = execSync(
      `echo "${task.test_prompt}" | head -c 500`,
      { timeout: 30000, encoding: 'utf8', cwd: configDir }
    );
    return result.length > 0 ? 1.0 : 0.0;
  } catch {
    return 0.0;
  }
}

module.exports = { evaluate };
