#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

const PORT = 3847;
const HOME = process.env.HOME || '/home/adminuser';
const KIRA = path.join(HOME, 'kira');
const CHIMERA = path.join(HOME, 'chimera');
const VDR = path.join(KIRA, 'vdr');
const MEMORY = path.join(KIRA, 'memory');

const server = http.createServer((req, res) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = url.pathname;

  try {
    if (route === '/') { serve(res, path.join(__dirname, 'index.html'), 'text/html'); }
    else if (route === '/api/overview') { json(res, headers, getOverview()); }
    else if (route === '/api/pm2') { getPM2(res, headers); }
    else if (route === '/api/vdr') { json(res, headers, getVDR(url.searchParams.get('dir') || '')); }
    else if (route === '/api/vdr/file') { json(res, headers, getVDRFile(url.searchParams.get('path') || '')); }
    else if (route === '/api/memory') { json(res, headers, getMemory()); }
    else if (route === '/api/memory/file') { json(res, headers, getMemoryFile(url.searchParams.get('path') || '')); }
    else if (route === '/api/cron') { getCron(res, headers); }
    else if (route === '/api/sessions') { getSessions(res, headers); }
    else if (route === '/api/git') { json(res, headers, getGitStatus()); }
    else if (route === '/api/system') { json(res, headers, getSystem()); }
    else if (route === '/api/tasks') { getNotion(res, headers, '300a6c94-88ca-81c7-be95-e0f0433b6f58'); }
    else if (route === '/api/goals') { getNotion(res, headers, '2fba6c94-88ca-81e0-938e-ceb20fcc7203'); }
    else if (route === '/api/scratchpad') { handleScratchpad(req, res, headers); }
    else if (route === '/api/chat/sync') { handleChatSync(req, res, headers); }
    else if (route === '/api/stream') { streamSSE(req, res, headers); }
    else if (route.startsWith('/public/')) { serveStatic(res, route); }
    else { res.writeHead(404, headers); res.end(JSON.stringify({ error: 'Not found' })); }
  } catch (e) {
    res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

function serve(res, filepath, ct) {
  res.writeHead(200, { 
    'Content-Type': ct,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
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
  const fp = path.join(__dirname, route);
  if (!fs.existsSync(fp)) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(fp);
  const types = { '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
  res.end(fs.readFileSync(fp));
}

// --- API Handlers ---

function getOverview() {
  const today = new Date().toISOString().split('T')[0];
  const memFile = path.join(MEMORY, `${today}.md`);
  const todayLog = fs.existsSync(memFile) ? fs.readFileSync(memFile, 'utf8').slice(0, 2000) : null;

  // Count VDR files
  let vdrCount = 0;
  try { vdrCount = parseInt(execSync(`find ${VDR} -name '*.md' | wc -l`).toString().trim()); } catch {}

  // Memory graph stats
  let graphStats = {};
  const graphDb = path.join(CHIMERA, 'memory/graph.db');
  if (fs.existsSync(graphDb)) {
    try {
      const entities = execSync(`sqlite3 ${graphDb} "SELECT COUNT(*) FROM entities" 2>/dev/null`).toString().trim();
      const facts = execSync(`sqlite3 ${graphDb} "SELECT COUNT(*) FROM facts" 2>/dev/null`).toString().trim();
      graphStats = { entities: parseInt(entities), facts: parseInt(facts) };
    } catch {}
  }

  // VDR analysis report
  let vdrReport = null;
  const reportFile = path.join(VDR, '.vdr-analysis-report.json');
  if (fs.existsSync(reportFile)) {
    try { const r = JSON.parse(fs.readFileSync(reportFile, 'utf8')); vdrReport = { actions: r.actions?.length || 0, questions: r.questions?.length || 0, gaps: r.gaps?.length || 0, stale: r.staleIndicators?.length || 0, timestamp: r.timestamp }; } catch {}
  }

  return {
    timestamp: new Date().toISOString(),
    todayLog,
    vdrFiles: vdrCount,
    graphStats,
    vdrReport,
    uptime: process.uptime()
  };
}

function getPM2(res, headers) {
  exec('pm2 jlist', (err, stdout) => {
    let procs = [];
    try { procs = JSON.parse(stdout || '[]').map(p => ({ name: p.name, status: p.pm2_env?.status, cpu: p.monit?.cpu, memory: p.monit?.memory, restarts: p.pm2_env?.restart_time, uptime: p.pm2_env?.pm_uptime })); } catch {}
    json(res, headers, procs);
  });
}

function getVDR(subdir) {
  const dir = path.join(VDR, subdir);
  if (!dir.startsWith(VDR)) return { error: 'Invalid path' };
  if (!fs.existsSync(dir)) return { entries: [], path: subdir };

  const entries = fs.readdirSync(dir, { withFileTypes: true }).map(d => ({
    name: d.name,
    type: d.isDirectory() ? 'dir' : 'file',
    size: d.isFile() ? fs.statSync(path.join(dir, d.name)).size : null,
    modified: fs.statSync(path.join(dir, d.name)).mtime.toISOString()
  })).sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1);

  return { entries, path: subdir };
}

function getVDRFile(filePath) {
  const fp = path.join(VDR, filePath);
  if (!fp.startsWith(VDR) || !fs.existsSync(fp)) return { error: 'Not found' };
  const stat = fs.statSync(fp);
  if (stat.size > 100000) return { error: 'File too large', size: stat.size };
  return { content: fs.readFileSync(fp, 'utf8'), path: filePath, size: stat.size, modified: stat.mtime.toISOString() };
}

function getMemory() {
  const files = [];
  if (fs.existsSync(MEMORY)) {
    fs.readdirSync(MEMORY).filter(f => f.endsWith('.md')).sort().reverse().forEach(f => {
      const stat = fs.statSync(path.join(MEMORY, f));
      files.push({ name: f, size: stat.size, modified: stat.mtime.toISOString() });
    });
  }
  // MEMORY.md
  const memMain = path.join(KIRA, 'MEMORY.md');
  if (fs.existsSync(memMain)) {
    const stat = fs.statSync(memMain);
    files.unshift({ name: 'MEMORY.md', size: stat.size, modified: stat.mtime.toISOString(), main: true });
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

function getCron(res, headers) {
  exec(`curl -s http://127.0.0.1:18789/api/cron/list 2>/dev/null`, (err, stdout) => {
    let jobs = [];
    try { const data = JSON.parse(stdout || '{}'); jobs = data.jobs || []; } catch {}
    json(res, headers, jobs);
  });
}

function getSessions(res, headers) {
  exec(`curl -s http://127.0.0.1:18789/api/sessions?limit=10 2>/dev/null`, (err, stdout) => {
    let sessions = [];
    try { sessions = JSON.parse(stdout || '{}').sessions || []; } catch {}
    json(res, headers, sessions);
  });
}

function getGitStatus() {
  try {
    const status = execSync('cd ' + KIRA + ' && git status --porcelain 2>/dev/null').toString().trim();
    const branch = execSync('cd ' + KIRA + ' && git branch --show-current 2>/dev/null').toString().trim();
    const lastCommit = execSync('cd ' + KIRA + ' && git log --oneline -5 2>/dev/null').toString().trim();
    return { branch, status: status || 'clean', lastCommits: lastCommit.split('\n') };
  } catch { return { error: 'git not available' }; }
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

// Scratchpad storage
const SCRATCHPAD_FILE = path.join(KIRA, 'dashboard', 'scratchpad.json');
const OPENROUTER_KEY = '';

// Chat sync — receives messages from Kira's main loop
function handleChatSync(req, res, headers) {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const msg = JSON.parse(body);
        let msgs = [];
        try { msgs = JSON.parse(fs.readFileSync(SCRATCHPAD_FILE, 'utf8')); } catch {}
        msgs.push({
          from: msg.from || 'unknown',
          type: msg.type || 'text',
          content: msg.content || '',
          messageId: msg.messageId,
          replyTo: msg.replyTo,
          media: msg.media,
          id: Date.now(),
          ts: msg.ts || new Date().toISOString(),
          synced: true
        });
        // Keep last 500 messages
        if (msgs.length > 500) msgs = msgs.slice(-500);
        fs.writeFileSync(SCRATCHPAD_FILE, JSON.stringify(msgs, null, 2));
        json(res, headers, { ok: true });
      } catch (e) { json(res, headers, { error: e.message }); }
    });
  } else {
    json(res, headers, { error: 'POST only' });
  }
}

function handleScratchpad(req, res, headers) {
  if (req.method === 'GET') {
    let msgs = [];
    try { msgs = JSON.parse(fs.readFileSync(SCRATCHPAD_FILE, 'utf8')); } catch {}
    json(res, headers, msgs);
  } else if (req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const msg = JSON.parse(body);
        let msgs = [];
        try { msgs = JSON.parse(fs.readFileSync(SCRATCHPAD_FILE, 'utf8')); } catch {}

        // Process <live_animation> tags
        const liveRegex = /<live_animation>([\s\S]*?)<\/live_animation>/g;
        const matches = [...(msg.content || '').matchAll(liveRegex)];
        
        if (matches.length > 0) {
          // Split content: escape text parts, replace tags with numbered placeholders
          const parts = msg.content.split(liveRegex);
          let rebuilt = '';
          let placeholderIdx = 0;
          const descriptions = [];
          for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) {
              const text = parts[i].trim();
              if (text) rebuilt += `<p style="margin:0 0 12px;white-space:pre-wrap">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`;
            } else {
              const id = `live-ph-${placeholderIdx++}`;
              descriptions.push({ id, desc: parts[i].trim() });
              rebuilt += `<div id="${id}"><div style="color:#0055ff;font-size:.8rem;padding:12px">⏳ Generating component...</div></div>`;
            }
          }
          
          const msgIdx = msgs.length;
          const msgObj = { ...msg, content: rebuilt, type: 'html', id: Date.now(), ts: new Date().toISOString(), generating: true };
          msgs.push(msgObj);
          fs.writeFileSync(SCRATCHPAD_FILE, JSON.stringify(msgs, null, 2));
          json(res, headers, { ok: true, id: msgs.length, generating: true });

          // Generate each component async
          for (const { id, desc } of descriptions) {
            try {
              const html = await generateLiveComponent(desc);
              const currentMsgs = JSON.parse(fs.readFileSync(SCRATCHPAD_FILE, 'utf8'));
              const target = currentMsgs[msgIdx];
              if (target) {
                target.content = target.content.replace(new RegExp(`<div id="${id}">[\\s\\S]*?<\\/div>`), html);
                target.generating = false;
                fs.writeFileSync(SCRATCHPAD_FILE, JSON.stringify(currentMsgs, null, 2));
              }
            } catch (e) {
              console.error('Live component generation failed:', e.message);
            }
          }
        } else {
          msgs.push({ ...msg, id: Date.now(), ts: new Date().toISOString() });
          fs.writeFileSync(SCRATCHPAD_FILE, JSON.stringify(msgs, null, 2));
          json(res, headers, { ok: true, id: msgs.length });
        }
      } catch (e) { json(res, headers, { error: e.message }); }
    });
  }
}

