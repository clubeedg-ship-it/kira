# TONIGHT IMPLEMENTATION SPEC
## Dynamic Task System for Kira Admin Dashboard

**Date:** 2025-06-28 night session
**Goal:** Go from hardcoded dashboard to dynamic task board with text-to-task extraction, inbox, and agent transcript viewer — in one session.

---

## 1. FILE CHANGES SUMMARY

| Action | File | What |
|--------|------|------|
| **MODIFY** | `admin-dashboard/server.js` | Add task/inbox/goal tables + 10 new API routes |
| **MODIFY** | `admin-dashboard/ui/dashboard.html` | Add 3 new tabs (Operations, Inbox, Agents), ~300 lines JS |
| **CREATE** | `admin-dashboard/task-extractor.js` | LLM text-to-task extraction module |
| **MODIFY** | `HEARTBEAT.md` | Add task checking instructions |
| **CREATE** | `admin-dashboard/migrate.js` | One-shot schema migration script |

---

## 2. SQLITE SCHEMA

Add to `server.js` db.exec() block (or run via `migrate.js`):

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',        -- todo | in_progress | review | done | blocked
  priority INTEGER DEFAULT 2,        -- 0=critical 1=high 2=medium 3=low
  project TEXT,                       -- e.g. 'IAM', 'Kira', 'Personal'
  assignee TEXT,                      -- 'otto', 'kira', 'randall', agent name
  creator TEXT DEFAULT 'kira',        -- who/what created it
  due_date TEXT,
  tags TEXT DEFAULT '[]',             -- JSON array
  source TEXT,                        -- 'manual' | 'extracted' | 'agent' | 'heartbeat'
  source_ref TEXT,                    -- message ID or session ID it came from
  session_id TEXT,                    -- linked OpenClaw session working on this
  position REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',       -- active | completed | archived
  target_date TEXT,
  progress INTEGER DEFAULT 0,        -- 0-100
  milestones TEXT DEFAULT '[]',       -- JSON array of {title, done}
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inbox_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                 -- 'task_review' | 'decision' | 'approval' | 'info'
  title TEXT NOT NULL,
  description TEXT,
  task_id TEXT,                       -- linked task if applicable
  actions TEXT DEFAULT '[]',          -- JSON: [{label:"Approve",action:"approve"}, ...]
  status TEXT DEFAULT 'pending',      -- pending | acted | dismissed
  priority INTEGER DEFAULT 2,
  created_at TEXT DEFAULT (datetime('now')),
  acted_at TEXT,
  acted_action TEXT                   -- which action was taken
);

CREATE TABLE IF NOT EXISTS task_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  actor TEXT NOT NULL,                -- 'otto', 'kira', 'system'
  action TEXT NOT NULL,               -- 'created', 'status_changed', 'assigned', 'commented'
  details TEXT,                       -- JSON with old/new values or comment text
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project);
CREATE INDEX IF NOT EXISTS idx_inbox_status ON inbox_items(status);
CREATE INDEX IF NOT EXISTS idx_activities_task ON task_activities(task_id);
```

---

## 3. MIGRATION SCRIPT

**File: `admin-dashboard/migrate.js`**

```js
#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'kira-admin.db'));
db.pragma('journal_mode = WAL');

const migrations = [
  // Tasks table
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
    status TEXT DEFAULT 'todo', priority INTEGER DEFAULT 2,
    project TEXT, assignee TEXT, creator TEXT DEFAULT 'kira',
    due_date TEXT, tags TEXT DEFAULT '[]', source TEXT,
    source_ref TEXT, session_id TEXT, position REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')), completed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
    status TEXT DEFAULT 'active', target_date TEXT,
    progress INTEGER DEFAULT 0, milestones TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS inbox_items (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL,
    description TEXT, task_id TEXT, actions TEXT DEFAULT '[]',
    status TEXT DEFAULT 'pending', priority INTEGER DEFAULT 2,
    created_at TEXT DEFAULT (datetime('now')),
    acted_at TEXT, acted_action TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS task_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL,
    actor TEXT NOT NULL, action TEXT NOT NULL, details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project)`,
  `CREATE INDEX IF NOT EXISTS idx_inbox_status ON inbox_items(status)`,
  `CREATE INDEX IF NOT EXISTS idx_activities_task ON task_activities(task_id)`,
];

for (const sql of migrations) {
  try { db.exec(sql); } catch (e) { console.log('Skip:', e.message); }
}
console.log('Migration complete.');
db.close();
```

Run: `node admin-dashboard/migrate.js`

---

## 4. API ENDPOINTS — Add to server.js

Add these handler functions and route them in the request handler:

### 4.1 Helper: Generate IDs

```js
// At top of server.js
function nanoid(len = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < len; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}
```

### 4.2 Task CRUD

```js
// GET /api/tasks?status=todo&project=IAM&assignee=kira
function apiTasks(query) {
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];
  if (query.status) { sql += ' AND status=?'; params.push(query.status); }
  if (query.project) { sql += ' AND project=?'; params.push(query.project); }
  if (query.assignee) { sql += ' AND assignee=?'; params.push(query.assignee); }
  sql += ' ORDER BY priority ASC, position ASC, created_at DESC LIMIT 200';
  return db.prepare(sql).all(...params);
}

// POST /api/tasks  body: {title, description?, status?, priority?, project?, assignee?, due_date?, tags?, source?}
function apiCreateTask(body) {
  const id = nanoid();
  const stmt = db.prepare(`INSERT INTO tasks (id, title, description, status, priority, project, assignee, creator, due_date, tags, source, source_ref)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt.run(id, body.title, body.description || null, body.status || 'todo',
    body.priority ?? 2, body.project || null, body.assignee || null,
    body.creator || 'manual', body.due_date || null,
    JSON.stringify(body.tags || []), body.source || 'manual', body.source_ref || null);

  db.prepare(`INSERT INTO task_activities (task_id, actor, action, details) VALUES (?, ?, 'created', ?)`).run(
    id, body.creator || 'manual', JSON.stringify({ title: body.title }));

  return db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
}

