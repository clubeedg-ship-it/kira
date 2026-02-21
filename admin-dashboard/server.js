#!/usr/bin/env node
/**
 * Kira Admin Dashboard — Command Center v2
 * Enhanced with Token Usage, Sessions, Live Logs
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const os = require('os');
const readline = require('readline');

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

// --- JSONL Usage Cache ---
let usageCache = { data: null, timestamp: 0 };
const CACHE_TTL = 60000; // 60s

function parseAllSessionUsage() {
  const now = Date.now();
  if (usageCache.data && (now - usageCache.timestamp) < CACHE_TTL) return usageCache.data;

  const result = { messages: [], sessions: [], byAgent: {}, byModel: {}, byDay: {}, totals: { cost: 0, input: 0, output: 0, cacheRead: 0, messages: 0 } };

  if (!fs.existsSync(OPENCLAW_AGENTS)) { usageCache = { data: result, timestamp: now }; return result; }

  for (const agentName of fs.readdirSync(OPENCLAW_AGENTS)) {
    const agentDir = path.join(OPENCLAW_AGENTS, agentName);
    try { if (!fs.statSync(agentDir).isDirectory()) continue; } catch { continue; }

    const sessDir = path.join(agentDir, 'sessions');
    if (!fs.existsSync(sessDir)) continue;

    // Read sessions.json for metadata
    let sessionsMeta = {};
    const sessJsonPath = path.join(sessDir, 'sessions.json');
    try { if (fs.existsSync(sessJsonPath)) sessionsMeta = JSON.parse(fs.readFileSync(sessJsonPath, 'utf-8')); } catch {}

    for (const file of fs.readdirSync(sessDir)) {
      if (!file.endsWith('.jsonl')) continue;
      const sessionId = file.replace('.jsonl', '');
      const filePath = path.join(sessDir, file);

      // Find metadata for this session
      let meta = null;
      for (const [key, val] of Object.entries(sessionsMeta)) {
        if (val.sessionId === sessionId) { meta = { key, ...val }; break; }
      }

      let sessionCost = 0, sessionTokens = 0, lastActivity = null, lastMessage = '', model = 'unknown', label = meta?.key || sessionId;
      const messages = [];

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          let obj;
          try { obj = JSON.parse(line); } catch { continue; }

          if (obj.type === 'session') {
            if (!meta) label = obj.id || sessionId;
            continue;
          }

          if (obj.type === 'message' && obj.message) {
            const msg = obj.message;
            const ts = obj.timestamp;

            if (ts) lastActivity = ts;

            if (msg.role === 'assistant' && msg.usage) {
              const u = msg.usage;
              const cost = u.cost?.total || 0;
              const day = ts ? ts.slice(0, 10) : 'unknown';
              const mdl = msg.model || 'unknown';
              model = mdl;

              sessionCost += cost;
              sessionTokens += u.totalTokens || (u.input + u.output + (u.cacheRead || 0));

              result.totals.cost += cost;
              result.totals.input += u.input || 0;
              result.totals.output += u.output || 0;
              result.totals.cacheRead += u.cacheRead || 0;
              result.totals.messages++;

              if (!result.byAgent[agentName]) result.byAgent[agentName] = { cost: 0, messages: 0, tokens: 0 };
              result.byAgent[agentName].cost += cost;
              result.byAgent[agentName].messages++;
              result.byAgent[agentName].tokens += u.totalTokens || 0;

              if (!result.byModel[mdl]) result.byModel[mdl] = { cost: 0, messages: 0 };
              result.byModel[mdl].cost += cost;
              result.byModel[mdl].messages++;

              const tokens = (usage.input||0) + (usage.output||0) + (usage.cacheRead||0);
              if (!result.byDay[day]) result.byDay[day] = { cost: 0, messages: 0, tokens: 0 };
              result.byDay[day].cost += cost;
              result.byDay[day].tokens += tokens;
              result.byDay[day].messages++;
            }

            // Track last message text
            if (msg.role === 'user' || msg.role === 'assistant') {
              let text = '';
              if (typeof msg.content === 'string') text = msg.content;
              else if (Array.isArray(msg.content)) {
                for (const c of msg.content) {
                  if (c.type === 'text' && c.text) { text = c.text; break; }
                }
              }
              if (text) lastMessage = text;
              messages.push({ role: msg.role, text: text.slice(0, 500), ts });
            }
          }
        }
      } catch {}

      const originLabel = meta?.origin?.label || '';
      const surface = meta?.origin?.surface || '';

      result.sessions.push({
        agent: agentName,
        sessionId,
        label,
        originLabel,
        surface,
        model,
        totalCost: sessionCost,
        totalTokens: sessionTokens,
        lastActivity,
        lastMessage: lastMessage.slice(0, 100),
        messageCount: messages.length,
        recentMessages: messages.slice(-10)
      });
    }
  }

  // Sort sessions by last activity
  result.sessions.sort((a, b) => (b.lastActivity || '').localeCompare(a.lastActivity || ''));

  usageCache = { data: result, timestamp: now };
  return result;
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

  let pm2Up = 0, pm2Down = 0;
  try {
    const pm2 = JSON.parse(safeExec('pm2 jlist') || '[]');
    pm2.forEach(p => p.pm2_env?.status === 'online' ? pm2Up++ : pm2Down++);
  } catch {}

  // Enhanced stats
  const usage = parseAllSessionUsage();
  const todayCost = usage.byDay[today]?.cost || 0;
  const activeSessions = usage.sessions.filter(s => {
    if (!s.lastActivity) return false;
    return (Date.now() - new Date(s.lastActivity).getTime()) < 3600000; // active in last hour
  }).length;

  let gpuMem = '';
  try {
    const raw = safeExec('nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits 2>/dev/null').trim();
    if (raw) {
      const [used, total] = raw.split(',').map(s => s.trim());
      gpuMem = `${used}/${total} MB`;
    }
  } catch {}

  return {
    agents: { count: agents.length, names: agents.map(a => a.name) },
    pendingDecisions, tasksToday, docsToday,
    services: { up: pm2Up, down: pm2Down },
    todayCost, todayTokens: usage.byDay[today]?.tokens || 0, activeSessions, gpuMem
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
      outputCount, schedule: 'on-demand'
    };
  });
}

function apiAgentRun(agentId) {
  const run = db.prepare('INSERT INTO agent_runs (agent_id) VALUES (?)').run(agentId);
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

function apiVdr() { return walkDir(VDR_ROOT); }

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
  let pm2List = [];
  try { pm2List = JSON.parse(safeExec('pm2 jlist') || '[]').map(p => ({
    name: p.name, status: p.pm2_env?.status || 'unknown',
    cpu: p.monit?.cpu || 0, memory: Math.round((p.monit?.memory || 0) / 1048576),
    uptime: p.pm2_env?.pm_uptime ? Math.round((Date.now() - p.pm2_env.pm_uptime) / 60000) : 0,
    restarts: p.pm2_env?.restart_time || 0
  })); } catch {}

  let docker = [];
  try {
    const raw = safeExec('docker ps --format "{{.Names}}|{{.Status}}|{{.Ports}}" 2>/dev/null');
    docker = raw.trim().split('\n').filter(Boolean).map(l => {
      const [name, status, ports] = l.split('|');
      return { name, status, ports };
    });
  } catch {}

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  let diskUsage = '';
  try { diskUsage = safeExec("df -h / | tail -1 | awk '{print $3\"/\"$2\" (\"$5\")\"}'").trim(); } catch {}

  // Ollama models
  let ollamaModels = [];
  try {
    const raw = safeExec('curl -s http://localhost:11434/api/tags 2>/dev/null');
    if (raw) {
      const parsed = JSON.parse(raw);
      ollamaModels = (parsed.models || []).map(m => ({
        name: m.name, size: m.size ? Math.round(m.size / 1073741824 * 10) / 10 : 0,
        modified: m.modified_at, family: m.details?.family || '', params: m.details?.parameter_size || ''
      }));
    }
  } catch {}

  // GPU usage
  let gpu = null;
  try {
    const raw = safeExec('nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>/dev/null').trim();
    if (raw) {
      const [util, memUsed, memTotal] = raw.split(',').map(s => parseFloat(s.trim()));
      gpu = { utilization: util, memUsed: Math.round(memUsed), memTotal: Math.round(memTotal) };
    }
  } catch {}

  return {
    pm2: pm2List, docker, ollamaModels, gpu,
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
  return parseAllSessionUsage().sessions;
}

function apiSessionTranscript(sessionId) {
  const usage = parseAllSessionUsage();
  const session = usage.sessions.find(s => s.sessionId === sessionId);
  if (!session) return { error: 'Session not found' };
  return { session, messages: session.recentMessages };
}

function apiTokenUsage() {
  const usage = parseAllSessionUsage();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  let todayCost = 0, weekCost = 0;
  const dayEntries = [];

  // Last 14 days
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const entry = usage.byDay[d] || { cost: 0, messages: 0 };
    dayEntries.unshift({ day: d, cost: entry.cost, messages: entry.messages });
    if (d === today) todayCost = entry.cost;
    if (d >= weekAgo) weekCost += entry.cost;
  }

  // Most expensive agent
  let mostExpensive = { name: 'none', cost: 0 };
  for (const [name, data] of Object.entries(usage.byAgent)) {
    if (data.cost > mostExpensive.cost) mostExpensive = { name, cost: data.cost };
  }

  const avgCost = usage.totals.messages > 0 ? usage.totals.cost / usage.totals.messages : 0;

  return {
    totals: usage.totals,
    todayCost, weekCost,
    mostExpensive, avgCost,
    byAgent: usage.byAgent,
    byModel: usage.byModel,
    byDay: dayEntries
  };
}

function apiLiveLogs(filter) {
  const today = new Date().toISOString().slice(0, 10);
  const logPath = `/tmp/openclaw/openclaw-${today}.log`;
  try {
    if (!fs.existsSync(logPath)) return { lines: [], logPath, error: 'Log file not found' };
    const content = fs.readFileSync(logPath, 'utf-8');
    let lines = content.split('\n').filter(Boolean);
    if (filter) {
      const f = filter.toLowerCase();
      lines = lines.filter(l => l.toLowerCase().includes(f));
    }
    return { lines: lines.slice(-100), logPath, total: lines.length };
  } catch (e) {
    return { lines: [], logPath, error: e.message };
  }
}

// --- Server ---
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  if (pathname === '/favicon.svg') return serveFile(res, path.join(__dirname, 'ui', 'favicon.svg'), 'image/svg+xml');
  if (pathname === '/' || pathname === '/login') return serveFile(res, path.join(__dirname, 'ui', 'index.html'), 'text/html');

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

  if (pathname === '/dashboard') {
    if (!isAuthed(req)) { res.writeHead(302, { Location: '/' }); return res.end(); }
    return serveFile(res, path.join(__dirname, 'ui', 'dashboard.html'), 'text/html');
  }

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
      if (pathname === '/api/sessions/transcript' && method === 'GET') {
        const sid = url.searchParams.get('id');
        return json(res, apiSessionTranscript(sid));
      }
      if (pathname === '/api/token-usage' && method === 'GET') return json(res, apiTokenUsage());
      if (pathname === '/api/logs' && method === 'GET') {
        const filter = url.searchParams.get('filter') || '';
        return json(res, apiLiveLogs(filter));
      }
    } catch (e) {
      return json(res, { error: e.message }, 500);
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => console.log(`Kira Admin Dashboard running on http://localhost:${PORT}`));
