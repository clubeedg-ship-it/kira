/**
 * Self-Improvement Loop — Merger
 * Applies validated proposals to production config.
 * Creates git commits and archive entries.
 */

const { getDb } = require('./db');
const { getProposal, getCurrentConfigHash } = require('./proposer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KIRA_ROOT = path.resolve(__dirname, '../..');

/**
 * Apply a validated proposal to production.
 * @param {Object} opts
 * @param {number} opts.proposalId - Proposal to merge
 * @param {boolean} [opts.dryRun=false] - Preview without applying
 * @returns {Object} Merge result
 */
function merge({ proposalId, dryRun = false } = {}) {
  const db = getDb();
  const proposal = getProposal(proposalId);

  if (!proposal) {
    throw new Error(`Proposal #${proposalId} not found`);
  }

  if (proposal.status !== 'validated') {
    throw new Error(`Proposal #${proposalId} is "${proposal.status}". Only validated proposals can be merged.`);
  }

  const targetFiles = JSON.parse(proposal.target_files);
  const changes = JSON.parse(proposal.changes);

  console.log(`[self-improve] ${dryRun ? 'DRY RUN — ' : ''}Merging proposal #${proposalId}...`);

  // Verify current config matches the proposal's parent
  const currentHash = getCurrentConfigHash();
  if (proposal.parent_config_hash && proposal.parent_config_hash !== currentHash) {
    console.warn(`[self-improve] WARNING: Config has changed since proposal was created. Parent hash: ${proposal.parent_config_hash}, current: ${currentHash}`);
  }

  const applied = [];
  const backups = {};

  for (const file of targetFiles) {
    const fullPath = path.join(KIRA_ROOT, file);

    // Backup original
    if (fs.existsSync(fullPath)) {
      backups[file] = fs.readFileSync(fullPath, 'utf8');
    }

    if (dryRun) {
      console.log(`[self-improve] Would modify: ${file}`);
      if (changes.type === 'replace') {
        console.log(`  Replace: "${changes.old_text?.slice(0, 60)}..." → "${changes.new_text?.slice(0, 60)}..."`);
      } else {
        console.log(`  Append: "${changes.new_text?.slice(0, 60)}..."`);
      }
      applied.push(file);
      continue;
    }

    try {
      let content = fs.existsSync(fullPath)
        ? fs.readFileSync(fullPath, 'utf8')
        : '';

      if (changes.type === 'replace') {
        if (!changes.old_text) {
          throw new Error(`Replace requires old_text for ${file}`);
        }
        if (!content.includes(changes.old_text)) {
          throw new Error(`old_text not found in ${file} — file may have changed`);
        }
        content = content.replace(changes.old_text, changes.new_text);
      } else if (changes.type === 'append') {
        content += '\n' + changes.new_text;
      } else {
        throw new Error(`Unknown change type: ${changes.type}`);
      }

      fs.writeFileSync(fullPath, content, 'utf8');
      applied.push(file);
      console.log(`[self-improve] Modified: ${file}`);
    } catch (err) {
      // Rollback all changes on failure
      console.error(`[self-improve] Failed to apply changes to ${file}: ${err.message}`);
      for (const [bFile, bContent] of Object.entries(backups)) {
        const bPath = path.join(KIRA_ROOT, bFile);
        fs.writeFileSync(bPath, bContent, 'utf8');
        console.log(`[self-improve] Rolled back: ${bFile}`);
      }
      db.prepare("UPDATE proposals SET status = 'rejected', rejection_reason = ? WHERE id = ?")
        .run(`Merge failed: ${err.message}`, proposalId);
      return { success: false, error: err.message };
    }
  }

  if (dryRun) {
    return { success: true, dryRun: true, files: applied };
  }

  // Git commit
  try {
    for (const file of applied) {
      execSync(`cd ${KIRA_ROOT} && git add ${file}`, { encoding: 'utf8' });
    }
    execSync(
      `cd ${KIRA_ROOT} && git commit -m "self-improve: proposal #${proposalId} — ${proposal.description.slice(0, 60)}"`,
      { encoding: 'utf8' }
    );
    console.log(`[self-improve] Git commit created.`);
  } catch (err) {
    console.warn(`[self-improve] Git commit failed (non-fatal): ${err.message}`);
  }

  // Create archive entry
  const newHash = getCurrentConfigHash();
  const parentArchive = db.prepare('SELECT id FROM archive ORDER BY id DESC LIMIT 1').get();

  // Build config snapshot of modified files
  const snapshot = {};
  for (const file of targetFiles) {
    const fullPath = path.join(KIRA_ROOT, file);
    if (fs.existsSync(fullPath)) {
      snapshot[file] = fs.readFileSync(fullPath, 'utf8');
    }
  }

  db.prepare(`
    INSERT INTO archive (parent_id, proposal_id, config_hash, config_snapshot, performance_delta, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    parentArchive?.id || null,
    proposalId,
    newHash,
    JSON.stringify(snapshot),
    null, // Will be updated after post-merge evaluation
    proposal.description
  );

  // Update proposal status
  db.prepare("UPDATE proposals SET status = 'merged' WHERE id = ?").run(proposalId);

  console.log(`[self-improve] Proposal #${proposalId} merged successfully. Archive entry created.`);

  return {
    success: true,
    files: applied,
    config_hash: newHash,
    previous_hash: proposal.parent_config_hash
  };
}

/**
 * Rollback to a previous archive state.
 * @param {number} archiveId
 * @returns {Object}
 */
function rollback(archiveId) {
  const db = getDb();
  const entry = db.prepare('SELECT * FROM archive WHERE id = ?').get(archiveId);

  if (!entry) {
    throw new Error(`Archive entry #${archiveId} not found`);
  }

  const snapshot = JSON.parse(entry.config_snapshot);

  for (const [file, content] of Object.entries(snapshot)) {
    const fullPath = path.join(KIRA_ROOT, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`[self-improve] Restored: ${file}`);
  }

  // Git commit the rollback
  try {
    execSync(`cd ${KIRA_ROOT} && git add -A && git commit -m "self-improve: rollback to archive #${archiveId}"`,
      { encoding: 'utf8' });
  } catch (err) {
    console.warn(`[self-improve] Git commit failed: ${err.message}`);
  }

  console.log(`[self-improve] Rolled back to archive #${archiveId}`);
  return { success: true, archive_id: archiveId };
}

module.exports = { merge, rollback };