// PATCH /api/tasks/:id  body: partial task fields
function apiUpdateTask(id, body) {
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  if (!task) return { error: 'Not found' };

  const allowed = ['title','description','status','priority','project','assignee','due_date','tags','session_id','position'];
  const sets = []; const params = [];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      sets.push(`${key}=?`);
      params.push(key === 'tags' ? JSON.stringify(body[key]) : body[key]);
    }
  }
  if (body.status === 'done' && task.status !== 'done') {
    sets.push('completed_at=datetime("now")');
  }
  if (sets.length === 0) return task;

  sets.push('updated_at=datetime("now")');
  params.push(id);
  db.prepare(`UPDATE tasks SET ${sets.join(',')} WHERE id=?`).run(...params);

  // Activity log
  if (body.status && body.status !== task.status) {
    db.prepare(`INSERT INTO task_activities (task_id, actor, action, details) VALUES (?, ?, 'status_changed', ?)`)
      .run(id, body.actor || 'system', JSON.stringify({ from: task.status, to: body.status }));
  }

  return db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
}

// DELETE /api/tasks/:id
function apiDeleteTask(id) {
  db.prepare('DELETE FROM task_activities WHERE task_id=?').run(id);
  db.prepare('DELETE FROM tasks WHERE id=?').run(id);
  return { ok: true };
}
```

### 4.3 Task Extraction

```js
// POST /api/tasks/extract  body: {text, project?}
// Returns extracted tasks (not yet saved) for review
async function apiExtractTasks(body) {
  const extractor = require('./task-extractor');
  const tasks = await extractor.extract(body.text, body.project);
  return { tasks }; // Array of {title, description, priority, assignee, project}
}

// POST /api/tasks/extract-and-create  body: {text, project?}
// Extracts AND creates tasks + inbox items for review
async function apiExtractAndCreate(body) {
  const extractor = require('./task-extractor');
  const extracted = await extractor.extract(body.text, body.project);
  const created = [];
  for (const t of extracted) {
    const task = apiCreateTask({ ...t, source: 'extracted', creator: 'kira' });
    created.push(task);
    // Create inbox item for each
    const inboxId = nanoid();
    db.prepare(`INSERT INTO inbox_items (id, type, title, description, task_id, actions, priority) VALUES (?,?,?,?,?,?,?)`)
      .run(inboxId, 'task_review', `Review: ${t.title}`, t.description || '',
        task.id, JSON.stringify([
          {label:'Approve',action:'approve'}, {label:'Edit',action:'edit'},
          {label:'Dismiss',action:'dismiss'}
        ]), t.priority ?? 2);
  }
  return { created, count: created.length };
}
```

### 4.4 Inbox Operations

```js
// GET /api/inbox?status=pending
function apiInbox(query) {
  let sql = 'SELECT * FROM inbox_items WHERE 1=1';
  const params = [];
  if (query.status) { sql += ' AND status=?'; params.push(query.status); }
  sql += ' ORDER BY priority ASC, created_at DESC LIMIT 100';
  return db.prepare(sql).all(...params);
}

