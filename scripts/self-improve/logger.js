/**
 * Self-Improvement Loop — Task Logger
 * Logs task outcomes to SQLite. Every significant action gets recorded.
 */

const { getDb } = require('./db');

const VALID_OUTCOMES = ['success', 'failure', 'partial'];
const VALID_CATEGORIES = [
  'code', 'outreach', 'research', 'content', 'memory',
  'communication', 'planning', 'infrastructure', 'meta'
];

/**
 * Log a task outcome.
 * @param {Object} opts
 * @param {string} opts.task - Description of the task
 * @param {string} opts.outcome - 'success' | 'failure' | 'partial'
 * @param {string} opts.category - Task category
 * @param {number} [opts.duration] - Duration in seconds
 * @param {string} [opts.notes] - Additional notes (what went wrong, what worked)
 * @param {number} [opts.improvementId] - FK to proposal that caused this task
 * @param {string} [opts.sessionKey] - Session identifier
 * @returns {Object} The inserted task record
 */
function logTask({ task, outcome, category, duration, notes, improvementId, sessionKey }) {
  if (!task || !task.trim()) throw new Error('Task description is required');
  if (!VALID_OUTCOMES.includes(outcome)) {
    throw new Error(`Invalid outcome "${outcome}". Must be one of: ${VALID_OUTCOMES.join(', ')}`);
  }
  if (!category || !category.trim()) throw new Error('Category is required');

  // Allow custom categories but warn
  if (!VALID_CATEGORIES.includes(category)) {
    console.warn(`[self-improve] Non-standard category "${category}". Standard categories: ${VALID_CATEGORIES.join(', ')}`);
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO tasks (task, outcome, category, duration_seconds, notes, improvement_id, session_key)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    task.trim(),
    outcome,
    category.trim(),
    duration || null,
    notes?.trim() || null,
    improvementId || null,
    sessionKey || null
  );

  const record = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  console.log(`[self-improve] Logged task #${record.id}: "${record.task}" → ${record.outcome}`);
  return record;
}

/**
 * Get recent tasks with optional filters.
 * @param {Object} [opts]
 * @param {number} [opts.days=7] - Look back period
 * @param {string} [opts.outcome] - Filter by outcome
 * @param {string} [opts.category] - Filter by category
 * @param {number} [opts.limit=100] - Max results
 * @returns {Array} Task records
 */
function getTasks({ days = 7, outcome, category, limit = 100 } = {}) {
  const db = getDb();
  let sql = "SELECT * FROM tasks WHERE timestamp >= datetime('now', ?)";
  const params = [`-${days} days`];

  if (outcome) {
    sql += ' AND outcome = ?';
    params.push(outcome);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  return db.prepare(sql).all(...params);
}

/**
 * Get summary statistics for a time period.
 * @param {number} [days=7]
 * @returns {Object} Stats summary
 */
function getStats(days = 7) {
  const db = getDb();
  const since = `-${days} days`;

  const total = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE timestamp >= datetime('now', ?)"
  ).get(since);

  const byOutcome = db.prepare(
    "SELECT outcome, COUNT(*) as count FROM tasks WHERE timestamp >= datetime('now', ?) GROUP BY outcome"
  ).all(since);

  const byCategory = db.prepare(
    "SELECT category, outcome, COUNT(*) as count FROM tasks WHERE timestamp >= datetime('now', ?) GROUP BY category, outcome ORDER BY count DESC"
  ).all(since);

  const avgDuration = db.prepare(
    "SELECT category, AVG(duration_seconds) as avg_duration FROM tasks WHERE timestamp >= datetime('now', ?) AND duration_seconds IS NOT NULL GROUP BY category"
  ).all(since);

  const outcomeMap = {};
  for (const row of byOutcome) outcomeMap[row.outcome] = row.count;

  const failureRate = total.count > 0
    ? ((outcomeMap.failure || 0) / total.count * 100).toFixed(1)
    : '0.0';

  return {
    period_days: days,
    total: total.count,
    outcomes: outcomeMap,
    failure_rate: `${failureRate}%`,
    by_category: byCategory,
    avg_duration_by_category: avgDuration
  };
}

module.exports = { logTask, getTasks, getStats, VALID_CATEGORIES, VALID_OUTCOMES };
