/**
 * Self-Improvement Loop — Database Layer
 * SQLite connection, schema initialization, migrations.
 * Production-grade: WAL mode, foreign keys, proper error handling.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'self-improve.db');

let _db = null;

const SCHEMA_VERSION = 1;

const SCHEMA = `
-- Task outcomes
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  task TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'partial')),
  category TEXT NOT NULL,
  duration_seconds INTEGER,
  notes TEXT,
  improvement_id INTEGER REFERENCES proposals(id),
  session_key TEXT
);

-- Failure pattern analyses
CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  period_days INTEGER NOT NULL,
  total_tasks INTEGER NOT NULL,
  failure_count INTEGER NOT NULL,
  patterns TEXT NOT NULL,
  focus_areas TEXT NOT NULL
);

-- Improvement proposals
CREATE TABLE IF NOT EXISTS proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  analysis_id INTEGER REFERENCES analyses(id),
  description TEXT NOT NULL,
  target_files TEXT NOT NULL,
  changes TEXT NOT NULL,
  expected_improvement TEXT NOT NULL,
  risk TEXT NOT NULL CHECK (risk IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'testing', 'validated', 'merged', 'rejected')),
  rejection_reason TEXT,
  parent_config_hash TEXT
);

-- Evaluation runs
CREATE TABLE IF NOT EXISTS evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  proposal_id INTEGER NOT NULL REFERENCES proposals(id),
  baseline_score REAL,
  modified_score REAL,
  improvement_pct REAL,
  passed INTEGER NOT NULL CHECK (passed IN (0, 1)),
  runs INTEGER NOT NULL DEFAULT 1,
  details TEXT
);

-- Config archive (DGM tree)
CREATE TABLE IF NOT EXISTS archive (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  parent_id INTEGER REFERENCES archive(id),
  proposal_id INTEGER REFERENCES proposals(id),
  config_hash TEXT NOT NULL,
  config_snapshot TEXT NOT NULL,
  performance_delta REAL,
  description TEXT
);

-- Task bank for evaluation
CREATE TABLE IF NOT EXISTS task_bank (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  test_prompt TEXT NOT NULL,
  success_criteria TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  enabled INTEGER NOT NULL DEFAULT 1
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_outcome ON tasks(outcome);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_timestamp ON tasks(timestamp);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_archive_parent ON archive(parent_id);
`;

function getDb() {
  if (_db) return _db;

  fs.mkdirSync(DB_DIR, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('busy_timeout = 5000');

  // Initialize schema
  _db.exec(SCHEMA);

  // Set schema version if not exists
  const version = _db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get();
  if (!version) {
    _db.prepare("INSERT INTO meta (key, value) VALUES ('schema_version', ?)").run(String(SCHEMA_VERSION));
  }

  return _db;
}

function close() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

// Graceful shutdown
process.on('exit', close);
process.on('SIGINT', () => { close(); process.exit(0); });
process.on('SIGTERM', () => { close(); process.exit(0); });

module.exports = { getDb, close, DB_PATH };
