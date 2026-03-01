# WhatsApp Bridge — Full System Plan

## Overview
Users authenticate their WhatsApp via QR code on the Stella Tax login page. Their full chat history is backed up immediately. Stella Vics (OpenClaw agent) can then communicate with them on WhatsApp and AI agents can search/analyze their chat data.

## User Flow

```
1. User opens stella-tax login page (port 3870)
2. Scrolls down → sees "Authenticate your WhatsApp for secure communication"
3. Clicks "Connect WhatsApp" → QR code appears (live, refreshes every 20s)
4. User scans QR with their phone → WhatsApp links
5. Status changes: "✅ Connected — backing up your messages..."
6. Full backup runs immediately (all chats, messages, contacts, media)
7. Progress bar: "Backed up 1,247 of ~3,500 messages..."
8. Once done: "✅ WhatsApp connected. Stella will message you there."
9. Stella Vics sends welcome message to their number
10. User's phone number stored → linked to their stella-tax account
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  STELLA TAX UI                   │
│              (ui/index.html + app.js)            │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  "Authenticate WhatsApp" section         │    │
│  │  [QR Code Display]  ←── WebSocket ──┐    │    │
│  │  [Progress Bar]                      │    │    │
│  │  [Status Text]                       │    │    │
│  └──────────────────────────────────────┘    │    │
└──────────────────────┬──────────────────────────┘
                       │ WebSocket (ws://localhost:3871)
                       ▼
┌──────────────────────────────────────────────────┐
│            WHATSAPP BRIDGE SERVICE                │
│          (whatsapp-bridge/index.js)               │
│              Port: 3871                           │
│                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │ QR Manager  │  │ Backup Engine│  │ Message  │ │
│  │ (generate,  │  │ (full export │  │ Router   │ │
│  │  relay to   │  │  on connect) │  │ (send/   │ │
│  │  frontend)  │  │              │  │  receive)│ │
│  └─────────────┘  └──────┬───────┘  └────┬────┘ │
│                          │                │      │
│  whatsapp-web.js ────────┴────────────────┘      │
│  (Puppeteer + WhatsApp Web session)              │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│              DATA LAYER                           │
│                                                   │
│  PostgreSQL (or SQLite for MVP)                   │
│  ┌────────────────────────────────────────────┐  │
│  │ wa_sessions     │ session_id, phone, status │  │
│  │ wa_contacts     │ jid, name, phone, avatar  │  │
│  │ wa_chats        │ chat_id, name, is_group   │  │
│  │ wa_messages     │ msg_id, chat_id, from,    │  │
│  │                 │ body, timestamp, media_url │  │
│  │ wa_media        │ msg_id, type, path, size  │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  File Storage: /data/whatsapp/{phone}/media/      │
│  Vector Index: nomic-embed on message bodies      │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│           AI AGENT LAYER                          │
│                                                   │
│  • Stella Vics (OpenClaw) → sends/receives via    │
│    bridge API                                     │
│  • Search Agent → semantic search across chats    │
│  • Tax Extractor → finds invoices, receipts,      │
│    payment confirmations, financial discussions    │
│  • Chat Renderer → displays results in familiar   │
│    WhatsApp-style UI in the tax app               │
└──────────────────────────────────────────────────┘
```

## Components to Build

### 1. WhatsApp Bridge Service (`whatsapp-bridge/`)
**Tech:** Node.js + whatsapp-web.js + ws (WebSocket)

```
whatsapp-bridge/
├── index.js              # Main service, WebSocket server on :3871
├── session-manager.js    # Create/restore/destroy WA sessions
├── backup-engine.js      # Full chat export on new connection
├── message-router.js     # Send/receive messages, webhook to OpenClaw
├── db.js                 # SQLite/PostgreSQL connection
├── media-handler.js      # Download & store media files
└── package.json
```

**Key behaviors:**
- On QR scan success → immediately start full backup
- Backup order: contacts → chat list → messages (newest first) → media
- Stream progress to frontend via WebSocket
- Keep session alive (persist auth to `/data/whatsapp/sessions/`)
- On disconnect → attempt reconnect; after 3 failures → notify user
- Rate limit: max 1 session per user account

### 2. Frontend Addition (`ui/`)
- New section on login page below fold
- "🔒 Authenticate your WhatsApp for secure communication"
- Subtitle: "Scan the QR code to connect. We'll back up your messages securely so Stella can assist you better."
- QR code display (canvas, updates via WebSocket)
- Progress bar during backup
- Status indicators: Generating QR → Waiting for scan → Connected → Backing up → Ready
- Privacy notice: "Your messages are encrypted and stored securely. Only Stella's AI accesses them for tax assistance."

### 3. Database Schema (SQLite MVP)

