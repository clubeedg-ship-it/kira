/**
 * Self-Improvement Loop — Failure Pattern Analyzer
 * Reads task logs, identifies failure clusters, computes actionable patterns.
 */

const { getDb } = require('./db');
const { getTasks, getStats } = require('./logger');

/**
 * Analyze task outcomes for failure patterns.
 * @param {Object} [opts]
 * @param {number} [opts.days=7] - Look back period
 * @param {number} [opts.minFailures=2] - Minimum failures in a category to flag
 * @returns {Object} Analysis with patterns and focus areas
 */
function analyze({ days = 7, minFailures = 2 } = {}) {
  const db = getDb();
  const tasks = getTasks({ days });
  const stats = getStats(days);

  if (tasks.length === 0) {
    console.log('[self-improve] No tasks in the analysis period. Nothing to analyze.');
    return null;
  }

  // Group failures by category
  const failuresByCategory = {};
  const failureNotes = {};

  for (const task of tasks) {
    if (task.outcome === 'failure' || task.outcome === 'partial') {
      if (!failuresByCategory[task.category]) {
        failuresByCategory[task.category] = 0;
        failureNotes[task.category] = [];
      }
      failuresByCategory[task.category]++;
      if (task.notes) {
        failureNotes[task.category].push({
          task: task.task,
          notes: task.notes,
          timestamp: task.timestamp
        });
      }
    }
  }

  // Identify patterns (categories with repeated failures)
  const patterns = [];
  for (const [category, count] of Object.entries(failuresByCategory)) {
    if (count >= minFailures) {
      // Calculate failure rate for this category
      const categoryTotal = tasks.filter(t => t.category === category).length;
      const failureRate = (count / categoryTotal * 100).toFixed(1);

      patterns.push({
        category,
        failure_count: count,
        total_in_category: categoryTotal,
        failure_rate: `${failureRate}%`,
        severity: count >= 5 ? 'high' : count >= 3 ? 'medium' : 'low',
        examples: failureNotes[category]?.slice(0, 5) || []
      });
    }
  }

  // Sort by severity then count
  const severityOrder = { high: 0, medium: 1, low: 2 };
  patterns.sort((a, b) => {
    const sDiff = severityOrder[a.severity] - severityOrder[b.severity];
    return sDiff !== 0 ? sDiff : b.failure_count - a.failure_count;
  });

  // Derive focus areas from patterns
  const focusAreas = patterns.map(p => ({
    category: p.category,
    priority: p.severity,
    reason: `${p.failure_count} failures (${p.failure_rate} failure rate) in last ${days} days`,
    sample_issues: p.examples.map(e => e.notes).slice(0, 3)
  }));

  // Also flag categories with high partial rates
  for (const task of tasks) {
    if (task.outcome === 'partial') {
      const cat = task.category;
      if (!focusAreas.find(f => f.category === cat)) {
        const catTasks = tasks.filter(t => t.category === cat);
        const partials = catTasks.filter(t => t.outcome === 'partial').length;
        if (partials >= minFailures) {
          focusAreas.push({
            category: cat,
            priority: 'low',
            reason: `${partials} partial completions — may benefit from workflow improvement`,
            sample_issues: []
          });
        }
      }
    }
  }

  // Store analysis
  const result = db.prepare(`
    INSERT INTO analyses (period_days, total_tasks, failure_count, patterns, focus_areas)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    days,
    tasks.length,
    tasks.filter(t => t.outcome === 'failure').length,
    JSON.stringify(patterns),
    JSON.stringify(focusAreas)
  );

  const analysis = db.prepare('SELECT * FROM analyses WHERE id = ?').get(result.lastInsertRowid);

  console.log(`[self-improve] Analysis #${analysis.id}: ${tasks.length} tasks, ${patterns.length} patterns found, ${focusAreas.length} focus areas`);

  return {
    ...analysis,
    patterns: JSON.parse(analysis.patterns),
    focus_areas: JSON.parse(analysis.focus_areas),
    stats
  };
}

/**
 * Get the most recent analysis.
 * @returns {Object|null}
 */
function getLatestAnalysis() {
  const db = getDb();
  const row = db.prepare('SELECT * FROM analyses ORDER BY id DESC LIMIT 1').get();
  if (!row) return null;
  return {
    ...row,
    patterns: JSON.parse(row.patterns),
    focus_areas: JSON.parse(row.focus_areas)
  };
}

/**
 * Get analysis by ID.
 * @param {number} id
 * @returns {Object|null}
 */
function getAnalysis(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM analyses WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    patterns: JSON.parse(row.patterns),
    focus_areas: JSON.parse(row.focus_areas)
  };
}

module.exports = { analyze, getLatestAnalysis, getAnalysis };
