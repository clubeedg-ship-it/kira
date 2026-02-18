# 05 — REST API Specification

---

## Conventions

### Response Envelope

Every endpoint returns:
```json
{
  "data": <payload | null>,
  "error": null | { "code": "ERROR_CODE", "message": "Human-readable" },
  "meta": { "requestId": "ulid", "timestamp": "ISO8601" }
}
```

### Authentication

All endpoints require `Authorization: Bearer <jwt>` unless marked **PUBLIC**.

### Pagination

List endpoints accept: `?limit=50&offset=0`
Response meta includes: `"pagination": { "offset": 0, "limit": 50, "total": 120 }`

---

## Auth (PUBLIC)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account `{ email, password, displayName }` |
| POST | `/api/auth/verify` | Verify email `{ email, code }` → returns tokens |
| POST | `/api/auth/login` | Login `{ email, password }` → returns tokens |
| POST | `/api/auth/refresh` | Refresh tokens `{ refreshToken }` → returns new pair |
| POST | `/api/auth/logout` | Revoke session (requires Bearer) |
| GET | `/api/auth/me` | Get current user (requires Bearer) |

## Chat

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/chat/sessions` | List chat sessions |
| POST | `/api/chat/sessions` | Create session `{ title? }` |
| DELETE | `/api/chat/sessions/:id` | Delete session |
| GET | `/api/chat/sessions/:id/messages` | Get messages `?limit=100&before=<msgId>` |
| POST | `/api/chat` | Send message `{ sessionId, message, model?, stream? }` |

**Streaming:** When `stream: true`, response is SSE:
```
data: {"type":"text","content":"Hello"}
data: {"type":"thinking","content":"Let me..."}
data: {"type":"tool_use","name":"search","input":{...}}
data: {"type":"done","model":"...","tokens":{"input":50,"output":100}}
```

## Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List tasks `?status=todo&priority=0` |
| POST | `/api/tasks` | Create task `{ title, description?, priority?, dueDate?, tags? }` |
| PATCH | `/api/tasks/:id` | Update task (partial) |
| DELETE | `/api/tasks/:id` | Delete task |

## Goals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/goals` | List goals |
| POST | `/api/goals` | Create goal `{ title, targetDate?, milestones? }` |
| PATCH | `/api/goals/:id` | Update goal |
| DELETE | `/api/goals/:id` | Delete goal |

## Documents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/documents/tree` | Get file tree |
| GET | `/api/documents/*path` | Download file |
| POST | `/api/documents/*path` | Upload file (multipart/form-data) |
| PUT | `/api/documents/mkdir` | Create folder `{ path }` |
| DELETE | `/api/documents/*path` | Delete file/folder |

## Knowledge

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/knowledge/entities` | List entities `?type=person&q=search` |
| GET | `/api/knowledge/entities/:id` | Get entity detail + relationships |
| GET | `/api/knowledge/search` | Semantic search `?q=query` |
| GET | `/api/knowledge/stats` | Entity counts by type |

## Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings/providers` | List configured providers |
| POST | `/api/settings/providers` | Add provider `{ type, apiKey, baseUrl? }` |
| DELETE | `/api/settings/providers/:type` | Remove provider |
| GET | `/api/settings/preferences` | Get user preferences |
| PATCH | `/api/settings/preferences` | Update preferences |
| PATCH | `/api/settings/account` | Update display name, password |

## Usage

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/usage` | Usage summary `?since=ISO8601` |
| GET | `/api/usage/recent` | Recent usage records `?limit=50` |

## Admin (admin role only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/:id` | Update user (role, tier, disabled) |
| GET | `/api/admin/usage` | All users usage summary |
| GET | `/api/admin/health` | System health + stats |

## Health (PUBLIC)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | `{ status: "ok", version, uptime }` |
