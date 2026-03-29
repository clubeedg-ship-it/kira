# SOP Engine — API Endpoints

> **Status:** ✅ DESIGNED (Phase 0)
> **Base URL:** `/api/v1` | **Auth:** Bearer JWT

---

## Conventions
- Responses: `{ data, meta? }` | Errors: `{ error: { code, message } }`
- Pagination: `?limit=50&offset=0` | Sorting: `?sort=priority&order=asc`
- All timestamps ISO 8601

## Endpoints

### Vision `/vision`
GET / | GET /:id | POST / | PATCH /:id | PATCH /:id/archive

### Areas `/areas`
GET / | GET /:id | POST / | PATCH /:id | PATCH /:id/pause | PATCH /:id/resume | PATCH /:id/archive | PUT /reorder

### Objectives `/objectives`
GET /?quarter=&area_id=&status= | GET /:id | POST / | PATCH /:id | POST /:id/defer | PATCH /:id/complete | PATCH /:id/fail

### Key Results `/objectives/:id/key-results`
GET / | POST / | PATCH /:id | DELETE /:id

### Projects `/projects`
GET /?status=&area_id=&owner_type= | GET /:id | POST / | PATCH /:id | PATCH /:id/status | PATCH /:id/assign | DELETE /:id

### Milestones `/projects/:id/milestones`
GET / | POST / | PATCH /:id | PATCH /:id/complete

### Tasks `/tasks`
GET / (rich filtering) | GET /:id | POST / | POST /quick-add | PATCH /:id | PATCH /:id/status | PATCH /:id/assign | POST /:id/reschedule | DELETE /:id

**Task filters:** status, project_id, area_id, executor_type, scheduled_date, due_before, context, energy, priority, has_blockers

### Composite Views `/views`
GET /today | GET /top-3 | GET /board/:projectId | GET /timeline/:areaId | GET /inbox

### Dependencies `/dependencies`
GET ?blocked_id= | GET ?blocker_id= | POST / | DELETE /:id | GET /check-cycle

### Input Queue `/input-queue`
GET / | GET /:id | POST /:id/resolve | POST /:id/dismiss | POST /:id/schedule | GET /count

### Agents `/agents`
GET / | GET /:id | POST / | PATCH /:id | GET /:id/work-log | POST /:id/pause | POST /:id/resume

### Time Blocks `/time-blocks`
GET / | GET /week | POST / | PATCH /:id | DELETE /:id

### Reviews `/reviews`
GET / | GET /:id | POST /:id/start | POST /:id/complete | POST /:id/skip

### Principles `/principles` & Decisions `/decisions`
Standard CRUD + PATCH /decisions/:id/outcome

### Real-time
GET `/events/stream` — SSE stream, filter: `?types=TASK_STATUS_CHANGED,INPUT_QUEUE_ITEM_ADDED`
