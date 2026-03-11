import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { skillsRouter } from './routes/skills';
import { initGatewayBridge, addSSEClient, removeSSEClient, getActivity, notifyStreamStart, notifyStreamDelta, notifyStreamEnd, setOnFinalMessage } from './gateway-bridge';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KIRA_HOME = process.env.KIRA_HOME || '/home/adminuser/kira';
const DB_PATH = path.join(KIRA_HOME, 'memory/unified.db');
const MEMORY_DIR = path.join(KIRA_HOME, 'memory');
const GATEWAY_URL = "http://127.0.0.1:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "cf56f0d0881f98620828918a6b1d782344483ee54713b226";
const PORT = parseInt(process.env.PORT || '3847', 10);
console.log('[kira-app] GATEWAY MODE v3 —', GATEWAY_URL);

// Open unified.db read-only for knowledge graph
let db: Database.Database | null = null;
try {
  if (fs.existsSync(DB_PATH)) {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma('journal_mode = WAL');
  }
} catch (e) {
  console.warn('Could not open unified.db:', e);
}

// Chat DB — read-write, stores conversations + messages
const CHAT_DB_PATH = path.join(KIRA_HOME, 'app/chat.db');
const chatDb = new Database(CHAT_DB_PATH);
chatDb.pragma('journal_mode = WAL');
chatDb.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT DEFAULT 'New Chat',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS panels (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    agent_id TEXT,
    title TEXT DEFAULT 'New Chat',
    position INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );
`);

function query(sql: string, params: any[] = []): any[] {
  if (!db) return [];
  try { return db.prepare(sql).all(...params); } catch { return []; }
}
function queryOne(sql: string, params: any[] = []): any {
  if (!db) return null;
  try { return db.prepare(sql).get(...params) || null; } catch { return null; }
}

const app = express();
app.use(express.json());

// Request logger — log all API requests
app.use('/api', (req, _res, next) => {
  console.log(`[req] ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Serve static build if exists
const clientDist = path.join(__dirname, '../../dist/client');
if (fs.existsSync(clientDist)) {
  // Cache JS/CSS assets (they have content hashes), but never cache HTML
  app.use(express.static(clientDist, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));
}

const wrap = (data: any) => ({ data });

// Health & Config
app.get('/api/health', (_r, res) => res.json({ status: 'ok', singleTenant: true }));
app.get('/api/v1/config', (_r, res) => res.json({ singleTenant: true }));

// SSE Events — wired to gateway bridge for real-time agent activity
app.get('/api/v1/events/stream', (_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('data: {"type":"connected"}\n\n');
  // Send current activity state immediately so refreshed clients know what's happening
  res.write(`event: activity\ndata: ${JSON.stringify(getActivity())}\n\n`);
  const clientId = addSSEClient(res);
  const iv = setInterval(() => { try { res.write(': keepalive\n\n'); } catch {} }, 15000);
  _req.on('close', () => { clearInterval(iv); removeSSEClient(clientId); });
});

// Agent activity status (polling fallback)
app.get('/api/v1/agent/activity', (_req, res) => {
  res.json({ data: getActivity() });
});

// Knowledge Graph
app.get('/api/v1/knowledge/entities', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 200, 1000);
  const type = req.query.type as string;
  const q = req.query.q as string;
  let sql = 'SELECT * FROM entities WHERE 1=1';
  const params: any[] = [];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (q) { sql += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY updated_at DESC LIMIT ?';
  params.push(limit);
  res.json(wrap(query(sql, params)));
});

app.get('/api/v1/knowledge/graph', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 200, 1000);
  const entities = query('SELECT * FROM entities ORDER BY updated_at DESC LIMIT ?', [limit]);
  const ids = entities.map((e: any) => e.id);
  let relations: any[] = [];
  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    relations = query(`SELECT * FROM relations WHERE source_id IN (${placeholders}) OR target_id IN (${placeholders})`, [...ids, ...ids]);
  }
  res.json(wrap({ entities, relations }));
});

