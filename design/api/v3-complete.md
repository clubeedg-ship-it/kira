# API Specification v3 — Complete

> **Status:** ✅ DESIGNED | **Phase:** 6
> **Purpose:** Single source of truth for all Kira API endpoints. Covers SOP engine, unified inbox, input queue, agents, documents, memory, events, and settings.

---

## 1. Conventions

- **Base URL:** `/api/v1`
- **Format:** JSON request/response
- **Auth:** Bearer token (JWT)
- **Pagination:** `?limit=50&offset=0` (default limit: 50, max: 200)
- **Sorting:** `?sort=created_at&order=desc`
- **Filtering:** Query params per field (e.g., `?status=active&area_id=xxx`)
- **Errors:** `{ "error": "message", "code": "ERROR_CODE" }` with appropriate HTTP status

---

## 2. SOP Engine

### Vision
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vision` | List all vision statements |
| POST | `/vision` | Create vision |
| GET | `/vision/:id` | Get vision detail |
| PUT | `/vision/:id` | Update vision |
| DELETE | `/vision/:id` | Archive vision |

### Areas
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/areas` | List areas (filter: ?status=active) |
| POST | `/areas` | Create area |
| GET | `/areas/:id` | Get area with expand options |
| PUT | `/areas/:id` | Update area |
| DELETE | `/areas/:id` | Archive area |
| GET | `/areas/:id?expand=objectives,projects,agents,principles,activity` | Full area detail |

### Objectives
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/objectives` | List (filter: ?quarter=2026-Q1&area_id=xxx) |
| POST | `/objectives` | Create objective |
| GET | `/objectives/:id` | Get with key results |
| PUT | `/objectives/:id` | Update |
| DELETE | `/objectives/:id` | Archive |
| POST | `/objectives/:id/score` | Score objective (complete/fail/defer) |

### Key Results
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/objectives/:id/key-results` | List KRs for objective |
| POST | `/objectives/:id/key-results` | Create KR |
| PUT | `/key-results/:id` | Update KR (including current_value) |
| DELETE | `/key-results/:id` | Remove KR |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List (filter: ?objective_id, ?area_id, ?status, ?owner_type) |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Get with milestones, tasks, dependencies |
| PUT | `/projects/:id` | Update |
| DELETE | `/projects/:id` | Archive |
| POST | `/projects/:id/decompose` | AI decomposition into tasks |

### Milestones
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/:id/milestones` | List milestones |
| POST | `/projects/:id/milestones` | Create milestone |
| PUT | `/milestones/:id` | Update |
| DELETE | `/milestones/:id` | Remove |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | List (extensive filters: status, project, area, executor, priority, due, scheduled, context, energy) |
| POST | `/tasks` | Create task (runs through classification engine) |
| GET | `/tasks/:id` | Get task detail |
| PUT | `/tasks/:id` | Update |
| DELETE | `/tasks/:id` | Cancel |
| POST | `/tasks/:id/complete` | Mark done |
| POST | `/tasks/:id/assign` | Assign to agent/human |
| GET | `/tasks/today` | Today's tasks (scheduled + overdue) |
| GET | `/tasks/inbox` | Unassigned tasks (project_id IS NULL) |

### Dependencies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dependencies?blocked_id=xxx` | Get blockers for entity |
| POST | `/dependencies` | Create dependency |
| DELETE | `/dependencies/:id` | Remove dependency |

---

## 3. Input Queue

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/input-queue` | List (filter: ?status=pending&queue_type&area_id&priority) |
| GET | `/input-queue/:id` | Get item detail |
| POST | `/input-queue/:id/resolve` | Resolve item (body: {resolution, chosen_option}) |
| POST | `/input-queue/:id/dismiss` | Dismiss item |
| POST | `/input-queue/:id/snooze` | Snooze (body: {until: datetime}) |
| POST | `/input-queue/:id/redo` | Request agent redo |

---

## 4. Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/agents` | List agents with stats |
| POST | `/agents` | Create/register agent |
| GET | `/agents/:id` | Agent detail with current task, work log |
| PUT | `/agents/:id` | Update agent config |
| POST | `/agents/:id/pause` | Pause agent |
| POST | `/agents/:id/resume` | Resume agent |
| GET | `/agents/:id/work-log` | Work history |
| GET | `/agents/stats` | Aggregate stats (cost, completion rate) |

---

## 5. Unified Inbox / Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/messages` | List (filter: ?channel, ?status, ?urgency, ?area_id, ?thread_id) |
| GET | `/messages/:id` | Get message detail |
| PUT | `/messages/:id` | Update status (read/archive/snooze) |
| POST | `/messages/:id/reply` | Send reply (body: {channel, body_text, attachments}) |
| GET | `/threads` | List threads |
| GET | `/threads/:id/messages` | Messages in thread |

---

## 6. Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents` | List (filter: area, project, type, creator, date range) |
| POST | `/documents/upload` | Upload file (multipart) |
| GET | `/documents/:id` | Get document metadata + summary |
| GET | `/documents/:id/content` | Download file content |
| PUT | `/documents/:id` | Update metadata (tags, project) |
| DELETE | `/documents/:id` | Delete |
| GET | `/documents/:id/versions` | Version history |
| POST | `/documents/:id/versions/:v/restore` | Restore version |
| GET | `/documents/collections` | List collections |

---

## 7. Knowledge Graph / Memory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/knowledge/entities` | List/search entities |
| GET | `/knowledge/entities/:id` | Entity detail with relationships |
| GET | `/knowledge/entities/:id/history` | Temporal history |
| GET | `/knowledge/snapshot?date=xxx` | Graph at point in time |
| GET | `/knowledge/changes?since=xxx` | Recent changes |
| GET | `/knowledge/search?q=xxx` | Semantic search across memory |

---

## 8. Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reviews` | List reviews |
| GET | `/reviews/generate?type=daily&date=xxx` | Generate review data |
| POST | `/reviews` | Create review |
| PUT | `/reviews/:id` | Update review (add insights, decisions) |
| POST | `/reviews/:id/complete` | Complete review |

---

## 9. Time Blocks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/time-blocks` | List (filter: ?day_of_week, ?area_id) |
| POST | `/time-blocks` | Create |
| PUT | `/time-blocks/:id` | Update |
| DELETE | `/time-blocks/:id` | Remove |

---

## 10. Principles & Decisions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/principles` | List (filter: ?area_id, ?domain) |
| POST | `/principles` | Create |
| PUT | `/principles/:id` | Update (confidence, examples) |
| GET | `/decisions` | List (filter: ?project_id, ?principle_id) |
| POST | `/decisions` | Log decision |
| PUT | `/decisions/:id` | Update outcome |

---

## 11. Real-Time Events (SSE)

| Endpoint | Description |
|----------|-------------|
| `GET /events/stream` | SSE stream. Query param `?channels=agent,task,inbox,message` to filter. |

Event format:
```json
{
  "event": "task.status_changed",
  "data": {
    "task_id": "xxx",
    "old_status": "in_progress",
    "new_status": "done",
    "timestamp": "2026-02-18T14:30:00Z"
  }
}
```

---

## 12. Views (Aggregated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/views/command-center` | Aggregated home screen data |
| GET | `/views/today` | Today view data (tasks + events + time blocks) |
| GET | `/views/timeline?area_id&start&end` | Timeline/Gantt data |

---

*One API to rule them all. Every endpoint documented, every filter specified. The contract between frontend and backend.*