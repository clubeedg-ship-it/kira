# Quick Capture — Mobile Widget & Share Sheet

> **Status:** ✅ DESIGNED | **Phase:** 6
> **Purpose:** Capture tasks from anywhere on your phone — home screen widget, share sheet, notification action, or Siri/shortcut integration. Thought to task in 2 seconds.

---

## 1. Entry Points

### 1.1 Home Screen Widget
Small widget (2×1): Tap to open capture input. Shows today's task count.
Medium widget (2×2): Shows top 3 tasks + capture input.

### 1.2 Share Sheet
Share any content (URL, text, image) to Kira. Creates a task with the shared content as description/attachment. Brief modal to confirm: title, project (auto-suggested), priority.

### 1.3 Notification Quick Action
On any Kira notification: quick-reply action opens inline text input. Typed response goes to Kira chat (which extracts tasks).

### 1.4 Siri / Shortcuts
"Hey Siri, tell Kira to research email platforms" → creates task via shortcut.

---

## 2. Capture Modal

All entry points lead to the same minimal modal:

```
┌────────────────────────┐
│ + Quick Capture         │
│                        │
│ ┌──────────────────┐   │
│ │ Task title...    │   │  ← Auto-focused input
│ └──────────────────┘   │
│                        │
│ [AI Recept. ▾] [Med ▾] │  ← Project + Priority (smart defaults)
│                        │
│ [Cancel]    [Create ✓]  │
└────────────────────────┘
```

- Auto-focuses text input
- Smart defaults: last-used project, medium priority
- Optional: due date, tags (tap "more" to expand)
- Create saves and dismisses immediately
- Task flows through classification engine automatically

## 3. Voice Capture

Hold the widget mic button → speak → speech-to-text → auto-creates task. No confirmation needed (undo available via notification for 5 seconds).

---

*Quick Capture is the safety net. No idea lost. Widget, share sheet, voice — 2 seconds from thought to task.*