// POST /api/inbox/:id/act  body: {action: 'approve'|'dismiss'|'edit'}
function apiInboxAct(id, body) {
  const item = db.prepare('SELECT * FROM inbox_items WHERE id=?').get(id);
  if (!item) return { error: 'Not found' };

  db.prepare(`UPDATE inbox_items SET status='acted', acted_at=datetime('now'), acted_action=? WHERE id=?`)
    .run(body.action, id);

  // Side effects
  if (body.action === 'approve' && item.task_id) {
    apiUpdateTask(item.task_id, { status: 'todo', actor: 'otto' });
  } else if (body.action === 'dismiss' && item.task_id) {
    apiDeleteTask(item.task_id);
  }

  return { ok: true, action: body.action };
}
```

### 4.5 Task Activities

```js
// GET /api/tasks/:id/activities
function apiTaskActivities(taskId) {
  return db.prepare('SELECT * FROM task_activities WHERE task_id=? ORDER BY created_at DESC LIMIT 50').all(taskId);
}
```

### 4.6 Route Registration

Add to the request handler switch in `server.js`, inside the `if (pathname.startsWith('/api/'))` block:

```js
// Tasks
if (pathname === '/api/tasks' && method === 'GET') {
  return json(res, apiTasks(Object.fromEntries(url.searchParams)));
}
if (pathname === '/api/tasks' && method === 'POST') {
  const body = JSON.parse(await readBody(req));
  return json(res, apiCreateTask(body));
}
if (pathname === '/api/tasks/extract' && method === 'POST') {
  const body = JSON.parse(await readBody(req));
  return json(res, await apiExtractTasks(body));
}
if (pathname === '/api/tasks/extract-and-create' && method === 'POST') {
  const body = JSON.parse(await readBody(req));
  return json(res, await apiExtractAndCreate(body));
}
if (pathname.match(/^\/api\/tasks\/([^/]+)$/) && method === 'PATCH') {
  const id = pathname.match(/^\/api\/tasks\/([^/]+)$/)[1];
  const body = JSON.parse(await readBody(req));
  return json(res, apiUpdateTask(id, body));
}
if (pathname.match(/^\/api\/tasks\/([^/]+)$/) && method === 'DELETE') {
  const id = pathname.match(/^\/api\/tasks\/([^/]+)$/)[1];
  return json(res, apiDeleteTask(id));
}
if (pathname.match(/^\/api\/tasks\/([^/]+)\/activities$/) && method === 'GET') {
  const id = pathname.match(/^\/api\/tasks\/([^/]+)\/activities$/)[1];
  return json(res, apiTaskActivities(id));
}

// Inbox
if (pathname === '/api/inbox' && method === 'GET') {
  return json(res, apiInbox(Object.fromEntries(url.searchParams)));
}
if (pathname.match(/^\/api\/inbox\/([^/]+)\/act$/) && method === 'POST') {
  const id = pathname.match(/^\/api\/inbox\/([^/]+)\/act$/)[1];
  const body = JSON.parse(await readBody(req));
  return json(res, apiInboxAct(id, body));
}
```

---

## 5. TEXT-TO-TASK EXTRACTOR

**File: `admin-dashboard/task-extractor.js`**

```js
/**
 * task-extractor.js — LLM-based text-to-task extraction
 * Works with Ollama (local) or Claude/OpenAI (via env vars)
 */

const EXTRACTION_PROMPT = `You are a task extraction assistant. Given a message, extract discrete actionable tasks.

For each task, output a JSON object with:
- title: concise task title (imperative verb + object)
- description: brief context if needed
- priority: 0=critical 1=high 2=medium 3=low
- assignee: who should do it (use lowercase: 'otto', 'kira', 'randall', or null if unclear)
- project: project name if mentioned, or null

Rules:
- Only extract ACTIONABLE items (not observations or FYI)
- If a task is for someone else to do (delegation), still extract it with the correct assignee
- Combine closely related sub-items into one task
- If the message is conversational and has no tasks, return empty array

Respond with ONLY a JSON array. No markdown, no explanation.

Example input: "We need to set up GA on the website, Randall can handle that. Also look into cold email tools."
Example output: [{"title":"Set up Google Analytics on website","description":"Randall to handle GA setup","priority":1,"assignee":"randall","project":null},{"title":"Research cold email tools","description":"Evaluate options for cold outreach","priority":2,"assignee":"kira","project":null}]`;

async function extract(text, defaultProject = null) {
  const prompt = EXTRACTION_PROMPT + `\n\nMessage to extract tasks from:\n${text}`;

  let response;
  try {
    // Try Ollama first (local, free)
    response = await tryOllama(prompt);
  } catch {
    try {
      // Fall back to OpenAI-compatible API
      response = await tryOpenAI(prompt);
    } catch (e) {
      console.error('Task extraction failed:', e.message);
      return [];
    }
  }

  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim();
    const match = jsonStr.match(/\[[\s\S]*\]/);
    if (match) jsonStr = match[0];
    const tasks = JSON.parse(jsonStr);
    // Apply default project
    return tasks.map(t => ({ ...t, project: t.project || defaultProject }));
  } catch (e) {
    console.error('Failed to parse extraction result:', e.message);
    return [];
  }
}

async function tryOllama(prompt) {
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'qwen3:14b',
      prompt,
      stream: false,
      options: { temperature: 0.1 }
    })
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = await res.json();
  return data.response;
}

