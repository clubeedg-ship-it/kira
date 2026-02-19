# Unified Inbox — Message Schema

> **Status:** ✅ DESIGNED | **Phase:** 5
> **Purpose:** Normalized format for messages across all channels. Every email, WhatsApp, Telegram, Discord message maps to this single schema.

---

## 1. Normalized Message

```sql
CREATE TABLE messages (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  channel       TEXT NOT NULL,           -- 'email', 'whatsapp', 'telegram', 'discord', 'system'
  channel_id    TEXT,                     -- platform-specific message ID
  thread_id     TEXT,                     -- groups messages in same conversation
  
  -- SENDER
  sender_name   TEXT NOT NULL,
  sender_handle TEXT,                     -- email address, phone number, username
  sender_avatar TEXT,                     -- URL or local path
  is_from_user  INTEGER DEFAULT 0,        -- 1 if sent by Kira user (outbound)
  
  -- CONTENT
  subject       TEXT,                     -- email subject, or NULL for chat channels
  body_text     TEXT NOT NULL,            -- plain text version
  body_html     TEXT,                     -- rich version (email HTML)
  attachments   TEXT,                     -- JSON array: [{name, type, size, path}]
  
  -- TRIAGE RESULTS (filled by triage engine)
  urgency       TEXT DEFAULT 'normal',    -- 'critical', 'urgent', 'normal', 'low'
  area_id       TEXT REFERENCES areas(id),
  extracted_tasks TEXT,                   -- JSON array of task titles extracted
  extracted_dates TEXT,                   -- JSON array of dates/deadlines found
  extracted_entities TEXT,                -- JSON array of entity names found
  action_required INTEGER DEFAULT 0,      -- 1 if triage detected action needed
  
  -- STATUS
  status        TEXT DEFAULT 'unread',    -- 'unread', 'read', 'archived', 'snoozed'
  snoozed_until TEXT,                     -- for snoozed messages
  
  -- METADATA
  received_at   TEXT NOT NULL,            -- when originally received on platform
  processed_at  TEXT,                     -- when triage engine processed it
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_messages_channel ON messages(channel);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_urgency ON messages(urgency);
CREATE INDEX idx_messages_area ON messages(area_id);
CREATE INDEX idx_messages_received ON messages(received_at);
```

---

## 2. Channel-Specific Mapping

| Field | Email | WhatsApp | Telegram | Discord |
|-------|-------|----------|----------|---------|
| sender_name | From header | Contact name | Username | Username#tag |
| sender_handle | email@addr | +phone | @username | user_id |
| subject | Subject line | NULL | NULL | NULL |
| body_text | Stripped HTML | Message text | Message text | Message text |
| body_html | Full HTML | NULL | NULL | Markdown |
| thread_id | Email thread (References header) | Chat JID | Chat ID | Channel+thread ID |
| attachments | MIME parts | Media messages | Documents/photos | Attachments |

---

## 3. Attachment Schema

```json
[
  {
    "name": "report.pdf",
    "type": "application/pdf",
    "size": 245000,
    "path": "/vdr/inbox-attachments/report.pdf",
    "thumbnail": "/vdr/thumbnails/report-thumb.png"
  }
]
```

Attachments are saved to VDR on receipt and run through the document enrichment pipeline.

---

*One schema for all channels. Every message normalized, triaged, and queryable from a single table.*