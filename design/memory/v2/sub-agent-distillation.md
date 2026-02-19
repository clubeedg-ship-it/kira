# Sub-Agent Knowledge Distillation

> **Status:** ✅ DESIGNED | **Phase:** 4
> **Purpose:** Automatically extract and persist knowledge from completed agent work into the knowledge graph. When a research agent finishes, its findings become permanent memory — not throwaway context.

---

## 1. The Problem

Sub-agents do valuable research, analysis, and drafting. But their findings live in VDR documents or agent_work_log entries. They don't automatically flow into the knowledge graph. Next time someone asks about the same topic, Kira has to re-research or rely on document search.

---

## 2. Distillation Pipeline

```
AGENT WORK COMPLETES
    │
    ├─ 1. Agent saves output to VDR + agent_work_log
    ├─ 2. Distillation agent (Haiku) reads the output
    ├─ 3. Extract:
    │      ├─ New entities (people, companies, products, concepts)
    │      ├─ New relationships ("Brevo is an email platform", "Client X chose Brevo")
    │      ├─ Key facts (prices, features, comparisons)
    │      ├─ Decisions made (if applicable)
    │      └─ Contradictions with existing knowledge
    ├─ 4. Merge into knowledge graph:
    │      ├─ New entities: create with source = agent_work_log_id
    │      ├─ Existing entities: reinforce confidence
    │      ├─ Contradictions: create superseding record (temporal graph)
    │      └─ Link output document to entities
    └─ 5. Log distillation summary to agent_work_log
```

---

## 3. What Gets Distilled

| Agent Type | Distillation Focus |
|-----------|-------------------|
| Research agent | Entities, comparisons, facts, recommendations |
| Comms agent | Contact details, conversation summaries, sentiment |
| Code agent | Technical decisions, dependencies, configurations |
| Orchestrator | Task decomposition patterns, priority decisions |

---

## 4. Quality Control

- Distilled facts get `confidence_source = 'agent'` (initial confidence: 0.60)
- If the user approves the agent's output (input_queue verify → approve), boost confidence to 0.80
- If the user rejects (redo/dismiss), mark distilled facts as `confidence = 0.2`
- Contradictions with user-stated facts are flagged, never auto-resolved

---

## 5. Cost

Distillation uses Haiku (~$0.002 per agent output). Runs asynchronously after agent completion. Does not block the agent work cycle.

---

*Distillation turns ephemeral agent work into permanent organizational memory. Research once, know forever.*