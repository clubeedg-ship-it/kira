# Confidence Decay

> **Status:** ✅ DESIGNED | **Phase:** 4
> **Purpose:** Facts should lose confidence over time unless reinforced. "Client X uses React" might be true today but not in 6 months. This defines how memory facts age, reinforcement mechanics, and pruning thresholds.

---

## 1. The Problem

Kira's knowledge graph accumulates facts but never forgets or doubts them. A fact learned 18 months ago about a client's tech stack has the same weight as something confirmed yesterday. This leads to stale context being injected into conversations.

---

## 2. Confidence Model

### Initial Confidence Assignment

| Source | Initial Confidence |
|--------|-------------------|
| User explicitly stated | 0.95 |
| Extracted from conversation | 0.80 |
| Extracted from document | 0.85 |
| Inferred by agent | 0.60 |
| Scraped from external source | 0.50 |

### Decay Formula

```
confidence(t) = initial_confidence × decay_rate ^ (days_since_last_reinforcement / half_life)
```

| Fact Category | Half-Life | Rationale |
|--------------|-----------|----------|
| Personal preferences | 365 days | Rarely change |
| Business relationships | 180 days | Contacts change |
| Technical facts | 120 days | Tech stacks evolve |
| Project status | 30 days | Projects move fast |
| Prices / numbers | 60 days | Market changes |
| Contact info | 180 days | Relatively stable |
| Opinions / sentiments | 90 days | People change minds |

---

## 3. Reinforcement

When a fact is **reinforced** (mentioned again, confirmed, or used successfully):
1. Reset `last_reinforced_at` to now
2. Boost confidence by `min(0.1, 1.0 - current_confidence)`
3. Never exceeds 1.0

Reinforcement triggers:
- User mentions the fact in conversation
- Agent uses the fact and user doesn't correct it
- Fact appears again in a new document
- User confirms during a review

---

## 4. Pruning

| Confidence Threshold | Action |
|---------------------|--------|
| > 0.6 | Active: included in context injection |
| 0.3 – 0.6 | Dormant: available via search but not auto-injected |
| 0.1 – 0.3 | Stale: flagged for review in weekly memory maintenance |
| < 0.1 | Archived: moved to cold storage, not queryable by default |

### Heartbeat Memory Maintenance
The heartbeat process runs decay calculations nightly:
1. Recalculate confidence for all active facts
2. Move newly-dormant facts to dormant status
3. Queue stale facts for human review (batch in weekly review)
4. Archive expired facts

---

## 5. Schema Addition

```sql
ALTER TABLE entities ADD COLUMN confidence REAL DEFAULT 0.8;
ALTER TABLE entities ADD COLUMN confidence_source TEXT;   -- 'user', 'conversation', 'document', 'agent', 'external'
ALTER TABLE entities ADD COLUMN last_reinforced_at TEXT;
ALTER TABLE entities ADD COLUMN decay_category TEXT;      -- maps to half-life
```

---

## 6. UI Integration

Knowledge Graph Explorer: node opacity scales with confidence. Faded nodes = low confidence. Tooltip shows confidence score + last reinforced date. Filter toggle: "Show only high-confidence facts."

---

*Confidence decay makes Kira's memory honest. Old facts fade unless confirmed. Fresh knowledge is trusted. Stale knowledge is questioned.*