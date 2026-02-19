# Chat Mobile

> **Status:** ✅ DESIGNED | **Phase:** 6
> **Purpose:** Full-screen mobile chat with Kira. The primary mobile interaction — optimized for thumb-reach, voice input, and quick task capture from conversation.

---

## 1. Layout

```
┌────────────────────────┐
│ ← Kira        🤖 ⋮    │  ← Top bar (44px)
├────────────────────────┤
│                        │
│ ┌──────────────────┐   │
│ │ Good morning! Here│  │  ← Kira's messages (left-aligned)
│ │ are your top 3    │  │
│ │ priorities today: │  │
│ │ 1. Review email...│  │
│ └──────────────────┘   │
│                        │
│   ┌──────────────────┐ │
│   │ Thanks, let me   │ │  ← User's messages (right-aligned)
│   │ start with #1    │ │
│   └──────────────────┘ │
│                        │
│ 🤖 typing...           │
│                        │
├────────────────────────┤
│ ┌──────────────────┐   │
│ │ Message Kira...  🎤│  │  ← Input bar (56px)
│ └──────────────────┘   │
│ [📎] [📷] [⌨️]  [Send]│  ← Action buttons
├────────────────────────┤
│ 💬  📥  📋  🏠  ⋯    │  ← Bottom tabs
└────────────────────────┘
```

---

## 2. Message Bubbles

| Type | Style |
|------|-------|
| Kira | Left-aligned, `--bg-secondary` bg, full-width max |
| User | Right-aligned, `--primary-500` bg, white text |
| System | Centered, no bubble, `--text-tertiary`, italic |
| Task created | Inline card with checkbox, title, project tag |
| Agent update | Compact card: agent icon + status + task name |

## 3. Input Bar

Fixed at bottom (above tab bar). Text input with: attachment button (📎), camera (📷), voice input (🎤), send button. Voice input: hold to record, release to send. Supports multi-line expansion (up to 4 lines before scroll).

## 4. Quick Actions

Long-press a message for: copy, reply, create task from message, pin, share.

Inline task cards in chat: tap checkbox to mark done, tap card to open task detail.

## 5. Agent Status

Top bar shows agent indicator (🤖). Tap to see: which agents are active, what they're working on. Compact bottom sheet.

---

*Chat is the primary mobile surface. Talk to Kira, capture tasks, review updates — all from a familiar messaging interface.*