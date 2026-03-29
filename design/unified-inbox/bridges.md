# Channel Bridges

> **Status:** ✅ DESIGNED | **Phase:** 5
> **Purpose:** Per-channel bridge requirements, authentication flows, and polling/webhook strategies for connecting external messaging platforms to Kira's unified inbox.

---

## 1. Email Bridge

### Provider Support
- **Gmail:** OAuth 2.0 → Gmail API (push notifications via Pub/Sub)
- **Outlook:** OAuth 2.0 → Microsoft Graph API (webhooks)
- **Generic IMAP:** Username/password or app-specific password → IMAP polling

### Strategy
Prefer webhooks/push for Gmail and Outlook (real-time). Fall back to IMAP polling (every 60 seconds) for other providers.

### Auth Flow
1. User clicks "Connect Email" in Settings
2. OAuth redirect to provider
3. User grants read + send permissions
4. Kira stores refresh token (encrypted)
5. Background process subscribes to push notifications or starts polling

### Data Extracted
From, To, CC, Subject, Body (text + HTML), Attachments, Date, Thread-ID, Message-ID.

---

## 2. WhatsApp Bridge

### Approach
**WhatsApp Business API** (official) for business accounts, or **Baileys** (open-source WhatsApp Web library) for personal.

### Auth Flow (Baileys)
1. User clicks "Connect WhatsApp" in Settings
2. QR code displayed in Kira
3. User scans with WhatsApp on phone
4. Session persisted (multi-device support)
5. Reconnects automatically on restart

### Limitations
WhatsApp Web sessions can expire. Kira monitors connection health and alerts user to re-scan if disconnected.

---

## 3. Telegram Bridge

### Approach
**Telegram Bot API** — create a Kira bot, user messages the bot.

### Auth Flow
1. User gets Kira bot link from Settings
2. User messages `/start` to the bot
3. Bot stores chat_id for future communication
4. Webhook registered for incoming messages

### Bidirectional
Kira can send messages back through the bot (replies, notifications, morning brief).

---

## 4. Discord Bridge

### Approach
**Discord Bot** via Discord.js. Listens in specified channels or DMs.

### Auth Flow
1. User adds Kira bot to their Discord server
2. Specifies which channels to monitor in Settings
3. Bot receives messages via Gateway websocket

---

## 5. Bridge Architecture

```
Bridge Process (per channel)
    │
    ├─ Receives raw message from platform
    ├─ Normalizes to message schema
    ├─ Saves attachments to VDR
    ├─ Writes to messages table
    ├─ Emits SSE: message.received
    └─ Triggers triage engine
```

Each bridge runs as a separate process/worker. Crash isolation: one bridge failing doesn't affect others. Health checks in heartbeat process.

---

## 6. Reply Capability

All bridges support **bidirectional messaging**:

| Channel | Reply Method |
|---------|-------------|
| Email | Gmail/Outlook API send, or SMTP |
| WhatsApp | Baileys sendMessage |
| Telegram | Bot API sendMessage |
| Discord | Bot sendMessage to channel |

Replies are composed in the unified inbox UI, routed through the appropriate bridge.

---

*Each bridge is a thin adapter: platform-specific on one side, normalized schema on the other. Add a new channel by writing one bridge.*