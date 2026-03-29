# Push Notification Strategy

> **Status:** ✅ DESIGNED | **Phase:** 6
> **Purpose:** Smart, batched push notifications. Not every event fires a push. Kira respects your attention and groups updates intelligently.

---

## 1. Notification Categories

### Immediate (real-time push)
| Trigger | Content |
|---------|---------|
| Critical input queue item | "🔴 [Agent] needs your approval: [title]" |
| Blocked project | "⛔ [Project] is blocked — your action needed" |
| Calendar reminder | "📅 [Event] in 15 minutes" |
| Direct message (urgent) | "💬 [Sender]: [preview]" |

### Batched (grouped, 2-3x per day)
| Trigger | Content |
|---------|---------|
| Morning brief | "☀️ Good morning. 3 priorities, 2 items to review." |
| Agent completions | "🤖 3 tasks completed while you were away" |
| Inbox digest | "📥 5 new messages across 3 channels" |
| Evening summary | "🌙 Today: 8 completed, 2 carried over. Review?" |

### Silent (badge only, no sound)
| Trigger | Effect |
|---------|--------|
| New document added | Badge count on Documents |
| Non-urgent message | Badge count on Inbox |
| Agent started task | Badge count on Agents |
| Key result updated | No notification (visible in Command Center) |

---

## 2. Batch Schedule

| Time | Batch |
|------|-------|
| 06:00 (configurable) | Morning brief |
| 12:00 | Midday digest (if items accumulated) |
| 20:00 (configurable) | Evening summary |

Batch notifications group multiple items into a single push with an expandable list.

---

## 3. DND (Do Not Disturb)

- **Sleep hours:** No pushes between 22:00–06:00 (configurable)
- **Focus mode:** Only critical items push. Everything else batches.
- **Calendar-aware:** If in a calendar event, batch non-critical.
- **Manual DND:** Toggle in app to silence everything.

---

## 4. Notification Actions

Each push notification includes inline actions:

| Notification Type | Actions |
|-------------------|---------|
| Input queue verify | [Approve] [View] |
| Input queue decide | [Option A] [Option B] [View] |
| Message | [Reply] [View] |
| Morning brief | [View] [Snooze 30m] |
| Task reminder | [Done ✓] [Snooze 1h] |

---

## 5. Notification Preferences

Configurable per: channel (email/WhatsApp/etc.), area, urgency level, agent. Settings at `/settings/notifications`.

---

*Notifications are curated, not spammed. Immediate for critical, batched for everything else, silent for ambient. Kira respects your attention.*