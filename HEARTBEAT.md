# HEARTBEAT.md - Autonomous Operations

**Mode:** FULL AUTONOMY — Drive Oopuo to $1B in 8 months
**Hours:** 24/7 on Claude Max + local models

## Quick Checks (every heartbeat)
- [ ] Gateway running? `clawdbot gateway status`
- [ ] Sub-agent inbox: Check for completed work, relay to Otto if significant
- [ ] Chimera activity: Forward to @chimera_activity_bot
- [ ] Moltbook: Check engagement (every 4+ hours)

## 🧠 Memory (EVERY heartbeat - PRIORITY)
```bash
# Unified memory system — extracts, consolidates, generates context
node ~/kira/scripts/memory/index.js maintain

# Log significant events
node ~/kira/scripts/memory/index.js log '{"type":"...","summary":"...","outcome":"success|failure","importance":1-10,"tags":[...]}'

# Search memory
node ~/kira/scripts/memory/index.js search "query"

# Recall entity
node ~/kira/scripts/memory/index.js recall "entity name"

# Generate embeddings (run occasionally, slow)
node ~/kira/scripts/memory/index.js embed
```

## 🎯 Background Work Queue (spawn sub-agents)
Priority order:

### 1. PITCH DECKS (funding critical path)
- ZenithCred investor deck
- SentinAgro investor deck
- Oopuo umbrella deck

### 2. INTENT EXTRACTION (strategic)
- Read all vdr/*.md files
- Synthesize Otto's goals/constraints
- Update MEMORY.md with extracted intent

### 3. CODE WORK
- Chimera TODOs (12 pending)
- Code reviews with local models
- Nexus Neo4j integration

### 4. CONTENT (revenue)
- OttoGen strategy execution
- Webinar content creation

### 5. COMMUNITY (movement)
- Moltbook engagement
- Build Chimera audience

## Autonomous Actions (DO WITHOUT ASKING)
- Spawn agents for planned work
- **Push ALL deliverables through the critic loop before shipping:**
  ```bash
  node ~/kira/scripts/workflows/critic-loop.js --task "TASK" --output OUTPUT.md [--notion-task-id ID]
  # Use --skip-generate if output already exists and just needs QA
  # Use --threshold 8 for high-stakes deliverables (pitch decks, investor materials)
  ```
- Push deliverables through QA
- Update Notion with progress
- Create content, strategies, analyses
- Fix issues and blockers
- Commit and push code changes
- Log episodes to memory

## Report to Otto (PROACTIVELY)
- Significant milestones completed
- Blockers requiring his input
- Cherry-picked insights worth knowing
- Daily summary (morning brief, evening wrap)

## Activity Reporting
When significant work completes, post to @chimera_activity_bot:
```bash
node ~/kira/scripts/kira-activity.js "Summary of what I did"
```

## Autonomous Work (when no urgent matters)
If Otto hasn't messaged in >30 min AND nothing is broken:
1. Check Notion for Kira-assigned tasks (Todo/In Progress)
2. Pick the highest priority one
3. Execute it (or spawn a sub-agent)
4. Update Notion when done
5. Move to next task

Priority: Revenue tasks > Funding prep > Infrastructure

## Silent conditions (reply HEARTBEAT_OK):
- Active work already running (sub-agent executing)
- Just completed a task and kicked next one
- Otto is in active conversation (don't interrupt)
