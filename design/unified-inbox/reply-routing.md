# Reply Routing

> **Status:** ✅ DESIGNED | **Phase:** 5
> **Purpose:** Compose and send replies from the unified inbox through any connected channel. Write once, route to the right platform.

---

## 1. Reply Flow

```
USER OPENS THREAD IN INBOX
    │
    ├─ Sees message history (all channels)
    ├─ Clicks [Reply]
    ├─ Compose panel opens (bottom of detail view)
    ├─ Channel selector: auto-selects channel of last message
    ├─ User can switch channel (reply via email instead of WhatsApp)
    ├─ Types reply (plain text + optional formatting)
    ├─ Optional: [Draft with Kira] → AI generates reply draft
    ├─ Clicks [Send]
    └─ Message routed through appropriate bridge
```

---

## 2. Compose Panel

```
┌─ REPLY ───────────────────────────────────┐
│ Via: [📧 Email ▾]  To: jan@dental.nl               │
│                                                    │
│ ┌────────────────────────────────────────┐  │
│ │ Type your reply...                          │  │
│ │                                              │  │
│ └────────────────────────────────────────┘  │
│ [📎 Attach] [🤖 Draft with Kira]     [Send →]  │
└────────────────────────────────────────────┘
```

---

## 3. Channel Selector

| Channel | Format Supported |
|---------|-----------------|
| Email | Rich text (HTML), attachments, subject line |
| WhatsApp | Plain text, single image/document |
| Telegram | Markdown, documents, images |
| Discord | Markdown, attachments |

Channel selector shows which channels are available for this contact. If contact has email and WhatsApp, both options appear.

---

## 4. AI Draft

[Draft with Kira] button:
1. Kira reads the thread context + knowledge graph for this contact
2. Generates a reply draft (Sonnet for quality)
3. User reviews, edits, then sends
4. Draft appears in compose area with "AI-drafted" label

---

## 5. Sent Message Tracking

Sent replies are stored in the messages table with `is_from_user = 1`. Thread updated with new message. Bridges confirm delivery status where supported (email: sent, WhatsApp: delivered/read).

---

*Reply from one place, deliver anywhere. Email, WhatsApp, Telegram — all from Kira's inbox. AI-drafted if you want, human-sent always.*