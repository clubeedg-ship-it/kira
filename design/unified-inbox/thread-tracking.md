# Thread Tracking

> **Status:** ✅ DESIGNED | **Phase:** 5
> **Purpose:** Group related messages across channels into conversation threads. Track conversations that span multiple messages and even multiple platforms.

---

## 1. Thread Identification

### Per-Channel Threading

| Channel | Thread ID Source |
|---------|------------------|
| Email | References + In-Reply-To headers |
| WhatsApp | Chat JID (1:1) or Group JID |
| Telegram | Chat ID (1:1) or Group ID |
| Discord | Channel ID + Thread ID (if threaded) |

### Cross-Channel Threading

When the same conversation spans channels (e.g., email then WhatsApp follow-up), link them:
1. Same sender + same entities + within 24 hours → suggest link
2. User confirms or system auto-links if confidence > 0.8
3. Linked threads show as one conversation in inbox with channel badges per message

---

## 2. Thread Schema

```sql
CREATE TABLE threads (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  title TEXT,                            -- auto-generated or email subject
  channel TEXT NOT NULL,                 -- primary channel
  participants TEXT,                     -- JSON array of sender_handles
  area_id TEXT REFERENCES areas(id),
  project_id TEXT REFERENCES projects(id),
  status TEXT DEFAULT 'active',          -- 'active', 'archived', 'snoozed'
  last_message_at TEXT,
  message_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE thread_links (
  id TEXT PRIMARY KEY,
  thread_a TEXT NOT NULL REFERENCES threads(id),
  thread_b TEXT NOT NULL REFERENCES threads(id),
  confidence REAL DEFAULT 0.8,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(thread_a, thread_b)
);
```

---

## 3. Inbox Display

Threads appear as collapsed items in the inbox list. Badge shows unread count. Expand to see all messages in chronological order with channel icon per message.

---

*Thread tracking keeps conversations coherent. One thread, regardless of how many messages or channels it spans.*