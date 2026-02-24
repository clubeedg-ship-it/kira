import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KIRA_HOME = process.env.KIRA_HOME || '/home/adminuser/kira';
const DB_PATH = path.join(KIRA_HOME, 'memory/unified.db');
const MEMORY_DIR = path.join(KIRA_HOME, 'memory');
const GATEWAY_URL = "http://127.0.0.1:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "cf56f0d0881f98620828918a6b1d782344483ee54713b226";
const PORT = parseInt(process.env.PORT || '3847', 10);
// Open unified.db read-only for knowledge graph
let db = null;
try {
    if (fs.existsSync(DB_PATH)) {
        db = new Database(DB_PATH, { readonly: true });
        db.pragma('journal_mode = WAL');
    }
}
catch (e) {
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
`);
function query(sql, params = []) {
    if (!db)
        return [];
    try {
        return db.prepare(sql).all(...params);
    }
    catch {
        return [];
    }
}
function queryOne(sql, params = []) {
    if (!db)
        return null;
    try {
        return db.prepare(sql).get(...params) || null;
    }
    catch {
        return null;
    }
}
const app = express();
app.use(express.json());
// Serve static build if exists
const clientDist = path.join(__dirname, '../../dist/client');
if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
}
const wrap = (data) => ({ data });
// Health & Config
app.get('/api/health', (_r, res) => res.json({ status: 'ok', singleTenant: true }));
app.get('/api/v1/config', (_r, res) => res.json({ singleTenant: true }));
// SSE Events
app.get('/api/v1/events', (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('data: {"type":"connected"}\n\n');
    const iv = setInterval(() => res.write(': keepalive\n\n'), 30000);
    _req.on('close', () => clearInterval(iv));
});
// Knowledge Graph
app.get('/api/v1/knowledge/entities', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    const type = req.query.type;
    const q = req.query.q;
    let sql = 'SELECT * FROM entities WHERE 1=1';
    const params = [];
    if (type) {
        sql += ' AND type = ?';
        params.push(type);
    }
    if (q) {
        sql += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(limit);
    res.json(wrap(query(sql, params)));
});
app.get('/api/v1/knowledge/graph', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    const entities = query('SELECT * FROM entities ORDER BY updated_at DESC LIMIT ?', [limit]);
    const ids = entities.map((e) => e.id);
    let relations = [];
    if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        relations = query(`SELECT * FROM relations WHERE source_id IN (${placeholders}) OR target_id IN (${placeholders})`, [...ids, ...ids]);
    }
    res.json(wrap({ entities, relations }));
});
app.get('/api/v1/knowledge/entity/:id', (req, res) => {
    const entity = queryOne('SELECT * FROM entities WHERE id = ?', [req.params.id]);
    if (!entity)
        return res.status(404).json({ error: 'Not found' });
    const facts = query('SELECT * FROM facts WHERE subject_id = ? ORDER BY timestamp DESC LIMIT 100', [req.params.id]);
    const relations = query('SELECT r.*, e.name as target_name, e.type as target_type FROM relations r LEFT JOIN entities e ON e.id = CASE WHEN r.source_id = ? THEN r.target_id ELSE r.source_id END WHERE r.source_id = ? OR r.target_id = ? LIMIT 100', [req.params.id, req.params.id, req.params.id]);
    res.json(wrap({ ...entity, facts, relations }));
});
// Episodes
app.get('/api/v1/episodes', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const since = req.query.since;
    let sql = 'SELECT * FROM episodes';
    const params = [];
    if (since) {
        sql += ' WHERE timestamp >= ?';
        params.push(since);
    }
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
    }
    catch {
        res.json(wrap([]));
    }
});
app.get('/api/v1/memory/file', (req, res) => {
    const p = req.query.path;
    if (!p)
        return res.status(400).json({ error: 'path required' });
    // Resolve relative to MEMORY_DIR, prevent traversal
    const resolved = path.resolve(MEMORY_DIR, p);
    if (!resolved.startsWith(KIRA_HOME))
        return res.status(403).json({ error: 'forbidden' });
    try {
        const content = fs.readFileSync(resolved, 'utf-8');
        res.json(wrap({ path: p, content }));
    }
    catch {
        res.status(404).json({ error: 'not found' });
    }
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
    if (title)
        chatDb.prepare(`UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?`).run(title, req.params.id);
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
// Send message — stream directly from OpenClaw gateway
app.post('/api/v1/chat/conversations/:id/messages', (req, res) => {
    const conversationId = req.params.id;
    const { content, message } = req.body || {};
    const userText = content || message || '';
    if (!userText) {
        res.status(400).json({ error: 'content required' });
        return;
    }
    // Save user message
    const userMsgId = uuid();
    chatDb.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)')
        .run(userMsgId, conversationId, 'user', userText);
    chatDb.prepare(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`).run(conversationId);
    // Auto-title from first message
    const msgCount = chatDb.prepare('SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?').get(conversationId)?.c || 0;
    if (msgCount <= 1) {
        const autoTitle = userText.slice(0, 60) + (userText.length > 60 ? '...' : '');
        chatDb.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(autoTitle, conversationId);
    }
    // SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    // Stream directly from OpenClaw gateway
    const gatewayChatUrl = `${GATEWAY_URL}/v1/chat/completions`;
    const postBody = JSON.stringify({
        model: 'openclaw:main',
        messages: [{ role: 'user', content: userText }],
        stream: true,
    });
    const controller = new AbortController();
    req.on('close', () => controller.abort());
    (async () => {
        try {
            const upstream = await fetch(gatewayChatUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${GATEWAY_TOKEN}`,
                    'Content-Type': 'application/json',
                    'x-openclaw-agent-id': 'main',
                    'x-openclaw-session-key': 'agent:main:main',
                },
                body: postBody,
                signal: controller.signal,
            });
            if (!upstream.ok || !upstream.body) {
                const errBody = await upstream.text().catch(() => '');
                const error = errBody
                    ? `Gateway returned ${upstream.status}: ${errBody}`
                    : `Gateway returned ${upstream.status}`;
                if (!res.writableEnded) {
                    res.write(`data: ${JSON.stringify({ type: 'error', error })}\n\n`);
                    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                    res.end();
                }
                return;
            }
            let fullResponse = '';
            let buffer = '';
            const reader = upstream.body.getReader();
            const decoder = new TextDecoder();
            let gotDone = false;
            const saveAssistantMessage = () => {
                if (!fullResponse.trim())
                    return;
                chatDb.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)')
                    .run(uuid(), conversationId, 'assistant', fullResponse.trim());
                chatDb.prepare(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`).run(conversationId);
            };
            const processDataLine = (line) => {
                if (!line.startsWith('data:'))
                    return;
                const payload = line.slice(5).trim();
                if (!payload)
                    return;
                if (payload === '[DONE]') {
                    gotDone = true;
                    return;
                }
                try {
                    const evt = JSON.parse(payload);
                    const delta = evt?.choices?.[0]?.delta?.content;
                    if (typeof delta === 'string' && delta.length > 0) {
                        fullResponse += delta;
                        res.write(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`);
                    }
                }
                catch { }
            };
            readLoop: while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split(/\r?\n/);
                buffer = lines.pop() || '';
                for (const line of lines) {
                    processDataLine(line.trim());
                    if (gotDone)
                        break readLoop;
                }
            }
            // Handle any trailing partial line
            if (!gotDone && buffer.trim()) {
                processDataLine(buffer.trim());
            }
            saveAssistantMessage();
            if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                res.end();
            }
        }
        catch (err) {
            if (err.name === 'AbortError')
                return;
            console.error('[chat gateway] error:', err.message);
            try {
                res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
                res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                res.end();
            }
            catch { }
        }
    })();
});
// Stubs
const emptyArrayRoutes = ['tasks', 'projects', 'objectives', 'areas', 'agents', 'vision', 'dashboards', 'reviews', 'time-blocks', 'principles'];
for (const r of emptyArrayRoutes)
    app.get(`/api/v1/${r}`, (_r, res) => res.json(wrap([])));
// Settings — persisted in chat.db
chatDb.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
app.get('/api/v1/settings', (_r, res) => {
    const row = chatDb.prepare('SELECT value FROM settings WHERE key = ?').get('user_settings');
    res.json(wrap(row ? JSON.parse(row.value) : {}));
});
app.patch('/api/v1/settings', (req, res) => {
    const incoming = req.body?.settings || req.body || {};
    const existing = (() => {
        const row = chatDb.prepare('SELECT value FROM settings WHERE key = ?').get('user_settings');
        return row ? JSON.parse(row.value) : {};
    })();
    const merged = { ...existing, ...incoming };
    chatDb.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('user_settings', JSON.stringify(merged));
    res.json(wrap(merged));
});
app.get('/api/v1/xp', (_r, res) => res.json(wrap({ level: 1, xp: 0 })));
// Catch-all for unknown /api/v1 routes
app.all('/api/v1/*', (_r, res) => res.json({ data: [] }));
// SPA fallback
if (fs.existsSync(clientDist)) {
    app.get('*', (_r, res) => res.sendFile(path.join(clientDist, 'index.html')));
}
app.listen(PORT, '0.0.0.0', () => console.log(`Kira single-tenant server on :${PORT}`));
//# sourceMappingURL=index-single.js.map