# Inbox Mobile

> **Status:** ✅ DESIGNED | **Phase:** 6
> **Purpose:** Swipe-based input queue processing on mobile. Tinder-style card interface for rapid verify/decide/approve workflows. Process your input queue in 60 seconds.

---

## 1. Layout

```
┌────────────────────────┐
│ Inbox (7)       Filter │  ← Header with count
├────────────────────────┤
│                        │
│  ┌──────────────────┐  │
│  │ 🔴 VERIFY         │  │
│  │                    │  │
│  │ Research: Best     │  │  ← Card stack
│  │ email platform     │  │
│  │ for Client X       │  │
│  │                    │  │
│  │ 🤖 research-agent  │  │
│  │ Email Campaign     │  │
│  │                    │  │
│  │ [View Output]      │  │
│  └──────────────────┘  │
│                        │
│  ← Dismiss    Approve →│  ← Swipe hints
│                        │
├────────────────────────┤
│  [✗ Dismiss]  [Edit]  [✓ Approve]  │  ← Button bar
├────────────────────────┤
│ 💬  📥  📋  🏠  ⋯    │
└────────────────────────┘
```

---

## 2. Swipe Gestures

| Gesture | Action | Visual |
|---------|--------|--------|
| Swipe right | Approve / Done | Green background reveals |
| Swipe left | Dismiss / Snooze | Red background reveals |
| Swipe up | Skip (next card) | Card slides up |
| Tap card | Expand for detail | Full-screen detail view |

## 3. Card Types

**Verify card:** Shows agent name, task title, project, [View Output] button to see deliverable inline. Swipe right = approve.

**Decide card:** Shows options as tappable buttons. Pick one = resolved.

**Create card:** Shows task details + scheduled time. Swipe right = mark done.

**Message card:** Shows sender, channel icon, preview. Swipe right = archive. Tap = open thread.

## 4. Batch Mode

Toggle "Batch" in header → shows list view (not cards). Swipe individual items or multi-select with checkboxes → bulk approve/dismiss.

## 5. Empty State

```
✨ Inbox clear!
All caught up. Go do great work.
```

---

*Mobile inbox is the speed-run. Swipe through your input queue like reviewing matches. Approve, dismiss, decide — all in seconds.*