function generateLiveComponent(description) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    console.log('[live] Generating component:', description.slice(0, 60) + '...');
    const timeout = setTimeout(() => { reject(new Error('Timeout after 60s')); }, 60000);
    const postData = JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: `You are a UI component generator. Output ONLY the raw HTML. No thinking, no explanation, no code fences, no markdown. Just the HTML.

Rules:
- Inline styles only
- Dark theme: transparent bg, text #e8e8f0, accent #0055ff  
- Self-contained in one <div>
- CSS animations via <style> tag inside the div
- SVG animations via CSS or SMIL
- Compact but visually impressive
- Start your response with <div> and end with </div>` },
        { role: 'user', content: description }
      ],
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

const NOTION_KEY = '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';
function getNotion(res, headers, dbId) {
  const https = require('https');
  const postData = JSON.stringify({ page_size: 100 });
  const opts = {
    hostname: 'api.notion.com', path: `/v1/databases/${dbId}/query`, method: 'POST',
    headers: { 'Authorization': `Bearer ${NOTION_KEY}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
  };
  const req2 = https.request(opts, (r) => {
    let body = '';
    r.on('data', c => body += c);
    r.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.object === 'error') { json(res, headers, { error: data.message, code: data.code }); return; }
        const rows = (data.results || []).map(p => {
          const props = p.properties || {};
          const row = { id: p.id };
          Object.keys(props).forEach(k => {
            const v = props[k];
            if (v.title) row[k] = v.title.map(t => t.plain_text).join('');
            else if (v.rich_text) row[k] = v.rich_text.map(t => t.plain_text).join('');
            else if (v.select) row[k] = v.select?.name || '';
            else if (v.multi_select) row[k] = v.multi_select.map(s => s.name).join(', ');
            else if (v.date) row[k] = v.date?.start || '';
            else if (v.number !== undefined) row[k] = v.number;
            else if (v.checkbox !== undefined) row[k] = v.checkbox;
            else if (v.relation) row[k] = v.relation?.length || 0;
            else if (v.status) row[k] = v.status?.name || '';
          });
          return row;
        });
        json(res, headers, rows);
      } catch (e) { json(res, headers, { error: e.message }); }
    });
  });
  req2.on('error', e => json(res, headers, { error: e.message }));
  req2.write(postData);
  req2.end();
}

function streamSSE(req, res, headers) {
  res.writeHead(200, { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
  const send = () => {
    const data = { ...getOverview(), system: getSystem() };
    res.write('data: ' + JSON.stringify(data) + '\n\n');
  };
  send();
  const iv = setInterval(send, 5000);
  req.on('close', () => clearInterval(iv));
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Kira Dashboard running at http://localhost:${PORT}`);
});