app.get('/api/v1/knowledge/entity/:id', (req, res) => {
  const entity = queryOne('SELECT * FROM entities WHERE id = ?', [req.params.id]);
  if (!entity) return res.status(404).json({ error: 'Not found' });
  const facts = query('SELECT * FROM facts WHERE subject_id = ? ORDER BY timestamp DESC LIMIT 100', [req.params.id]);
  const relations = query('SELECT r.*, e.name as target_name, e.type as target_type FROM relations r LEFT JOIN entities e ON e.id = CASE WHEN r.source_id = ? THEN r.target_id ELSE r.source_id END WHERE r.source_id = ? OR r.target_id = ? LIMIT 100', [req.params.id, req.params.id, req.params.id]);
  res.json(wrap({ ...entity, facts, relations }));
});

// Episodes
app.get('/api/v1/episodes', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
  const since = req.query.since as string;
  let sql = 'SELECT * FROM episodes';
  const params: any[] = [];
  if (since) { sql += ' WHERE timestamp >= ?'; params.push(since); }
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);
  res.json(wrap(query(sql, params)));
});

// Memory files
app.get('/api/v1/memory', (_r, res) => {
  try {
    const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md')).map(f => ({
      name: f, path: f, size: fs.statSync(path.join(MEMORY_DIR, f)).size,
      modified: fs.statSync(path.join(MEMORY_DIR, f)).mtime.toISOString(),
    }));
    // Also include MEMORY.md from KIRA_HOME
    const memoryMd = path.join(KIRA_HOME, 'MEMORY.md');
    if (fs.existsSync(memoryMd)) {
      const s = fs.statSync(memoryMd);
      files.unshift({ name: 'MEMORY.md', path: '../MEMORY.md', size: s.size, modified: s.mtime.toISOString() });
    }
    res.json(wrap(files));
  } catch { res.json(wrap([])); }
});

app.get('/api/v1/memory/file', (req, res) => {
  const p = req.query.path as string;
  if (!p) return res.status(400).json({ error: 'path required' });
  // Resolve relative to MEMORY_DIR, prevent traversal
  const resolved = path.resolve(MEMORY_DIR, p);
  if (!resolved.startsWith(KIRA_HOME)) return res.status(403).json({ error: 'forbidden' });
  try {
    const content = fs.readFileSync(resolved, 'utf-8');
    res.json(wrap({ path: p, content }));
  } catch { res.status(404).json({ error: 'not found' }); }
});

// Agents
app.get('/api/v1/agents/runs', (_r, res) => res.json(wrap([])));

// ── Chat System ────────────────────────────────────────────────────

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// List conversations
app.get('/api/v1/chat/conversations', (_r, res) => {
  const rows = chatDb.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all();
  res.json({ data: rows });
});

// Create conversation
app.post('/api/v1/chat/conversations', (req, res) => {
  const id = uuid();
  const title = req.body?.title || 'New Chat';
  chatDb.prepare('INSERT INTO conversations (id, title) VALUES (?, ?)').run(id, title);
  const row = chatDb.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  res.json({ data: row });
});

// Delete conversation
app.delete('/api/v1/chat/conversations/:id', (req, res) => {
  chatDb.prepare('DELETE FROM messages WHERE conversation_id = ?').run(req.params.id);
  chatDb.prepare('DELETE FROM conversations WHERE id = ?').run(req.params.id);
  res.json({ data: { ok: true } });
});

// Rename conversation
app.patch('/api/v1/chat/conversations/:id', (req, res) => {
  const { title } = req.body || {};
  if (title) chatDb.prepare(`UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?`).run(title, req.params.id);
  const row = chatDb.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
  res.json({ data: row });
});

// Get messages for a conversation
app.get('/api/v1/chat/conversations/:id/messages', (req, res) => {
  const msgs = chatDb.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ data: msgs });
});

// Last 50 chat messages from local history
app.get('/api/v1/chat/history', (_req, res) => {
  const rows = chatDb.prepare(`
    SELECT * FROM (
      SELECT * FROM messages ORDER BY created_at DESC LIMIT 50
    ) ORDER BY created_at ASC
  `).all();
  res.json({ data: rows });
});

