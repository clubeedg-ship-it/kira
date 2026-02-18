# Normalized Message Schema

> **Status:** 🔴 SCAFFOLD | **Phase:** 5

Standard format for all channel messages.

## Schema
```sql
CREATE TABLE messages (
  id            TEXT PRIMARY KEY,
  channel       TEXT NOT NULL,     -- 'email', 'whatsapp', 'telegram', 'discord', 'signal'
  channel_msg_id TEXT,             -- original ID in source platform
  thread_id     TEXT,              -- for grouping conversations
  sender_name   TEXT,
  sender_id     TEXT,              -- platform-specific sender ID
  recipient     TEXT,              -- who it was sent to (for email)
  subject       TEXT,              -- email subject, or null
  body          TEXT NOT NULL,
  body_html     TEXT,              -- for email
  attachments   TEXT,              -- JSON array of attachment refs
  timestamp     TEXT NOT NULL,
  is_inbound    INTEGER DEFAULT 1, -- 1=received, 0=sent by Kira
  urgency       TEXT DEFAULT 'normal', -- from triage: urgent/normal/low
  area_id       TEXT,              -- from triage: assigned area
  status        TEXT DEFAULT 'unread', -- unread, read, archived
  triage_result TEXT,              -- JSON: full triage output
  created_at    TEXT DEFAULT (datetime('now'))
);
```

## TODO
- Attachment storage strategy
- Thread linking algorithm
- Sender identity resolution (same person across channels)
- Search indexing
