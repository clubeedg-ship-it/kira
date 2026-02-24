# TASK 020 — Gamification: XP, Levels, Streaks

## Agent Instructions

You are building the **gamification layer** — XP, levels, streaks, and visual feedback that makes Kira a tool people want to come back to daily.

**Read these files first (in order):**
1. `AGENTS.md` — project conventions
2. `design/gamification/user-engagement.md` — full XP/levels/streaks spec
3. `src/server/events/sse.ts` — SSE system for real-time events
4. `src/server/routes/tasks.ts` — task completion (XP trigger)
5. `src/db/schema.ts` — schema
6. `src/client/components/layout/Sidebar.tsx` — where XP bar goes

**What you're building:**

### Database

Add to `src/db/schema.ts`:
```
user_xp table:
  id: uuid (PK)
  user_id: uuid (FK → users, UNIQUE, NOT NULL)
  total_xp: integer (default 0)
  level: integer (default 1)
  current_streak: integer (default 0)
  longest_streak: integer (default 0)
  last_active_date: date (nullable)
  streak_freezes_available: integer (default 1)
  streak_freezes_used_this_week: integer (default 0)
  created_at: timestamptz
  updated_at: timestamptz

xp_events table:
  id: uuid (PK)
  user_id: uuid (FK → users, NOT NULL, indexed)
  amount: integer (NOT NULL)
  reason: text (NOT NULL — 'task_complete', 'milestone_complete', 'goal_achieved', 'daily_checkin', 'streak_bonus', 'feature_used', 'agent_spawned', 'feedback_given')
  reference_id: uuid (nullable — links to the task/milestone/etc that triggered it)
  created_at: timestamptz
```

### Backend Engine (`src/server/engine/xp.ts`)

Core functions:
- `awardXP(userId, amount, reason, referenceId?)` — inserts xp_event, updates user_xp.total_xp, recalculates level, emits SSE events
- `calculateLevel(totalXp)` — `floor(100 × N^1.5)` curve. Returns `{ level, xpForCurrentLevel, xpForNextLevel, progress }`
- `checkStreak(userId)` — called on any meaningful activity. If `last_active_date !== today`, increment streak and award streak bonus (`5 × current_streak` XP). If `last_active_date` is >1 day ago, check freeze availability.
- `resetStreakFreeze()` — BullMQ job, runs weekly (Monday 00:00), resets `streak_freezes_used_this_week` to 0, sets `streak_freezes_available` back to 1.

### XP Award Points

| Action | XP | Implementation |
|--------|-----|----------------|
| Task complete | 10 + (5 × complexity) | Hook into task status → `done` transition in state-machine.ts. Complexity from `effort_estimate`: xs=0, s=1, m=2, l=3, xl=4 |
| Milestone complete | 100 | Hook into cascade.ts when milestone is auto-completed |
| Goal/Objective achieved | 500 | Hook into cascade.ts |
| Daily check-in | 15 | First `POST /api/v1/chat/send` or task action of the day |
| Streak bonus | 5 × streak_day | Awarded with daily check-in |
| Feature first-use | 25 | Track in `user_xp` via a `features_used jsonb` field |
| Agent spawned | 10 | Hook into agent run |

### Level Titles

```typescript
const LEVEL_TITLES = [
  { min: 1, max: 5, title: 'Newcomer', icon: '🌱' },
  { min: 6, max: 10, title: 'Explorer', icon: '🧭' },
  { min: 11, max: 18, title: 'Builder', icon: '🔨' },
  { min: 19, max: 28, title: 'Master', icon: '⚡' },
  { min: 29, max: 38, title: 'Architect', icon: '🏛️' },
  { min: 39, max: 45, title: 'Visionary', icon: '🔮' },
  { min: 46, max: 50, title: 'Legend', icon: '👑' },
];
```

### SSE Events
- `xp.gained` — `{ amount, reason, newTotal, level, progress }`
- `xp.level_up` — `{ newLevel, title, icon }`
- `xp.streak_updated` — `{ currentStreak, longestStreak, isFrozen }`
- `xp.streak_broken` — `{ previousStreak, longestStreak }`

### Backend Routes (`src/server/routes/xp.ts`)
- `GET /api/v1/xp` — returns user's XP state: `{ total_xp, level, title, icon, progress, xpToNextLevel, currentStreak, longestStreak, streakFreezes }`
- `GET /api/v1/xp/history?limit=20` — recent XP events with reasons
- `GET /api/v1/xp/leaderboard` — (defer for now, placeholder 404)

### Frontend Components

**XP Bar in Sidebar** (`src/client/components/layout/XPBar.tsx`):
- Compact: shows level icon, level number, progress bar (thin, colored), streak 🔥 count
- Position: bottom of sidebar, always visible
- Animates on XP gain: bar fills, number increments
- Click to expand: shows full stats (total XP, next level requirement, streak details)

**Level-Up Toast** (`src/client/components/LevelUpToast.tsx`):
- Triggered by `xp.level_up` SSE event
- Subtle: golden glow border toast, level icon, "Level X — [Title]" text
- First time in a new tier (e.g., Newcomer → Explorer): slightly bigger celebration (full-width banner, 2s auto-dismiss)
- Never interrupts typing or active work

**XP Gain Indicator**:
- Small "+10 XP" floating text near the completed task, fades out after 1.5s
- CSS animation only, no heavy library

### Integration Hooks

In `src/server/engine/state-machine.ts` — after successful task status transition to `done`:
```typescript
await awardXP(userId, calculateTaskXP(task), 'task_complete', task.id);
await checkStreak(userId);
```

Similar hooks in cascade.ts for milestone/objective completion.

## Commit Format
```
build(TASK-020): XP system with levels, streaks, and real-time feedback
```

## Acceptance Test
```bash
# 1. Task completion XP
# Complete a task → "+10 XP" appears → XP bar updates → DB has xp_event

# 2. Level up
# Seed user with 95 XP → complete task (+10) → crosses 100 → "Level 2 — Newcomer" toast

# 3. Streak
# First action today → streak increments → "🔥2" in sidebar
# Skip a day → streak freezes if available, or resets

# 4. SSE events
# Listen to /api/v1/events/stream → complete a task → receive xp.gained event

# 5. History
# GET /api/v1/xp/history → shows recent XP events with reasons

# 6. Multi-tenancy
# User A's XP never affects User B
```
