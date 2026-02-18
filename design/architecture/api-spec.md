# Kira REST API Specification

**Version:** 1.0  
**Date:** February 11, 2026  
**Status:** Design

---

## Conventions

### Response Envelope

All endpoints return:

```json
{
  "data": <payload>,
  "error": null | { "code": "STRING", "message": "Human-readable" },
  "meta": { "requestId": "uuid", "timestamp": "ISO8601", "pagination?": { "offset": 0, "limit": 50, "total": 120 } }
}
```

### Authentication

Unless marked **public**, every request requires:
```
Authorization: Bearer <jwt>
```

Tokens are obtained via the Auth API.

### Common Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `limit` | int | Max items (default 50, max 200) |
| `offset` | int | Pagination offset |
| `after` | string | Cursor/timestamp for cursor pagination |

---

## 1. Chat API

### GET /api/chat/sessions

List chat sessions.

| | |
|---|---|
| **Auth** | Required |
| **Query** | `?status=active&limit=50&offset=0` |

**Response:**
```json
{
  "data": [
    {
      "id": "main",
      "label": "Main Session",
      "status": "active",
      "model": "claude-opus-4-6",
      "messageCount": 342,
      "createdAt": "2026-02-10T08:00:00Z",
      "lastMessageAt": "2026-02-11T09:12:00Z"
    }
  ],
  "error": null,
  "meta": { "pagination": { "offset": 0, "limit": 50, "total": 5 } }
}
```

### GET /api/chat/messages

Fetch messages from a session.

| | |
|---|---|
| **Auth** | Required |
| **Query** | `?sessionId=main&after=2026-02-11T08:00:00Z&limit=100` |

**Response:**
```json
{
  "data": [
    {
      "id": "msg_abc123",
      "parentId": "msg_def456",
      "timestamp": "2026-02-11T09:12:00Z",
      "role": "user",
      "content": [
        { "type": "text", "text": "Yes, please update it" }
      ]
    },
    {
      "id": "msg_ghi789",
      "parentId": "msg_abc123",
      "timestamp": "2026-02-11T09:12:01Z",
      "role": "assistant",
      "content": [
        { "type": "thinking", "text": "Otto wants me to..." },
        { "type": "text", "text": "Done — v1.2 updated." }
      ]
    }
  ],
  "error": null,
  "meta": { "pagination": { "offset": 0, "limit": 100, "total": 342 } }
}
```

### GET /api/chat/stream

Server-Sent Events stream for real-time messages.

| | |
|---|---|
| **Auth** | Required (via query `?token=<jwt>`) |
| **Query** | `?sessionId=main` |

**SSE Events:**
```
event: message
data: {"id":"msg_xyz","role":"assistant","content":[{"type":"text","text":"Hello"}],"timestamp":"..."}

event: thinking
data: {"id":"msg_xyz","content":"Let me think about..."}

event: tool_call
data: {"id":"msg_xyz","toolName":"exec","input":{"command":"ls"},"status":"running"}

event: tool_result
data: {"id":"msg_xyz","toolName":"exec","output":"file1.txt\nfile2.txt","status":"success"}

event: heartbeat
data: {"timestamp":"..."}
```

Heartbeat sent every 15 seconds.

### POST /api/chat/send

Send a message to the agent.

| | |
|---|---|
| **Auth** | Required |

**Request:**
```json
{
  "sessionId": "main",
  "message": "What's the status of the VDR?",
  "attachments": [
    { "type": "file", "path": "/uploads/screenshot.png" }
  ]
}
```

**Response:**
```json
{
  "data": {
    "id": "msg_new123",
    "status": "queued",
    "sessionId": "main"
  },
  "error": null,
  "meta": {}
}
```

The actual response arrives via SSE stream.

---

## 2. Memory API

### GET /api/memory/search

Search the knowledge graph.

| | |
|---|---|
| **Auth** | Required |
| **Query** | `?q=zenithcred+pilot&limit=20` |

**Response:**
```json
{
  "data": [
    {
      "id": "fact_001",
      "subject": "ZenithCred",
      "predicate": "has_status",
      "object": "pilot phase",
      "confidence": 0.92,
      "source": "memory/2026-02-10.md",
      "createdAt": "2026-02-10T14:00:00Z"
    }
  ],
  "error": null,
  "meta": { "pagination": { "total": 3 } }
}
```

### GET /api/memory/entities

List known entities.

| | |
|---|---|
| **Auth** | Required |
| **Query** | `?type=project&limit=50` |

**Response:**
```json
{
  "data": [
    {
      "id": "ent_001",
      "name": "ZenithCred",
      "type": "project",
      "factCount": 24,
      "lastMentioned": "2026-02-11T08:30:00Z"
    }
  ],
  "error": null,
  "meta": {}
}
```

