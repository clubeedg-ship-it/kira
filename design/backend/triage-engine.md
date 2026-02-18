# Triage Engine — Message Processing Pipeline

> **Status:** 🔴 SCAFFOLD | **Phase:** 2

---

## Pipeline

```
RAW MESSAGE
    ├─ 1. Normalize (channel-specific → standard format)
    ├─ 2. Classify (urgent/normal/low, personal/business, area assignment)
    ├─ 3. Extract (tasks, deadlines, action items, entities)
    ├─ 4. Match (relate to existing project/task/conversation?)
    ├─ 5. Route (→ inbox, → agent, → notification, → batch)
    └─ 6. Store (message stored, entities to graph, tasks to SOP)
```

**Model:** Haiku-tier. Must be FAST and CHEAP. Runs on every message.
**Latency target:** < 500ms per message.

## TODO
- Detailed classification taxonomy
- Entity extraction prompts
- Matching algorithm (fuzzy project/task linking)
- Routing decision tree
- Example classifications for each channel
