# SOP Engine — Data Model

> **Status:** ✅ DESIGNED (Phase 0)  
> **Full Schema:** See `KIRA-SOP-ENGINE.md` Section 3  
> **Replaces:** `design-v2/10-tasks-goals.md`

---

## Summary

14 tables across 5 hierarchy layers + supporting systems:

**Core Hierarchy:** `vision` (L0) → `areas` (L1) → `objectives` + `key_results` (L2) → `projects` + `milestones` (L3) → `tasks` (L4)

**Dependency DAG:** `dependencies` — tracks blocker/blocked relationships across tasks, projects, milestones

**Agent System:** `agents` + `agent_work_log` — registry and audit trail

**Human Interface:** `input_queue` — the single surface for human attention (verify/decide/create/review/blocker)

**Time System:** `time_blocks` + `reviews` — calendar integration and review cadence

**Knowledge:** `principles` + `decisions` — Dalio-style algorithmic decision-making

## Key Design Decisions

1. **IDs:** `lower(hex(randomblob(8)))` — 16-char hex strings, no UUIDs needed for single-user
2. **Timestamps:** ISO 8601 text — SQLite doesn't have native datetime
3. **JSON fields:** `tags`, `options`, `examples`, `can_execute`, `area_ids` — stored as TEXT, parsed in app
4. **Soft deletes:** All "deletions" change status to archived/cancelled (see cascade-rules.md)
5. **Priority encoding:** 0=critical, 1=high, 2=medium, 3=low (lower number = higher priority)
6. **Executor classification:** `executor_type` ('human'|'agent'|'ambiguous') + `requires_input` ('no'|'verify'|'decide'|'create')

## Full SQL

The complete CREATE TABLE statements with all columns, constraints, and indexes are in `KIRA-SOP-ENGINE.md` Section 3 (Sections 3.1 through 3.5).

### Quick Reference — Table Count by Category

| Category | Tables | Notes |
|----------|--------|-------|
| Core Hierarchy | 6 | vision, areas, objectives, key_results, projects, milestones |
| Tasks | 1 | tasks (with executor classification) |
| Dependencies | 1 | polymorphic blocker/blocked |
| Agents | 2 | agents, agent_work_log |
| Input Queue | 1 | input_queue |
| Time | 2 | time_blocks, reviews |
| Knowledge | 2 | principles, decisions |
| **Total** | **15** | + 24 indexes |
