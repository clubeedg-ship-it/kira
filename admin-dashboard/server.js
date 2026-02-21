#!/usr/bin/env node
/**
 * Kira Admin Dashboard — Command Center
 * Raw http.createServer + better-sqlite3
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const os = require('os');

// Load .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const PORT = parseInt(process.env.PORT || '3880');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'kira-admin-2026';
const KIRA_ROOT = path.resolve(__dirname, '..');
const VDR_ROOT = path.join(KIRA_ROOT, 'vdr');
const AGENTS_ROOT = path.join(KIRA_ROOT, 'agents');
const OUTPUTS_DIR = path.join(AGENTS_ROOT, 'outputs');
const OPENCLAW_AGENTS = path.join(os.homedir(), '.openclaw', 'agents');

// --- SQLite ---
const Database = require('better-sqlite3');
const DB_PATH = path.join(__dirname, 'kira-admin.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS agent_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    started_at TEXT DEFAULT (datetime('now')),
    finished_at TEXT,
    status TEXT DEFAULT 'running',
    output_count INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS agent_outputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT,
    content TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed outputs from disk if table is empty
const outputCount = db.prepare('SELECT COUNT(*) as c FROM agent_outputs').get().c;
if (outputCount === 0 && fs.existsSync(OUTPUTS_DIR)) {
  const insert = db.prepare('INSERT INTO agent_outputs (agent_id, type, title, content, status, created_at) VALUES (?,?,?,?,?,?)');
  const tx = db.transaction(() => {
    for (const file of fs.readdirSync(OUTPUTS_DIR).filter(f => f.endsWith('.json'))) {
      try {
        const raw = fs.readFileSync(path.join(OUTPUTS_DIR, file), 'utf-8');
        const data = JSON.parse(raw);
        const agentId = file.split('-')[0] || 'unknown';
        const type = data.type || (file.includes('decision') ? 'decision' : file.includes('task') ? 'task' : 'document');
        insert.run(agentId, type, data.title || file.replace('.json',''), raw, data.status || 'pending', data.created_at || new Date().toISOString());
      } catch {}
    }
  });
  tx();
}

// --- Agent definitions ---
function getAgentDefs() {
  const agents = [];
  if (!fs.existsSync(AGENTS_ROOT)) return agents;
  for (const name of fs.readdirSync(AGENTS_ROOT)) {
    const dir = path.join(AGENTS_ROOT, name);
    if (!fs.statSync(dir).isDirectory() || name === 'outputs' || name === 'shared') continue;
    const soul = path.join(dir, 'SOUL.md');
    let role = 'agent';
    if (fs.existsSync(soul)) {
      const txt = fs.readFileSync(soul, 'utf-8').slice(0, 500);
      const m = txt.match(/^#\s*(.+)/m);
      if (m) role = m[1].trim();
    }
    agents.push({ id: name, name, role, dir });
  }
  return agents;
}

// --- Helpers ---
function parseCookies(req) {
  const obj = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.split('=');
    if (k) obj[k.trim()] = v.join('=').trim();
  });
  return obj;
}

function isAuthed(req) {
  const cookies = parseCookies(req);
  return cookies.kira_token === ADMIN_TOKEN;
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function serveFile(res, filePath, contentType) {
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}

function readBody(req) {
  return new Promise(resolve => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => resolve(d));
  });
}

function walkDir(dir, base = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, entry.name);
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full, rel));
    } else {
      try {
        const st = fs.statSync(full);
        results.push({ path: rel, name: entry.name, category: base || '/', size: st.size, modified: st.mtime.toISOString() });
      } catch {}
    }
  }
  return results;
}

function safeExec(cmd) {
  try { return execSync(cmd, { timeout: 10000, encoding: 'utf-8' }); } catch { return ''; }
}

// --- API handlers ---
function apiOverview() {
  const agents = getAgentDefs();
  const pendingDecisions = db.prepare("SELECT COUNT(*) as c FROM agent_outputs WHERE status='pending'").get().c;
  const today = new Date().toISOString().slice(0, 10);
  const tasksToday = db.prepare("SELECT COUNT(*) as c FROM agent_outputs WHERE type='task' AND created_at >= ?").get(today).c;
  const docsToday = db.prepare("SELECT COUNT(*) as c FROM agent_outputs WHERE type='document' AND created_at >= ?").get(today).c;

  // Service health
  let pm2Up = 0, pm2Down = 0;
  try {
    const pm2 = JSON.parse(safeExec('pm2 jlist') || '[]');
    pm2.forEach(p => p.pm2_env?.status === 'online' ? pm2Up++ : pm2Down++);
  } catch {}

  return {
    agents: { count: agents.length, names: agents.map(a => a.name) },
    pendingDecisions,
    tasksToday,
    docsToday,
    services: { up: pm2Up, down: pm2Down }
  };
}

function apiAgents() {
  const defs = getAgentDefs();
  return defs.map(a => {
    const lastRun = db.prepare('SELECT * FROM agent_runs WHERE agent_id=? ORDER BY started_at DESC LIMIT 1').get(a.id);
    const lastOutput = db.prepare('SELECT type FROM agent_outputs WHERE agent_id=? ORDER BY created_at DESC LIMIT 1').get(a.id);
    const outputCount = db.prepare('SELECT COUNT(*) as c FROM agent_outputs WHERE agent_id=?').get(a.id).c;
    return {
      id: a.id, name: a.name, role: a.role,
      status: lastRun?.status === 'running' ? 'running' : 'idle',
      lastRun: lastRun?.started_at || null,
      lastOutputType: lastOutput?.type || null,
      outputCount,
      schedule: 'on-demand'
    };
  });
}

function apiAgentRun(agentId) {
  const run = db.prepare('INSERT INTO agent_runs (agent_id) VALUES (?)').run(agentId);
  // Mark finished immediately (manual trigger placeholder)
  db.prepare("UPDATE agent_runs SET status='completed', finished_at=datetime('now') WHERE id=?").run(run.lastInsertRowid);
  return { ok: true, runId: run.lastInsertRowid };
}

function apiOutputs(query) {
  let sql = 'SELECT * FROM agent_outputs WHERE 1=1';
  const params = [];
  if (query.agent) { sql += ' AND agent_id=?'; params.push(query.agent); }
  if (query.type) { sql += ' AND type=?'; params.push(query.type); }
  if (query.status) { sql += ' AND status=?'; params.push(query.status); }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  return db.prepare(sql).all(...params);
}

function apiOutputDetail(id) {
  return db.prepare('SELECT * FROM agent_outputs WHERE id=?').get(id);
}

function apiOutputProcess(id) {
  db.prepare("UPDATE agent_outputs SET status='processed' WHERE id=?").run(id);
  return { ok: true };
}

function apiVdr() {
  return walkDir(VDR_ROOT);
}

function apiVdrContent(relPath) {
  if (!relPath || relPath.includes('..')) return { error: 'Invalid path' };
  const full = path.join(VDR_ROOT, relPath);
  if (!full.startsWith(VDR_ROOT)) return { error: 'Invalid path' };
  try {
    const content = fs.readFileSync(full, 'utf-8');
    return { path: relPath, content: content.slice(0, 100000) };
  } catch { return { error: 'File not found' }; }
}

function apiServices() {
  // PM2
  let pm2List = [];
  try { pm2List = JSON.parse(safeExec('pm2 jlist') || '[]').map(p => ({
    name: p.name, status: p.pm2_env?.status || 'unknown',
    cpu: p.monit?.cpu || 0, memory: Math.round((p.monit?.memory || 0) / 1048576),
    uptime: p.pm2_env?.pm_uptime ? Math.round((Date.now() - p.pm2_env.pm_uptime) / 60000) : 0,
    restarts: p.pm2_env?.restart_time || 0
  })); } catch {}

  // Docker
  let docker = [];
  try {
    const raw = safeExec('docker ps --format "{{.Names}}|{{.Status}}|{{.Ports}}" 2>/dev/null');
    docker = raw.trim().split('\n').filter(Boolean).map(l => {
      const [name, status, ports] = l.split('|');
      return { name, status, ports };
    });
  } catch {}

  // System
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  let diskUsage = '';
  try { diskUsage = safeExec("df -h / | tail -1 | awk '{print $3\"/\"$2\" (\"$5\")\"}'").trim(); } catch {}

  return {
    pm2: pm2List, docker,
    system: {
      ramUsed: Math.round((totalMem - freeMem) / 1048576),
      ramTotal: Math.round(totalMem / 1048576),
      disk: diskUsage,
      loadAvg: os.loadavg().map(l => l.toFixed(2)),
      uptime: Math.round(os.uptime() / 3600)
    }
  };
}

function apiSessions() {
  const sessions = [];
  if (!fs.existsSync(OPENCLAW_AGENTS)) return sessions;
  for (const name of fs.readdirSync(OPENCLAW_AGENTS)) {
    const dir = path.join(OPENCLAW_AGENTS, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const configPath = path.join(dir, 'config.json');
    let config = {};
    if (fs.existsSync(configPath)) {
      try { config = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch {}
    }
    // Look for session files
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'config.json');
    sessions.push({
      key: name,
      model: config.model || 'unknown',
      tokenUsage: config.tokenUsage || null,
      files: files.length,
      config
    });
  }
  return sessions;
}

// --- Server ---
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  // Static files
  if (pathname === '/favicon.svg') return serveFile(res, path.join(__dirname, 'ui', 'favicon.svg'), 'image/svg+xml');
  if (pathname === '/' || pathname === '/login') return serveFile(res, path.join(__dirname, 'ui', 'index.html'), 'text/html');

  // Login POST
  if (pathname === '/api/login' && method === 'POST') {
    const body = await readBody(req);
    let token;
    try { token = JSON.parse(body).token; } catch { token = body; }
    if (token === ADMIN_TOKEN) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': `kira_token=${ADMIN_TOKEN}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
      });
      return res.end(JSON.stringify({ ok: true }));
    }
    return json(res, { error: 'Invalid token' }, 401);
  }

  // Dashboard page
  if (pathname === '/dashboard') {
    if (!isAuthed(req)) { res.writeHead(302, { Location: '/' }); return res.end(); }
    return serveFile(res, path.join(__dirname, 'ui', 'dashboard.html'), 'text/html');
  }

  // API routes — all require auth
  if (pathname.startsWith('/api/')) {
    if (!isAuthed(req)) return json(res, { error: 'Unauthorized' }, 401);

    try {
      if (pathname === '/api/overview' && method === 'GET') return json(res, apiOverview());
      if (pathname === '/api/agents' && method === 'GET') return json(res, apiAgents());
      if (pathname.match(/^\/api\/agents\/(.+)\/run$/) && method === 'POST') {
        const id = pathname.match(/^\/api\/agents\/(.+)\/run$/)[1];
        return json(res, apiAgentRun(id));
      }
      if (pathname === '/api/outputs' && method === 'GET') {
        const q = Object.fromEntries(url.searchParams);
        return json(res, apiOutputs(q));
      }
      if (pathname.match(/^\/api\/outputs\/(\d+)$/) && method === 'GET') {
        const id = pathname.match(/^\/api\/outputs\/(\d+)$/)[1];
        return json(res, apiOutputDetail(parseInt(id)));
      }
      if (pathname.match(/^\/api\/outputs\/(\d+)\/process$/) && method === 'POST') {
        const id = pathname.match(/^\/api\/outputs\/(\d+)\/process$/)[1];
        return json(res, apiOutputProcess(parseInt(id)));
      }
      if (pathname === '/api/vdr' && method === 'GET') return json(res, apiVdr());
      if (pathname === '/api/vdr/content' && method === 'GET') {
        const p = url.searchParams.get('path');
        return json(res, apiVdrContent(p));
      }
      if (pathname === '/api/services' && method === 'GET') return json(res, apiServices());
      if (pathname === '/api/sessions' && method === 'GET') return json(res, apiSessions());
    } catch (e) {
      return json(res, { error: e.message }, 500);
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => console.log(`Kira Admin Dashboard running on http://localhost:${PORT}`));
