# SOP Engine — Cascade Rules

> **Status:** ✅ DESIGNED (Phase 0)

---

## Principle
All "deletes" are soft (→ archived/cancelled). Changes cascade downward. Destructive cascades require confirmation via input queue.

## Delete Cascades

| Entity Archived | Children Effect |
|----------------|----------------|
| Vision → archived | Areas → paused, input queue notification |
| Area → archived | Objectives → failed, Projects → archived, Tasks → cancelled |
| Objective → failed | Active Projects → archived, Active Tasks → cancelled |
| Objective → deferred | Clone to next quarter, re-link projects |
| Project → archived | Active Tasks → cancelled, Queue items → dismissed, Agents → stop |
| Task → cancelled | Queue items → dismissed, Agent → stop. Blocked items stay blocked (input queue warning) |

## Status Change Cascades

| Change | Effect |
|--------|--------|
| Project → blocked | In-progress tasks pause, input queue blocker item created |
| Project → completed | Verify all tasks done/cancelled, update objective progress, award XP |
| Task → done | Set completed_at, check dependency DAG to unblock, check if last task → project review |
| Area → paused | Active projects → blocked (reason: area paused), agents stop for area |
| Area → active (resume) | Paused projects → active, agents resume |

## Reparenting Rules
- Task → different project: allowed any status, deps stay valid
- Project → different objective: recalculate both objective progress values
- Objective → different area: only during quarterly planning

## Orphan Handling
- Tasks without project: live in virtual "Inbox", heartbeat proposes assignment
- Projects without objective: valid if has area_id, surfaced in quarterly review
