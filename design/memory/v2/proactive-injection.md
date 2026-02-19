# Proactive Memory Injection

> **Status:** ✅ DESIGNED | **Phase:** 4
> **Purpose:** Event-driven context loading. Before a meeting about Client X, Kira auto-loads all Client X context without being asked. Anticipatory memory that makes Kira feel telepathic.

---

## 1. The Problem

Currently, memory is only retrieved when the user asks about something or when semantic search matches during conversation. But the best assistant prepares context BEFORE you need it.

---

## 2. Injection Triggers

| Event | What Gets Loaded | When |
|-------|-----------------|------|
| Calendar event approaching | All entities related to attendees, company, topic | 15 min before |
| Task started (by user) | Project context, related documents, previous decisions | On task open |
| Task assigned (to agent) | Project context, related research, principles for this area | On assignment |
| Conversation starts about topic | Related entities, recent history on topic | During first message parse |
| Morning brief generation | Today's calendar attendees, active project contexts | 06:00 daily |
| Review ceremony starts | All entities in review scope (area/quarterly) | On review open |

---

## 3. Injection Pipeline

```
TRIGGER EVENT
    │
    ├─ 1. Extract context keys (people, companies, topics, project_ids)
    ├─ 2. Query knowledge graph for related entities (1-hop + high-confidence 2-hop)
    ├─ 3. Retrieve recent conversation excerpts mentioning these entities
    ├─ 4. Retrieve linked documents (summaries only, not full content)
    ├─ 5. Retrieve relevant decisions and principles
    ├─ 6. Compile into structured context block
    └─ 7. Inject into agent's system prompt or conversation context
```

### Context Block Format
```
--- PROACTIVE CONTEXT ---
Meeting: Call with Client X (Jan, Dental Practice)
Relationship: Client since Nov 2025. Primary contact: Jan (✉ jan@dental.nl)
Recent: Discussed email platform switch on Feb 12. Chose Brevo.
Open project: Email Campaign Setup (Milestone 2: Setup phase)
Pending: DNS configuration task waiting on Jan's hosting credentials.
Principle: "Always confirm tech requirements before starting setup" (confidence: 0.8)
Documents: Platform Research (Feb 18), Email Strategy (Feb 15)
--- END CONTEXT ---
```

---

## 4. Budget

Proactive injection adds ~500-1500 tokens to context. Must stay under budget. If too much context, prioritize by: recency > confidence > relevance score.

Model: Haiku for context compilation (cheap, fast). The compiled block is plain text injected into the main agent's context.

---

## 5. Calendar Integration

```sql
CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  attendees TEXT,          -- JSON array of names/emails
  location TEXT,
  source TEXT,             -- 'google', 'outlook', 'manual'
  entity_ids TEXT,         -- JSON: resolved entity IDs from attendees/title
  context_loaded INTEGER DEFAULT 0,  -- whether proactive injection ran
  created_at TEXT DEFAULT (datetime('now'))
);
```

Heartbeat checks calendar every 15 minutes. For events in next 30 min where `context_loaded = 0`: run proactive injection, set flag.

---

*Proactive injection is what makes Kira feel like it reads your mind. Context loads before you ask. The system anticipates, not just responds.*