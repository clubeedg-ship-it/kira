/**
 * Self-Improvement Loop — Task Bank Manager
 * Manages evaluation tasks used to test proposals.
 */

const { getDb } = require('./db');

/**
 * Add a task to the bank.
 * @param {Object} opts
 * @returns {Object} Created task
 */
function addTask({ name, description, category, testPrompt, successCriteria, difficulty = 'medium' }) {
  if (!name || !testPrompt) throw new Error('name and testPrompt are required');

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO task_bank (name, description, category, test_prompt, success_criteria, difficulty)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    name,
    description || name,
    category || 'general',
    testPrompt,
    JSON.stringify(successCriteria || { type: 'completion' }),
    difficulty
  );

  return db.prepare('SELECT * FROM task_bank WHERE id = ?').get(result.lastInsertRowid);
}

/**
 * List all tasks.
 * @param {boolean} [enabledOnly=true]
 * @returns {Array}
 */
function listTasks(enabledOnly = true) {
  const db = getDb();
  if (enabledOnly) {
    return db.prepare('SELECT * FROM task_bank WHERE enabled = 1 ORDER BY difficulty, category').all();
  }
  return db.prepare('SELECT * FROM task_bank ORDER BY difficulty, category').all();
}

/**
 * Toggle task enabled/disabled.
 * @param {number} id
 * @param {boolean} enabled
 */
function toggleTask(id, enabled) {
  const db = getDb();
  db.prepare('UPDATE task_bank SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
}

/**
 * Remove a task.
 * @param {number} id
 */
function removeTask(id) {
  const db = getDb();
  db.prepare('DELETE FROM task_bank WHERE id = ?').run(id);
}

/**
 * Seed the task bank with default evaluation tasks.
 */
function seedDefaults() {
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) as count FROM task_bank').get();
  if (existing.count > 0) {
    console.log('[self-improve] Task bank already has entries. Skipping seed.');
    return;
  }

  const defaults = [
    {
      name: 'Memory file read',
      description: 'Agent should read and summarize recent memory files',
      category: 'memory',
      testPrompt: 'Read the most recent memory file and summarize key events',
      successCriteria: { type: 'completion', min_length: 50 },
      difficulty: 'easy'
    },
    {
      name: 'Task planning',
      description: 'Agent should break down a complex task into steps',
      category: 'planning',
      testPrompt: 'Create a step-by-step plan to set up a new company LinkedIn page',
      successCriteria: { type: 'completion', min_length: 100, must_contain: ['step'] },
      difficulty: 'medium'
    },
    {
      name: 'Code review',
      description: 'Agent should identify issues in a code snippet',
      category: 'code',
      testPrompt: 'Review this function for bugs: function add(a,b) { return a - b; }',
      successCriteria: { type: 'completion', must_contain: ['subtract', 'minus', 'bug', 'error', 'wrong'] },
      difficulty: 'easy'
    },
    {
      name: 'Research synthesis',
      description: 'Agent should research and synthesize information on a topic',
      category: 'research',
      testPrompt: 'What are the top 3 trends in corporate wellness technology for 2026?',
      successCriteria: { type: 'completion', min_length: 200 },
      difficulty: 'medium'
    },
    {
      name: 'Error recovery',
      description: 'Agent should handle a failed task gracefully',
      category: 'infrastructure',
      testPrompt: 'Run a command that does not exist and report the error clearly',
      successCriteria: { type: 'completion', must_contain: ['error', 'failed', 'not found'] },
      difficulty: 'easy'
    }
  ];

  for (const task of defaults) {
    addTask(task);
  }

  console.log(`[self-improve] Seeded ${defaults.length} default evaluation tasks.`);
}

module.exports = { addTask, listTasks, toggleTask, removeTask, seedDefaults };
