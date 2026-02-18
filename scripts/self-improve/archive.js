/**
 * Self-Improvement Loop — Archive Manager
 * DGM-style tree of configurations. Track lineage, compare performance.
 */

const { getDb } = require('./db');

/**
 * List all archive entries.
 * @param {number} [limit=20]
 * @returns {Array}
 */
function list(limit = 20) {
  const db = getDb();
  return db.prepare(`
    SELECT a.*, p.description as proposal_description, p.status as proposal_status
    FROM archive a
    LEFT JOIN proposals p ON a.proposal_id = p.id
    ORDER BY a.id DESC
    LIMIT ?
  `).all(limit);
}

/**
 * Get a specific archive entry.
 * @param {number} id
 * @returns {Object|null}
 */
function get(id) {
  const db = getDb();
  const entry = db.prepare('SELECT * FROM archive WHERE id = ?').get(id);
  if (!entry) return null;
  return {
    ...entry,
    config_snapshot: JSON.parse(entry.config_snapshot)
  };
}

/**
 * Get the lineage (parent chain) for an archive entry.
 * @param {number} id
 * @returns {Array} Ordered from root to leaf
 */
function getLineage(id) {
  const db = getDb();
  const chain = [];
  let current = id;

  while (current) {
    const entry = db.prepare('SELECT * FROM archive WHERE id = ?').get(current);
    if (!entry) break;
    chain.unshift({ id: entry.id, timestamp: entry.timestamp, description: entry.description, config_hash: entry.config_hash });
    current = entry.parent_id;
  }

  return chain;
}

/**
 * Get all children of an archive entry (branches).
 * @param {number} parentId
 * @returns {Array}
 */
function getChildren(parentId) {
  const db = getDb();
  return db.prepare('SELECT id, timestamp, description, config_hash, performance_delta FROM archive WHERE parent_id = ?')
    .all(parentId);
}

/**
 * Build the full tree structure.
 * @returns {Object} Tree with nodes and edges
 */
function getTree() {
  const db = getDb();
  const all = db.prepare('SELECT id, parent_id, timestamp, description, config_hash, performance_delta FROM archive ORDER BY id').all();

  const nodes = {};
  const roots = [];

  for (const entry of all) {
    nodes[entry.id] = { ...entry, children: [] };
  }

  for (const entry of all) {
    if (entry.parent_id && nodes[entry.parent_id]) {
      nodes[entry.parent_id].children.push(nodes[entry.id]);
    } else {
      roots.push(nodes[entry.id]);
    }
  }

  return { roots, total: all.length };
}

/**
 * Compare two archive entries.
 * @param {number} id1
 * @param {number} id2
 * @returns {Object} Diff summary
 */
function compare(id1, id2) {
  const entry1 = get(id1);
  const entry2 = get(id2);

  if (!entry1 || !entry2) {
    throw new Error(`Archive entries #${id1} and/or #${id2} not found`);
  }

  const files1 = entry1.config_snapshot;
  const files2 = entry2.config_snapshot;
  const allFiles = new Set([...Object.keys(files1), ...Object.keys(files2)]);

  const diffs = {};
  for (const file of allFiles) {
    const c1 = files1[file] || '';
    const c2 = files2[file] || '';
    if (c1 !== c2) {
      diffs[file] = {
        in_first: !!files1[file],
        in_second: !!files2[file],
        first_length: c1.length,
        second_length: c2.length,
        changed: true
      };
    }
  }

  return {
    entry1: { id: id1, timestamp: entry1.timestamp, description: entry1.description },
    entry2: { id: id2, timestamp: entry2.timestamp, description: entry2.description },
    files_changed: Object.keys(diffs).length,
    diffs
  };
}

module.exports = { list, get, getLineage, getChildren, getTree, compare };
