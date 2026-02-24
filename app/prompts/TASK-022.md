# TASK 022 — Proactive Notifications & Agent Reach-Out

## Agent Instructions

You are building Kira's **proactive notification system** — making the AI agent reach out to users when something needs attention, instead of waiting for them to check.

**Read these files first (in order):**
1. `AGENTS.md` — project conventions
2. `design/screens/mobile/notifications.md` — notification types and strategy
3. `design/backend/heartbeat-process.md` — heartbeat spec (triggers notifications)
4. `src/server/jobs/heartbeat.ts` — existing heartbeat BullMQ job (built in TASK 015)
5. `src/server/events/sse.ts` — SSE system
6. `src/server/routes/chat.ts` — chat routes (agent sends proactive messages here)

**What you're building:**

### Database

Add to `src/db/schema.ts`:
```
notifications table:
  id: uuid (PK)
  user_id: uuid (FK → users, NOT NULL, indexed)
  type: text ('overdue_task' | 'deadline_approaching' | 'agent_completed' | 'morning_brief' | 'evening_summary' | 'streak_at_risk' | 'objective_at_risk' | 'generic')
  title: text
  body: text
  reference_type: text (nullable — 'task', 'objective', 'agent_work')
  reference_id: uuid (nullable)
  read: boolean (default false)
  dismissed: boolean (default false)
  created_at: timestamptz

user_notification_prefs table:
  id: uuid (PK)
  user_id: uuid (FK → users, UNIQUE, NOT NULL)
  push_enabled: boolean (default false)
  push_subscription: jsonb (nullable — Web Push subscription object)
  quiet_hours_start: text (nullable — "23:00")
  quiet_hours_end: text (nullable — "08:00")
  overdue_task: boolean (default true)
  deadline_approaching: boolean (default true)
  agent_completed: boolean (default true)
  morning_brief: boolean (default true)
  evening_summary: boolean (default true)
  streak_at_risk: boolean (default true)
  batch_interval_minutes: integer (default 15)
  created_at: timestamptz
  updated_at: timestamptz
```

### Heartbeat Integration (`src/server/jobs/heartbeat.ts`)

Extend the existing heartbeat job to detect notification-worthy situations:

```typescript
async function runHeartbeat(userId: string) {
  const now = new Date();
  const prefs = await getNotificationPrefs(userId);
  
  if (isQuietHours(now, prefs)) return;

  // 1. Overdue tasks
  const overdue = await getOverdueTasks(userId);
  if (overdue.length > 0 && prefs.overdue_task) {
    await createNotification(userId, {
      type: 'overdue_task',
      title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
      body: overdue.map(t => t.title).join(', '),
    });
  }

  // 2. Deadline approaching (<24h)
  const approaching = await getApproachingDeadlines(userId, 24);
  // ... similar pattern

  // 3. Streak at risk (no activity today, streak > 0)
  // 4. Objective at risk (>80% time elapsed, <60% complete)
  // 5. Agent completed work (check agent_work_log for new completed entries)
}
```

### Proactive Agent Messages

For significant situations, the heartbeat should also trigger an agent chat message (not just a notification):

- Morning brief (configurable time): agent sends a chat message summarizing today's tasks, any overdue items, upcoming deadlines. Use a simpler model call (Sonnet) for cost efficiency.
- Evening summary: what got done, what slipped, streak status.
- At-risk objective: "Your Q1 goal is at 45% with 2 weeks left. Want to reprioritize?"

Implementation: heartbeat job calls `enqueueChatResponse(userId, systemMessage)` which uses the existing chat-response job but with a system-triggered message instead of user-triggered.

### Backend Routes (`src/server/routes/notifications.ts`)

- `GET /api/v1/notifications?unread=true&limit=20` — list notifications
- `POST /api/v1/notifications/:id/read` — mark read
- `POST /api/v1/notifications/read-all` — mark all read
- `POST /api/v1/notifications/:id/dismiss` — dismiss
- `GET /api/v1/notifications/preferences` — get prefs
- `PUT /api/v1/notifications/preferences` — update prefs

### Web Push (`src/server/push.ts`)

- Use `web-push` npm package
- Generate VAPID keys on first run, store in env
- `POST /api/v1/notifications/subscribe` — stores push subscription
- `sendPushNotification(userId, { title, body, url })` — sends if push_enabled and not quiet hours
- Called from notification creation flow

### Frontend Components

**NotificationBell** (`src/client/components/layout/NotificationBell.tsx`):
- Bell icon in TopBar, badge with unread count
- Click opens Notification Drawer (right side)

**NotificationDrawer** (`src/client/components/NotificationDrawer.tsx`):
- Slide-in panel from right
- List of notifications grouped by today / earlier
- Each notification: icon (by type), title, body, timestamp, click to navigate to reference
- "Mark all read" button
- SSE-powered: `notification.created` event adds new ones in real-time

**NotificationToast**:
- When `notification.created` SSE fires and page is visible: show a toast (top-right, auto-dismiss 5s)
- Click toast → navigate to reference
- Don't show toast if notification drawer is already open

**NotificationPreferences** (in Settings page):
- Toggle per notification type
- Quiet hours time pickers
- Push notification enable/disable (triggers browser permission request)
- Batch interval slider

### SSE Events
- `notification.created` — `{ id, type, title, body, reference_type, reference_id }`
- `notification.batch` — multiple notifications at once (from heartbeat)

## Commit Format
```
build(TASK-022): Proactive notifications with push + agent reach-out
```

## Acceptance Test
```bash
# 1. Overdue notification
# Create a task with past due date → next heartbeat → notification appears in bell

# 2. Morning brief
# Configure brief time → agent sends chat message at that time with daily summary

# 3. Push notification
# Enable push → overdue task → browser push notification appears

# 4. Quiet hours
# Set quiet hours 23:00-08:00 → no notifications during that window

# 5. Notification drawer
# Click bell → drawer opens → click notification → navigates to task

# 6. Real-time
# SSE connected → new notification created → toast appears + bell badge increments

# 7. Preferences
# Disable "overdue_task" → no more overdue notifications
```
