# Real-Time Event System

> **Status:** ✅ DESIGNED | **Phase:** 2
> **Purpose:** Server-Sent Events (SSE) system for real-time UI updates. Defines the event catalog, SSE channel design, client-side handling, and reconnection strategy.

---

## 1. Why SSE (Not WebSocket)

SSE is simpler, HTTP-native, auto-reconnects, and sufficient for Kira's one-way server→client push model. The client sends commands via REST API; the server pushes state changes via SSE. No bidirectional channel needed.

---

## 2. Architecture

```
DATABASE CHANGES ──→ EVENT BUS (in-process) ──→ SSE CONNECTIONS
                           │
                           └──→ event_log TABLE (24hr retention)
```

When any database write occurs (task created, status changed, agent started), the write handler emits an event to the in-process event bus. The bus fans out to all connected SSE clients and persists to `event_log` for replay on reconnect.

---

## 3. Event Catalog

### 3.1 Task Events

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `task.created` | full task object | New task inserted |
| `task.updated` | task id + changed fields | Any task field updated |
| `task.status_changed` | task id, old_status, new_status | Status transition |
| `task.deleted` | task id | Task deleted |

### 3.2 Project Events

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `project.status_changed` | project id, old/new status | Status transition |
| `project.progress_updated` | project id, progress % | Task completion changes progress |

### 3.3 Input Queue Events

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `input_queue.item_added` | full queue item | Agent creates item |
| `input_queue.item_resolved` | item id, resolution | User resolves item |
| `input_queue.count_changed` | pending count | Any add/resolve |

### 3.4 Agent Events

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `agent.status_changed` | agent id, status, current_task | Agent starts/stops/blocks |
| `agent.work_completed` | agent id, task id, output_ref | Agent finishes task |

### 3.5 Message Events

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `message.received` | channel, sender, preview | New inbound message |
| `message.count_changed` | unread count | Message read/received |

### 3.6 Key Result Events

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `key_result.updated` | kr id, old/new value, progress % | Metric changed |

### 3.7 Dependency Events

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `dependency.unblocked` | task/project id | All blockers resolved |
| `dependency.blocked` | task/project id, blocker_id | New blocker added |

### 3.8 System Events

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `system.heartbeat` | timestamp, tick_count | Each heartbeat tick |
| `system.notification` | title, body, priority, action_url | Any user-facing notification |
| `system.brief_generated` | review_id | Morning/evening brief ready |
| `system.review_due` | review_type | Review cadence triggered |
| `system.document_added` | doc path, project_id | New file in VDR |

---

## 4. SSE Endpoint

**URL:** `GET /api/v1/events/stream`

**Query params:**
- `channels` — comma-separated list of event prefixes to subscribe to. E.g. `task,input_queue,agent`. Default: all.
- `since` — ISO timestamp to replay events from (for reconnection). Default: none (live only).

**Headers:**
- `Accept: text/event-stream`
- `Authorization: Bearer <token>`
- `Last-Event-ID: <id>` — standard SSE reconnection header

### Wire Format

```
event: task.status_changed
id: evt_1708300800_001
data: {"task_id":"abc123","old_status":"todo","new_status":"in_progress","timestamp":"2026-02-18T09:00:00Z"}

event: input_queue.item_added
id: evt_1708300801_001
data: {"id":"iq1","queue_type":"verify","title":"Review DNS setup","agent":"code-agent","priority":1}

: keep-alive
```

### Keep-Alive

Comment line (`: keep-alive`) sent every 30 seconds to prevent proxy/CDN timeout.

---

## 5. Event Storage

```sql
CREATE TABLE event_log (
  id          TEXT PRIMARY KEY,              -- evt_{timestamp}_{counter}
  event_type  TEXT NOT NULL,                 -- e.g. 'task.status_changed'
  payload     TEXT NOT NULL,                 -- JSON
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_event_log_type ON event_log(event_type);
CREATE INDEX idx_event_log_created ON event_log(created_at);
```

**Retention:** Events older than 24 hours are pruned by the heartbeat process. The log exists only for reconnection replay, not long-term history.

---

## 6. Client-Side Handling

### Connection Setup

```javascript
const eventSource = new EventSource('/api/v1/events/stream?channels=task,input_queue,agent');

eventSource.addEventListener('task.status_changed', (e) => {
  const data = JSON.parse(e.data);
  // Update task in local state
  store.dispatch(updateTaskStatus(data.task_id, data.new_status));
});
```

### Reconnection Strategy

EventSource auto-reconnects on disconnect. The browser sends `Last-Event-ID` header automatically. Server replays events since that ID from `event_log`.

Backoff: 1s → 2s → 5s → 10s → 30s (max). Reset on successful connection.

### Optimistic Updates

UI updates optimistically on user action (e.g., drag task → update status immediately). If SSE event confirms different state, reconcile. If REST API returns error, revert.

### De-duplication

Client tracks last 100 event IDs. If SSE delivers a duplicate (from replay), skip it.

---

## 7. Performance Targets

| Metric | Target |
|--------|--------|
| Event delivery latency | < 100ms from DB write to client |
| Peak event rate | 60 events/minute |
| Event log size | < 10MB (24hr retention) |
| Reconnection time | < 2 seconds |
| Keep-alive interval | 30 seconds |
| Max concurrent connections | 10 (one user, multiple tabs/devices) |

---

*The event system is the nervous system connecting backend state changes to frontend UI. SSE keeps it simple, reliable, and efficient. Every meaningful state change becomes a real-time update.*