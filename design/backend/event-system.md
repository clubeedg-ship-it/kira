# Real-time Event System

> **Status:** 🔴 SCAFFOLD | **Phase:** 2

---

## Event Catalog

```
AGENT_STATUS_CHANGED      — Agent started/stopped/blocked
TASK_STATUS_CHANGED       — Task moved to new status
INPUT_QUEUE_ITEM_ADDED    — New item needs attention
INPUT_QUEUE_ITEM_RESOLVED
MESSAGE_RECEIVED          — New message in unified inbox
REVIEW_DUE                — Review cadence triggered
KEY_RESULT_UPDATED        — Metric changed
DEPENDENCY_UNBLOCKED      — Task/project became unblocked
DOCUMENT_ADDED            — New file in VDR
MEMORY_UPDATED            — Knowledge graph changed
NOTIFICATION              — Anything user should see
```

## TODO
- SSE channel design (single stream vs per-entity)
- Event payload schemas
- Client-side handling patterns
- Reconnection logic
- Event filtering (subscribe to specific types)
- Event history / replay
