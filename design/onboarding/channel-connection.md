# Channel Connection — Messaging Platform Setup

> **Goal:** Connect messaging platforms so the agent is available wherever the user already communicates.

---

## Supported Channels

| Channel | Status | Method | Setup Time |
|---------|--------|--------|------------|
| Web Dashboard | Built-in | Automatic | 0s |
| Telegram | Supported | BotFather token | ~2 min |
| Discord | Supported | Bot application | ~2 min |
| WhatsApp | Supported | QR code (Baileys) | ~1 min |
| Signal | Supported | signal-cli linking | ~2 min |

---

## Telegram

### Prerequisites
- Telegram account
- Telegram app installed (mobile or desktop)

### Setup Flow

**In Kira's wizard:**

1. **Intro card:** "Let's connect Telegram. You'll create a bot through Telegram's BotFather — it takes about 2 minutes."

2. **Step-by-step guide (inline, not a separate page):**

   ```
   ① Open Telegram and search for @BotFather
   ② Send /newbot
   ③ Choose a name for your bot (e.g., "My Kira")
   ④ Choose a username (must end in "bot", e.g., "mykira_bot")
   ⑤ BotFather gives you a token — copy it
   ```
   
   Each step has: text instruction + visual hint (screenshot or illustration)
   
   Link: `[Open BotFather in Telegram →]` (deep link: `https://t.me/BotFather`)

3. **Token input:**
   - Field: "Paste your bot token here"
   - Format validation: `digits:alphanumeric` pattern
   - On paste → validate via Telegram `getMe` API
   - Success: shows bot name and username
   - Failure: "That token didn't work. Make sure you copied the full token from BotFather."

4. **Test message:**
   - "Now open a chat with your bot in Telegram: [Open @username →]"
   - "Send any message to it."
   - Kira listens for incoming message → confirms: "✅ Connected! I received your message."
   - If no message after 30s: "Haven't received anything yet. Make sure you: (1) opened the bot chat, (2) sent a message, (3) the bot username is correct. [Retry]"

5. **Optional config:**
   - Set bot profile photo (uses agent avatar)
   - Set bot description
   - Enable/disable inline mode

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Token invalid" | Regenerate via `/token` in BotFather |
| Bot doesn't respond | Check bot isn't blocked; restart connection |
| Messages delayed | Telegram webhook may need reset; Kira auto-retries |
| Multiple bots | Each Kira user needs their own bot |

---

## Discord

### Prerequisites
- Discord account
- A server where you have "Manage Server" permission (or create a new one)

### Setup Flow

1. **Intro:** "Let's connect Discord. You'll create a bot application and invite it to your server."

2. **Option A: Automatic (recommended)**
   - `[Create Bot Automatically]` → OAuth flow
   - Kira creates the Discord application via OAuth
   - User selects which server to add it to
   - Permissions auto-configured

3. **Option B: Manual**
   ```
   ① Go to discord.com/developers/applications
   ② Click "New Application", name it
   ③ Go to "Bot" tab → "Add Bot"
   ④ Copy the bot token
   ⑤ Go to "OAuth2" → "URL Generator"
   ⑥ Select scopes: bot, applications.commands
   ⑦ Select permissions: Send Messages, Read Messages, Embed Links, Attach Files, Add Reactions
   ⑧ Copy the invite URL and open it
   ⑨ Select your server → Authorize
   ```

4. **Token input & validation** (same pattern as Telegram)

5. **Test:** Bot sends a message in the default channel: "👋 Hey! I'm [Agent Name], and I'm connected to this server."

6. **Channel config:**
   - Which channels should the bot listen in? (dropdown multi-select)
   - DM mode: respond to DMs? (default: yes)
   - Prefix: require `!kira` prefix or respond to all messages? (DM = all, server = prefix by default)

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing permissions" | Re-invite with correct permissions link |
| Bot offline | Check token validity, restart connection |
| No response in channel | Verify bot has read access to that channel |

---

## WhatsApp

### Prerequisites
- WhatsApp installed on phone
- Phone number registered with WhatsApp

### Setup Flow

1. **Intro:** "Connect WhatsApp with a QR code scan — just like WhatsApp Web."

2. **QR Code display:**
   - Kira generates a WhatsApp Web QR code (via Baileys/whatsapp-web.js)
   - Large QR code displayed in wizard
   - Instructions: "Open WhatsApp → Settings → Linked Devices → Link a Device → Scan this code"
   - QR refreshes automatically every 20s
   - Loading states: "Waiting for scan..." → "Connecting..." → "✅ Connected!"

3. **Test:** Agent sends a message to the user's WhatsApp: "Hey! I'm connected on WhatsApp now. 👋"