### GET /api/memory/facts

List facts, optionally filtered by entity.

| | |
|---|---|
| **Auth** | Required |
| **Query** | `?entityId=ent_001&limit=50` |

**Response:**
```json
{
  "data": [
    {
      "id": "fact_001",
      "subject": "ZenithCred",
      "predicate": "target_market",
      "object": "Brazilian immigrants in Portugal",
      "confidence": 0.95,
      "createdAt": "2026-02-08T10:00:00Z"
    }
  ],
  "error": null,
  "meta": {}
}
```

### POST /api/memory/log

Manually add a fact or memory entry.

| | |
|---|---|
| **Auth** | Required |

**Request:**
```json
{
  "subject": "Otto",
  "predicate": "prefers",
  "object": "dark theme",
  "confidence": 1.0,
  "source": "manual"
}
```

**Response:**
```json
{
  "data": { "id": "fact_099", "created": true },
  "error": null,
  "meta": {}
}
```

---

## 3. Tasks API

### GET /api/tasks

List tasks.

| | |
|---|---|
| **Auth** | Required |
| **Query** | `?status=open&goalId=goal_001&limit=50` |

**Response:**
```json
{
  "data": [
    {
      "id": "task_001",
      "title": "Design API spec",
      "status": "in_progress",
      "priority": "high",
      "goalId": "goal_001",
      "xp": 50,
      "dueDate": "2026-02-12T00:00:00Z",
      "createdAt": "2026-02-10T08:00:00Z",
      "updatedAt": "2026-02-11T09:00:00Z"
    }
  ],
  "error": null,
  "meta": { "pagination": { "total": 12 } }
}
```

### POST /api/tasks

Create a task.

| | |
|---|---|
| **Auth** | Required |

**Request:**
```json
{
  "title": "Write onboarding flow tests",
  "description": "Unit + integration tests for the first-run wizard",
  "priority": "medium",
  "goalId": "goal_001",
  "dueDate": "2026-02-15T00:00:00Z"
}
```

**Response:**
```json
{
  "data": { "id": "task_002", "title": "Write onboarding flow tests", "status": "open" },
  "error": null,
  "meta": {}
}
```

### PATCH /api/tasks/:id

Update a task.

| | |
|---|---|
| **Auth** | Required |

**Request:**
```json
{
  "status": "done",
  "xpAwarded": 50
}
```

**Response:**
```json
{
  "data": { "id": "task_001", "status": "done", "xpAwarded": 50 },
  "error": null,
  "meta": {}
}
```

### DELETE /api/tasks/:id

Delete a task.

| | |
|---|---|
| **Auth** | Required |

**Response:**
```json
{
  "data": { "deleted": true },
  "error": null,
  "meta": {}
}
```

### GET /api/goals

List goals.

| | |
|---|---|
| **Auth** | Required |

**Response:**
```json
{
  "data": [
    {
      "id": "goal_001",
      "title": "Launch Kira Dashboard v1",
      "progress": 0.45,
      "taskCount": 12,
      "completedTasks": 5,
      "createdAt": "2026-02-01T00:00:00Z"
    }
  ],
  "error": null,
  "meta": {}
}
```

### POST /api/goals

Create a goal.

| | |
|---|---|
| **Auth** | Required |

**Request:**
```json
{
  "title": "Ship ZenithCred MVP",
  "description": "Complete the minimum viable product for ZenithCred"
}
```

**Response:**
```json
{
  "data": { "id": "goal_002", "title": "Ship ZenithCred MVP", "progress": 0 },
  "error": null,
  "meta": {}
}
```

---

## 4. VDR (Virtual Data Room) API

### GET /api/vdr/tree

Get the file tree.

| | |
|---|---|
| **Auth** | Required |
| **Query** | `?root=/&depth=3` |

**Response:**
```json
{
  "data": {
    "name": "kira",
    "type": "directory",
    "children": [
      {
        "name": "design",
        "type": "directory",
        "children": [
          { "name": "architecture", "type": "directory", "children": [] },
          { "name": "dashboard", "type": "directory", "children": [] }
        ]
      },
      { "name": "README.md", "type": "file", "size": 2048, "modified": "2026-02-11T08:00:00Z" }
    ]
  },
  "error": null,
  "meta": {}
}
```

### GET /api/vdr/file

Read a file's contents.

| | |
|---|---|
| **Auth** | Required |
| **Query** | `?path=/design/README.md` |

