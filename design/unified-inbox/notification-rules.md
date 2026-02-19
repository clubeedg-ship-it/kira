# Notification Rules

> **Status:** ✅ DESIGNED | **Phase:** 5
> **Purpose:** What surfaces immediately vs. what batches for the next review. DND rules, per-channel and per-area configuration.

---

## 1. Notification Tiers

| Tier | Behavior | Triggers |
|------|----------|----------|
| **Immediate** | Push notification + sound + badge | Critical urgency, blocked project, calendar 15min, VIP sender |
| **Soon** | Badge update, visible in next inbox check | Action required, agent needs decision, urgent messages |
| **Batched** | Grouped in morning/evening digest | Normal messages, agent completions, document additions |
| **Silent** | Badge count only, no notification | Low-priority FYI, newsletters, agent status changes |
| **Suppressed** | Not shown at all | Known spam, auto-responders, duplicate messages |

---

## 2. VIP Senders

Users can mark senders as VIP in Settings. VIP messages always get **Immediate** tier regardless of content classification.

---

## 3. DND Schedule

```sql
CREATE TABLE notification_preferences (
  id TEXT PRIMARY KEY,
  dnd_start TEXT DEFAULT '22:00',     -- no notifications after this
  dnd_end TEXT DEFAULT '06:00',       -- notifications resume
  dnd_override_critical INTEGER DEFAULT 1,  -- critical still pushes during DND
  digest_morning TEXT DEFAULT '06:00',
  digest_evening TEXT DEFAULT '20:00',
  focus_mode INTEGER DEFAULT 0,        -- when on, only critical pushes
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE sender_preferences (
  id TEXT PRIMARY KEY,
  sender_handle TEXT NOT NULL,
  is_vip INTEGER DEFAULT 0,
  is_muted INTEGER DEFAULT 0,          -- never notify for this sender
  area_override TEXT,                   -- always assign to this area
  UNIQUE(sender_handle)
);
```

---

## 4. Per-Channel Defaults

| Channel | Default Tier |
|---------|-------------|
| Email | Based on triage (usually Batched) |
| WhatsApp | Soon (personal messages tend to be more urgent) |
| Telegram | Soon |
| Discord | Batched (server messages are usually FYI) |
| System (agents) | Soon for decisions, Silent for status |

Users can override per-channel in Settings.

---

## 5. Calendar-Aware

During active calendar events (from calendar integration), non-critical notifications are held and delivered after the event ends. This prevents interruptions during meetings.

---

*Notifications are earned, not spammed. Immediate for what matters, batched for the rest, silent during focus time.*