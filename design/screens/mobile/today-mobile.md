# Today Mobile

> **Status:** ✅ DESIGNED | **Phase:** 6
> **Purpose:** Mobile daily agenda view. Scrollable timeline of today's tasks, time blocks, and calendar events. The "what's on my plate" view.

---

## 1. Layout

```
┌────────────────────────┐
│ Today, Feb 18    ← →   │  ← Date + day navigation
│ 4 tasks · 2 events     │  ← Summary
├────────────────────────┤
│                        │
│ 09:00 ─────────────── │
│ 💜 Deep Work           │  ← Time block (area-colored)
│  ☐ Setup DNS config   │  ← Task in block
│  ☐ Draft welcome seq. │
│                        │
│ 11:00 ─────────────── │
│ 📅 Call with Client X  │  ← Calendar event
│                        │
│ 12:00 ─────────────── │
│ 💛 Admin               │
│  ☐ Process inbox items │
│  ☑ Review platform res.│  ← Completed (struck)
│                        │
│ 14:00 ─────────────── │
│ 💚 Personal            │
│  ☐ Meal prep           │
│                        │
│ ─── UNSCHEDULED ────── │
│  ☐ Follow up dentist   │
│  ☐ Update landing copy │
│                        │
├────────────────────────┤
│ 💬  📥  📋  🏠  ⋯    │
└────────────────────────┘
```

---

## 2. Interactions

| Action | Gesture |
|--------|--------|
| Complete task | Tap checkbox |
| View task detail | Tap task title → push to detail |
| Swipe right on task | Quick complete |
| Swipe left on task | Reschedule (bottom sheet: tomorrow, next week, pick date) |
| Pull-to-refresh | Reload today's data |
| Tap ← → | Previous/next day |

## 3. Now Indicator

Horizontal red line at current time position. Auto-scrolls to now on load. Past time blocks slightly dimmed.

## 4. Unscheduled Section

Tasks without scheduled_date that are due today or overdue. Shown at bottom. Tap to schedule (assign to a time block).

## 5. Empty State

```
☀️ Clear day!
No tasks scheduled. Enjoy or capture something new.
[+ Add task]
```

---

*Today Mobile is your pocket daily agenda. Scroll through the day, tap to complete, swipe to reschedule. Simple and fast.*