**Response:**
```json
{
  "data": {
    "path": "/design/README.md",
    "content": "# Kira Design\n...",
    "size": 2048,
    "mimeType": "text/markdown",
    "modified": "2026-02-11T08:00:00Z"
  },
  "error": null,
  "meta": {}
}
```

For binary files, `content` is a base64 string and `encoding: "base64"` is set.

### POST /api/vdr/upload

Upload a file.

| | |
|---|---|
| **Auth** | Required |
| **Content-Type** | `multipart/form-data` |

**Form fields:**
- `file`: the file binary
- `path`: destination path (e.g. `/uploads/report.pdf`)
- `overwrite`: `true` | `false` (default false)

**Response:**
```json
{
  "data": { "path": "/uploads/report.pdf", "size": 104857, "created": true },
  "error": null,
  "meta": {}
}
```

### GET /api/vdr/search

Full-text search across files.

| | |
|---|---|
| **Auth** | Required |
| **Query** | `?q=zenithcred&ext=md&limit=20` |

**Response:**
```json
{
  "data": [
    {
      "path": "/deliverables/zenithcred-product-design.md",
      "matches": [
        { "line": 12, "text": "ZenithCred targets Brazilian immigrants..." }
      ],
      "score": 0.87
    }
  ],
  "error": null,
  "meta": { "pagination": { "total": 4 } }
}
```

---

## 5. Agent API

### GET /api/agents

List active and recent agents.

| | |
|---|---|
| **Auth** | Required |

**Response:**
```json
{
  "data": [
    {
      "id": "main",
      "label": "Main Agent",
      "status": "active",
      "model": "claude-opus-4-6",
      "uptime": 3600,
      "messageCount": 42
    },
    {
      "id": "subagent:abc123",
      "label": "zenithcred-research",
      "status": "completed",
      "model": "claude-sonnet-4-20250514",
      "duration": 327,
      "result": "success"
    }
  ],
  "error": null,
  "meta": {}
}
```

### POST /api/agents/spawn

Spawn a sub-agent.

| | |
|---|---|
| **Auth** | Required |

**Request:**
```json
{
  "label": "api-research",
  "task": "Research competitor API designs for personal AI assistants",
  "model": "claude-sonnet-4-20250514",
  "timeout": 300
}
```

**Response:**
```json
{
  "data": {
    "id": "subagent:def456",
    "label": "api-research",
    "status": "running"
  },
  "error": null,
  "meta": {}
}
```

### GET /api/agents/:id/status

Get agent status and output.

| | |
|---|---|
| **Auth** | Required |

**Response:**
```json
{
  "data": {
    "id": "subagent:def456",
    "label": "api-research",
    "status": "completed",
    "model": "claude-sonnet-4-20250514",
    "startedAt": "2026-02-11T09:00:00Z",
    "completedAt": "2026-02-11T09:05:27Z",
    "duration": 327,
    "result": "success",
    "output": "Found 5 competitor APIs...",
    "tokenUsage": { "input": 12000, "output": 3400 }
  },
  "error": null,
  "meta": {}
}
```

---

## 6. Settings API

### GET /api/settings

Get all settings.

| | |
|---|---|
| **Auth** | Required |

**Response:**
```json
{
  "data": {
    "general": {
      "agentName": "Kira",
      "personality": "friendly, proactive",
      "avatar": "/assets/kira-avatar.png",
      "emoji": "⚡"
    },
    "connections": {
      "anthropic": { "configured": true, "type": "subscription" },
      "openrouter": { "configured": true, "type": "api_key" },
      "ollama": { "configured": true, "url": "http://localhost:11434" }
    },
    "models": {
      "mainChat": "claude-opus-4-6",
      "subAgents": "claude-sonnet-4-20250514",
      "widgets": "gemini-2.0-flash",
      "memory": "qwen3:14b",
      "embeddings": "nomic-embed-text"
    },
    "channels": {
      "telegram": { "enabled": true, "username": "@kira_bot" },
      "discord": { "enabled": false }
    },
    "autonomy": {
      "green": ["read_files", "web_search", "memory"],
      "yellow": ["exec_commands", "send_messages"],
      "red": ["delete_files", "send_emails", "financial"]
    },
    "memory": {
      "retentionDays": 90,
      "autoBackup": true,
      "graphStats": { "entities": 142, "facts": 891 }
    },
    "appearance": {
      "theme": "dark",
      "fontSize": 14
    },
    "gamification": {
      "xpVisible": true,
      "streaksEnabled": true,
      "achievementNotifications": true
    }
  },
  "error": null,
  "meta": {}
}
```

### PATCH /api/settings

Update settings (partial merge).

| | |
|---|---|
| **Auth** | Required |

