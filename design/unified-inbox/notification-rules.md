# Notification Rules

> **Status:** 🔴 SCAFFOLD | **Phase:** 5

What surfaces immediately, what batches, DND rules.

## Priority Routing
- **Immediate:** Urgent messages, blockers, critical input queue items
- **Batched (next review):** Normal messages, verify items, low-priority decisions
- **Silent (daily summary):** Low-priority messages, FYI items

## DND Rules
- Configurable quiet hours (default: 22:00-07:00)
- Override for urgent/critical only
- Per-channel mute
- Per-area mute

## TODO
- Rule definition schema
- User configuration UI (in Settings)
- Notification delivery channels (push, email digest, in-app)
- Escalation rules (if unread for X hours, re-notify)
