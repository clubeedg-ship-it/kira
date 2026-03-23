# Kira Backend API Reference

**Base URL:** `http://localhost:3847`  
**Auth:** Single-tenant mode — no auth headers needed. `userId` auto-injected server-side.  
**All responses:** `{ data: T }` or `{ data: T[], total?: number }` or `{ error: { code, message } }`  
**Database:** PostgreSQL 17 (Drizzle ORM) + SQLite (chat history, Mem0, unified knowledge graph)

---

## Table of Contents

1. [Tasks System](#1-tasks-system)
2. [Projects & Milestones](#2-projects--milestones)
3. [Areas & Objectives](#3-areas--objectives)
4. [Documents (Notion-like)](#4-documents-notion-like)
5. [Knowledge Graph](#5-knowledge-graph)
6. [Agents & Agent Runs](#6-agents--agent-runs)
7. [Chat System (Multi-Agent)](#7-chat-system-multi-agent)
8. [Memory (Mem0)](#8-memory-mem0)
9. [Skills Marketplace](#9-skills-marketplace)
10. [Infrastructure State](#10-infrastructure-state)
11. [Settings & Identity](#11-settings--identity)
12. [XP & Gamification](#12-xp--gamification)
13. [Real-Time Events (SSE)](#13-real-time-events-sse)
14. [Canvas & Sandbox](#14-canvas--sandbox)
15. [State Overview API](#15-state-overview-api)
16. [Paperclip](#16-paperclip)

---

## 1. Tasks System

Full CRUD with state machine, priority scoring, agent assignment, and dependencies.

### Task Schema
```json
{
  "id": "uuid",
  "projectId": "uuid | null",
  "milestoneId": "uuid | null",
  "title": "string (required, max 255)",
  "description": "string | null",
  "status": "todo | in-progress | blocked | in-review | done | cancelled",
  "priority": "integer 1-4 (1=critical, 2=high, 3=medium, 4=low)",
  "executorType": "human | agent",
  "executorId": "string | null (agent name/id when executorType=agent)",
  "requiresInput": "no | verify | approve",
  "dueDate": "YYYY-MM-DD | null",
  "scheduledDate": "YYYY-MM-DD | null",
  "durationEst": "integer (minutes) | null",
  "context": "string | null (freeform context label)",
  "energy": "low | medium | high",
  "source": "string | null (e.g. 'telegram', 'github', 'manual')",
  "sourceRef": "string | null (e.g. message ID, issue URL)",
  "tags": ["string[]"] ,
  "sortOrder": "float",
  "priorityScore": "integer (auto-calculated)",
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime",
  "completedAt": "ISO datetime | null"
}
```

### Status Transitions (State Machine)
```
todo → in-progress → in-review → done
todo → cancelled
in-progress → blocked → in-progress
in-progress → cancelled
in-review → in-progress (rejected)
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/tasks` | List tasks (filterable) |
| `GET` | `/api/v1/tasks/:id` | Get single task |
| `GET` | `/api/v1/tasks/next` | Get next recommended task (priority algorithm) |
| `GET` | `/api/v1/tasks/stats` | Task count by status |
| `POST` | `/api/v1/tasks` | Create task |
| `PUT` | `/api/v1/tasks/:id` | Update task (full replace) |
| `DELETE` | `/api/v1/tasks/:id` | Delete task |

#### `GET /api/v1/tasks` — Query Parameters
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status (`todo`, `in-progress`, etc.) |
| `priority` | integer | Filter by priority (1-4) |
| `project_id` | uuid | Filter by project |
| `executor_type` | string | `human` or `agent` |
| `due_date` | YYYY-MM-DD | Filter by due date |
| `energy` | string | `low`, `medium`, `high` |
| `search` | string | Full-text search in title + description |
| `sort` | string | `priority`, `due_date`, `created_at`, `sort_order` |
| `order` | string | `asc` or `desc` |
| `limit` | integer | Max results (default 100, max 500) |
| `offset` | integer | Pagination offset |

#### `POST /api/v1/tasks` — Create Task
```json
{
  "title": "Build Lovable dashboard",
  "description": "Wire all API endpoints to React UI",
  "status": "todo",
  "priority": 1,
  "projectId": "uuid-of-project",
  "executorType": "agent",
  "executorId": "kira",
  "dueDate": "2026-03-25",
  "tags": ["dashboard", "ui"]
}
```

---

## 2. Projects & Milestones

### Project Schema
```json
{
  "id": "uuid",
  "objectiveId": "uuid | null",
  "areaId": "uuid | null",
  "title": "string (required)",
  "description": "string | null",
  "ownerType": "human | agent",
  "ownerId": "string | null",
  "status": "planning | active | paused | completed | cancelled",
  "priority": "integer 1-4",
  "deadline": "YYYY-MM-DD | null",
  "tags": ["string[]"],
  "sortOrder": "float"
}
```

### Milestone Schema
```json
{
  "id": "uuid",
  "projectId": "uuid (required)",
  "title": "string (required)",
  "description": "string | null",
  "targetDate": "YYYY-MM-DD | null",
  "status": "pending | active | completed",
  "sortOrder": "float"
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/projects` | List projects (filterable by status, area) |
| `GET` | `/api/v1/projects/:id` | Get project with milestones and task counts |
| `POST` | `/api/v1/projects` | Create project |
| `PUT` | `/api/v1/projects/:id` | Update project |
| `DELETE` | `/api/v1/projects/:id` | Delete project |
| `GET` | `/api/v1/milestones` | List milestones |
| `POST` | `/api/v1/milestones` | Create milestone |
| `PUT` | `/api/v1/milestones/:id` | Update milestone |
| `DELETE` | `/api/v1/milestones/:id` | Delete milestone |

---

## 3. Areas & Objectives

### Area Schema
```json
{
  "id": "uuid",
  "name": "string (required)",
  "description": "string | null",
  "color": "string | null (hex color)",
  "icon": "string | null (emoji or icon name)",
  "sortOrder": "float"
}
```

### Objective Schema (OKR-style)
```json
{
  "id": "uuid",
  "areaId": "uuid | null",
  "title": "string (required)",
  "description": "string | null",
  "horizon": "30d | 90d | 1y | 3y | 10y",
  "status": "active | completed | abandoned",
  "sortOrder": "float"
}
```

### Key Result Schema
```json
{
  "id": "uuid",
  "objectiveId": "uuid (required)",
  "title": "string (required)",
  "targetValue": "float",
  "currentValue": "float",
  "unit": "string",
  "status": "on_track | at_risk | behind | completed"
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST/PUT/DELETE` | `/api/v1/areas[/:id]` | CRUD areas |
| `GET/POST/PUT/DELETE` | `/api/v1/objectives[/:id]` | CRUD objectives |
| `GET/POST/PUT/DELETE` | `/api/v1/key-results[/:id]` | CRUD key results |

---

## 4. Documents (Notion-like)

Freeform documents with folders. Agents use this as their playground for development notes, drafts, analysis.

### Document Schema
```json
{
  "id": "uuid",
  "title": "string (required, max 512)",
  "content": "string (markdown, default empty)",
  "folder": "string | null (e.g. 'docs', 'drafts', 'agent-workspace')",
  "tags": ["string[]"],
  "mimeType": "string (default 'text/markdown')",
  "summary": "string | null (AI-generated)",
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime"
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/documents` | List docs (filter: `search`, `folder`) |
| `GET` | `/api/v1/documents/:id` | Get document |
| `POST` | `/api/v1/documents` | Create document |
| `PUT` | `/api/v1/documents/:id` | Update document (title, content, folder, tags) |
| `DELETE` | `/api/v1/documents/:id` | Delete document |

#### `POST /api/v1/documents`
```json
{
  "title": "IAM Competitive Analysis",
  "content": "# Market Research\n\n## Competitors...",
  "folder": "research",
  "tags": ["iam", "market"]
}
```

---

## 5. Knowledge Graph

Two systems available:

### 5a. SQLite Knowledge Graph (unified.db — 44K entities, 208K facts, 134K relations)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/knowledge/entities` | List entities (`limit`, `type`, `q` params) |
| `GET` | `/api/v1/knowledge/graph` | Get entities + their relations (for visualization) |
| `GET` | `/api/v1/knowledge/entity/:id` | Get entity with its facts and relations |

### 5b. Postgres Knowledge Graph (structured, CRUD)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/pg-knowledge/entities` | List entities (search, type filter) |
| `GET` | `/api/v1/pg-knowledge/entities/:id` | Get entity with facts + relationships |
| `POST` | `/api/v1/pg-knowledge/entities` | Create entity |
| `PUT` | `/api/v1/pg-knowledge/entities/:id` | Update entity |
| `DELETE` | `/api/v1/pg-knowledge/entities/:id` | Delete entity |
| `GET` | `/api/v1/pg-knowledge/facts` | List facts |
| `POST` | `/api/v1/pg-knowledge/facts` | Create fact |
| `GET` | `/api/v1/pg-knowledge/relationships` | List relationships |
| `POST` | `/api/v1/pg-knowledge/relationships` | Create relationship |

### Entity Schema (Postgres)
```json
{
  "id": "uuid",
  "type": "string (e.g. 'person', 'company', 'project', 'concept')",
  "name": "string",
  "aliases": ["string[]"],
  "properties": { "key": "value" }
}
```

### Relationship Schema
```json
{
  "id": "uuid",
  "sourceEntityId": "uuid",
  "targetEntityId": "uuid",
  "type": "string (e.g. 'works_for', 'owns', 'depends_on')",
  "properties": { "key": "value" },
  "strength": "float 0-1"
}
```

---

## 6. Agents & Agent Runs

### Agent Schema
```json
{
  "id": "uuid",
  "name": "string (required)",
  "role": "string (required, e.g. 'researcher', 'developer', 'analyst')",
  "description": "string | null",
  "model": "string (default 'claude-sonnet-4-5-20250514')",
  "status": "idle | working | error",
  "canExecute": ["string[] (capability tags)"],
  "autonomy": "autonomous | checkpoint | approval",
  "areaIds": ["uuid[]"],
  "maxConcurrent": "integer (default 3)"
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/agents` | List registered agents |
| `POST` | `/api/v1/agents` | Register new agent |
| `PUT` | `/api/v1/agents/:id` | Update agent config |
| `DELETE` | `/api/v1/agents/:id` | Remove agent |
| `GET` | `/api/v1/user-agents` | List user-configured agents |
| `GET` | `/api/v1/user-agents/runs/recent` | Recent agent runs |
| `GET` | `/api/v1/agent-work-log` | Agent work log entries |
| `POST` | `/api/v1/agent-work-log` | Log agent work |
| `GET` | `/api/v1/agents/openclaw` | OpenClaw skills/capabilities |

### Agent Runs Schema
```json
{
  "id": "uuid",
  "agentId": "uuid | null",
  "taskId": "uuid | null",
  "status": "pending | running | completed | failed | cancelled",
  "input": "string",
  "output": "string | null",
  "model": "string",
  "tokensUsed": "integer | null",
  "durationMs": "integer | null",
  "error": "string | null"
}
```

---

## 7. Chat System (Multi-Agent)

Multi-panel chat with separate conversations routable to different agents.

### Conversation Schema
```json
{
  "id": "uuid",
  "title": "string",
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime"
}
```

### Message Schema
```json
{
  "id": "uuid",
  "conversationId": "uuid",
  "role": "user | assistant | system",
  "content": "string",
  "createdAt": "ISO datetime"
}
```

### Panel Schema (multi-agent tabs)
```json
{
  "id": "uuid",
  "conversationId": "uuid",
  "agentId": "string | null (route to specific agent)",
  "title": "string",
  "position": "integer",
  "isActive": "boolean"
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/chat/conversations` | List conversations |
| `POST` | `/api/v1/chat/conversations` | Create conversation |
| `PATCH` | `/api/v1/chat/conversations/:id` | Rename conversation |
| `DELETE` | `/api/v1/chat/conversations/:id` | Delete conversation + messages |
| `GET` | `/api/v1/chat/conversations/:id/messages` | Get messages |
| `POST` | `/api/v1/chat/conversations/:id/messages` | Send message (→ OpenClaw gateway) |
| `GET` | `/api/v1/chat/history` | Last 50 messages (all convos) |
| `GET` | `/api/v1/panels` | List chat panels |
| `POST` | `/api/v1/panels` | Create panel `{title, agentId}` |
| `DELETE` | `/api/v1/panels/:id` | Delete panel |

### How Chat Works
1. `POST /conversations/:id/messages` saves user message and fires to OpenClaw Gateway
2. Gateway processes through the agent (same brain as Telegram)
3. Response streams back via WebSocket bridge
4. SSE event pushes tokens to browser in real-time (see Events section)
5. Final message auto-saved to conversation

---

## 8. Memory (Mem0)

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/mem0/search?q=X` | Semantic memory search |
| `POST` | `/api/v1/mem0/add` | Add memory |
| `GET` | `/api/v1/state/memory/facts` | List all extracted facts (paginated) |
| `GET` | `/api/v1/state/memory/search?q=X` | Alternative semantic search |
| `GET` | `/api/v1/state/memory/stats` | Memory system statistics |
| `GET` | `/api/v1/state/memory/daily-logs` | List daily log files |
| `GET` | `/api/v1/state/memory/daily-logs/:date` | Read daily log content |

### Memory Stats Response
```json
{
  "data": {
    "mem0": { "total": 847, "byAction": { "ADD": 626, "UPDATE": 221 }, "lastUpdated": "..." },
    "knowledgeGraph": { "entities": 44011, "facts": 208441, "relations": 134393 },
    "files": { "count": 73, "dailyLogs": 51, "totalSizeKB": 266 }
  }
}
```

---

## 9. Skills Marketplace

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/skills` | List all skills (installed + marketplace) |
| `GET` | `/api/v1/skills/:name` | Get skill details |
| `POST` | `/api/v1/skills/:name/install` | Install a skill |
| `DELETE` | `/api/v1/skills/:name` | Uninstall a skill |
| `GET` | `/api/v1/agents/openclaw` | Currently active OpenClaw skills |

---

## 10. Infrastructure State

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/state/infra/pm2` | All PM2 processes with CPU/memory/uptime |
| `GET` | `/api/v1/state/infra/docker` | All Docker containers |
| `GET` | `/api/v1/state/infra/system` | System resources (RAM, disk, GPU) |

### System Response Example
```json
{
  "data": {
    "memory": { "totalMB": 27532, "usedMB": 15340, "availableMB": 12191 },
    "disk": { "size": "662G", "used": "456G", "available": "206G", "usePercent": "69%" },
    "uptime": "13:13:54 up 40 days...",
    "gpu": {
      "name": "NVIDIA GeForce RTX 4090",
      "memoryUsedMB": 20941, "memoryTotalMB": 24564,
      "utilizationPercent": 0, "temperatureC": 41
    }
  }
}
```

---

## 11. Settings & Identity

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/settings` | Get user settings |
| `PATCH` | `/api/v1/settings` | Update settings (merge) |
| `GET` | `/api/v1/identity` | Get agent identity config |
| `PUT` | `/api/v1/identity` | Update identity |
| `GET` | `/api/v1/principles` | List guiding principles |
| `POST` | `/api/v1/principles` | Create principle |
| `GET` | `/api/v1/decisions` | List recorded decisions |
| `POST` | `/api/v1/decisions` | Record a decision |
| `GET` | `/api/v1/vision` | Get vision statements |
| `POST` | `/api/v1/vision` | Create vision |

### Decision Schema
```json
{
  "id": "uuid",
  "projectId": "uuid | null",
  "title": "string",
  "description": "string",
  "rationale": "string",
  "alternatives": "string | null",
  "status": "proposed | accepted | superseded | rejected",
  "impact": "low | medium | high"
}
```

---

## 12. XP & Gamification

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/xp` | Current XP/level |
| `GET` | `/api/v1/xp/events` | XP history |
| `POST` | `/api/v1/xp/events` | Award XP |
| `GET` | `/api/v1/xp/leaderboard` | Leaderboard |

---

## 13. Real-Time Events (SSE)

### `GET /api/v1/events/stream`

Server-Sent Events stream for real-time updates. Connect with `EventSource`.

### Event Types
```
event: activity
data: {"type":"idle"} | {"type":"thinking","agentId":"main"} | {"type":"streaming","text":"..."}

event: stream-start
data: {"runId":"abc123","agentId":"main"}

event: stream-delta
data: {"runId":"abc123","text":"token chunk here"}

event: stream-end
data: {"runId":"abc123","text":"full response","userText":"original question"}

event: task-update
data: {"taskId":"uuid","status":"done"}

event: agent-update  
data: {"agentId":"uuid","status":"working","taskId":"uuid"}
```

### Polling Fallback
`GET /api/v1/agent/activity` — Returns current agent activity state.

---

## 14. Canvas & Sandbox

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/canvas` | List canvas states |
| `POST` | `/api/v1/canvas` | Save canvas state |
| `GET` | `/api/v1/sandbox` | List sandbox containers |
| `POST` | `/api/v1/sandbox/exec` | Execute in sandbox |

---

## 15. State Overview API

Single-call dashboard state aggregators.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/state/overview` | Combined dashboard state (memory + PM2 + system) |
| `GET` | `/api/v1/state/portfolio/projects` | Oopuo portfolio companies |
| `GET` | `/api/v1/state/portfolio/revenue-targets` | MRR targets |
| `GET` | `/api/v1/state/portfolio/vdr` | VDR document listing |
| `GET` | `/api/v1/state/portfolio/vdr/*` | Read VDR document |
| `GET` | `/api/v1/state/agents/sessions` | Active OpenClaw sessions |
| `GET` | `/api/v1/state/agents/sessions/:id/history` | Session transcript |
| `GET` | `/api/v1/state/agents/skills` | Available skills |
| `GET` | `/api/v1/state/activity/crons` | Background crons |
| `GET` | `/api/v1/state/activity/agent-outputs` | Recent agent output files |

---

## 16. Paperclip

Paperclip is the autonomous task runner. Exposes state via PM2 and log files.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/state/infra/pm2` | Check `paperclip` process status |
| `GET` | `/api/v1/state/activity/agent-outputs` | Paperclip output files |

*Note: Dedicated Paperclip visualizer API (task queue, active chains, decision tree) to be added as Paperclip's own REST interface matures.*

---

## Dependency Hierarchy

```
Vision
  └── Objectives (OKRs)
       └── Key Results
            └── Projects
                 └── Milestones
                      └── Tasks
                           └── Dependencies (task → task)
                           └── Time Blocks
```

All entities can be linked to **Areas** (thematic groupings like "Revenue", "Infrastructure", "Funding").

**Agents** can be assigned to tasks (`executorType: "agent"`, `executorId: "agent-uuid"`).

**Documents** are freeform — agents use them as scratchpads, notes, analysis.

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input |
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Auth required (shouldn't occur in single-tenant) |
| `CONFLICT` | 409 | Invalid state transition |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Architecture Notes for UI Developers

1. **Single Brain:** All chat (Telegram, Web, WhatsApp) routes through the same OpenClaw Gateway. The backend is a thin client.
2. **Real-time:** Use SSE (`/api/v1/events/stream`) for live agent activity. Polling `/agent/activity` is the fallback.
3. **Tasks are the core primitive.** Everything in the system ultimately produces or consumes tasks.
4. **Documents are agent playgrounds.** Agents write analysis, drafts, research here. The UI should render markdown with syntax highlighting.
5. **Knowledge Graph** has two layers: SQLite (read-only, 44K entities from historical extraction) and Postgres (CRUD, for UI-managed entities).
6. **Mem0** handles auto-extraction from conversations. The `/state/memory/*` endpoints expose it.
7. **Panels** enable multi-agent chat — each panel routes to a different agent via `agentId`.

---

*Generated: 2026-03-18 | Backend: Kira App v3 | Database: PostgreSQL 17 + SQLite*