```sql
CREATE TABLE wa_sessions (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,           -- stella-tax user
    phone TEXT NOT NULL,             -- +55 11 99999-9999
    session_data TEXT,               -- serialized auth
    status TEXT DEFAULT 'pending',   -- pending|connected|backing_up|ready|disconnected
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME
);

CREATE TABLE wa_contacts (
    id INTEGER PRIMARY KEY,
    session_id INTEGER REFERENCES wa_sessions(id),
    jid TEXT NOT NULL,               -- WhatsApp JID
    name TEXT,
    push_name TEXT,
    phone TEXT,
    is_business INTEGER DEFAULT 0
);

CREATE TABLE wa_chats (
    id INTEGER PRIMARY KEY,
    session_id INTEGER REFERENCES wa_sessions(id),
    jid TEXT NOT NULL,
    name TEXT,
    is_group INTEGER DEFAULT 0,
    unread_count INTEGER DEFAULT 0,
    last_message_at DATETIME,
    message_count INTEGER DEFAULT 0
);

CREATE TABLE wa_messages (
    id INTEGER PRIMARY KEY,
    session_id INTEGER REFERENCES wa_sessions(id),
    chat_jid TEXT NOT NULL,
    msg_id TEXT UNIQUE,
    from_jid TEXT,
    from_name TEXT,
    body TEXT,
    type TEXT,                       -- text|image|video|audio|document|sticker
    media_path TEXT,
    timestamp DATETIME,
    is_forwarded INTEGER DEFAULT 0,
    quoted_msg_id TEXT
);

CREATE TABLE wa_media (
    id INTEGER PRIMARY KEY,
    msg_id TEXT REFERENCES wa_messages(msg_id),
    mime_type TEXT,
    filename TEXT,
    file_path TEXT,
    file_size INTEGER
);

CREATE INDEX idx_messages_chat ON wa_messages(chat_jid, timestamp);
CREATE INDEX idx_messages_body ON wa_messages(body);
CREATE INDEX idx_messages_session ON wa_messages(session_id);
```

### 4. OpenClaw Integration
- Bridge exposes REST API:
  - `POST /api/send` → send message to a number
  - `GET /api/chats/:sessionId` → list chats
  - `GET /api/messages/:sessionId/:chatJid` → get messages
  - `GET /api/search/:sessionId?q=` → search messages
- OpenClaw WhatsApp channel config points to bridge
- Stella Vics sends welcome message on successful connection
- Incoming messages from user → forwarded to Stella's session

### 5. Backup Engine Logic

```
On QR scan success:
1. Get client info (phone number, profile pic, about)
2. Store session + create wa_sessions record
3. Fetch all contacts → wa_contacts (batch insert)
4. Fetch all chats → wa_chats (batch insert)
5. For each chat (sorted by last_message desc):
   a. Fetch ALL messages (paginated, 100 at a time)
   b. Batch insert to wa_messages
   c. Queue media downloads (async, don't block)
   d. Update progress → WebSocket
6. Start media download worker (parallel, 3 at a time)
7. When text backup complete → status = 'ready'
8. Media continues downloading in background
9. Send completion webhook to OpenClaw
```

**Estimated backup times:**
- 1,000 messages: ~30 seconds
- 10,000 messages: ~3-5 minutes
- 50,000 messages: ~15-20 minutes
- Media adds significant time depending on volume

### 6. Chat Renderer (Phase 2)
- WhatsApp-style chat UI in the tax app
- Shows original conversations with AI highlights
- "Stella found 3 potential tax documents in this chat"
- Click to expand → see the original message context
- Filter by: date, chat, media type, AI-tagged category

## Security & Privacy

- All data encrypted at rest (SQLite encryption or file-level)
- Sessions isolated per user (can't access other users' data)
- Media stored in per-phone directories
- Session auto-expires after 30 days of inactivity
- User can disconnect + delete all data from UI
- Clear consent text before QR scan
- WhatsApp ToS note: technically against WhatsApp's ToS to use unofficial clients. Risk = account ban. User must accept this risk

## Build Order

### Phase 1: Core Bridge (Day 1-2)
- [ ] whatsapp-bridge service scaffolding
- [ ] QR generation + WebSocket relay to frontend
- [ ] Session persistence (survive restarts)
- [ ] Frontend: QR display section on login page

### Phase 2: Full Backup (Day 2-3)
- [ ] SQLite database + schema
- [ ] Backup engine (contacts → chats → messages)
- [ ] Media download worker
- [ ] Progress streaming to frontend

### Phase 3: OpenClaw Integration (Day 3-4)
- [ ] REST API for send/receive
- [ ] Webhook to OpenClaw on incoming messages
- [ ] Stella welcome message on connection
- [ ] Phone number → user account linking

### Phase 4: AI Search (Day 4-5)
- [ ] Embedding pipeline (nomic-embed on messages)
- [ ] Semantic search endpoint
- [ ] Tax document extractor agent
- [ ] Chat renderer UI

### Phase 5: Polish (Day 5-6)
- [ ] Error handling, reconnection logic
- [ ] Multi-session support (multiple users)
- [ ] Data deletion / disconnect flow
- [ ] Security audit

## Dependencies

```json
{
  "whatsapp-web.js": "^1.26.0",
  "qrcode": "^1.5.4",
  "ws": "^8.18.0",
  "better-sqlite3": "^11.0.0",
  "puppeteer": "^23.0.0"
}
```

## File Storage

```
/home/adminuser/kira/projects/neil-alden-tax-ai/
├── data/
│   └── whatsapp/
│       ├── sessions/          # Auth session files
│       │   └── {phone}/
│       ├── backups/           # SQLite DB
│       │   └── whatsapp.db
│       └── media/             # Downloaded media
│           └── {phone}/
│               ├── images/
│               ├── videos/
│               ├── audio/
│               └── documents/
├── whatsapp-bridge/           # New service
│   ├── index.js
│   ├── session-manager.js
│   ├── backup-engine.js
│   ├── message-router.js
│   ├── media-handler.js
│   ├── db.js
│   └── package.json
└── ui/
    ├── index.html             # Modified: add WhatsApp section
    ├── app.js                 # Modified: add WhatsApp WS client
    └── style.css              # Modified: add WhatsApp section styles
```
