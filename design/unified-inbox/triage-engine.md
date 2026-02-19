# Unified Inbox — Triage Engine

> **Status:** ✅ DESIGNED | **Phase:** 5
> **Purpose:** Classification pipeline that runs on every inbound message. Extracts tasks, deadlines, entities. Classifies urgency and routes to the right area. Must be fast and cheap.

---

## 1. Pipeline

```
RAW MESSAGE (from bridge)
    │
    ├─ 1. NORMALIZE (bridge already did this)
    ├─ 2. CLASSIFY urgency + area
    ├─ 3. EXTRACT tasks, deadlines, action items, entities
    ├─ 4. MATCH to existing project/task/conversation
    ├─ 5. ROUTE to inbox, agent, notification, or batch
    └─ 6. STORE results to messages table + emit events
```

---

## 2. Classification (Step 2)

### Urgency

| Level | Criteria | Example |
|-------|----------|--------|
| Critical | Explicit urgency words + deadline today | "URGENT: server is down" |
| Urgent | Time-sensitive or from VIP sender | "Can you confirm by EOD?" |
| Normal | Standard communication | "Here are the designs" |
| Low | FYI, newsletters, automated | "Your weekly digest" |

### Area Assignment
Match message content against area keywords, sender associations (known contacts linked to areas), and project context. If no match: assign to general inbox.

---

## 3. Extraction (Step 3)

| Extract | Method | Example |
|---------|--------|--------|
| Tasks | Pattern matching + LLM | "Can you send me the report" → Task: Send report |
| Deadlines | Date parsing (chrono.js + LLM) | "by Friday" → 2026-02-20 |
| Action items | LLM classification | "Please review and approve" → action_required = true |
| Entities | NER + knowledge graph matching | "Jan from the dental practice" → entity_id |

---

## 4. Matching (Step 4)

Check if message relates to existing work:
- **Thread match:** same thread_id = same conversation
- **Entity match:** mentions entities linked to active projects
- **Sender match:** sender is known contact linked to a project
- **Keyword match:** subject/body matches active task titles

If matched: link message to project/task. Update task if relevant (e.g., "it's done" → mark task complete).

---

## 5. Routing (Step 5)

| Condition | Route |
|-----------|-------|
| Critical urgency | Immediate push notification + top of inbox |
| Action required | Inbox with action badge |
| Matches agent-assigned task | Route to agent (auto-context) |
| Normal, no action | Inbox (standard) |
| Low / newsletter | Batch for daily digest |
| Auto-responder / spam | Archive automatically |

---

## 6. Performance Targets

| Metric | Target |
|--------|--------|
| Latency (normalize + classify) | < 500ms |
| Latency (full pipeline) | < 2s |
| Model | Haiku (cheapest, fastest) |
| Cost per message | ~$0.0005 |
| Accuracy (urgency) | > 85% |
| Accuracy (area assignment) | > 80% |

---

## 7. Learning

When user manually re-classifies a message (changes urgency, moves to different area), the system logs the correction. Monthly: review corrections to tune classification prompts.

---

*The triage engine is the gatekeeper. Every message classified, extracted, matched, and routed in under 2 seconds. Haiku-powered, penny-per-message.*