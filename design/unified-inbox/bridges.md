# Channel Bridges

> **Status:** 🔴 SCAFFOLD | **Phase:** 5

Per-channel bridge requirements and auth flows.

## Channels
- **Email** — Gmail API / IMAP polling, Outlook API
- **WhatsApp** — Baileys / WhatsApp Web bridge
- **Telegram** — Existing bridge (extend)
- **Discord** — Discord.js bot
- **Signal** — Signal CLI / libsignal

## TODO per channel
- Auth flow (OAuth, API key, QR code scan)
- Message polling vs webhook
- Rate limits and quotas
- Attachment handling
- Reply capability
- Connection health monitoring