4. **Important notice:**
   - ⚠️ "WhatsApp allows only one linked business session. If you link another service, Kira will disconnect."
   - "Keep your phone connected to the internet for reliable message delivery."

### Limitations
- WhatsApp's unofficial API may break with updates
- No group chat support initially (DM only)
- Media support: text, images, voice messages
- Rate limits: WhatsApp may throttle automated messages

### Troubleshooting

| Issue | Solution |
|-------|----------|
| QR code won't scan | Refresh QR, ensure phone camera works, try brighter screen |
| Disconnects frequently | Keep phone on WiFi, check WhatsApp is updated |
| "Session expired" | Re-scan QR code |

---

## Signal

### Prerequisites
- Signal installed on phone
- Phone number registered with Signal

### Setup Flow

1. **Intro:** "Connect Signal for maximum privacy. Your messages are end-to-end encrypted."

2. **Linking process:**
   - Kira runs `signal-cli` and generates a device link URI
   - Displayed as QR code
   - Instructions: "Open Signal → Settings → Linked Devices → Link New Device → Scan"
   - Verification: Signal sends a verification code, auto-handled

3. **Test:** Agent sends a test message via Signal.

4. **Privacy note:** "Signal messages are end-to-end encrypted. Kira processes them in memory but never stores raw message content outside your encrypted workspace."

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Linking fails | Ensure Signal is updated, phone has internet |
| Messages not arriving | Check linked device is still active in Signal settings |
| "Unregistered" error | Re-link device |

---

## Multi-Channel Routing

When multiple channels are connected, users can control what goes where.

### Default Behavior
- All messages go to all connected channels (broadcast)
- User responds on whichever channel they prefer
- Agent remembers which channel the user last responded on and prefers it for next proactive message

### Custom Routing Rules

**Settings > Channels > Routing**

Simple rule builder:

```
┌─────────────────────────────────────────────────┐
│ Routing Rules                                    │
│                                                  │
│ When: [Task reminders ▼]  Send to: [Telegram ▼] │
│ When: [Daily summary  ▼]  Send to: [Email    ▼] │
│ When: [Urgent alerts  ▼]  Send to: [All      ▼] │
│                                                  │
│ [+ Add Rule]                                     │
│                                                  │
│ Default: [Telegram ▼] (for everything else)      │
└─────────────────────────────────────────────────┘
```

### Message Categories (for routing)
- Task reminders
- Daily/weekly summaries
- Calendar alerts
- Urgent alerts
- Casual conversation
- File sharing
- Voice messages

### Priority Channel
- One channel is marked "primary" — gets everything by default
- If primary is disconnected, falls back to next available
- User sets primary during setup or in settings

---

## Channel Disconnection & Fallback

### Detection
- Heartbeat check every 5 minutes per channel
- If 3 consecutive heartbeats fail → mark channel as disconnected

### Notification
- Dashboard shows disconnected badge ⚠️
- Agent sends notification on remaining connected channels: "Heads up — I lost connection to [Channel]. I'll keep trying to reconnect. For now, I'm available here and on [other channels]."

### Auto-Reconnect
- Retry every 5 min for first hour
- Retry every 30 min after that
- After 24h: stop retrying, notify user to re-authenticate

### Fallback Chain
```
Primary channel → Secondary channel → Web dashboard (always available)
```

### Graceful Degradation
- If all external channels fail: web dashboard remains functional
- Pending messages queue and deliver when channel reconnects
- Queue limit: 100 messages, 24h max age, then summarize and discard

---

## Channel-Specific Formatting

The agent adapts message formatting per platform:

| Feature | Telegram | Discord | WhatsApp | Signal | Web |
|---------|----------|---------|----------|--------|-----|
| Markdown | Full | Full | Limited | Limited | Full |
| Tables | ✅ | ❌ (use lists) | ❌ | ❌ | ✅ |
| Code blocks | ✅ | ✅ | ❌ (monospace) | ❌ | ✅ |
| Inline buttons | ✅ | ✅ (components) | ❌ | ❌ | ✅ |
| File sharing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Voice messages | ✅ | ✅ | ✅ | ✅ | ✅ |
| Max message length | 4096 | 2000 | ~65000 | ~65000 | Unlimited |

Agent automatically reformats messages for each platform (e.g., converts tables to bullet lists for Discord/WhatsApp).

---

## Security Considerations

- **Token storage:** All channel tokens encrypted at rest (see `auth/api-keys.md`)
- **Session isolation:** Each user's channel connections are completely isolated
- **Token exposure:** Tokens never appear in logs, error messages, or API responses
- **Revocation:** User can disconnect any channel instantly; token is deleted, not just deactivated
- **No cross-channel data:** Messages from one channel are not forwarded to another unless routing rules explicitly say so
