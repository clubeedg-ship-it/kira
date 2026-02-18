# Memory Automation Plan

## Current Problem
Memory logging is manual. I forget to log, so context is lost.

## Solution: Memory Daemon with GLM-4.7-Flash

### Architecture
```
[Heartbeat] → [Memory Daemon] → [GLM-4.7-Flash]
                    ↓
            [Analyze Session Log]
                    ↓
            [Extract & Store]
                    ↓
    [Episodes] [Facts] [Procedures] [Blackboard]
```

### Daemon Behavior
Every N minutes (or on heartbeat trigger):
1. Read recent session messages (since last check)
2. Send to GLM-4.7-Flash with extraction prompt
3. Parse structured output
4. Store to appropriate memory layers
5. Update checkpoint

### Extraction Prompt for GLM-4.7-Flash
```
Analyze this conversation segment and extract:

1. EPISODES (significant events)
   - type: task|milestone|decision|learning|failure
   - summary: one-line description
   - outcome: success|failure|pending
   - importance: 1-10
   - tags: relevant keywords

2. FACTS (new knowledge)
   - subject: entity name
   - predicate: relationship
   - object: value or entity
   - confidence: 0-1

3. PROCEDURES (repeated patterns worth documenting)
   - name: action name
   - steps: how to do it
   - triggers: when to use

4. DISCOVERIES (insights, questions, patterns)
   - type: insight|question|pattern
   - content: description
   - priority: low|normal|high

Return as JSON.
```

### Implementation Steps
1. [ ] Create memory-daemon.js
2. [ ] Integrate with vLLM/GLM-4.7-Flash
3. [ ] Add to systemd or heartbeat
4. [ ] Test extraction quality
5. [ ] Add to HEARTBEAT.md

### Resource Usage
- GLM-4.7-Flash: ~19GB VRAM (fits on 4090)
- Run as background vLLM server
- Query via OpenAI-compatible API

### Trigger Options
1. **Heartbeat-based:** Every heartbeat, check if new messages
2. **Message-count:** After every N messages
3. **Time-based:** Every 30 minutes
4. **Hybrid:** Whichever comes first

### Files Affected
- ~/kira/scripts/memory/memory-daemon.js (new)
- ~/kira/HEARTBEAT.md (add daemon trigger)
- ~/.config/systemd/user/memory-daemon.service (optional)
