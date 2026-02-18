# Heartbeat as Separate Process

> **Status:** 🔴 SCAFFOLD | **Phase:** 2

---

## Architecture

```
MAIN AGENT (user conversation)
    │  ← does NOT run heartbeats
    
HEARTBEAT PROCESS (separate, cron-driven)
    ├── Memory maintenance (compaction, graph enrichment, decay)
    ├── Inbox triage (process new messages across channels)
    ├── Agent work check (poll sub-agent completions)
    ├── Schedule check (upcoming events, deadline warnings)
    ├── Review triggers (is it Friday? → queue weekly review)
    ├── Health monitoring (system resources, API status)
    └── Morning/evening brief generation
    
    Uses: Haiku/Sonnet (cheap)
    Context: Minimal (heartbeat state + current day's data)
    Output: Updates to SOP database, input queue, notification queue
    Does NOT: Hold conversation history or user context
```

## TODO
- Cron schedule definition
- State management (what does heartbeat persist between runs?)
- Error handling and retry logic
- Resource limits (max tokens per heartbeat cycle)
- Observability (logging, metrics)
