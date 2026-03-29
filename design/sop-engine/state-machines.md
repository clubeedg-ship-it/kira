# SOP Engine — State Machines

> **Status:** ✅ DESIGNED (Phase 0)

---

## Status Transitions by Entity

### Vision: `active` ↔ `archived`

### Areas: `active` → `paused` → `archived` (paused can reactivate to active)

### Objectives: `active` → `completed` | `failed` | `deferred`
- Auto-progress: `AVG(MIN(100, current_value/target_value × 100))` across key_results

### Projects: `planning` → `active` ↔ `blocked` → `review` → `completed` | `archived`

### Tasks: `todo` → `in_progress` ↔ `waiting` → `review` → `done` | `cancelled`
- `waiting` = agent hit requires_input checkpoint → input_queue item created
- `review` = agent completed with requires_input='verify'

### Input Queue: `pending` → `scheduled` → `in_progress` → `resolved` | `dismissed`

### Reviews: `pending` → `in_progress` → `completed` | `skipped`

### Agents: `idle` ↔ `working` ↔ `blocked`, `idle` ↔ `sleeping`

## Invariants
1. `done` tasks must have `completed_at` set
2. `waiting` tasks must have a pending/scheduled input_queue item
3. `completed` projects must have ALL tasks done or cancelled
4. Objective progress = calculated average of key_results
5. No dependency cycles (enforced at insert)
6. Agent-executed tasks must have valid `executor_id`

## Dependency Cascade on Task Completion
```
WHEN task → done:
  FOR EACH dep WHERE blocker_id = task.id:
    IF all blockers of dep.blocked_id are done:
      Unblock the blocked entity
```