**Request:**
```json
{
  "appearance": { "theme": "light" },
  "gamification": { "achievementNotifications": false }
}
```

**Response:**
```json
{
  "data": { "updated": true },
  "error": null,
  "meta": {}
}
```

### GET /api/settings/models

List available models across all providers.

| | |
|---|---|
| **Auth** | Required |

**Response:**
```json
{
  "data": {
    "cloud": [
      { "id": "claude-opus-4-6", "provider": "anthropic", "type": "subscription", "contextWindow": 200000 },
      { "id": "claude-sonnet-4-20250514", "provider": "openrouter", "type": "api_key", "costPer1kInput": 0.003 }
    ],
    "local": [
      { "id": "qwen3:14b", "provider": "ollama", "size": "8.5GB", "loaded": true, "vram": "10GB" },
      { "id": "nomic-embed-text", "provider": "ollama", "size": "274MB", "loaded": false }
    ],
    "gpu": {
      "name": "NVIDIA RTX 4090",
      "vramTotal": "24GB",
      "vramUsed": "10GB"
    }
  },
  "error": null,
  "meta": {}
}
```

### POST /api/settings/ollama/pull

Pull a model from Ollama registry.

| | |
|---|---|
| **Auth** | Required |

**Request:**
```json
{
  "model": "llama3:8b"
}
```

**Response (SSE stream):**
```
event: progress
data: {"status":"pulling","completed":1073741824,"total":4294967296,"percent":25}

event: progress
data: {"status":"pulling","completed":4294967296,"total":4294967296,"percent":100}

event: done
data: {"status":"success","model":"llama3:8b","size":"4.7GB"}
```

---

## 7. System API

### GET /api/health

Health check.

| | |
|---|---|
| **Auth** | **Public** |

**Response:**
```json
{
  "data": { "status": "healthy", "uptime": 86400, "version": "0.1.0" },
  "error": null,
  "meta": {}
}
```

### GET /api/metrics

System metrics.

| | |
|---|---|
| **Auth** | Required |

**Response:**
```json
{
  "data": {
    "tokens": { "today": 45000, "thisMonth": 1200000, "costToday": 0.85 },
    "agents": { "active": 1, "completed": 14, "failed": 1 },
    "memory": { "entities": 142, "facts": 891, "dbSizeMB": 12 },
    "system": { "cpuPercent": 23, "memUsedMB": 1024, "diskUsedPercent": 45 }
  },
  "error": null,
  "meta": {}
}
```

### GET /api/system/info

System information.

| | |
|---|---|
| **Auth** | Required |

**Response:**
```json
{
  "data": {
    "version": "0.1.0",
    "node": "v25.6.0",
    "os": "Linux 6.8.0-94-generic (x64)",
    "openclaw": "1.2.0",
    "ollamaVersion": "0.6.2",
    "gpu": "NVIDIA RTX 4090 (24GB)"
  },
  "error": null,
  "meta": {}
}
```

---

## 8. Auth API

### POST /api/auth/login

| | |
|---|---|
| **Auth** | **Public** |

**Request:**
```json
{
  "email": "otto@example.com",
  "password": "..."
}
```

**Response:**
```json
{
  "data": {
    "token": "eyJhbG...",
    "expiresAt": "2026-02-12T09:00:00Z",
    "user": { "id": "usr_001", "email": "otto@example.com", "role": "owner" }
  },
  "error": null,
  "meta": {}
}
```

### POST /api/auth/register

| | |
|---|---|
| **Auth** | **Public** (first-run only; disabled after first user created) |

**Request:**
```json
{
  "email": "otto@example.com",
  "password": "...",
  "agentName": "Kira"
}
```

**Response:**
```json
{
  "data": {
    "token": "eyJhbG...",
    "user": { "id": "usr_001", "email": "otto@example.com", "role": "owner" }
  },
  "error": null,
  "meta": {}
}
```

### POST /api/auth/oauth/:provider

Start or complete OAuth flow.

| | |
|---|---|
| **Auth** | **Public** |
| **Providers** | `claude-max`, `chatgpt-plus`, `google` |

**Request:**
```json
{
  "action": "callback",
  "code": "oauth_code_from_redirect",
  "state": "csrf_token"
}
```

**Response:**
```json
{
  "data": {
    "provider": "claude-max",
    "status": "connected",
    "subscription": { "plan": "Max", "rateLimit": "1000 msgs/day" }
  },
  "error": null,
  "meta": {}
}
```

For `action: "start"`, response returns `{ "data": { "redirectUrl": "https://..." } }`.

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_REQUIRED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `AGENT_BUSY` | 409 | Agent is processing another request |
| `MODEL_UNAVAILABLE` | 503 | Requested model not available |
