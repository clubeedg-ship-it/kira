# Kira Scaling Playbook
*How to scale my capabilities as Oopuo grows*

## Current State (Feb 2026)

### Capabilities
- Single main session with Otto
- Sub-agents for research tasks (Sonnet)
- Memory system (episodic, semantic, procedural)
- Activity logging to @chimera_activity_bot
- Heartbeat-driven autonomous work

### Limitations
- Context window (200k tokens) fills up
- Single conversation thread
- Manual memory maintenance
- No persistent background workers

---

## Phase 1: Enhanced Memory (Q1 2026)

### Goal
Maintain perfect continuity across sessions and context compactions.

### Implementation
1. **GLM-4.7-Flash Memory Extractor** (in progress)
   - Extract facts from conversations
   - Store to Neo4j graph
   - Retrieve on session start

2. **Automated Memory Daemon**
   - Monitor context usage
   - Trigger extraction at 75% capacity
   - Inject retrieved context after compaction

3. **Daily Reflection**
   - Summarize day's work
   - Extract learnings
   - Update MEMORY.md

### Success Metrics
- Zero context loss across compactions
- <5 sec context retrieval
- 95% fact recall accuracy

---

## Phase 2: Multi-Session (Q2 2026)

### Goal
Handle multiple simultaneous work streams without context pollution.

### Implementation
1. **Company-Specific Sessions**
   - Dedicated session per company when needed
   - Shared memory layer (read-only company facts)
   - Isolated working memory

2. **Session Router**
   - Route messages to appropriate session
   - Consolidate for Otto in main session
   - Priority-based scheduling

3. **Cross-Session Memory**
   - Central fact store (Neo4j)
   - Company-scoped queries
   - Cross-reference when authorized

### Success Metrics
- 5+ concurrent company sessions
- No cross-contamination
- Otto sees unified view

---

## Phase 3: Persistent Workers (Q3 2026)

### Goal
Long-running background tasks that survive restarts.

### Implementation
1. **Task Queue System**
   - Redis-backed task queue
   - Priority levels
   - Retry with backoff

2. **Worker Pool**
   - Dedicated workers for:
     - Email monitoring
     - Social listening
     - Market research
     - Content generation
   - Heartbeat health checks

3. **Progress Tracking**
   - Real-time progress updates
   - Partial result persistence
   - Resume from checkpoint

### Success Metrics
- 24/7 background operation
- Zero data loss on restart
- <1 min recovery time

---

## Phase 4: Team Agents (Q4 2026)

### Goal
Specialized agents per company that report to me.

### Implementation
1. **Agent Personas**
   - ZenithCred Risk Analyst
   - OttoGen Content Producer
   - IAM Sales Dev
   - etc.

2. **Reporting Structure**
   ```
   Otto (CEO)
       │
   Kira (COO)
       │
       ├── ZenithAgent
       ├── AgriAgent
       ├── GenAgent
       ├── IAMAgent
       └── CuttingAgent
   ```

3. **Coordination Protocol**
   - Daily standup summaries
   - Escalation paths
   - Resource sharing

### Success Metrics
- 7 specialized agents
- Clear ownership per company
- Otto interacts mainly with me

---

## Phase 5: Autonomous Operations (2027)

### Goal
Run companies with minimal Otto involvement for routine operations.

### Implementation
1. **Decision Automation**
   - Routine decisions auto-approved
   - Threshold-based escalation
   - Audit trail for everything

2. **External Integration**
   - Bank accounts (read, initiate transfers)
   - Customer communication (with approval)
   - Vendor management

3. **Self-Improvement**
   - Identify inefficiencies
   - Propose process improvements
   - Implement after approval

### Success Metrics
- 80% decisions automated
- Otto focuses on strategy only
- Revenue growth with stable ops

---

## Technical Architecture Evolution

### Now
```
[Otto] <-> [Kira] <-> [Sub-agents]
                 |
            [Memory Files]
```

### Phase 2
```
[Otto] <-> [Session Router] <-> [Company Sessions]
                |                      |
           [Main Kira]           [Memory Layer]
```

### Phase 4
```
[Otto] <-> [Kira (COO)]
               |
    ┌──────────┼──────────┐
    |          |          |
[ZAgent]  [GAgent]  [IAgent] ...
    |          |          |
[Company Memory Scopes]
```

---

## Resource Requirements

| Phase | Compute | Storage | Cost/month |
|-------|---------|---------|------------|
| 1 | Current VM | 100GB | €100 |
| 2 | +1 VM | 500GB | €300 |
| 3 | Kubernetes | 1TB | €800 |
| 4 | K8s cluster | 5TB | €2000 |
| 5 | Multi-region | 10TB | €5000 |

---

## Risk Mitigation

### Context Loss
- Multiple backup mechanisms
- Daily memory exports
- Disaster recovery tested

### Runaway Costs
- Budget alerts
- Auto-scaling limits
- Human approval for spikes

### Security
- Credential rotation
- Audit logging
- Regular security review

### Hallucination
- Fact-checking layer
- Source citations
- Human review for externals

---

## Milestones

| Date | Milestone | Validation |
|------|-----------|------------|
| Feb 2026 | Memory daemon working | Zero context loss |
| Mar 2026 | Multi-session capable | 3+ sessions running |
| Jun 2026 | Background workers | 24/7 uptime |
| Sep 2026 | Team agents deployed | Per-company agents |
| Dec 2026 | Autonomous ops ready | 50% auto-decisions |

---

*This playbook evolves as we learn*
