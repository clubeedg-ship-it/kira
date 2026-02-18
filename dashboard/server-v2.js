#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const Database = require('better-sqlite3');

const PORT = 3847;
const HOME = process.env.HOME || '/home/adminuser';
const KIRA = path.join(HOME, 'kira');
const CHIMERA = path.join(HOME, 'chimera');
const VDR = path.join(KIRA, 'vdr');
const MEMORY = path.join(KIRA, 'memory');
const UNIFIED_DB = path.join(MEMORY, 'unified.db');
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const https = require('https');
const auth = require('./auth.js');

// Tasks stored in-memory (persisted to JSON)
const TASKS_FILE = path.join(__dirname, 'tasks.json');
const SCRATCHPAD_FILE = path.join(__dirname, 'scratchpad.json'); // legacy fallback

function getUserChatFile(userId) {
  if (!userId) return SCRATCHPAD_FILE;
  const dir = path.join(__dirname, 'data', 'users', userId);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'chat.json');
}
function loadScratchpad(userId) {
  try { return JSON.parse(fs.readFileSync(getUserChatFile(userId), 'utf8')); }
  catch { return []; }
}
function saveScratchpad(msgs, userId) { fs.writeFileSync(getUserChatFile(userId), JSON.stringify(msgs, null, 2)); }

function loadTasks() {
  try { return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8')); }
  catch { return generateDefaultTasks(); }
}
function saveTasks(tasks) { fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2)); }

function generateDefaultTasks() {
  const tasks = [
    { id: 't1', title: 'Close 3 kindergarten pilot contracts', company: 'IAM', priority: 0, status: 'in-progress', due: '2026-02-15', notes: 'Follow up with Kita Sonnenschein, Regenbogen, Sternchen' },
    { id: 't2', title: 'Finalize IAM pricing tier for 10+ seats', company: 'IAM', priority: 1, status: 'todo', due: '2026-02-12', notes: '' },
    { id: 't3', title: 'IAM demo video for kindergarten sales', company: 'IAM', priority: 2, status: 'todo', due: '2026-02-20', notes: '' },
    { id: 't4', title: 'Submit ZenithCred pitch deck v3 to investors', company: 'ZenithCred', priority: 0, status: 'in-progress', due: '2026-02-11', notes: 'Deck updated, need final review' },
    { id: 't5', title: 'ZenithCred €1.1M seed round - investor outreach', company: 'ZenithCred', priority: 0, status: 'in-progress', due: '2026-03-01', notes: '3 warm intros pending' },
    { id: 't6', title: 'ZenithCred SCHUFA API integration spec', company: 'ZenithCred', priority: 1, status: 'todo', due: '2026-02-18', notes: '' },
    { id: 't7', title: 'OttoGen MVP feature freeze', company: 'OttoGen', priority: 0, status: 'in-progress', due: '2026-02-14', notes: 'Core generation pipeline stable' },
    { id: 't8', title: 'OttoGen landing page + waitlist', company: 'OttoGen', priority: 1, status: 'todo', due: '2026-02-17', notes: '' },
    { id: 't9', title: 'OttoGen beta user onboarding flow', company: 'OttoGen', priority: 2, status: 'todo', due: '2026-02-25', notes: '' },
    { id: 't10', title: 'Chimera Phase 3 architecture doc', company: 'Chimera', priority: 1, status: 'in-progress', due: '2026-02-13', notes: 'Memory graph + agent orchestration' },
    { id: 't11', title: 'Chimera unified.db migration to v2 schema', company: 'Chimera', priority: 2, status: 'todo', due: '2026-02-22', notes: '' },
    { id: 't12', title: 'CuttingEdge client proposal - Munich project', company: 'CuttingEdge', priority: 1, status: 'todo', due: '2026-02-16', notes: '' },
    { id: 't13', title: 'CuttingEdge invoice batch February', company: 'CuttingEdge', priority: 2, status: 'done', due: '2026-02-05', notes: 'Sent and confirmed' },
    { id: 't14', title: 'SentinAgro sensor dashboard wireframes', company: 'SentinAgro', priority: 1, status: 'todo', due: '2026-02-19', notes: '' },
    { id: 't15', title: 'SentinAgro IoT gateway prototype', company: 'SentinAgro', priority: 2, status: 'in-progress', due: '2026-02-28', notes: 'ESP32 + LoRa testing' },
    { id: 't16', title: 'Abura brand identity finalization', company: 'Abura', priority: 1, status: 'in-progress', due: '2026-02-10', notes: 'Logo variations ready' },
    { id: 't17', title: 'Abura e-commerce platform evaluation', company: 'Abura', priority: 2, status: 'todo', due: '2026-02-24', notes: 'Shopify vs custom' },
    { id: 't18', title: 'Weekly investor update email', company: 'ZenithCred', priority: 1, status: 'todo', due: '2026-02-10', notes: '' },
    { id: 't19', title: 'Review Kira dashboard deployment', company: 'Chimera', priority: 0, status: 'in-progress', due: '2026-02-10', notes: 'This dashboard!' },
    { id: 't20', title: 'IAM GDPR compliance audit', company: 'IAM', priority: 1, status: 'todo', due: '2026-03-01', notes: '' },
  ];
  saveTasks(tasks);
  return tasks;
}

// --- Per-user SQLite DB (projects/goals/tasks/subtasks) ---
const userDbs = new Map();
function getUserDb(userId) {
  if (userDbs.has(userId)) return userDbs.get(userId);
  const dbPath = path.join(__dirname, 'data', 'users', userId, 'kira.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const udb = new Database(dbPath);
  udb.pragma('foreign_keys = ON');
  // Migrate: drop old-schema tables if they lack project_id column
  try {
    const cols = udb.prepare("PRAGMA table_info(tasks)").all().map(c => c.name);
    if (cols.length > 0 && !cols.includes('project_id')) {
      udb.exec('DROP TABLE IF EXISTS tasks'); udb.exec('DROP TABLE IF EXISTS goals');
    }
  } catch {};
  udb.exec(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
    status TEXT DEFAULT 'backlog', deadline TEXT, position REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);
  udb.exec(`CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY, project_id TEXT, parent_id TEXT, title TEXT NOT NULL, description TEXT,
    target_date TEXT, cadence TEXT DEFAULT 'monthly', status TEXT DEFAULT 'active',
    level TEXT DEFAULT 'objective', progress REAL DEFAULT 0, notion_id TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES goals(id) ON DELETE SET NULL
  )`);
  // Migrate: add columns if missing
  try { udb.exec('ALTER TABLE goals ADD COLUMN parent_id TEXT'); } catch {}
  try { udb.exec('ALTER TABLE goals ADD COLUMN level TEXT DEFAULT "objective"'); } catch {}
  try { udb.exec('ALTER TABLE goals ADD COLUMN progress REAL DEFAULT 0'); } catch {}
  try { udb.exec('ALTER TABLE goals ADD COLUMN notion_id TEXT'); } catch {}
  try { udb.exec('ALTER TABLE tasks ADD COLUMN notion_id TEXT'); } catch {}
  udb.exec(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, project_id TEXT, goal_id TEXT, title TEXT NOT NULL, description TEXT,
    status TEXT DEFAULT 'backlog', priority INTEGER DEFAULT 2, due_date TEXT,
    assignee TEXT DEFAULT 'user', effort TEXT DEFAULT 'M', position REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
  )`);
  udb.exec(`CREATE TABLE IF NOT EXISTS subtasks (
    id TEXT PRIMARY KEY, task_id TEXT NOT NULL, title TEXT NOT NULL,
    done INTEGER DEFAULT 0, position REAL DEFAULT 0, completed_at TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  )`);
  // Documents (Notion-style)
  udb.exec(`CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    doc_type TEXT DEFAULT 'note',
    icon TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    is_folder INTEGER DEFAULT 0,
    position REAL DEFAULT 0,
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES documents(id) ON DELETE CASCADE
  )`);
  udb.exec(`CREATE TABLE IF NOT EXISTS document_versions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  )`);
  // FTS5 for full-text search
  try {
    udb.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(title, content, content=documents, content_rowid=rowid)`);
  } catch {}
  // Triggers to keep FTS in sync
  try {
    udb.exec(`CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
      INSERT INTO documents_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
    END`);
    udb.exec(`CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, title, content) VALUES('delete', old.rowid, old.title, old.content);
    END`);
    udb.exec(`CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, title, content) VALUES('delete', old.rowid, old.title, old.content);
      INSERT INTO documents_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
    END`);
  } catch {}
  userDbs.set(userId, udb);
  return udb;
}