// Send message — fire-and-forget to gateway, response comes via WS bridge SSE
app.post('/api/v1/chat/conversations/:id/messages', async (req, res) => {
  const conversationId = req.params.id;
  const { content, message } = req.body || {};
  const userText = content || message || '';
  console.log(`[chat] POST message conv=${conversationId} text="${userText.slice(0, 50)}"`);
  if (!userText) { res.status(400).json({ error: 'content required' }); return; }

  // Ensure conversation exists (auto-create if missing)
  const convExists = chatDb.prepare('SELECT id FROM conversations WHERE id = ?').get(conversationId);
  if (!convExists) {
    chatDb.prepare('INSERT INTO conversations (id, title) VALUES (?, ?)').run(conversationId, 'New Chat');
  }

  // Save user message
  const userMsgId = uuid();
  try {
    chatDb.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)')
      .run(userMsgId, conversationId, 'user', userText);
  } catch (err: any) {
    console.error('[chat] Failed to save user message:', err.message);
    res.status(500).json({ error: 'Failed to save message' });
    return;
  }
  chatDb.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversationId);

  // Auto-title
  const msgCount = (chatDb.prepare('SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?').get(conversationId) as any)?.c || 0;
  if (msgCount <= 1) {
    const autoTitle = userText.slice(0, 60) + (userText.length > 60 ? '...' : '');
    chatDb.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(autoTitle, conversationId);
  }

  // Send to gateway (fire-and-forget — response comes via WS bridge)
  try {
    const upstream = await fetch(GATEWAY_URL + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GATEWAY_TOKEN,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': 'main',
      },
      body: JSON.stringify({
        model: 'openclaw:main',
        messages: [{ role: 'user', content: userText }],
        stream: false,
        user: 'kira-dashboard',
      }),
    });
    console.log(`[chat] Gateway accepted: ${upstream.status}`);
    // We don't need the response body — the WS bridge captures the streamed events
    // Just drain it to avoid memory leaks
    upstream.body?.cancel().catch(() => {});
  } catch (err: any) {
    console.error('[chat] Gateway send error:', err.message);
  }

  // Return immediately with the saved user message
  res.json({ data: { id: userMsgId, conversationId, role: 'user', content: userText, createdAt: new Date().toISOString() } });
});

// Stubs
const emptyArrayRoutes = ['tasks', 'projects', 'objectives', 'areas', 'agents', 'vision', 'dashboards', 'reviews', 'time-blocks', 'principles'];
for (const r of emptyArrayRoutes) app.get(`/api/v1/${r}`, (_r, res) => res.json(wrap([])));
// Settings — persisted in chat.db
chatDb.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);

app.get('/api/v1/settings', (_r, res) => {
  const row = chatDb.prepare('SELECT value FROM settings WHERE key = ?').get('user_settings') as any;
  res.json(wrap(row ? JSON.parse(row.value) : {}));
});

app.patch('/api/v1/settings', (req, res) => {
  const incoming = req.body?.settings || req.body || {};
  const existing = (() => {
    const row = chatDb.prepare('SELECT value FROM settings WHERE key = ?').get('user_settings') as any;
    return row ? JSON.parse(row.value) : {};
  })();
  const merged = { ...existing, ...incoming };
  chatDb.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('user_settings', JSON.stringify(merged));
  res.json(wrap(merged));
});
app.get('/api/v1/xp', (_r, res) => res.json(wrap({ level: 1, xp: 0 })));

// ── Panels ──────────────────────────────────────────────────────────

app.get('/api/v1/panels', (_r, res) => {
  const rows = chatDb.prepare(`
    SELECT id, conversation_id as conversationId, agent_id as agentId, title, position, is_active as isActive
    FROM panels ORDER BY position ASC
  `).all();
  console.log(`[panels] GET /api/v1/panels → ${rows.length} panels`);
  res.json({ data: rows });
});

