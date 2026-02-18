> ⚠️ **DEFERRED TO v2.0** — Mobile native app is out of scope for v1.0. This document is retained for future reference. v1.0 focuses on desktop (macOS + Windows via Tauri). The web dashboard will be responsive but mobile-optimized native features (push notifications, home screen widgets, Siri) are v2.0.

# Mobile UX Design

> Mobile Kira is chat-first. The phone is where you capture, check, and course-correct. Deep work happens on desktop.

---

## Responsive Layout

### Desktop → Mobile Changes

| Desktop | Mobile |
|---|---|
| Sidebar navigation | Bottom tab bar (4 tabs) |
| Side-by-side widgets | Stacked single-column |
| Full dashboard | Condensed dashboard (top priorities only) |
| Persistent chat panel | Full-screen chat (primary view) |
| Hover tooltips | Long-press tooltips |
| Multi-column task view | Single list with swipe actions |

### Bottom Tab Bar

```
┌──────────────────────────────────────┐
│                                      │
│         [Main Content Area]          │
│                                      │
├──────────────────────────────────────┤
│  💬 Chat    📋 Tasks   🎯 Goals   👤  │
│             (badge:3)               │
└──────────────────────────────────────┘
```

- **Chat**: Default/home tab. Full-screen conversation.
- **Tasks**: Today's list + overdue. Badge shows due today count.
- **Goals**: Progress bars, tap to expand milestones.
- **Profile**: XP, streaks, achievements, settings.

### XP Bar (Mobile)

Compact header, collapsible:
```
┌──────────────────────────────────────┐
│ 🔨 Lv 14  ████████░░ 72%  🔥17     │
└──────────────────────────────────────┘
```
- Tap to expand full stats
- Pull down to refresh / show morning briefing
- Auto-hides when scrolling down, reappears on scroll up

---

## Touch Interactions

### Swipe Actions

**Task list:**
- **Swipe right** → Complete task (green, ✅)
- **Swipe left** → Snooze/postpone (orange, 📅 picker appears)
- **Long-press** → Context menu (edit, delete, assign to agent, set priority)

**Chat messages:**
- **Swipe right on agent message** → React (👍 quick react)
- **Long-press agent message** → Copy, create task from this, save to memory

**Navigation:**
- **Swipe from left edge** → Back (standard OS gesture)
- **Pull down on chat** → Refresh / load older messages

### Quick Actions

**Floating Action Button (bottom-right, above tab bar):**
```
     ┌───┐
     │ + │  ← Tap to expand
     └───┘
       ↓
  ┌─────────────┐
  │ 📝 New Task  │
  │ 🎤 Voice     │
  │ 📸 Scan Doc  │
  │ 💡 Quick Note│
  └─────────────┘
```

- **New Task**: Opens minimal task creation (title + optional due date)
- **Voice**: Starts voice recording → transcribed → agent processes
- **Scan Doc**: Camera opens → OCR → agent extracts action items
- **Quick Note**: Text field → saved to memory instantly

### Pull-to-Refresh

- **Chat**: Checks for new messages / agent updates
- **Tasks**: Refreshes statuses, syncs with desktop
- **Goals**: Recalculates progress

---

## Notification Handling

### Push Notifications

```
┌─────────────────────────────────┐
│ 🤖 Kira                   now   │
│ Morning brief ready. Top task:  │
│ Fix auth bug (due today)        │
│ [View] [Mark Done] [Snooze 1h] │
└─────────────────────────────────┘
```

**Actionable notifications:**
- 1-2 inline action buttons (platform-dependent)
- Tap notification → opens relevant screen (task, chat, goal)
- Grouped: Multiple notifications from same context → single expandable group

### Badge Count

- App icon badge = overdue tasks + unread agent messages
- Cleared when user opens relevant tab
- Configurable: "badge for tasks only" / "badge for everything" / "no badge"

### Notification Categories (iOS/Android)

| Category | Default | Examples |
|---|---|---|
| Urgent | On, sound + vibrate | Deadline today, meeting in 15 min |
| Agent Updates | On, silent | Research complete, task auto-completed |
| Achievements | On, silent | Level up, streak milestone |
| Summaries | Off (in-app) | Weekly review, daily recap |

Users configure per-category in system settings.

### Smart Delivery