// --- Helper functions ---
function calcHealthColor(project, tasks) {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  if (total === 0) return 'gray';
  if (!project.deadline) return done === total ? 'green' : 'blue';
  const now = new Date();
  const start = new Date(project.created_at);
  const end = new Date(project.deadline);
  const timeElapsed = (now - start) / (end - start);
  const workDone = done / total;
  const ratio = workDone / Math.max(timeElapsed, 0.01);
  if (ratio >= 0.9) return 'green';
  if (ratio >= 0.6) return 'yellow';
  if (ratio >= 0.3) return 'orange';
  return 'red';
}
function calcVelocity(db) {
  const weekAgo = new Date(Date.now() - 7*86400000).toISOString();
  const completed = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='done' AND updated_at > ?").get(weekAgo);
  return Math.round((completed.c / 7) * 10) / 10;
}
function calcStreak(db) {
  let streak = 0;
  let day = new Date();
  while (true) {
    const dayStr = day.toISOString().split('T')[0];
    const count = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='done' AND date(updated_at)=?").get(dayStr);
    if (count.c === 0) break;
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

const crypto = require('crypto');

// Goals data
const NOTION_KEY = fs.readFileSync(path.join(HOME, '.config/notion/api_key'), 'utf8').trim();
const NOTION_VERSION = '2022-06-28';
const GOALS_DB = '2fba6c94-88ca-8102-afb2-cae874f281bd';

let goalsCache = { data: null, ts: 0 };

function getGoals() {
  // Return cache if fresh (<2 min)
  if (goalsCache.data && Date.now() - goalsCache.ts < 120000) return goalsCache.data;
  
  try {
    const res = execSync(`curl -s -H "Authorization: Bearer ${NOTION_KEY}" -H "Notion-Version: ${NOTION_VERSION}" "https://api.notion.com/v1/databases/${GOALS_DB}/query" -X POST -H "Content-Type: application/json" -d '{"page_size":100}'`, { timeout: 15000 });
    const d = JSON.parse(res.toString());
    const goals = d.results.map(r => {
      const p = r.properties;
      const name = (p.Goal?.title || []).map(t => t.plain_text).join('');
      const status = p.Status?.select?.name || 'Not Started';
      const level = p.Level?.select?.name || '?';
      const progress = p.Progress?.number || 0;
      const owner = p.Owner?.select?.name || '?';
      const due = p['Due Date']?.date?.start || null;
      const timeframe = p.Timeframe?.select?.name || null;
      const keyResults = (p['Key Results']?.rich_text || []).map(t => t.plain_text).join('');
      
      // Map status to dashboard status
      const dashStatus = status === 'Achieved' ? 'on-track' : 
                          status === 'In Progress' ? (progress > 30 ? 'on-track' : 'behind') : 
                          status === 'Abandoned' ? 'at-risk' : 'behind';
      
      return { id: r.id, name, status: dashStatus, notionStatus: status, level, current: progress, target: 100, unit: '%', owner, due, timeframe, keyResults };
    });
    goalsCache = { data: goals, ts: Date.now() };
    return goals;
  } catch(e) {
    console.error('Goals fetch error:', e.message);
    return goalsCache.data || [];
  }
}

let db;
try { db = new Database(UNIFIED_DB, { readonly: true }); } catch(e) { console.error('DB error:', e.message); }

const ALLOWED_ORIGIN = process.env.KIRA_CORS_ORIGIN || '*';
const server = http.createServer(async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = url.pathname;
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;

  // Global IP rate limit (60 req/s per IP)
  if (!auth.checkRate('ip:' + clientIP, 60, 1)) {
    res.writeHead(429, headers); res.end(JSON.stringify({ error: 'Too many requests' })); return;
  }

  try {
    // Static files
    if (route === '/' || route === '/index.html') {
      // If authenticated → serve dashboard, else → serve splash
      const user = auth.extractUser(req);
      const splashPath = path.join(__dirname, 'public', 'splash.html');
      if (!user && fs.existsSync(splashPath)) {
        serve(res, splashPath, 'text/html');
      } else {
        serve(res, path.join(__dirname, 'public', 'index.html'), 'text/html');
      }
    }
    else if (route === '/dashboard') { serve(res, path.join(__dirname, 'public', 'index.html'), 'text/html'); }
    else if (route === '/favicon.svg') { serveStatic(res, '/favicon.svg'); }
    else if (route.startsWith('/assets/')) { serveStatic(res, route); }
    else if (route.startsWith('/public/')) { serveStatic(res, route); }

    // Auth APIs (public)
    else if (route === '/api/auth/register' && req.method === 'POST') {
      const body = await readBody(req);
      if (!auth.checkRate(`register:ip:${clientIP}`, 5, 900) || !auth.checkRate(`register:${body.email || ''}`, 5, 900)) {
        res.writeHead(429, headers); res.end(JSON.stringify({ error: 'Too many attempts' })); return;
      }
      try {
        const result = auth.register(body.email, body.password, body.displayName);
        // TODO: send verification email. For now, auto-verify
        auth.verifyEmail(result.email, result.code);
        const loginResult = auth.login(body.email, body.password);
        json(res, headers, loginResult);
      } catch (e) { res.writeHead(400, headers); res.end(JSON.stringify({ error: e.message })); }
    }
    else if (route === '/api/auth/login' && req.method === 'POST') {
      const body = await readBody(req);
      if (!auth.checkRate(`login:ip:${clientIP}`, 10, 900) || !auth.checkRate(`login:${body.email || ''}`, 5, 900)) {
        res.writeHead(429, headers); res.end(JSON.stringify({ error: 'Too many attempts' })); return;
      }
      try {
        const result = auth.login(body.email, body.password);
        json(res, headers, result);
      } catch (e) { res.writeHead(401, headers); res.end(JSON.stringify({ error: e.message })); }
    }
    else if (route === '/api/auth/refresh' && req.method === 'POST') {
      const body = await readBody(req);
      try {
        const result = auth.refresh(body.refreshToken);
        json(res, headers, result);
      } catch (e) { res.writeHead(401, headers); res.end(JSON.stringify({ error: e.message })); }
    }
    else if (route === '/api/auth/me' && req.method === 'GET') {
      const user = auth.extractUser(req);
      if (!user) { res.writeHead(401, headers); res.end(JSON.stringify({ error: 'Not authenticated' })); return; }
      json(res, headers, user);
    }
    else if (route === '/api/auth/logout' && req.method === 'POST') {
      const body = await readBody(req);
      try { auth.logout(body.refreshToken); } catch {}
      json(res, headers, { ok: true });
    }
    else if (route === '/api/health') {
      json(res, headers, { status: 'ok', uptime: process.uptime() });
    }

    // SSE endpoint — handles its own auth via query param token
    else if (route === '/api/chat/events') {
      handleChatSSE(req, res, null);
    }

    // Existing APIs — require authentication
    else if (route.startsWith('/api/') && !route.startsWith('/api/auth/') && route !== '/api/health') {
      // Service key for internal daemons (chat-sync, etc.)
      const serviceKey = req.headers['x-service-key'];
      const validService = serviceKey && serviceKey === (process.env.KIRA_SERVICE_KEY || '');
      const user = auth.extractUser(req);
      if (!user && !validService) { res.writeHead(401, headers); res.end(JSON.stringify({ error: 'Authentication required' })); return; }
      if (user) req._user = user;
      // Service requests target admin user by default
      if (validService && !user) {
        const adminUser = auth.listUsers().find(u => u.role === 'admin');
        if (adminUser) req._user = adminUser;
      }
      // Fall through to API routing below
      // --- Projects API ---
      const projectIdMatch = route.match(/^\/api\/projects\/([^/]+)$/);
      if (route === '/api/projects' && req.method === 'GET') {
        const udb = getUserDb(req._user.id);
        const projects = udb.prepare('SELECT * FROM projects ORDER BY position ASC, created_at DESC').all();
        const result = projects.map(p => {
          const tasks = udb.prepare('SELECT status FROM tasks WHERE project_id = ?').all(p.id);
          const task_count = tasks.length;
          const tasks_done = tasks.filter(t => t.status === 'done').length;
          const progress_pct = task_count ? Math.round((tasks_done / task_count) * 100) : 0;
          return { ...p, task_count, tasks_done, progress_pct, health_color: calcHealthColor(p, tasks) };
        });
        json(res, headers, result);
      }
      else if (route === '/api/projects' && req.method === 'POST') {
        const udb = getUserDb(req._user.id);
        const body = await readBody(req);
        const id = crypto.randomUUID();
        udb.prepare('INSERT INTO projects (id, title, description, status, deadline, position) VALUES (?,?,?,?,?,?)').run(
          id, body.title, body.description || null, body.status || 'backlog', body.deadline || null, body.position ?? 0
        );
        json(res, headers, { ok: true, data: udb.prepare('SELECT * FROM projects WHERE id = ?').get(id) });
      }
      else if (projectIdMatch && req.method === 'GET') {
        const udb = getUserDb(req._user.id);
        const pid = projectIdMatch[1];
        const project = udb.prepare('SELECT * FROM projects WHERE id = ?').get(pid);
        if (!project) { res.writeHead(404, headers); res.end(JSON.stringify({ error: 'Not found' })); }
        else {
          const goals = udb.prepare('SELECT * FROM goals WHERE project_id = ? ORDER BY created_at DESC').all(pid);
          const tasks = udb.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY position ASC').all(pid);
          const taskIds = tasks.map(t => t.id);
          const subtasks = taskIds.length ? udb.prepare('SELECT * FROM subtasks WHERE task_id IN (' + taskIds.map(() => '?').join(',') + ') ORDER BY position ASC').all(...taskIds) : [];
          const subtaskMap = {};
          subtasks.forEach(s => { (subtaskMap[s.task_id] = subtaskMap[s.task_id] || []).push(s); });
          const tasksWithSubs = tasks.map(t => ({ ...t, subtasks: subtaskMap[t.id] || [] }));
          const task_count = tasks.length;
          const tasks_done = tasks.filter(t => t.status === 'done').length;
          json(res, headers, { ...project, task_count, tasks_done, progress_pct: task_count ? Math.round((tasks_done / task_count) * 100) : 0, health_color: calcHealthColor(project, tasks), goals, tasks: tasksWithSubs });
        }
      }
      else if (projectIdMatch && req.method === 'PATCH') {
        const udb = getUserDb(req._user.id);
        const body = await readBody(req);
        const fields = ['title','description','status','deadline','position'];
        const sets = []; const vals = [];
        for (const f of fields) { if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]); } }
        if (sets.length) { sets.push("updated_at = datetime('now')"); vals.push(projectIdMatch[1]); udb.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...vals); }
        json(res, headers, { ok: true, data: udb.prepare('SELECT * FROM projects WHERE id = ?').get(projectIdMatch[1]) });
      }
      else if (projectIdMatch && req.method === 'DELETE') {
        const udb = getUserDb(req._user.id);
        udb.prepare('DELETE FROM projects WHERE id = ?').run(projectIdMatch[1]);
        json(res, headers, { ok: true });
      }

      // --- Tasks API ---
      else if ((() => { const m = route.match(/^\/api\/tasks\/([^/]+)\/move$/); if (m) { req._matchId = m[1]; return true; } return false; })() && req.method === 'PATCH') {
        const udb = getUserDb(req._user.id);
        const body = await readBody(req);
        udb.prepare("UPDATE tasks SET status = COALESCE(?, status), position = COALESCE(?, position), updated_at = datetime('now') WHERE id = ?").run(body.status || null, body.position ?? null, req._matchId);
        json(res, headers, { ok: true, data: udb.prepare('SELECT * FROM tasks WHERE id = ?').get(req._matchId) });
      }
      else if ((() => { const m = route.match(/^\/api\/tasks\/([^/]+)$/); if (m) { req._matchId = m[1]; return true; } return false; })() && req.method === 'PATCH') {
        const udb = getUserDb(req._user.id);
        const body = await readBody(req);
        const fields = ['title','description','status','priority','due_date','assignee','effort','position','project_id','goal_id'];
        const sets = []; const vals = [];
        for (const f of fields) { if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]); } }
        if (sets.length) { sets.push("updated_at = datetime('now')"); vals.push(req._matchId); udb.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...vals); }
        json(res, headers, { ok: true, data: udb.prepare('SELECT * FROM tasks WHERE id = ?').get(req._matchId) });
      }
      else if (route.match(/^\/api\/tasks\/([^/]+)$/) && req.method === 'DELETE') {
        const udb = getUserDb(req._user.id);
        const tid = route.match(/^\/api\/tasks\/([^/]+)$/)[1];
        udb.prepare('DELETE FROM tasks WHERE id = ?').run(tid);
        json(res, headers, { ok: true });
      }
      else if (route === '/api/tasks' && req.method === 'GET') {
        const udb = getUserDb(req._user.id);
        let sql = 'SELECT * FROM tasks'; const clauses = []; const params = [];
        const qs = url.searchParams.get('status'); const qp = url.searchParams.get('project_id'); const qg = url.searchParams.get('goal_id');
        if (qs) { clauses.push('status = ?'); params.push(qs); }
        if (qp) { clauses.push('project_id = ?'); params.push(qp); }
        if (qg) { clauses.push('goal_id = ?'); params.push(qg); }
        if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
        sql += ' ORDER BY position ASC, created_at DESC';
        json(res, headers, udb.prepare(sql).all(...params));
      }
      else if (route === '/api/tasks' && req.method === 'POST') {
        const udb = getUserDb(req._user.id);
        const body = await readBody(req);
        const id = crypto.randomUUID();
        udb.prepare('INSERT INTO tasks (id, project_id, goal_id, title, description, status, priority, due_date, assignee, effort, position) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
          id, body.project_id || null, body.goal_id || null, body.title, body.description || null, body.status || 'backlog', body.priority ?? 2, body.due_date || null, body.assignee || 'user', body.effort || 'M', body.position ?? 0
        );
        // Auto-generate subtasks from description lines
        if (body.description) {
          const lines = body.description.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          lines.forEach((line, i) => {
            udb.prepare('INSERT INTO subtasks (id, task_id, title, position) VALUES (?,?,?,?)').run(crypto.randomUUID(), id, line, i);
          });
        }
        const task = udb.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        const subs = udb.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC').all(id);
        json(res, headers, { ok: true, data: { ...task, subtasks: subs } });
      }

      // --- Subtasks API ---
      else if ((() => { const m = route.match(/^\/api\/subtasks\/([^/]+)$/); if (m) { req._matchId = m[1]; return true; } return false; })() && req.method === 'PATCH') {
        const udb = getUserDb(req._user.id);
        const body = await readBody(req);
        const sets = []; const vals = [];
        if (body.title !== undefined) { sets.push('title = ?'); vals.push(body.title); }
        if (body.done !== undefined) { sets.push('done = ?'); vals.push(body.done ? 1 : 0); if (body.done) sets.push("completed_at = datetime('now')"); else sets.push('completed_at = NULL'); }
        if (sets.length) { vals.push(req._matchId); udb.prepare(`UPDATE subtasks SET ${sets.join(', ')} WHERE id = ?`).run(...vals); }
        json(res, headers, { ok: true, data: udb.prepare('SELECT * FROM subtasks WHERE id = ?').get(req._matchId) });
      }
      else if (route.match(/^\/api\/subtasks\/([^/]+)$/) && req.method === 'DELETE') {
        const udb = getUserDb(req._user.id);
        udb.prepare('DELETE FROM subtasks WHERE id = ?').run(route.match(/^\/api\/subtasks\/([^/]+)$/)[1]);
        json(res, headers, { ok: true });
      }
      else if (route === '/api/subtasks' && req.method === 'GET') {
        const udb = getUserDb(req._user.id);
        const tid = url.searchParams.get('task_id');
        const rows = tid ? udb.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC').all(tid) : udb.prepare('SELECT * FROM subtasks ORDER BY position ASC').all();
        json(res, headers, rows);
      }
      else if (route === '/api/subtasks' && req.method === 'POST') {
        const udb = getUserDb(req._user.id);
        const body = await readBody(req);
        const id = crypto.randomUUID();
        udb.prepare('INSERT INTO subtasks (id, task_id, title, position) VALUES (?,?,?,?)').run(id, body.task_id, body.title, body.position ?? 0);
        json(res, headers, { ok: true, data: udb.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) });
      }

      // --- Goals API ---
      else if (route.match(/^\/api\/goals\/([^/]+)$/) && req.method !== 'GET' && route !== '/api/goals/notion') {
        const gid = route.match(/^\/api\/goals\/([^/]+)$/)[1];
        const udb = getUserDb(req._user.id);
        if (req.method === 'PATCH') {
          const body = await readBody(req);
          const fields = ['title','description','status','target_date','cadence','project_id','parent_id','level','progress','notion_id'];
          const sets = []; const vals = [];
          for (const f of fields) { if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]); } }
          if (sets.length) { sets.push("updated_at = datetime('now')"); vals.push(gid); udb.prepare(`UPDATE goals SET ${sets.join(', ')} WHERE id = ?`).run(...vals); }
          json(res, headers, { ok: true, data: udb.prepare('SELECT * FROM goals WHERE id = ?').get(gid) });
        } else if (req.method === 'DELETE') {
          udb.prepare('DELETE FROM goals WHERE id = ?').run(gid);
          json(res, headers, { ok: true });
        }
      }
      else if (route === '/api/goals' && req.method === 'GET') {
        const udb = getUserDb(req._user.id);
        let sql = 'SELECT * FROM goals'; const clauses = []; const params = [];
        const qp = url.searchParams.get('project_id');
        const ql = url.searchParams.get('level');
        const qparent = url.searchParams.get('parent_id');
        if (qp) { clauses.push('project_id = ?'); params.push(qp); }
        if (ql) { clauses.push('level = ?'); params.push(ql); }
        if (qparent === 'null') { clauses.push('parent_id IS NULL'); }
        else if (qparent) { clauses.push('parent_id = ?'); params.push(qparent); }
        if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
        sql += ' ORDER BY level ASC, created_at ASC';
        const goals = udb.prepare(sql).all(...params);
        // Enrich with child count and task count
        goals.forEach(g => {
          g.child_count = udb.prepare('SELECT COUNT(*) as c FROM goals WHERE parent_id = ?').get(g.id).c;
          g.task_count = udb.prepare('SELECT COUNT(*) as c FROM tasks WHERE goal_id = ?').get(g.id).c;
        });
        json(res, headers, goals);
      }
      else if (route === '/api/goals' && req.method === 'POST') {
        const udb = getUserDb(req._user.id);
        const body = await readBody(req);
        const id = crypto.randomUUID();
        udb.prepare('INSERT INTO goals (id, project_id, parent_id, title, description, target_date, cadence, status, level, progress, notion_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
          id, body.project_id || null, body.parent_id || null, body.title, body.description || null, body.target_date || null, body.cadence || 'monthly', body.status || 'active', body.level || 'objective', body.progress || 0, body.notion_id || null
        );
        json(res, headers, { ok: true, data: udb.prepare('SELECT * FROM goals WHERE id = ?').get(id) });
      }

      // --- Overview (aggregated) ---
      else if (route === '/api/overview') {
        const udb = getUserDb(req._user.id);
        const tasksByStatus = {};
        for (const row of udb.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status').all()) tasksByStatus[row.status] = row.count;
        const today = new Date().toISOString().split('T')[0];
        const dueToday = udb.prepare("SELECT COUNT(*) as c FROM tasks WHERE due_date = ? AND status != 'done'").get(today)?.c || 0;
        const projects = udb.prepare('SELECT * FROM projects ORDER BY position ASC').all().map(p => {
          const tasks = udb.prepare('SELECT status FROM tasks WHERE project_id = ?').all(p.id);
          return { ...p, task_count: tasks.length, tasks_done: tasks.filter(t => t.status === 'done').length, health_color: calcHealthColor(p, tasks) };
        });
        json(res, headers, { projects, tasks_by_status: tasksByStatus, velocity: calcVelocity(udb), streak: calcStreak(udb), due_today: dueToday, timestamp: new Date().toISOString() });
      }

    else if (route === '/api/pm2') { getPM2(res, headers); }
    else if (route === '/api/system') { json(res, headers, getSystem()); }
    else if (route === '/api/git') { json(res, headers, getGitStatus()); }
    else if (route === '/api/cron') { getCron(res, headers); }
    else if (route === '/api/sessions') { getSessions(res, headers); }
    else if (route === '/api/memory') { json(res, headers, getMemory()); }
    else if (route === '/api/memory/file') { json(res, headers, getMemoryFile(url.searchParams.get('path') || '')); }

    // New APIs
    else if (route === '/api/brief') { json(res, headers, getMorningBrief()); }
    else if (route === '/api/goals/notion') { json(res, headers, getGoals()); }
    else if (route === '/api/knowledge/entities') { json(res, headers, getEntities(url)); }
    else if (route === '/api/knowledge/graph') { json(res, headers, getKnowledgeGraph(url)); }
    else if (route === '/api/knowledge/entity') { json(res, headers, getEntityDetail(url.searchParams.get('id'))); }
    else if (route === '/api/episodes') { json(res, headers, getEpisodes(url)); }
    else if (route === '/api/sync/morning') { json(res, headers, generateMorningSync()); }

    // Chat APIs (specific routes first, catch-all last)
    else if (route === '/api/chat/enrichment' && req.method === 'GET') {
      const ts = url.searchParams.get('ts');
      const logFile = path.join(__dirname, '..', 'memory', 'enrichment-log.json');
      try {
        const log = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        if (ts) {
          const target = new Date(ts).getTime();
          const match = [...log].reverse().find(e => Math.abs(new Date(e.timestamp).getTime() - target) < 30000)
            || [...log].reverse().find(e => Math.abs(new Date(e.timestamp).getTime() - target) < 120000);
          json(res, headers, match || { error: 'not found' });
        } else {
          json(res, headers, log.slice(-20));
        }
      } catch { json(res, headers, []); }
    }
    else if (route.startsWith('/api/chat') && req.method === 'GET') {
      const userId = req._user?.id;
      const msgs = loadScratchpad(userId);
      const u = new URL(req.url, 'http://localhost');
      const limit = parseInt(u.searchParams.get('limit')) || 200;
      console.log(`[DEBUG] GET /api/chat userId=${userId} totalMsgs=${msgs.length} returning=${msgs.slice(-limit).length}`);
      json(res, headers, msgs.slice(-limit));
    }
    else if (route === '/api/transcribe' && req.method === 'POST') {
      // Voice transcription endpoint — receives raw audio, sends to Whisper
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const audioBuffer = Buffer.concat(chunks);
        if (!audioBuffer.length) { json(res, headers, { error: 'No audio data' }, 400); return; }
        
        const tmpPath = `/tmp/webui_voice_${Date.now()}.webm`;
        fs.writeFileSync(tmpPath, audioBuffer);
        
        // Send to Whisper via GPU Router
        const whisperResp = await fetch('http://localhost:3853/transcribe-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: tmpPath })
        });
        const result = await whisperResp.json();
        try { fs.unlinkSync(tmpPath); } catch {}
        
        // V2: Apply voice post-processing pipeline
        if (result.text) {
          try {
            const { postProcessVoice } = require('/home/adminuser/kira/scripts/memory/nlp-graph-layer');
            const pp = postProcessVoice(result.text, result.language);
            result.originalText = result.text;
            result.text = pp.text;
            result.postProcessSteps = pp.steps;
          } catch (ppErr) {
            console.error('[transcribe] Post-processing error:', ppErr.message);
            // Non-fatal — return raw transcription
          }
        }
        
        json(res, headers, result);
      } catch (err) {
        console.error('[transcribe]', err.message);
        json(res, headers, { error: err.message }, 500);
      }
    }
    else if (route === '/api/chat' && req.method === 'POST') { handleChatPost(req, res, headers, req._user?.id); }
    else if (route === '/api/chat/sync' && req.method === 'POST') { handleChatSync(req, res, headers, req._user?.id); }
    else if (route === '/api/chat/diff-context') {
      // Return surrounding context lines for a file edit
      const body = await readBody(req);
      const filePath = body.file_path || '';
      const oldStr = body.old_string || '';
      const ctxLines = body.context || 5;
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileLines = content.split('\n');
        // Try to find the old_string OR new_string in current file (file may have changed)
        const newStr = body.new_string || '';
        const searchStr = newStr || oldStr; // prefer new_string since file already has it after edit
        const searchLines = searchStr.split('\n');
        let startLine = -1;
        for (let i = 0; i <= fileLines.length - searchLines.length; i++) {
          if (fileLines[i].trimEnd() === searchLines[0].trimEnd()) {
            let match = true;
            for (let j = 1; j < searchLines.length; j++) {
              if (fileLines[i + j]?.trimEnd() !== searchLines[j]?.trimEnd()) { match = false; break; }
            }
            if (match) { startLine = i; break; }
          }
        }
        // If we can't find the new text, try old text (maybe file reverted)
        if (startLine === -1 && oldStr) {
          const oldLines = oldStr.split('\n');
          for (let i = 0; i <= fileLines.length - oldLines.length; i++) {
            if (fileLines[i].trimEnd() === oldLines[0].trimEnd()) {
              let match = true;
              for (let j = 1; j < oldLines.length; j++) {
                if (fileLines[i + j]?.trimEnd() !== oldLines[j]?.trimEnd()) { match = false; break; }
              }
              if (match) { startLine = i; break; }
            }
          }
        }
        if (startLine === -1) { json(res, headers, { found: false }); return; }
        const before = fileLines.slice(Math.max(0, startLine - ctxLines), startLine);
        const after = fileLines.slice(startLine + searchLines.length, startLine + searchLines.length + ctxLines);
        json(res, headers, {
          found: true,
          startLine: Math.max(0, startLine - ctxLines) + 1, // 1-indexed
          editStartLine: startLine + 1,
          before, after
        });
      } catch(e) { json(res, headers, { found: false, error: e.message }); }
    }
    // enrichment route handled above (before catch-all chat GET)

    // VDR APIs (per-user)
    else if (route === '/api/vdr') {
      const user = auth.extractUser(req);
      const userVdr = user ? getUserVDR(user.id) : VDR;
      json(res, headers, getVDRList(url.searchParams.get('dir') || '', userVdr));
    }
    else if (route === '/api/vdr/search') {
      const user = auth.extractUser(req);
      const userVdr = user ? getUserVDR(user.id) : VDR;
      const q = (url.searchParams.get('q') || '').toLowerCase().trim();
      if (!q) { json(res, headers, { results: [] }); }
      else { json(res, headers, { results: searchVDR(q, userVdr) }); }
    }
    else if (route === '/api/vdr/file') {
      const user = auth.extractUser(req);
      const userVdr = user ? getUserVDR(user.id) : VDR;
      json(res, headers, getVDRFile(url.searchParams.get('path') || '', userVdr));
    }

    // Agent status API — is Kira currently working?
    else if (route === '/api/agent/status' && req.method === 'GET') {
      try {
        const { execFileSync } = require('child_process');
        const sessFile = path.join(process.env.HOME || '/home/adminuser', '.openclaw/agents/main/sessions/sessions.json');
        const sessData = JSON.parse(fs.readFileSync(sessFile, 'utf8'));
        const mainSess = sessData['agent:main:main'] || {};
        const mainAge = mainSess.updatedAt ? Date.now() - mainSess.updatedAt : 999999;
        // Check JSONL for latest partial message
        const sessId = 'dd3de969-b7ee-41f5-8621-68f53d29dfb7';
        const jsonlPath = path.join(process.env.HOME || '/home/adminuser', '.openclaw/agents/main/sessions', sessId + '.jsonl');
        let lastEntry = null;
        if (fs.existsSync(jsonlPath)) {
          const content = fs.readFileSync(jsonlPath, 'utf8');
          const lines = content.trim().split('\n');
          const last = lines[lines.length - 1];
          try { lastEntry = JSON.parse(last); } catch {}
        }
        const isWorking = mainAge < 30000; // updated in last 30s
        const lastRole = lastEntry?.message?.role || 'unknown';
        json(res, headers, { working: isWorking, lastRole, ageMs: mainAge });
      } catch {
        json(res, headers, { working: false, lastRole: 'unknown', ageMs: 0 });
      }
    }

    // Sub-agents API
    else if (route === '/api/agents' && req.method === 'GET') {
      try {
        const { execFileSync } = require('child_process');
        // Get session list from CLI (has token counts, ageMs)
        const raw = execFileSync('openclaw', ['sessions', 'list', '--json', '--message-limit', '1'], { timeout: 5000 }).toString();
        const sessions = JSON.parse(raw);
        // Also read sessions.json directly (has labels)
        let sessionsData = {};
        try {
          const sessFile = path.join(process.env.HOME || '/home/adminuser', '.openclaw/agents/main/sessions/sessions.json');
          sessionsData = JSON.parse(fs.readFileSync(sessFile, 'utf8'));
        } catch {}
        
        const subagents = (Array.isArray(sessions) ? sessions : sessions.sessions || [])
          .filter(s => s.key?.includes('subagent') || s.sessionKey?.includes('subagent') || s.kind === 'sub-agent')
          .map(s => {
            const key = s.key || s.sessionKey;
            const stored = sessionsData[key] || {};
            const labelFromKey = key?.split(':').pop()?.substring(0, 8) || '?';
            const ageMs = s.ageMs || 0;
            const status = ageMs < 120000 ? 'running' : 'completed';
            const lastActivityMs = s.updatedAt || stored.updatedAt || Date.now();
            return {
              sessionKey: key,
              label: stored.label || s.label || labelFromKey,
              status,
              model: s.model,
              createdAt: s.updatedAt ? new Date(s.updatedAt - ageMs).toISOString() : undefined,
              lastActivity: new Date(lastActivityMs).toISOString(),
              ageMs,
              tokens: s.totalTokens,
              messages: s.lastMessages || []
            };
          })
          .sort((a, b) => (b.lastActivity || b.createdAt || '').localeCompare(a.lastActivity || a.createdAt || ''));
        json(res, headers, subagents);
      } catch (e) {
        json(res, headers, []);
      }
    }
    else if (route.match(/^\/api\/agents\/(.+)\/history$/) && req.method === 'GET') {
      const sk = decodeURIComponent(route.match(/^\/api\/agents\/(.+)\/history$/)[1]);
      try {
        // Read from sessions.json to find transcript path
        const sessionsFile = path.join(HOME, '.openclaw/agents/main/sessions/sessions.json');
        const sessions = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
        const session = sessions[sk] || (sessions.sessions || []).find(s => s.key === sk);
        if (!session) { json(res, headers, []); return; }
        
        const transcript = session.transcriptPath || (session.sessionId ? session.sessionId + '.jsonl' : null);
        if (!transcript) { json(res, headers, []); return; }
        
        const jsonlPath = path.join(HOME, '.openclaw/agents/main/sessions', transcript);
        if (!fs.existsSync(jsonlPath)) { json(res, headers, []); return; }
        
        const lines = fs.readFileSync(jsonlPath, 'utf8').split('\n').filter(Boolean);
        const messages = [];
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (entry.type === 'message' && entry.message) {
              const m = entry.message;
              let content = m.content || '';
              if (Array.isArray(content)) {
                content = content.filter(c => c.type === 'text').map(c => c.text || '').join('\n');
              }
              if (content && m.role !== 'system') {
                messages.push({ role: m.role || 'unknown', content });
              }
            }
          } catch {}
        }
        json(res, headers, messages.slice(-20));
      } catch (e) {
        console.error('[agents/history] error:', e.message);
        json(res, headers, []);
      }
    }

    // Documents API (database-backed)
    else if (route === '/api/documents/search' && req.method === 'GET') {
      const udb = getUserDb(req._user.id);
      const q = url.searchParams.get('q') || '';
      if (!q.trim()) { json(res, headers, []); }
      else {
        try {
          const results = udb.prepare(`
            SELECT d.id, d.parent_id, d.title, d.doc_type, d.icon, d.tags, d.is_folder,
              d.created_at, d.updated_at, snippet(documents_fts, 1, '<mark>', '</mark>', '...', 40) as snippet
            FROM documents_fts f JOIN documents d ON d.rowid = f.rowid
            WHERE documents_fts MATCH ? ORDER BY rank LIMIT 50
          `).all(q.trim() + '*');
          json(res, headers, results);
        } catch {
          // Fallback to LIKE if FTS fails
          const results = udb.prepare(`SELECT * FROM documents WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC LIMIT 50`)
            .all('%'+q.trim()+'%', '%'+q.trim()+'%');
          json(res, headers, results);
        }
      }
    }
    else if (route === '/api/documents/tree' && req.method === 'GET') {
      const udb = getUserDb(req._user.id);
      const parentId = url.searchParams.get('parent_id');
      let docs;
      if (parentId === 'null' || parentId === '') {
        docs = udb.prepare('SELECT id, parent_id, title, doc_type, icon, tags, is_folder, position, created_at, updated_at, LENGTH(content) as content_length FROM documents WHERE parent_id IS NULL ORDER BY is_folder DESC, position ASC, updated_at DESC').all();
      } else if (parentId) {
        docs = udb.prepare('SELECT id, parent_id, title, doc_type, icon, tags, is_folder, position, created_at, updated_at, LENGTH(content) as content_length FROM documents WHERE parent_id = ? ORDER BY is_folder DESC, position ASC, updated_at DESC').all(parentId);
      } else {
        docs = udb.prepare('SELECT id, parent_id, title, doc_type, icon, tags, is_folder, position, created_at, updated_at, LENGTH(content) as content_length FROM documents ORDER BY is_folder DESC, position ASC, updated_at DESC').all();
      }
      // Enrich with child count
      docs.forEach(d => {
        d.child_count = udb.prepare('SELECT COUNT(*) as c FROM documents WHERE parent_id = ?').get(d.id).c;
      });
      json(res, headers, docs);
    }
    else if (route === '/api/documents' && req.method === 'POST') {
      const udb = getUserDb(req._user.id);
      const body = await readBody(req);
      const id = crypto.randomUUID();
      udb.prepare(`INSERT INTO documents (id, parent_id, title, content, doc_type, icon, tags, is_folder, position, metadata)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
        id, body.parent_id || null, body.title || 'Untitled', body.content || '', body.doc_type || 'note',
        body.icon || '', JSON.stringify(body.tags || []), body.is_folder ? 1 : 0, body.position || 0, JSON.stringify(body.metadata || {})
      );
      json(res, headers, udb.prepare('SELECT * FROM documents WHERE id = ?').get(id));
    }
    else if (route.match(/^\/api\/documents\/([^/]+)$/) && req.method === 'GET') {
      const docId = route.match(/^\/api\/documents\/([^/]+)$/)[1];
      const udb = getUserDb(req._user.id);
      const doc = udb.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
      if (!doc) { res.writeHead(404, headers); res.end(JSON.stringify({ error: 'Not found' })); }
      else { json(res, headers, doc); }
    }
    else if (route.match(/^\/api\/documents\/([^/]+)$/) && req.method === 'PATCH') {
      const docId = route.match(/^\/api\/documents\/([^/]+)$/)[1];
      const udb = getUserDb(req._user.id);
      const body = await readBody(req);
      // Save version before updating content
      if (body.content !== undefined) {
        const old = udb.prepare('SELECT content FROM documents WHERE id = ?').get(docId);
        if (old) {
          udb.prepare('INSERT INTO document_versions (id, document_id, content) VALUES (?,?,?)').run(crypto.randomUUID(), docId, old.content);
        }
      }
      const fields = ['title','content','doc_type','icon','tags','is_folder','position','parent_id','metadata'];
      const sets = []; const vals = [];
      for (const f of fields) {
        if (body[f] !== undefined) {
          sets.push(`${f} = ?`);
          vals.push(f === 'tags' || f === 'metadata' ? JSON.stringify(body[f]) : body[f]);
        }
      }
      if (sets.length) { sets.push("updated_at = datetime('now')"); vals.push(docId); udb.prepare(`UPDATE documents SET ${sets.join(', ')} WHERE id = ?`).run(...vals); }
      json(res, headers, udb.prepare('SELECT * FROM documents WHERE id = ?').get(docId));
    }
    else if (route.match(/^\/api\/documents\/([^/]+)$/) && req.method === 'DELETE') {
      const docId = route.match(/^\/api\/documents\/([^/]+)$/)[1];
      const udb = getUserDb(req._user.id);
      udb.prepare('DELETE FROM documents WHERE id = ?').run(docId);
      json(res, headers, { ok: true });
    }
    else if (route.match(/^\/api\/documents\/([^/]+)\/versions$/) && req.method === 'GET') {
      const docId = route.match(/^\/api\/documents\/([^/]+)\/versions$/)[1];
      const udb = getUserDb(req._user.id);
      json(res, headers, udb.prepare('SELECT id, document_id, created_at, LENGTH(content) as content_length FROM document_versions WHERE document_id = ? ORDER BY created_at DESC LIMIT 50').all(docId));
    }

      else { res.writeHead(404, headers); res.end(JSON.stringify({ error: 'Not found' })); }
    } // end auth-guarded API block
  } catch (e) {
    console.error('Server error:', e.stack || e);
    res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

function serve(res, filepath, ct) {
  if (!fs.existsSync(filepath)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 
    'Content-Type': ct,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(fs.readFileSync(filepath, 'utf8'));
}
function json(res, headers, data) {
  res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
function serveStatic(res, route) {
  const fp = path.join(__dirname, 'public', route);
  if (!fs.existsSync(fp)) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(fp);
  const types = { '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain', 'Cache-Control': 'no-cache, must-revalidate' });
  res.end(fs.readFileSync(fp));
}
function readBody(req, maxBytes = 1048576) {
  return new Promise((resolve) => {
    let body = '', size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > maxBytes) { req.destroy(); resolve({ _oversized: true }); return; }
      body += c;
    });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

// --- Morning Brief ---
function getMorningBrief() {
  const now = new Date();
  const hour = now.getUTCHours();
  let greeting;
  if (hour < 6) greeting = 'Burning the midnight oil? ☕';
  else if (hour < 12) greeting = 'Good morning, Otto ☀️';
  else if (hour < 18) greeting = 'Good afternoon, Otto 🌤️';
  else greeting = 'Good evening, Otto 🌙';

  // Recent episodes (last 24h)
  let recentEpisodes = [];
  if (db) {
    const since = new Date(Date.now() - 86400000).toISOString();
    try {
      recentEpisodes = db.prepare(`SELECT * FROM episodes WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 20`).all(since);
    } catch {}
  }

  // Tasks due today
  const today = now.toISOString().split('T')[0];
  const tasks = loadTasks();
  const dueTasks = tasks.filter(t => t.due <= today && t.status !== 'done');

  // System health
  const system = getSystem();
  let gatewayOk = false;
  try { execSync('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18789/api/sessions 2>/dev/null'); gatewayOk = true; } catch {}

  let memoryOk = false;
  try { memoryOk = db !== undefined; } catch {}

  let cronJobs = 0;
  try {
    const out = execSync('curl -s http://127.0.0.1:18789/api/cron/list 2>/dev/null').toString();
    cronJobs = JSON.parse(out).jobs?.length || 0;
  } catch {}

  // Today's memory file
  const memFile = path.join(MEMORY, `${today}.md`);
  const todayLog = fs.existsSync(memFile) ? fs.readFileSync(memFile, 'utf8').slice(0, 3000) : null;

  return {
    greeting,
    timestamp: now.toISOString(),
    episodes: recentEpisodes,
    dueTasks,
    allTasks: { total: tasks.length, done: tasks.filter(t=>t.status==='done').length, inProgress: tasks.filter(t=>t.status==='in-progress').length },
    health: {
      gateway: gatewayOk,
      memory: memoryOk,
      cronJobs,
      system
    },
    todayLog,
    goals: getGoals()
  };
}

// --- Tasks CRUD ---
async function handleTasks(req, res, headers, url) {
  if (req.method === 'GET') {
    json(res, headers, loadTasks());
  } else if (req.method === 'POST') {
    const body = await readBody(req);
    const tasks = loadTasks();
    body.id = 't' + Date.now();
    tasks.push(body);
    saveTasks(tasks);
    json(res, headers, body);
  } else if (req.method === 'PUT') {
    const body = await readBody(req);
    const tasks = loadTasks();
    const idx = tasks.findIndex(t => t.id === body.id);
    if (idx >= 0) { tasks[idx] = { ...tasks[idx], ...body }; saveTasks(tasks); }
    json(res, headers, tasks[idx] || { error: 'not found' });
  } else if (req.method === 'DELETE') {
    const id = url.searchParams.get('id');
    let tasks = loadTasks();
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(tasks);
    json(res, headers, { ok: true });
  }
}

// --- Knowledge Graph ---
function getEntities(url) {
  if (!db) return { entities: [] };
  const type = url.searchParams.get('type');
  const search = url.searchParams.get('q');
  const limit = parseInt(url.searchParams.get('limit') || '200');
  let sql = 'SELECT * FROM entities';
  const params = [];
  const clauses = [];
  if (type) { clauses.push('type = ?'); params.push(type); }
  if (search) { clauses.push('(name LIKE ? OR description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
  sql += ' ORDER BY updated_at DESC LIMIT ?';
  params.push(limit);
  return { entities: db.prepare(sql).all(...params) };
}

function getKnowledgeGraph(url) {
  if (!db) return { nodes: [], links: [] };
  const limit = parseInt(url.searchParams.get('limit') || '10000');
  const type = url.searchParams.get('type');
  const search = url.searchParams.get('q');

  // Get entities
  let entSql = 'SELECT id, type, name, description FROM entities';
  const entParams = [];
  const clauses = [];
  if (type) { clauses.push('type = ?'); entParams.push(type); }
  if (search) { clauses.push('(name LIKE ? OR description LIKE ?)'); entParams.push(`%${search}%`, `%${search}%`); }
  if (clauses.length) entSql += ' WHERE ' + clauses.join(' AND ');
  entSql += ' LIMIT ?';
  entParams.push(limit);
  const entities = db.prepare(entSql).all(...entParams);
  const entityIds = new Set(entities.map(e => e.id));

  // Get facts that link entities
  const facts = db.prepare('SELECT id, subject_id, predicate, object FROM facts WHERE subject_id IN (' + 
    entities.map(() => '?').join(',') + ') LIMIT 1000').all(...entities.map(e => e.id));

  // Get relations
  let relations = [];
  try {
    relations = db.prepare('SELECT * FROM relations WHERE source_id IN (' + 
      entities.map(() => '?').join(',') + ') OR target_id IN (' + 
      entities.map(() => '?').join(',') + ') LIMIT 15000').all(...entities.map(e => e.id), ...entities.map(e => e.id));
  } catch {}

  const links = relations.map(r => ({ source: r.source_id, target: r.target_id, type: r.type }))
    .filter(l => entityIds.has(l.source) && entityIds.has(l.target));
  
  const nodes = entities.map(e => ({ id: e.id, name: e.name, type: e.type, description: e.description }));

  // Entity type counts
  const typeCounts = {};
  entities.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });

  // Total counts for stats display
  const totalEntities = db.prepare('SELECT COUNT(*) as c FROM entities').get().c;
  const totalRelations = db.prepare('SELECT COUNT(*) as c FROM relations').get().c;
  const totalFacts = db.prepare('SELECT COUNT(*) as c FROM facts').get().c;

  return { nodes, links, facts: facts.length, typeCounts, totals: { entities: totalEntities, relations: totalRelations, facts: totalFacts } };
}

function getEntityDetail(id) {
  if (!db || !id) return { error: 'not found' };
  const entity = db.prepare('SELECT * FROM entities WHERE id = ?').get(id);
  if (!entity) return { error: 'not found' };
  const facts = db.prepare('SELECT * FROM facts WHERE subject_id = ? ORDER BY timestamp DESC').all(id);
  const relationsOut = db.prepare('SELECT r.*, e.name as target_name, e.type as target_type FROM relations r LEFT JOIN entities e ON r.target_id = e.id WHERE r.source_id = ?').all(id);
  const relationsIn = db.prepare('SELECT r.*, e.name as source_name, e.type as source_type FROM relations r LEFT JOIN entities e ON r.source_id = e.id WHERE r.target_id = ?').all(id);
  return { entity, facts, relationsOut, relationsIn };
}

// --- Episodes ---
function getEpisodes(url) {
  if (!db) return { episodes: [] };
  const since = url.searchParams.get('since') || new Date(Date.now() - 86400000).toISOString();
  const limit = parseInt(url.searchParams.get('limit') || '50');
  return { episodes: db.prepare('SELECT * FROM episodes WHERE timestamp > ? ORDER BY timestamp DESC LIMIT ?').all(since, limit) };
}

// --- Morning Sync (cron-ready) ---
function generateMorningSync() {
  const brief = getMorningBrief();
  const syncFile = path.join(__dirname, 'morning-sync.json');
  const data = { ...brief, generatedAt: new Date().toISOString() };
  fs.writeFileSync(syncFile, JSON.stringify(data, null, 2));
  return data;
}

// --- Existing helpers ---
function getOverview() {
  const today = new Date().toISOString().split('T')[0];
  const memFile = path.join(MEMORY, `${today}.md`);
  const todayLog = fs.existsSync(memFile) ? fs.readFileSync(memFile, 'utf8').slice(0, 2000) : null;
  let vdrCount = 0;
  try { vdrCount = parseInt(execSync(`find ${VDR} -name '*.md' 2>/dev/null | wc -l`).toString().trim()); } catch {}
  let graphStats = {};
  if (db) {
    try {
      graphStats = {
        entities: db.prepare('SELECT COUNT(*) as c FROM entities').get().c,
        facts: db.prepare('SELECT COUNT(*) as c FROM facts').get().c,
        episodes: db.prepare('SELECT COUNT(*) as c FROM episodes').get().c,
        procedures: db.prepare('SELECT COUNT(*) as c FROM procedures').get().c,
      };
    } catch {}
  }
  return { timestamp: new Date().toISOString(), todayLog, vdrFiles: vdrCount, graphStats, uptime: process.uptime() };
}

function getPM2(res, headers) {
  exec('pm2 jlist 2>/dev/null', (err, stdout) => {
    let procs = [];
    try { procs = JSON.parse(stdout || '[]').map(p => ({ name: p.name, status: p.pm2_env?.status, cpu: p.monit?.cpu, memory: p.monit?.memory, restarts: p.pm2_env?.restart_time, uptime: p.pm2_env?.pm_uptime })); } catch {}
    json(res, headers, procs);
  });
}

function getSystem() {
  try {
    const loadavg = fs.readFileSync('/proc/loadavg', 'utf8').trim().split(' ');
    const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
    const totalMem = parseInt(meminfo.match(/MemTotal:\s+(\d+)/)?.[1] || 0) / 1024;
    const availMem = parseInt(meminfo.match(/MemAvailable:\s+(\d+)/)?.[1] || 0) / 1024;
    const disk = execSync("df -h / | tail -1 | awk '{print $3\"/\"$2\" (\"$5\" used)\"}'").toString().trim();
    return { load: loadavg.slice(0, 3), memUsedMB: Math.round(totalMem - availMem), memTotalMB: Math.round(totalMem), disk };
  } catch { return {}; }
}

function getGitStatus() {
  try {
    const status = execSync('cd ' + KIRA + ' && git status --porcelain 2>/dev/null').toString().trim();
    const branch = execSync('cd ' + KIRA + ' && git branch --show-current 2>/dev/null').toString().trim();
    const lastCommit = execSync('cd ' + KIRA + ' && git log --oneline -5 2>/dev/null').toString().trim();
    return { branch, status: status || 'clean', lastCommits: lastCommit.split('\n') };
  } catch { return { error: 'git not available' }; }
}

function getCron(res, headers) {
  exec('openclaw cron list --json 2>/dev/null', (err, stdout) => {
    let jobs = [];
    try { jobs = JSON.parse(stdout || '{}').jobs || []; } catch {}
    json(res, headers, jobs);
  });
}

function getSessions(res, headers) {
  exec('curl -s http://127.0.0.1:18789/api/sessions?limit=10 2>/dev/null', (err, stdout) => {
    let sessions = [];
    try { sessions = JSON.parse(stdout || '{}').sessions || []; } catch {}
    json(res, headers, sessions);
  });
}

function getMemory() {
  const files = [];
  if (fs.existsSync(MEMORY)) {
    fs.readdirSync(MEMORY).filter(f => f.endsWith('.md')).sort().reverse().forEach(f => {
      const stat = fs.statSync(path.join(MEMORY, f));
      files.push({ name: f, size: stat.size, modified: stat.mtime.toISOString() });
    });
  }
  return files;
}

function getMemoryFile(filePath) {
  let fp;
  if (filePath === 'MEMORY.md') fp = path.join(KIRA, 'MEMORY.md');
  else fp = path.join(MEMORY, filePath);
  if (!fs.existsSync(fp)) return { error: 'Not found' };
  return { content: fs.readFileSync(fp, 'utf8'), path: filePath };
}

// --- Chat ---

// Detect <live_animation>desc</live_animation> OR <live_animation/> (self-closing = context-aware)
function detectLiveAnimations(content) {
  const items = [];
  // Self-closing: <live_animation/> or <live_animation />
  const selfClose = /<live_animation\s*\/>/g;
  // With description: <live_animation>...</live_animation>
  const withDesc = /<live_animation>([\s\S]*?)<\/live_animation>/g;
  
  let m;
  while ((m = selfClose.exec(content)) !== null) items.push({ index: m.index, length: m[0].length, desc: '' });
  while ((m = withDesc.exec(content)) !== null) items.push({ index: m.index, length: m[0].length, desc: m[1].trim() });
  items.sort((a, b) => a.index - b.index);
  return items;
}

function buildLiveContent(content, animations) {
  let rebuilt = '';
  let lastEnd = 0;
  const descriptions = [];
  
  for (let i = 0; i < animations.length; i++) {
    const a = animations[i];
    const before = content.slice(lastEnd, a.index).trim();
    if (before) rebuilt += `<p style="margin:0 0 12px;white-space:pre-wrap">${before.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`;
    const id = `live-ph-${i}`;
    descriptions.push({ id, desc: a.desc });
    rebuilt += `<div id="${id}"><div style="color:#0055ff;font-size:.8rem;padding:12px">⏳ Generating visual...</div></div>`;
    lastEnd = a.index + a.length;
  }
  const after = content.slice(lastEnd).trim();
  if (after) rebuilt += `<p style="margin:0 0 12px;white-space:pre-wrap">${after.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`;
  
  return { rebuilt, descriptions };
}

async function processLiveAnimations(msgId, descriptions, userId) {
  // Get recent messages for context-aware generation
  const allMsgs = loadScratchpad(userId);
  const recent = allMsgs.slice(-10).filter(m => m.type === 'text' || m.type === 'html');
  
  for (const { id, desc } of descriptions) {
    try {
      // If desc is empty, use context mode (self-closing tag)
      const html = await generateLiveComponent(desc || '', desc ? null : recent);
      const currentMsgs = loadScratchpad(userId);
      const target = currentMsgs.find(m => m.messageId === msgId);
      if (target) {
        target.content = target.content.replace(new RegExp(`<div id="${id}">.*?</div>`, 's'), `<div id="${id}">${html}</div>`);
        target.generating = false;
        saveScratchpad(currentMsgs, userId);
      }
    } catch (e) {
      console.error('[live] Error:', e.message);
      const currentMsgs = loadScratchpad(userId);
      const target = currentMsgs.find(m => m.messageId === msgId);
      if (target) {
        target.content = target.content.replace(new RegExp(`<div id="${id}">.*?</div>`, 's'), `<div id="${id}"><div style="color:#ff4757;font-size:.8rem;padding:12px">❌ Generation failed</div></div>`);
        target.generating = false;
        saveScratchpad(currentMsgs, userId);
      }
    }
  }
}

async function handleChatPost(req, res, headers, userId) {
  const body = await readBody(req);
  const msgs = loadScratchpad(userId);
  const content = body.content || '';
  
  const animations = detectLiveAnimations(content);
  
  if (animations.length > 0) {
    const { rebuilt, descriptions } = buildLiveContent(content, animations);
    const msgId = 'dash-' + Date.now();
    const msg = { from: body.from || 'kira', type: 'html', content: rebuilt, ts: new Date().toISOString(), messageId: msgId, generating: true };
    msgs.push(msg);
    saveScratchpad(msgs, userId);
    json(res, headers, { ok: true, message: msg, generating: true });
    processLiveAnimations(msgId, descriptions, userId);
  } else {
    // Dedup: reject identical content within 60s
    const recentUserMsgs = msgs.filter(m => m.from === 'otto').slice(-5);
    const isDup = recentUserMsgs.some(m => m.content === content && (Date.now() - new Date(m.ts).getTime()) < 60000);
    if (isDup) {
      console.log('[chat] Server-side duplicate blocked:', content.substring(0, 40));
      json(res, headers, { ok: true, duplicate: true });
      return;
    }
    const msg = { from: body.from || 'otto', type: body.type || 'text', content, ts: new Date().toISOString(), messageId: 'dash-' + Date.now() };
    if (body.attachments && body.attachments.length) msg.attachments = body.attachments;
    msgs.push(msg);
    saveScratchpad(msgs, userId);
    // Forward user messages: NLP enrichment → Kira
    if (msg.from === 'otto' && content.trim()) {
      // Notify SSE: NLP processing
      if (userId) notifySSE(userId, { type: 'nlp_start', messageId: msg.messageId });
      
      enrichAndForward(content, msg.messageId, userId).catch(e => console.error('[chat] Forward failed:', e.message));
    }
    json(res, headers, { ok: true, message: msg });
  }
}

// Forward webUI messages: NLP enrichment → Kira via openclaw agent CLI
const { execFile } = require('child_process');

async function enrichAndForward(text, messageId, userId) {
  const start = Date.now();
  
  // Step 1: NLP enrichment via msg-proxy
  let enrichResult = null;
  try {
    const enrichResp = await new Promise((resolve, reject) => {
      const data = JSON.stringify({ message: text });
      const req = http.request({
        hostname: 'localhost', port: 3850, path: '/enrich',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
      }, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
    enrichResult = enrichResp;
    console.log(`[nlp] Enriched in ${enrichResp.elapsed}ms, ${enrichResp.context?.split('\n').length || 0} context lines`);
  } catch(e) {
    console.error('[nlp] Enrichment failed:', e.message);
  }
  
  // Notify SSE: NLP done, now forwarding to Kira
  if (userId) {
    notifySSE(userId, { 
      type: 'nlp_done', 
      messageId,
      elapsed: enrichResult?.elapsed || 0,
      contextLines: enrichResult?.context?.split('\n').length || 0,
      typoFixed: enrichResult?.original !== enrichResult?.fixed,
      fixed: enrichResult?.fixed
    });
    notifySSE(userId, { type: 'typing', from: 'kira' });
  }
  
  // Step 2: Forward to Kira via openclaw agent — stream stdout for real-time updates
  // NOTE: Do NOT use --deliver — it causes Telegram round-trip duplicates
  const msgText = enrichResult?.fixed || text;
  const { spawn } = require('child_process');
  const child = spawn('openclaw', [
    'agent',
    '--session-id', 'dd3de969-b7ee-41f5-8621-68f53d29dfb7',
    '--message', `[WebUI] ${msgText}`
  ], { timeout: 120000 });

  let streamedText = '';
  let lastStreamPush = 0;
  child.stdout.on('data', (chunk) => {
    streamedText += chunk.toString();
    const now = Date.now();
    // Push partial content every 300ms to avoid flooding SSE
    if (userId && (now - lastStreamPush > 300)) {
      lastStreamPush = now;
      notifySSE(userId, { type: 'stream', text: streamedText, partial: true });
    }
  });

  let stderrBuf = '';
  child.stderr.on('data', (chunk) => { stderrBuf += chunk.toString(); });

  child.on('close', (code) => {
    if (code !== 0) {
      console.error('[forward] openclaw agent error:', stderrBuf);
      const errMsg = (stderrBuf || '').toLowerCase();
      let userError = null;
      if (errMsg.includes('rate limit') || errMsg.includes('429') || errMsg.includes('quota'))
        userError = '⚠️ API rate limit reached. Your provider subscription may have hit its usage cap. Please check your API key / subscription status.';
      else if (errMsg.includes('401') || errMsg.includes('auth') || errMsg.includes('invalid key'))
        userError = '⚠️ API authentication failed. Your API key may be invalid or expired.';
      else if (errMsg.includes('insufficient') || errMsg.includes('credit') || errMsg.includes('balance'))
        userError = '⚠️ Insufficient API credits. Please top up your provider account.';
      else if (errMsg.includes('timeout') || errMsg.includes('ETIMEDOUT'))
        userError = '⚠️ Request timed out. The AI provider may be experiencing issues.';
      
      if (userError && userId) {
        notifySSE(userId, { type: 'error', message: userError });
      }
    } else {
      console.log(`[forward] Done (total ${Date.now() - start}ms)`);
    }
  });
}

function generateLiveComponent(descriptionOrContext, recentMessages) {
  return new Promise((resolve, reject) => {
    const isContextMode = !descriptionOrContext || descriptionOrContext === '';
    const logMsg = isContextMode ? 'context-aware (last messages)' : descriptionOrContext.slice(0, 60) + '...';
    console.log('[live] Generating component:', logMsg);
    const timeout = setTimeout(() => { reject(new Error('Timeout after 60s')); }, 60000);
    
    const messages = [
      { role: 'system', content: `You are a UI micro-app generator embedded in a chat interface. Output ONLY raw HTML. No thinking, no explanation, no code fences.

Your job: Read the conversation context and create a beautiful, relevant visual component — a card, chart, timeline, animation, infographic, or interactive widget that enhances the conversation visually.

Rules:
- Self-contained in one <div>
- Dark theme: transparent bg, text #e8e8f0, accent #0055ff, green #28c840, yellow #f5a623, red #ff4757
- Use <style> for CSS animations (keyframes, transitions, hover effects)
- Use <script> for JS interactivity (click handlers, counters, toggles, expand/collapse)
- Prefer CSS animations + JS over SVG. Use canvas or simple DOM manipulation.
- Make it INTERACTIVE: clickable cards, hover effects, expandable sections, toggles
- Think: beautiful dashboard widgets, info cards, animated progress bars, mini charts, timelines
- Keep it compact (max 400x300px unless it's a chart/graph)
- Font: inherit from parent (Inter/system-ui)
- Start with <div> end with </div>
- Be creative! If someone discusses data, make a chart. Goals? Progress cards. Timeline? Animated timeline. Stats? Dashboard widget.` }
    ];
    
    if (isContextMode && recentMessages && recentMessages.length > 0) {
      // Context mode: feed last messages as conversation
      const context = recentMessages.map(m => `[${m.from}]: ${(m.content || '').substring(0, 500)}`).join('\n');
      messages.push({ role: 'user', content: `Here's the recent conversation. Create a visual component that enhances or illustrates what's being discussed:\n\n${context}\n\nGenerate a beautiful, relevant interactive HTML component.` });
    } else {
      messages.push({ role: 'user', content: descriptionOrContext });
    }
    
    const postData = JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages,
      max_tokens: 8000
    });

    const opts = {
      hostname: 'openrouter.ai', path: '/api/v1/chat/completions', method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };

    const req = https.request(opts, (r) => {
      let body = '';
      r.on('data', c => body += c);
      r.on('end', () => {
        clearTimeout(timeout);
        try {
          const data = JSON.parse(body);
          let html = data.choices?.[0]?.message?.content || '';
          html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();
          // Scope CSS: replace :root with a scoped class to prevent leaking
          html = html.replace(/:root\s*{/g, '.live-widget {');
          // Wrap in scoped container
          html = `<div class="live-widget">${html}</div>`;
          console.log('[live] Generated', html.length, 'chars');
          resolve(html);
        } catch (e) { console.error('[live] Parse error:', e.message); reject(e); }
      });
    });
    req.on('error', (e) => { clearTimeout(timeout); console.error('[live] Request error:', e.message); reject(e); });
    req.write(postData);
    req.end();
  });
}

// SSE for real-time chat updates
const sseClients = new Map(); // userId → Set of response objects

function handleChatSSE(req, res, userId) {
  // SSE can't send Authorization header, so accept token in query param
  if (!userId) {
    const url = new URL(req.url, 'http://localhost');
    const qToken = url.searchParams.get('token');
    if (qToken) {
      const user = auth.getUser(qToken);
      if (user) userId = user.id;
    }
  }
  if (!userId) { res.writeHead(401); res.end(); return; }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': process.env.KIRA_CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Authorization'
  });
  res.write('data: {"type":"connected"}\n\n');
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(res);
  // Keep-alive ping every 5s (Cloudflare tunnels drop idle SSE connections)
  const keepAlive = setInterval(() => {
    try { res.write(':ping\n\n'); } catch { clearInterval(keepAlive); }
  }, 5000);
  req.on('close', () => { 
    clearInterval(keepAlive);
    sseClients.get(userId)?.delete(res); 
    console.log(`[sse] Client disconnected, remaining: ${sseClients.get(userId)?.size || 0}`);
  });
}

function notifySSE(userId, event) {
  const clients = sseClients.get(userId);
  console.log(`[sse] notify ${event.type} to user ${userId?.substring(0,8)}, clients: ${clients?.size || 0}`);
  if (!clients || clients.size === 0) return;
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) { try { res.write(data); } catch(e) { console.error('[sse] write error:', e.message); } }
}

async function handleChatSync(req, res, headers, userId) {
  const body = await readBody(req);
  if (!body.content) { json(res, headers, { ok: false }); return; }
  const msgs = loadScratchpad(userId);
  if (body.messageId && msgs.some(m => m.messageId === body.messageId)) { json(res, headers, { ok: true, duplicate: true }); return; }
  
  const content = body.content;
  const animations = detectLiveAnimations(content);
  
  if (animations.length > 0) {
    const { rebuilt, descriptions } = buildLiveContent(content, animations);
    const msgId = body.messageId || ('sync-' + Date.now());
    const msg = { from: body.from || 'kira', type: 'html', content: rebuilt, ts: body.ts || new Date().toISOString(), messageId: msgId, generating: true };
    msgs.push(msg);
    saveScratchpad(msgs, userId);
    json(res, headers, { ok: true, generating: true });
    processLiveAnimations(msgId, descriptions, userId);
  } else {
    const entry = { from: body.from || 'kira', type: body.type || 'text', content, ts: body.ts || new Date().toISOString(), messageId: body.messageId || ('sync-' + Date.now()) };
    if (body.blocks && Array.isArray(body.blocks) && body.blocks.length > 0) entry.blocks = body.blocks;
    msgs.push(entry);
    saveScratchpad(msgs, userId);
    // Notify SSE clients of new message
    if (userId) notifySSE(userId, { type: 'message', message: entry });
    json(res, headers, { ok: true });
  }
}

// --- VDR (per-user) ---
const USER_DATA = path.join(__dirname, 'data', 'users');
const DEFAULT_GUIDES = path.join(__dirname, 'default-guides');

function getUserVDR(userId) {
  const userDir = path.join(USER_DATA, userId, 'vdr');
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
    // Seed with default guides
    seedUserVDR(userDir);
  }
  return userDir;
}

function seedUserVDR(userDir) {
  const guidesDir = path.join(userDir, 'guides');
  fs.mkdirSync(guidesDir, { recursive: true });
  // Copy from default-guides if exists, otherwise create inline
  if (fs.existsSync(DEFAULT_GUIDES)) {
    const files = fs.readdirSync(DEFAULT_GUIDES);
    files.forEach(f => {
      fs.copyFileSync(path.join(DEFAULT_GUIDES, f), path.join(guidesDir, f));
    });
  } else {
    fs.writeFileSync(path.join(guidesDir, 'getting-started.md'), `# Getting Started with Kira

Welcome to Kira — your AI partner that actually gets things done.

## Quick Start

1. **Chat** — Talk to Kira like a colleague. She remembers context across sessions.
2. **Tasks** — Create and track your work items.
3. **Documents** — Upload and organize files. Kira can read and reference them.
4. **Knowledge** — Kira builds a connected graph of people, companies, and concepts.

## Tips
- Be specific — more context = better results
- Use tasks to break work into trackable items
- Check your morning brief for a daily summary
`);
  }
}

function getVDRList(dir, vdrRoot) {
  vdrRoot = path.resolve(vdrRoot || VDR);
  const fullPath = path.resolve(vdrRoot, dir || '.');
  if (!fullPath.startsWith(vdrRoot)) return { error: 'Invalid path' };
  if (!fs.existsSync(fullPath)) return { error: 'Not found', items: [] };
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  const items = entries.filter(e => !e.name.startsWith('.')).map(e => {
    const fp = path.join(fullPath, e.name);
    const stat = fs.statSync(fp);
    return { name: e.name, isDir: e.isDirectory(), size: stat.size, modified: stat.mtime.toISOString() };
  }).sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name));
  return { dir: path.relative(vdrRoot, fullPath), items };
}

function getVDRFile(filePath, vdrRoot) {
  vdrRoot = path.resolve(vdrRoot || VDR);
  const fullPath = path.resolve(vdrRoot, filePath || '');
  if (!fullPath.startsWith(vdrRoot)) return { error: 'Invalid path' };
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) return { error: 'Not found' };
  return { path: path.relative(vdrRoot, fullPath), content: fs.readFileSync(fullPath, 'utf8') };
}

function searchVDR(query, vdrRoot) {
  vdrRoot = path.resolve(vdrRoot || VDR);
  const results = [];
  function walk(dir, rel) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const fp = path.join(dir, e.name);
      const rp = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { walk(fp, rp); continue; }
      const nameMatch = e.name.toLowerCase().includes(query);
      let snippet = null;
      try {
        const ext = path.extname(e.name).toLowerCase();
        if (['.md','.txt','.json','.csv','.html','.js','.ts','.yml','.yaml','.toml','.env','.sh'].includes(ext)) {
          const content = fs.readFileSync(fp, 'utf8').substring(0, 50000);
          const lower = content.toLowerCase();
          const idx = lower.indexOf(query);
          if (idx >= 0) {
            const start = Math.max(0, idx - 60);
            const end = Math.min(content.length, idx + query.length + 60);
            snippet = (start > 0 ? '...' : '') + content.substring(start, end).replace(/\n/g, ' ') + (end < content.length ? '...' : '');
          }
          if (!nameMatch && idx < 0) return;
        } else if (!nameMatch) return;
      } catch { if (!nameMatch) return; }
      const stat = fs.statSync(fp);
      results.push({ path: rp, name: e.name, size: stat.size, modified: stat.mtime.toISOString(), snippet, isDir: false });
      if (results.length >= 50) return;
    }
  }
  walk(vdrRoot, '');
  return results;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Kira Command Center running at http://localhost:${PORT}`);
});