app.post('/api/v1/panels', (req, res) => {
  console.log(`[panels] POST /api/v1/panels — body:`, JSON.stringify(req.body));
  const { title, agentId } = req.body || {};
  const convId = uuid();
  const panelId = uuid();
  const panelTitle = title || 'New Chat';
  chatDb.prepare('INSERT INTO conversations (id, title) VALUES (?, ?)').run(convId, panelTitle);
  const pos = (chatDb.prepare('SELECT COUNT(*) as c FROM panels').get() as any)?.c || 0;
  chatDb.prepare('INSERT INTO panels (id, conversation_id, agent_id, title, position) VALUES (?, ?, ?, ?, ?)')
    .run(panelId, convId, agentId || null, panelTitle, pos);
  res.json({ data: {
    id: panelId,
    conversationId: convId,
    agentId: agentId || null,
    title: panelTitle,
    position: pos,
    isActive: 1,
    conversation: { id: convId, title: panelTitle },
  }});
});

app.delete('/api/v1/panels/:id', (req, res) => {
  chatDb.prepare('DELETE FROM panels WHERE id = ?').run(req.params.id);
  res.json({ data: { ok: true } });
});

// User agents stub
app.get('/api/v1/user-agents', (_r, res) => res.json({ data: [] }));
app.get('/api/v1/user-agents/runs/recent', (_r, res) => res.json({ data: [] }));

// ── Skills (real router, bridged to OpenClaw) ────────────────────────────
app.use('/api/v1/skills', skillsRouter);

// ── Transcribe (voice input → Whisper) ───────────────────────────────────
import { transcribeRouter } from './routes/transcribe';
app.use('/api/v1/transcribe', transcribeRouter);

// ── Agents / OpenClaw bridge ─────────────────────────────────────────────
app.get('/api/v1/agents/openclaw', async (_r, res) => {
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    const { stdout } = await execFileAsync('openclaw', ['skills', 'check', '--json'], {
      timeout: 15_000,
      env: { ...process.env },
    });
    const parsed = JSON.parse(stdout);
    res.json({ data: parsed });
  } catch (err) {
    res.json({ data: { eligible: [], disabled: [], blocked: [], missingRequirements: [] } });
  }
});

// Catch-all for unknown /api/v1 routes
app.all('/api/v1/*', (req, res) => {
  console.log(`[catch-all] ${req.method} ${req.path}`);
  res.json({ data: [] });
});

// SPA fallback
if (fs.existsSync(clientDist)) {
  app.get('*', (_r, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Kira single-tenant server on :${PORT}`);
  initGatewayBridge();
  
  // When the WS bridge receives a final assistant message, save it to chat.db
  // We save to the most recently active conversation
  setOnFinalMessage(async (text, runId, userText) => {
    try {
      // Find the most recent conversation with messages
      const conv = chatDb.prepare(`
        SELECT c.id FROM conversations c
        JOIN messages m ON m.conversation_id = c.id
        ORDER BY m.created_at DESC LIMIT 1
      `).get() as any;
      if (!conv) return;
      const msgId = uuid();
      chatDb.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)')
        .run(msgId, conv.id, 'assistant', text);
      chatDb.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conv.id);
      console.log(`[chat] Saved assistant message via bridge: ${msgId} (${text.length} chars) to conv=${conv.id}`);

      // Mem0 extraction on Telegram messages flowing through gateway
      try {
        const { addToMemory } = await import('./memory/mem0-service');
        const mem0Messages: Array<{ role: string; content: string }> = [];
        if (userText) mem0Messages.push({ role: 'user', content: userText });
        mem0Messages.push({ role: 'assistant', content: text });
        addToMemory(
          mem0Messages,
          { userId: 'otto', agentId: 'kira', sessionId: conv.id, metadata: { source: 'telegram', conversationId: conv.id } }
        ).then(r => {
          if (r?.results?.length) console.log(`[mem0-bridge] extracted ${r.results.length} memories`);
        }).catch(err => console.error('[mem0-bridge] extraction error:', err.message));
      } catch {}
    } catch (err: any) {
      console.error('[chat] Error saving bridge message:', err.message);
    }
  });
});
