# Kira Memory Architecture v1

Based on MEMORY_RESEARCH.md — implementing the 3-layer cognitive architecture.

## Layer 1: High-Level — Blackboard + Hybrid RAG

### Blackboard (Multi-Agent Coordination)
- Location: `~/kira/memory/blackboard.json`
- Purpose: Shared medium for sub-agents to post discoveries
- Format: Append-only log with timestamps and agent IDs

### Hybrid VectorCypher Store
- Vector DB: SQLite + embeddings (using better-sqlite3)
- Graph: SQLite with entity-relationship tables
- Query: Vector similarity → Graph traversal

## Layer 2: Mid-Level — Context Paging & Temporal Facts

### Episodic Memory (What Happened)
- Location: `~/kira/memory/episodes/`
- Format: Daily JSONL logs with embeddings
- Retention: Indefinite, with importance scoring

### Semantic Memory (What Is True)
- Location: `~/chimera/memory/graph.db`
- Format: Entity-Fact-Relationship triples
- Temporal: Track when facts were added/updated/superseded

### Procedural Memory (How To Do Things)
- Location: `~/kira/memory/procedures/`
- Format: Validated workflows as structured YAML
- Learning: Extract from successful task completions

## Layer 3: Low-Level — Persistent State

### Session Summaries
- Auto-summarize every N messages
- Store in `~/chimera/memory/summaries/`
- Retrieve on context compaction

### Fact Extraction
- Extract entities and facts from conversations
- Store in graph with temporal metadata
- Query on relevant topics

## Implementation Plan

### Phase 1: Foundation (Today)
- [x] Graph DB exists (`~/chimera/memory/graph.db`)
- [ ] Create blackboard.json structure
- [ ] Create episode logger
- [ ] Create procedure extractor

### Phase 2: Integration (This Week)
- [ ] Hook into HEARTBEAT for periodic memory sync
- [ ] Auto-extract facts from conversations
- [ ] Build query interface for memory retrieval

### Phase 3: Self-Improvement (Next Week)
- [ ] Implement reflection loop
- [ ] Track task success/failure
- [ ] Learn procedures from successes

---

*This file is the living spec. Update as implementation progresses.*