- Agent learns when user typically checks phone → batches non-urgent notifications for those times
- During detected "focus time" (long typing session, meeting): hold notifications
- Sleep hours (auto-detected or configured): only urgent gets through

---

## Offline Mode

### What Works Offline

| Feature | Offline Capability |
|---|---|
| View tasks | ✅ Full (cached locally) |
| Complete tasks | ✅ Queued, syncs when online |
| Create tasks | ✅ Queued, syncs when online |
| View goals | ✅ Cached progress |
| Read chat history | ✅ Last 100 messages cached |
| Send messages | ⏳ Queued, delivered when online |
| Agent responses | ❌ Requires connection |
| Sub-agent work | ❌ Requires connection |
| Voice input | ⚠️ Device transcription only (less accurate) |
| Achievements | ✅ Cached, new ones sync later |

### Offline UX

```
┌──────────────────────────────────────┐
│ ⚡ Offline — changes will sync       │
├──────────────────────────────────────┤
│                                      │
│  📋 Today's Tasks (cached)           │
│  ☑ Fix auth bug                      │
│  □ Review proposal                   │
│  □ Write blog post                   │
│                                      │
│  💬 Chat unavailable offline         │
│  [Queued messages: 1]               │
│                                      │
└──────────────────────────────────────┘
```

- Subtle banner at top, not a blocking modal
- All offline actions queue with visual indicator (⏳ icon)
- On reconnect: sync animation, then "All caught up!" toast
- Conflict resolution: server wins for agent actions, client wins for user actions, conflicts prompt user

---

## Performance

### Loading Strategy

```
App Open → Skeleton Screen (instant) → Cached Data (< 100ms) → Fresh Data (< 2s)
```

1. **Skeleton screens**: Gray placeholder shapes that match layout. Shown for <500ms max.
2. **Cached-first**: Show last-known data immediately, refresh in background.
3. **Progressive loading**: Chat loads last 20 messages first, then lazy-loads older on scroll up.
4. **Image/attachment lazy loading**: Thumbnails first, full resolution on tap.

### Instant Feedback

- **Task completion**: Checkbox fills immediately (optimistic UI), syncs in background
- **Message send**: Appears in chat instantly with sending indicator
- **Swipe actions**: Haptic feedback + animation on gesture recognition
- **XP gain**: Animation plays immediately, server reconciles later

### Memory & Battery

- Background sync: every 5 minutes when on WiFi, every 15 on cellular
- Agent push: WebSocket when app is open, push notifications when closed
- Image cache: 50MB limit, LRU eviction
- Chat history: Last 500 messages in local DB, older available on-demand

### Target Metrics

| Metric | Target |
|---|---|
| Cold start | < 2 seconds |
| Warm start | < 500ms |
| Task completion feedback | < 100ms |
| Chat message display | < 200ms |
| Screen transitions | < 300ms |
| Offline → online sync | < 5 seconds |

---

## Mobile-Specific Features

### Quick Capture Widget (iOS/Android)

Home screen widget:
```
┌─────────────────────┐
│ 🤖 Kira              │
│ 🔥 17 days  ⚡ Lv 14  │
│ □ Fix auth bug       │
│ □ Review proposal    │
│ [+ Add Task] [🎤]   │
└─────────────────────┘
```

- Shows top 2 tasks
- Quick add without opening app
- Voice capture button

### Share Sheet Integration

Share from any app → Kira processes:
- **URL**: Agent reads and summarizes, offers to create task
- **Text**: Agent detects tasks, stores as note, or adds to memory
- **Image**: OCR for text, agent processes content
- **Document**: Queued for document scanning

### Siri / Google Assistant Integration (Future)

- "Hey Siri, tell Kira I need to call the dentist"
- "OK Google, ask Kira what's my top priority"

---

## Design Principles

1. **Chat is home**: Mobile users land on chat. Everything else is one tap away.
2. **Thumb-friendly**: All primary actions reachable with one thumb. No top-of-screen buttons for important actions.
3. **Respect the platform**: iOS feels like iOS. Android feels like Android. No cross-platform uncanny valley.
4. **Offline is normal**: Not an error state. Gracefully degrade, sync seamlessly.
5. **Speed over features**: A fast app with fewer features beats a slow app with everything. Ship the essential mobile experience, not a desktop port.
