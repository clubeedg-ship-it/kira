# Channel Bridges

> **Status:** 🔴 SCAFFOLD | **Phase:** 5

Per-channel bridge requirements and auth flows.

## Channels

### Email
- Protocol: IMAP polling or Gmail API webhook
- Auth: OAuth2 (Gmail) or IMAP credentials (generic)
- Features: read, send, attachments, thread tracking

### WhatsApp
- Protocol: Baileys / WhatsApp Web
- Auth: QR code pairing
- Features: read, send, media, group messages

### Telegram
- Protocol: Telegram Bot API (existing bridge)
- Auth: Bot token
- Features: read, send, media, inline keyboards

### Discord
- Protocol: Discord.js bot
- Auth: Bot token + OAuth2 for user context
- Features: read, send, embeds, reactions

### Signal
- Protocol: signal-cli or libsignal
- Auth: Phone number registration
- Features: read, send, media

## TODO
- Detailed auth flow for each channel
- Message format mapping to normalized schema
- Rate limits and quotas
- Error handling and reconnection
- Health monitoring per bridge
