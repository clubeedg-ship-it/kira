# SOP Engine — Priority Algorithm

> **Status:** ✅ DESIGNED (Phase 0)
> **Source:** `KIRA-SOP-ENGINE.md` Section 4.2

---

## Formula

```
score = (deadline_urgency × 3.0) + (blocking_count × 2.5) + (explicit_priority × 1.5) + (area_weight × 1.0)
```

## Components

| Component | Values |
|-----------|--------|
| deadline_urgency | overdue=10, today=8, this_week=5, this_month=3, this_quarter=2, none=1 |
| blocking_count | COUNT of entities blocked by this item (capped at 10) |
| explicit_priority | critical(0)→10, high(1)→7, medium(2)→4, low(3)→1 |
| area_weight | 0-5 based on area sort_order position |

## Top 3 Selection

1. Filter: actionable tasks (todo/in_progress, scheduled ≤ today, all dependencies clear)
2. Score and sort descending
3. Area diversity: try to pick from different areas

## Re-scoring Triggers
- Deadline change, dependency add/remove, blocker completed
- Priority change, area reorder, daily startup batch
- Scores are cached and invalidated on trigger events

## Range
Typical: 5 (low/no-deadline) to 85 (critical/overdue/blocks-many/top-area)