async function tryOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1';
  if (!apiKey) throw new Error('No API key');

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.EXTRACTION_MODEL || 'anthropic/claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    })
  });
  if (!res.ok) throw new Error(`OpenAI API ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

module.exports = { extract };
```

---

## 6. DASHBOARD HTML CHANGES

### 6.1 Add New Tabs

In the `.tabs` div, add 3 new tab buttons **before** the existing ones (they become the primary view):

```html
<div class="tabs">
  <button class="tab active" data-tab="operations">⚡ Operations</button>
  <button class="tab" data-tab="inbox">📥 Inbox <span id="inboxBadge" style="background:var(--danger);color:#fff;border-radius:8px;padding:1px 6px;font-size:.65rem;margin-left:4px;display:none">0</span></button>
  <button class="tab" data-tab="transcripts">🤖 Agents</button>
  <button class="tab" data-tab="overview">Overview</button>
  <button class="tab" data-tab="agents">Agent Fleet</button>
  <button class="tab" data-tab="outputs">Outputs</button>
  <button class="tab" data-tab="usersessions">Sessions</button>
  <button class="tab" data-tab="tokenusage">Token Usage</button>
  <button class="tab" data-tab="livelogs">Live Logs</button>
  <button class="tab" data-tab="services">Services</button>
  <button class="tab" data-tab="documents">Documents</button>
</div>
```

Make `operations` the default active tab (remove `active` from `overview`).

### 6.2 Operations Tab (Task Board)

```html
<!-- Operations — Dynamic Task Board -->
<div class="tab-content active" id="tab-operations">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
    <div class="filters">
      <select id="taskFilterProject" onchange="loadTasks()">
        <option value="">All Projects</option>
        <option value="IAM">IAM</option>
        <option value="Kira">Kira</option>
        <option value="Personal">Personal</option>
      </select>
      <select id="taskFilterAssignee" onchange="loadTasks()">
        <option value="">All Assignees</option>
        <option value="otto">Otto</option>
        <option value="kira">Kira</option>
      </select>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn-action" onclick="openExtractModal()">📝 Extract Tasks</button>
      <button class="btn-action" onclick="openNewTaskModal()">+ New Task</button>
    </div>
  </div>

  <!-- Kanban Board -->
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;min-height:400px" id="kanbanBoard">
    <div class="kanban-col" data-status="todo">
      <div style="font-size:.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;padding:8px 12px;border-bottom:2px solid var(--accent)">📋 Todo <span class="col-count"></span></div>
      <div class="kanban-cards" data-status="todo"></div>
    </div>
    <div class="kanban-col" data-status="in_progress">
      <div style="font-size:.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;padding:8px 12px;border-bottom:2px solid var(--warning)">🔨 In Progress <span class="col-count"></span></div>
      <div class="kanban-cards" data-status="in_progress"></div>
    </div>
    <div class="kanban-col" data-status="review">
      <div style="font-size:.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;padding:8px 12px;border-bottom:2px solid #4299e1">👁 Review <span class="col-count"></span></div>
      <div class="kanban-cards" data-status="review"></div>
    </div>
    <div class="kanban-col" data-status="blocked">
      <div style="font-size:.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;padding:8px 12px;border-bottom:2px solid var(--danger)">🚫 Blocked <span class="col-count"></span></div>
      <div class="kanban-cards" data-status="blocked"></div>
    </div>
    <div class="kanban-col" data-status="done">
      <div style="font-size:.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;padding:8px 12px;border-bottom:2px solid var(--success)">✅ Done <span class="col-count"></span></div>
      <div class="kanban-cards" data-status="done"></div>
    </div>
  </div>
</div>
```

### 6.3 Inbox Tab

```html
<!-- Inbox — Decision Queue -->
<div class="tab-content" id="tab-inbox">
  <div style="display:flex;justify-content:space-between;margin-bottom:16px">
    <h3 style="font-size:.95rem;color:var(--text)">Pending Decisions</h3>
    <select id="inboxFilter" onchange="loadInbox()">
      <option value="pending">Pending</option>
      <option value="">All</option>
      <option value="acted">Acted</option>
    </select>
  </div>
  <div id="inboxList"><p class="loading-msg">Loading...</p></div>
</div>
```

### 6.4 Agents/Transcripts Tab

```html
<!-- Agent Transcripts -->
<div class="tab-content" id="tab-transcripts">
  <div style="display:grid;grid-template-columns:300px 1fr;gap:16px;min-height:500px">
    <div style="border-right:1px solid var(--border)">
      <h3 style="font-size:.85rem;color:var(--accent);padding:8px 0;border-bottom:1px solid var(--border)">Active Sessions</h3>
      <div id="agentSessionList" style="overflow-y:auto;max-height:500px"><p class="loading-msg">Loading...</p></div>
    </div>
    <div>
      <div id="transcriptHeader" style="padding:8px;border-bottom:1px solid var(--border);font-size:.85rem;color:var(--text-muted)">Select a session to view transcript</div>
      <div id="transcriptView" class="transcript" style="max-height:500px;overflow-y:auto;padding:12px"></div>
    </div>
  </div>
</div>
```

### 6.5 New Task Modal

```html
<!-- New Task Modal -->
<div class="modal-overlay" id="newTaskModal">
  <div class="modal" style="max-width:500px">
    <div class="modal-header"><h3>New Task</h3><button class="modal-close" onclick="closeModal('newTaskModal')">&times;</button></div>
    <div class="modal-body">
      <div style="display:flex;flex-direction:column;gap:12px">
        <input type="text" id="ntTitle" placeholder="Task title..." style="padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:.9rem">
        <textarea id="ntDesc" placeholder="Description (optional)" rows="3" style="padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:.85rem;resize:vertical"></textarea>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <select id="ntPriority" style="padding:6px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text)">
            <option value="0">🔴 P0 Critical</option>
            <option value="1" selected>🟡 P1 High</option>
            <option value="2">🔵 P2 Medium</option>
            <option value="3">⚪ P3 Low</option>
          </select>
          <input type="text" id="ntProject" placeholder="Project" style="padding:6px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text)">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <input type="text" id="ntAssignee" placeholder="Assignee" style="padding:6px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text)">
          <input type="date" id="ntDue" style="padding:6px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text)">
        </div>
        <button class="btn-action" onclick="createTask()" style="margin-top:8px">Create Task</button>
      </div>
    </div>
  </div>
</div>
```

### 6.6 Extract Tasks Modal

```html
<!-- Extract Tasks Modal -->
<div class="modal-overlay" id="extractModal">
  <div class="modal" style="max-width:600px">
    <div class="modal-header"><h3>📝 Extract Tasks from Text</h3><button class="modal-close" onclick="closeModal('extractModal')">&times;</button></div>
    <div class="modal-body">
      <textarea id="extractText" placeholder="Paste a message, email, or notes here... Kira will extract actionable tasks." rows="6" style="width:100%;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:.85rem;resize:vertical"></textarea>
      <input type="text" id="extractProject" placeholder="Default project (optional)" style="margin-top:8px;padding:6px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);width:100%">
      <button class="btn-action" onclick="extractTasks()" style="margin-top:12px;width:100%" id="extractBtn">🤖 Extract Tasks</button>
      <div id="extractResults" style="margin-top:16px"></div>
    </div>
  </div>
</div>
```

### 6.7 Additional CSS (add to `<style>`)

```css
.kanban-cards { min-height:300px; padding:8px; }
.kanban-card {
  background:var(--card-bg); border:1px solid var(--border); border-radius:8px;
  padding:10px 12px; margin-bottom:8px; cursor:pointer; transition:all .2s;
}
.kanban-card:hover { border-color:var(--accent); transform:translateY(-1px); }
.kanban-card .card-title { font-size:.82rem; font-weight:500; margin-bottom:4px; }
.kanban-card .card-meta { font-size:.68rem; color:var(--text-muted); display:flex; gap:8px; align-items:center; }
.kanban-card .priority-dot { width:6px; height:6px; border-radius:50%; display:inline-block; }
.priority-0 { background:#e53e3e; }
.priority-1 { background:#d69e2e; }
.priority-2 { background:#4299e1; }
.priority-3 { background:#718096; }

.inbox-item {
  background:var(--card-bg); border:1px solid var(--border); border-radius:8px;
  padding:14px 16px; margin-bottom:8px;
}
.inbox-item .inbox-title { font-size:.88rem; font-weight:500; margin-bottom:4px; }
.inbox-item .inbox-desc { font-size:.78rem; color:var(--text-muted); margin-bottom:10px; }
.inbox-actions { display:flex; gap:8px; }
.inbox-actions button { padding:5px 14px; border-radius:6px; border:1px solid var(--border); font-size:.72rem; cursor:pointer; font-weight:500; }
.inbox-actions .act-approve { background:rgba(56,161,105,.15); color:var(--success); border-color:var(--success); }
.inbox-actions .act-dismiss { background:rgba(229,62,62,.1); color:var(--danger); border-color:var(--danger); }
.inbox-actions .act-edit { background:rgba(66,153,225,.1); color:#4299e1; border-color:#4299e1; }
```

### 6.8 JavaScript Functions (add to `<script>`)

```js
// ===== TASK OPERATIONS =====

let allTasks = [];

async function loadTasks() {
  const project = document.getElementById('taskFilterProject').value;
  const assignee = document.getElementById('taskFilterAssignee').value;
  let url = '/api/tasks?';
  if (project) url += `project=${project}&`;
  if (assignee) url += `assignee=${assignee}&`;
  const res = await fetch(url);
  allTasks = await res.json();
  renderKanban();
}

function renderKanban() {
  const statuses = ['todo','in_progress','review','blocked','done'];
  for (const status of statuses) {
    const container = document.querySelector(`.kanban-cards[data-status="${status}"]`);
    const tasks = allTasks.filter(t => t.status === status);
    const count = container.parentElement.querySelector('.col-count');
    if (count) count.textContent = `(${tasks.length})`;
    container.innerHTML = tasks.map(t => `
      <div class="kanban-card" onclick="openTaskDetail('${t.id}')" draggable="true"
           ondragstart="event.dataTransfer.setData('text/plain','${t.id}')">
        <div class="card-title">${esc(t.title)}</div>
        <div class="card-meta">
          <span class="priority-dot priority-${t.priority}"></span>
          ${t.project ? `<span>${esc(t.project)}</span>` : ''}
          ${t.assignee ? `<span>→ ${esc(t.assignee)}</span>` : ''}
          ${t.due_date ? `<span>📅 ${t.due_date}</span>` : ''}
        </div>
      </div>
    `).join('');

    // Drop zone
    container.ondragover = e => e.preventDefault();
    container.ondrop = async e => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('text/plain');
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ status, actor: 'otto' })
      });
      loadTasks();
    };
  }
}

function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function openNewTaskModal() { document.getElementById('newTaskModal').classList.add('open'); }
function openExtractModal() { document.getElementById('extractModal').classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

async function createTask() {
  const body = {
    title: document.getElementById('ntTitle').value,
    description: document.getElementById('ntDesc').value,
    priority: parseInt(document.getElementById('ntPriority').value),
    project: document.getElementById('ntProject').value || null,
    assignee: document.getElementById('ntAssignee').value || null,
    due_date: document.getElementById('ntDue').value || null,
    source: 'manual', creator: 'otto'
  };
  if (!body.title) return alert('Title required');
  await fetch('/api/tasks', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  closeModal('newTaskModal');
  document.getElementById('ntTitle').value = '';
  document.getElementById('ntDesc').value = '';
  loadTasks();
}

async function extractTasks() {
  const btn = document.getElementById('extractBtn');
  const text = document.getElementById('extractText').value;
  if (!text.trim()) return;
  btn.textContent = '⏳ Extracting...'; btn.disabled = true;
  try {
    const res = await fetch('/api/tasks/extract', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text, project: document.getElementById('extractProject').value || null })
    });
    const data = await res.json();
    const results = document.getElementById('extractResults');
    if (!data.tasks || data.tasks.length === 0) {
      results.innerHTML = '<p style="color:var(--text-muted)">No actionable tasks found.</p>';
      return;
    }
    results.innerHTML = `<p style="font-size:.78rem;color:var(--text-muted);margin-bottom:8px">Found ${data.tasks.length} tasks:</p>` +
      data.tasks.map((t, i) => `
        <div class="inbox-item">
          <div class="inbox-title"><span class="priority-dot priority-${t.priority}" style="margin-right:6px"></span>${esc(t.title)}</div>
          <div class="inbox-desc">${esc(t.description||'')} ${t.assignee?`→ ${t.assignee}`:''} ${t.project?`[${t.project}]`:''}</div>
        </div>
      `).join('') +
      `<button class="btn-action" onclick="createExtractedTasks()" style="margin-top:8px;width:100%">✅ Create All Tasks</button>`;
    window._extractedTasks = data.tasks;
  } catch(e) { alert('Extraction failed: ' + e.message); }
  finally { btn.textContent = '🤖 Extract Tasks'; btn.disabled = false; }
}

async function createExtractedTasks() {
  const text = document.getElementById('extractText').value;
  const project = document.getElementById('extractProject').value || null;
  await fetch('/api/tasks/extract-and-create', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ text, project })
  });
  closeModal('extractModal');
  document.getElementById('extractText').value = '';
  document.getElementById('extractResults').innerHTML = '';
  loadTasks();
  loadInbox();
}

function openTaskDetail(id) {
  const task = allTasks.find(t => t.id === id);
  if (!task) return;
  const modal = document.getElementById('outputModal');
  const titleEl = modal.querySelector('.modal-header h3');
  const bodyEl = modal.querySelector('.modal-body');
  titleEl.textContent = task.title;
  const pLabels = ['🔴 Critical','🟡 High','🔵 Medium','⚪ Low'];
  bodyEl.innerHTML = `
    <dl>
      <dt>Status</dt><dd>${task.status}</dd>
      <dt>Priority</dt><dd>${pLabels[task.priority] || task.priority}</dd>
      <dt>Project</dt><dd>${task.project || '—'}</dd>
      <dt>Assignee</dt><dd>${task.assignee || '—'}</dd>
      <dt>Due Date</dt><dd>${task.due_date || '—'}</dd>
      <dt>Created</dt><dd>${task.created_at}</dd>
      ${task.description ? `<dt>Description</dt><dd>${esc(task.description)}</dd>` : ''}
      ${task.session_id ? `<dt>Linked Session</dt><dd><code>${task.session_id}</code></dd>` : ''}
    </dl>
    <div style="margin-top:16px;display:flex;gap:8px">
      <select id="taskStatusChange" style="padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text)">
        <option value="todo" ${task.status==='todo'?'selected':''}>Todo</option>
        <option value="in_progress" ${task.status==='in_progress'?'selected':''}>In Progress</option>
        <option value="review" ${task.status==='review'?'selected':''}>Review</option>
        <option value="blocked" ${task.status==='blocked'?'selected':''}>Blocked</option>
        <option value="done" ${task.status==='done'?'selected':''}>Done</option>
      </select>
      <button class="btn-sm" onclick="updateTaskStatus('${task.id}')">Update</button>
      <button class="btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="deleteTask('${task.id}')">Delete</button>
    </div>
  `;
  modal.classList.add('open');
}

async function updateTaskStatus(id) {
  const status = document.getElementById('taskStatusChange').value;
  await fetch(`/api/tasks/${id}`, {
    method:'PATCH', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ status, actor: 'otto' })
  });
  document.getElementById('outputModal').classList.remove('open');
  loadTasks();
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await fetch(`/api/tasks/${id}`, { method:'DELETE' });
  document.getElementById('outputModal').classList.remove('open');
  loadTasks();
}

// ===== INBOX =====

async function loadInbox() {
  const status = document.getElementById('inboxFilter')?.value || 'pending';
  const res = await fetch(`/api/inbox?status=${status}`);
  const items = await res.json();
  const badge = document.getElementById('inboxBadge');
  const pending = items.filter(i => i.status === 'pending').length;
  badge.style.display = pending > 0 ? 'inline' : 'none';
  badge.textContent = pending;

  const list = document.getElementById('inboxList');
  if (items.length === 0) {
    list.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted)">📭 No pending decisions</p>';
    return;
  }
  list.innerHTML = items.map(item => {
    let actions;
    try { actions = JSON.parse(item.actions); } catch { actions = []; }
    return `
      <div class="inbox-item" ${item.status === 'acted' ? 'style="opacity:.5"' : ''}>
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div>
            <div class="inbox-title">${esc(item.title)}</div>
            <div class="inbox-desc">${esc(item.description || '')}</div>
          </div>
          <span class="badge badge-${item.status}">${item.status}</span>
        </div>
        ${item.status === 'pending' ? `
        <div class="inbox-actions">
          ${actions.map(a => `<button class="act-${a.action}" onclick="actInbox('${item.id}','${a.action}')">${a.label}</button>`).join('')}
        </div>` : `<div style="font-size:.72rem;color:var(--text-muted)">Action: ${item.acted_action} at ${item.acted_at}</div>`}
      </div>`;
  }).join('');
}

async function actInbox(id, action) {
  await fetch(`/api/inbox/${id}/act`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action })
  });
  loadInbox();
  loadTasks();
}

// ===== AGENT TRANSCRIPTS =====

async function loadAgentTranscripts() {
  const res = await fetch('/api/sessions');
  const sessions = await res.json();
  const list = document.getElementById('agentSessionList');
  // Show last 20 sessions
  const recent = sessions.slice(0, 20);
  list.innerHTML = recent.map(s => `
    <div class="session-item" onclick="viewTranscript('${s.sessionId}')">
      <div style="font-size:.8rem;font-weight:500">${esc(s.label || s.sessionId.slice(0,12))}</div>
      <div class="session-meta">
        <span>${s.agent}</span>
        <span>${s.surface || ''}</span>
        <span>${s.messageCount || 0} msgs</span>
      </div>
      <div style="font-size:.68rem;color:var(--text-muted)">${s.lastActivity ? new Date(s.lastActivity).toLocaleString() : ''}</div>
    </div>
  `).join('');
}

async function viewTranscript(sessionId) {
  const res = await fetch(`/api/sessions/transcript?id=${sessionId}`);
  const data = await res.json();
  const header = document.getElementById('transcriptHeader');
  const view = document.getElementById('transcriptView');

  if (data.error) { view.innerHTML = `<p style="color:var(--danger)">${data.error}</p>`; return; }

  header.innerHTML = `<strong>${esc(data.session?.label || sessionId)}</strong> — ${data.session?.agent || ''} — ${data.session?.model || ''} — $${(data.session?.totalCost || 0).toFixed(4)}`;
  view.innerHTML = (data.messages || []).map(m => `
    <div class="transcript-msg ${m.role}">
      <div class="transcript-role">${m.role}</div>
      <div>${esc(m.text || '').slice(0, 1000)}</div>
      <div style="font-size:.6rem;color:var(--text-muted);margin-top:2px">${m.ts || ''}</div>
    </div>
  `).join('');
}

// ===== INIT: Load new tabs =====

// Modify the existing init/load function to also load tasks/inbox
const origInit = window.onload || function(){};
window.addEventListener('load', () => {
  loadTasks();
  loadInbox();
  loadAgentTranscripts();
});

// Auto-refresh tasks every 30s
setInterval(() => { loadTasks(); loadInbox(); }, 30000);
```

---

## 7. HEARTBEAT INTEGRATION

**Update `HEARTBEAT.md`** to include:

```markdown
## Task System Check
1. Check for new messages (WhatsApp/Telegram/Discord) that might contain tasks
2. If you find actionable messages, call the task extraction API:
   ```bash
   curl -s -b "kira_token=$ADMIN_TOKEN" -X POST http://localhost:3880/api/tasks/extract-and-create \
     -H "Content-Type: application/json" \
     -d '{"text":"<the message text>","project":"<project if known>"}'
   ```
3. Check for stale tasks (in_progress for >24h without update):
   ```bash
   curl -s -b "kira_token=$ADMIN_TOKEN" 'http://localhost:3880/api/tasks?status=in_progress'
   ```
4. Check inbox for unacted items — nudge Otto if pending >2h
5. Update task status for any sub-agent work you completed this cycle
```

---

## 8. SUB-AGENT ↔ TASK BRIDGE

### How it works:

1. **When Kira spawns a sub-agent for a task**, she updates the task with the session ID:
   ```bash
   curl -X PATCH http://localhost:3880/api/tasks/TASK_ID \
     -H "Content-Type: application/json" \
     -d '{"session_id":"SESSION_ID","status":"in_progress"}'
   ```

2. **Sub-agent instructions** (add to spawn prompt):
   ```
   You are working on task: [TASK_TITLE]
   Task ID: [TASK_ID]
   When complete, your output will be routed to the inbox for QA.
   ```

3. **When sub-agent completes**, Kira (main session) should:
   - Update task status to `review`
   - Create an inbox item with the output for Otto to approve
   ```js
   // In heartbeat or after session_history check:
   apiUpdateTask(taskId, { status: 'review' });
   db.prepare(`INSERT INTO inbox_items (id, type, title, description, task_id, actions) VALUES (?,?,?,?,?,?)`)
     .run(nanoid(), 'task_review', `Review: ${taskTitle}`, agentOutput,
       taskId, JSON.stringify([{label:'Approve',action:'approve'},{label:'Revise',action:'edit'}]));
   ```

4. **Agent transcript link**: The task detail modal already shows `session_id` — click to jump to the transcript in the Agents tab.

### Programmatic bridge (for orchestrator.js):

```js
// In orchestrator.js or a new task-bridge.js:
async function spawnForTask(taskId, agentInstructions) {
  // 1. Get task
  const task = await fetch(`http://localhost:3880/api/tasks/${taskId}`).then(r => r.json());

  // 2. Spawn sub-agent via OpenClaw
  // (Kira does this naturally via sessions_spawn in conversation)

  // 3. After spawn, link session
  await fetch(`http://localhost:3880/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: spawnedSessionId, status: 'in_progress' })
  });
}
```

---

## 9. MIGRATION PATH (Zero Downtime)

### Step 1: Run migration (adds tables, breaks nothing)
```bash
node admin-dashboard/migrate.js
```

### Step 2: Update server.js
- Add the new API functions and routes
- Keep ALL existing routes untouched
- The existing `agent_runs` and `agent_outputs` tables remain — they're the old system
- New `tasks` and `inbox_items` are the new system

### Step 3: Update dashboard.html
- Add new tabs BEFORE existing ones
- Make Operations the default tab
- Existing tabs (Overview, Agents, Outputs, etc.) remain fully functional
- They become "advanced" tabs at the end

### Step 4: Create task-extractor.js
- Standalone module, no impact on existing code

### Step 5: Restart dashboard
```bash
pm2 restart kira-dashboard
```

### Rollback: Just revert the HTML tab default back to `overview` — all old tabs still work.

---

## 10. BUILD ORDER (Tonight)

| # | Task | Time | Test |
|---|------|------|------|
| 1 | Run `migrate.js` | 2 min | `sqlite3 kira-admin.db ".tables"` shows new tables |
| 2 | Add API functions to server.js | 15 min | `curl localhost:3880/api/tasks` returns `[]` |
| 3 | Create task-extractor.js | 10 min | `node -e "require('./task-extractor').extract('set up GA for website').then(console.log)"` |
| 4 | Add CSS to dashboard.html | 5 min | Visual check |
| 5 | Add HTML tabs + modals | 10 min | Tabs visible, clickable |
| 6 | Add JavaScript functions | 20 min | Create task via UI, see on board, drag between columns |
| 7 | Test extract flow | 5 min | Paste IAM message → see extracted tasks → create all → appear on board |
| 8 | Test inbox flow | 5 min | Extracted tasks appear in inbox → approve → status updates |
| 9 | Update HEARTBEAT.md | 2 min | Read it, confirm it makes sense |
| 10 | Restart & smoke test | 5 min | Full flow works |

**Total estimated: ~80 minutes**

---

## 11. VERIFICATION CHECKLIST

- [ ] `GET /api/tasks` returns array
- [ ] `POST /api/tasks` creates task, appears in `GET`
- [ ] `PATCH /api/tasks/:id` updates status
- [ ] `DELETE /api/tasks/:id` removes task
- [ ] `POST /api/tasks/extract` returns structured tasks from freeform text
- [ ] `POST /api/tasks/extract-and-create` creates tasks + inbox items
- [ ] `GET /api/inbox` returns pending items
- [ ] `POST /api/inbox/:id/act` with `approve` moves task to todo
- [ ] `POST /api/inbox/:id/act` with `dismiss` deletes task
- [ ] Dashboard Operations tab shows kanban board
- [ ] Drag-and-drop between columns works
- [ ] New Task modal creates task
- [ ] Extract Tasks modal parses text and creates tasks
- [ ] Inbox tab shows pending decisions with action buttons
- [ ] Agents tab shows session list and transcripts
- [ ] Existing tabs (Overview, Token Usage, Services, etc.) still work
- [ ] Dashboard loads without errors in console
