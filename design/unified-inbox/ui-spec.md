# Unified Inbox — UI Specification

> **Status:** ✅ DESIGNED | **Phase:** 5
> **Purpose:** Dashboard inbox view that merges external messages and internal input queue items. See `design/screens/inbox.md` for the full screen spec — this document covers inbox-specific UI patterns for the unified inbox feature.

---

## 1. Relationship to Inbox Screen

The unified inbox UI is the data layer behind `design/screens/inbox.md`. This spec defines how unified inbox data (messages from bridges + input queue from agents) feeds into that screen.

---

## 2. Merged Feed

The inbox shows two streams in a single chronological feed:

| Stream | Source | Card Type |
|--------|--------|-----------|
| External messages | messages table (from bridges) | Message card: avatar, channel icon, sender, preview, time |
| Input queue | input_queue table (from agents) | Action card: type badge, agent name, title, action buttons |

Default sort: newest first. Filter tabs: [All] [Messages] [Actions] [Urgent].

---

## 3. Tab Filters

| Tab | Shows |
|-----|-------|
| All | Everything merged chronologically |
| Messages | External messages only (email, WhatsApp, etc.) |
| Actions | Input queue items only (verify, decide, create) |
| Urgent | Anything classified as critical or urgent |

Additional filters (dropdown): by channel, by area, by agent, by status.

---

## 4. Badge Counts

Sidebar badge: total unread messages + pending input queue items. Updates in real-time via SSE.

---

## 5. Integration with Triage

New messages arrive via SSE event `message.received`. The inbox prepends the new message card with a slide-in animation. Urgency determines position (critical items float to top regardless of time).

---

*The unified inbox UI is the single pane of glass. Messages and agent actions, merged, filtered, actionable. Your daily command surface.*