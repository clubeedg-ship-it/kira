# Triage Engine — Message Processing Pipeline

> **Status:** ✅ DESIGNED | **Phase:** 2
> **Purpose:** Every inbound message (from any channel) passes through this pipeline before reaching the user or an agent. It normalizes, classifies, extracts actionable items, matches to existing context, and routes appropriately.

---

## 1. Design Intent

The triage engine is the gatekeeper. It ensures no message arrives raw — every message is classified, enriched, and routed before it touches the user's inbox. It must be FAST (< 600ms total) and CHEAP (< $0.001/message).

---

## 2. Pipeline (7 Stages)

```
RAW MESSAGE
    │
    ├─ 1. NORMALIZE      (< 1ms)   Channel-specific → standard format
    ├─ 2. DEDUPLICATE     (< 1ms)   Skip if seen before (by content hash)
    ├─ 3. CLASSIFY        (< 500ms) LLM: urgency, area, type
    ├─ 4. EXTRACT         (same call) Tasks, deadlines, entities, action items
    ├─ 5. MATCH           (< 5ms)   Link to existing project/task/thread
    ├─ 6. ROUTE           (< 1ms)   Inbox, agent, notification, batch
    └─ 7. STORE           (< 5ms)   Message + entities + tasks to DB
```

---

## 3. Stage 1: Normalize

Convert each channel's message format to a standard schema:

```json
{
  "id": "msg_<channel>_<id>",
  "channel": "whatsapp|telegram|email|discord|signal",
  "sender": { "name": "...", "handle": "...", "channel_id": "..." },
  "content": { "text": "...", "attachments": [] },
  "thread_id": "...",
  "timestamp": "2026-02-18T09:00:00Z",
  "raw": {}
}
```

Each bridge adapter implements `normalize(raw_message) → StandardMessage`.

---

## 4. Stage 2: Deduplicate

Hash `channel + sender.channel_id + content.text + timestamp(rounded to minute)`. Check against `message_hashes` table. If exists → skip (some bridges deliver duplicates). If new → continue.

---

## 5. Stage 3+4: Classify & Extract (Single LLM Call)

One Haiku call handles both classification and extraction. This is the only LLM call in the pipeline.

**System prompt (condensed):**
```
You are a message triage assistant. Classify and extract from this message.
Return JSON only.
```

**Output schema:**
```json
{
  "urgency": "critical|high|normal|low",
  "area_id": "<matched area or null>",
  "project_id": "<matched project or null>",
  "message_type": "actionable|informational|social|spam",
  "extracted_tasks": [
    { "title": "...", "due_date": "...", "executor_hint": "agent|human" }
  ],
  "deadlines": [{ "description": "...", "date": "..." }],
  "entities": [{ "name": "...", "type": "person|company|project|concept" }],
  "action_items": ["..."],
  "summary": "One-sentence summary",
  "sentiment": "positive|neutral|negative|urgent"
}
```

**Cost:** ~$0.001/message with Haiku (avg 200 input tokens, 150 output tokens).

**Batching:** If multiple messages arrive within 5 seconds, batch up to 5 into a single LLM call.

---

## 6. Stage 5: Match

Link the message to existing context using extracted entities and area/project IDs:

1. If `area_id` returned → verify against `areas` table (fuzzy match on name)
2. If `project_id` returned → verify against `projects` table
3. Check `thread_id` → group with existing conversation thread
4. Match extracted entities against knowledge graph entities
5. If sender is a known contact → link to their entity

---

## 7. Stage 6: Route

Rules engine (no LLM, pure conditionals):

| Condition | Route |
|-----------|-------|
| urgency = critical | Immediate push notification + top of inbox |
| message_type = spam | Archive (skip inbox) |
| has extracted_tasks | Create draft tasks in SOP engine (status='todo', source='message') |
| message_type = actionable AND matched area has agent | Route to area's agent |
| message_type = informational | Batch for next review (low priority inbox) |
| message_type = social | Low priority inbox |
| urgency = normal, no tasks | Standard inbox |

**Notification rules (from settings):**
- DND hours → queue everything except critical
- Per-channel overrides (e.g., "always notify for WhatsApp")
- Per-sender overrides (e.g., "always notify for boss@company.com")

---

## 8. Stage 7: Store

Write to multiple tables:

| Destination | What |
|-------------|------|
| `messages` | Full normalized message + classification |
| `entity_mentions` | Extracted entities → knowledge graph links |
| `tasks` (draft) | Extracted tasks (pending user confirmation) |
| `input_queue` | If routed to agent or needs classification |
| `event_log` | `message.received` event for SSE |

---

## 9. Learning Loop

The triage engine improves over time:

| Signal | Learning |
|--------|----------|
| User moves message to different area | Correct area classification for sender/topic |
| User marks as spam/not spam | Update sender reputation |
| User ignores extracted task | Reduce extraction confidence for that pattern |
| User promotes extracted task | Reinforce pattern |
| User changes urgency | Adjust urgency model for sender/topic |

Store corrections in `triage_corrections` table. After N corrections, retrain routing rules (no LLM retraining — just update heuristic weights).

---

## 10. Sender Profiles

Build profiles over time per sender:

```json
{
  "sender_id": "...",
  "name": "Jan (Dentist)",
  "channels": ["whatsapp"],
  "area_id": "sales",
  "avg_urgency": "normal",
  "response_expected": true,
  "typical_topics": ["appointments", "pricing"],
  "last_contact": "2026-02-15"
}
```

Used by classifier to improve accuracy without LLM context.

---

## 11. Fallback & Error Handling

| Error | Fallback |
|-------|----------|
| LLM call fails | Store message as unclassified (urgency=normal, type=unknown). Retry on next heartbeat tick. |
| Bridge disconnected | Queue messages locally. Process backlog on reconnect. |
| Database write fails | Write to local file. Alert. Process on recovery. |
| Classification confidence low | Store with `needs_review` flag. Show in inbox with "Help classify" prompt. |

---

## 12. Performance Targets

| Metric | Target |
|--------|--------|
| Total pipeline latency | < 600ms |
| LLM call latency (P95) | < 500ms |
| Cost per message | < $0.002 |
| Throughput | 100 messages/minute |
| Classification accuracy | > 85% (urgency), > 80% (area) |
| False positive rate (spam) | < 2% |

---

*The triage engine is the first line of defense. Every message gets normalized, classified, and routed before it reaches you. Over time it learns your patterns. The goal: you never see a raw, unprocessed message.*