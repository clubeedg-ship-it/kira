# User Engagement & Gamification System

> Kira's gamification makes productivity feel like progress in an RPG — rewarding without being patronizing, visible without being distracting.

---

## 1. XP System

### How Users Earn XP

| Action | XP | Notes |
|---|---|---|
| Complete a task | 10-50 | Scaled by complexity (agent-estimated) |
| Complete a milestone | 100 | Part of goal decomposition |
| Achieve a goal | 500 | Major accomplishment |
| Daily check-in | 15 | First meaningful interaction of the day |
| Use a new feature | 25 | One-time per feature |
| Spawn a sub-agent | 10 | Delegation is a skill |
| Provide feedback to agent | 20 | "That worked" / "Try differently" |
| Store a memory/fact | 5 | Building your knowledge base |
| Complete a guided workflow | 75 | Following agent-led processes |
| Streak bonus (daily) | 5 × streak_day | Compounds — day 30 = +150 bonus |

### XP Curve

Logarithmic RPG-style progression. Early levels are fast (dopamine hook), later levels require sustained effort.

```
XP required for level N = floor(100 × N^1.5)

Level 1:   100 XP    (~ 1 day)
Level 5:   1,118 XP  (~ 1 week)
Level 10:  3,162 XP  (~ 2-3 weeks)
Level 20:  8,944 XP  (~ 2 months)
Level 30:  16,432 XP (~ 4 months)
Level 40:  25,298 XP (~ 7 months)
Level 50:  35,355 XP (~ 1 year of consistent use)
```

### Level Titles

| Levels | Title | Icon | Unlocks |
|---|---|---|---|
| 1-5 | **Newcomer** | 🌱 | Basic features, onboarding guidance |
| 6-10 | **Explorer** | 🧭 | Sub-agent spawning, custom dashboards |
| 11-18 | **Builder** | 🔨 | Workflow templates, advanced integrations |
| 19-28 | **Master** | ⚡ | Priority automation, agent personality tuning |
| 29-38 | **Architect** | 🏛️ | Multi-agent orchestration, API access |
| 39-45 | **Visionary** | 🔮 | Beta features, community influence |
| 46-50 | **Legend** | 👑 | Everything. Custom title creation. |

### Level-Up Celebrations

- **Subtle by default**: Golden glow on the XP bar, a soft chime, and a one-line toast: *"Level 12 — Builder. You've completed 47 tasks this month."*
- **First time in a tier**: Bigger moment. Full-screen animation (skippable after 1s). New title reveal with a brief description of what's unlocked.
- **Agent acknowledgment**: Kira says something contextual: *"Builder tier! You've been shipping consistently. Here's what you can do now..."*
- **No popups during focus mode**. Celebrations queue and show when the user next opens Kira or finishes a session.

---

## 2. Streaks

### Streak Types

#### Daily Engagement Streak
- **Trigger**: At least 1 meaningful interaction per day (not just opening the app)
- **Meaningful** = completing a task, having a conversation >3 messages, reviewing a summary, updating a goal
- **Resets at**: User's configured "day start" time (default: 4 AM local)

#### Task Completion Streak
- **Trigger**: Complete at least 1 task per day
- **Independent from engagement streak** — you can engage without completing, and vice versa
- **Both running simultaneously** creates a "double streak" bonus: +10 XP/day

### Streak Freeze

- **1 free freeze per week** (auto-applied on first miss)
- **Earn extra freezes**: Legendary achievements grant +1 freeze; 100-day milestone grants permanent +1/week
- **Freeze indicator**: Snowflake icon ❄️ on the streak counter when used
- **No guilt**: Agent says *"Streak frozen — everyone needs a day off. See you tomorrow!"* not *"You almost lost your streak!"*

### Streak Milestones

| Days | Badge | Reward |
|---|---|---|
| 7 | 🔥 Week Warrior | +100 XP, fire border on avatar |
| 30 | ⚡ Monthly Machine | +500 XP, animated streak counter |
| 100 | 💎 Century Club | +2,000 XP, extra streak freeze, profile flair |
| 365 | 🏆 Year One | +10,000 XP, unique title, permanent profile badge |

### Anti-Anxiety Design

- Streak count is visible but **not prominent** — it's in the profile, not the main UI
- No push notifications about "your streak is about to end"
- Agent mentions streaks positively (*"14 days straight — nice rhythm!"*) but never guilts
- If a streak breaks, agent says: *"Fresh start. Your consistency over the last N days still counts in your XP."*

---

## 3. Achievements

### Categories

#### 🎯 Productivity
| Achievement | Description | Rarity | XP |
|---|---|---|---|
| First Blood | Complete your first task | Common | 25 |
| Ten Down | Complete 10 tasks | Common | 50 |
| Century | Complete 100 tasks | Rare | 200 |
| Thousand Club | Complete 1,000 tasks | Epic | 1,000 |
| Goal Getter | Achieve your first goal | Common | 100 |
| Milestone Maker | Complete 10 milestones | Rare | 300 |
| Inbox Zero | Clear all tasks in a project | Rare | 150 |
| Speed Demon | Complete 5 tasks in one hour | Rare | 200 |

#### 📚 Learning
| Achievement | Description | Rarity | XP |
|---|---|---|---|
| Memory Master | Store 100 facts in memory | Rare | 250 |
| Knowledge Base | 500 facts stored | Epic | 750 |
| Curious Mind | Ask agent 50 research questions | Common | 100 |
| Deep Diver | Have a conversation >50 messages on one topic | Rare | 200 |
| Feedback Loop | Correct or guide the agent 25 times | Rare | 200 |

#### 🤝 Collaboration (future, multi-user)
| Achievement | Description | Rarity | XP |
|---|---|---|---|
| Team Player | Share a project with someone | Common | 50 |
| Mentor | Help onboard a new user | Rare | 300 |
| Hive Mind | 5 agents working simultaneously on shared project | Epic | 500 |

#### 🔧 System Mastery
| Achievement | Description | Rarity | XP |
|---|---|---|---|
| First Sub-Agent | Spawn your first background agent | Common | 50 |
| Delegator | 10 tasks completed by agents autonomously | Rare | 200 |
| Automator | Create 5 recurring tasks or cron jobs | Rare | 200 |
| Night Owl | Work past midnight 5 times | Common | 75 |
| Early Bird | Check in before 7 AM 10 times | Common | 75 |
| Streak Lord | Maintain a 30-day streak | Epic | 500 |
| Streak Legend | Maintain a 100-day streak | Legendary | 2,000 |
| Workflow Wizard | Complete 10 guided workflows | Rare | 300 |
| Architect's Eye | Customize dashboard layout 5 times | Common | 50 |
| Voice Commander | Use voice input for 50 interactions | Rare | 150 |

### Rarity Distribution

- **Common** (60%): Normal effort, discoverable within first 2 weeks
- **Rare** (25%): Requires sustained use or specific behavior patterns
- **Epic** (12%): Months of engagement or impressive feats
- **Legendary** (3%): Exceptional dedication — bragging rights

### Achievement Showcase

- **Profile section**: Grid of earned achievements, sorted by rarity
- **Pinned achievements**: User picks 3 to display prominently
- **Progress tracking**: Partially-completed achievements show progress bars
- **Secret achievements**: Some achievements are hidden until earned (e.g., "Night Owl" — discovered by behavior)
- **Rarity glow**: Common (gray), Rare (blue), Epic (purple), Legendary (gold animated)

---

## 4. Leaderboard (Future, Multi-User)

### Design Principles

- **Opt-in only**: Never shown by default. User must explicitly enable.
- **Privacy-first**: No real names unless user chooses. Default = anonymous handle.
- **Healthy competition**: Rankings based on consistency, not raw volume (prevents burnout gaming).

### Metrics

- **Consistency Score**: Streak length + daily average tasks (rewards showing up, not grinding)
- **Delegation Score**: Effective use of agents (rewards working smart)
- **Growth Score**: Level progression rate (rewards learning)

### Modes

- **Anonymous**: Random handle, no identifying info. See your rank only.
- **Community**: Chosen display name. See top 20 + your position.
- **Team**: Within an organization. Full names optional.

### Anti-Gaming

- XP from repetitive trivial tasks is capped (max 5 "micro-tasks" per hour count)
- Achievements require genuine engagement (agent validates task complexity)
- No rewards for time spent — only outcomes

---

## 5. Visual Design

### XP Bar

```
┌─────────────────────────────────────────┐
│ 🔨 Builder (Lv 14)  ████████░░░ 72%    │
│                      2,847 / 3,953 XP   │
└─────────────────────────────────────────┘
```

- **Location**: Top of sidebar (desktop) or collapsible header (mobile)
- **Behavior**: Fills smoothly with micro-animation when XP is earned
- **Click to expand**: Shows recent XP history, next level preview, active streaks
- **Color**: Matches current tier (green→blue→purple→gold)

### Level Badge

- Small icon next to username everywhere it appears
- Tier-colored ring around avatar
- Hover/tap shows: level, title, XP to next level

### Toast Notifications

```
╭──────────────────────────────╮
│ ✨ +25 XP — Task completed   │
│ 🔥 Streak: 14 days           │
╰──────────────────────────────╯
```

- **Position**: Bottom-right (desktop), top (mobile)
- **Duration**: 3 seconds, auto-dismiss
- **Stacking**: Max 2 visible. Others queue.
- **Suppressed during**: Focus mode, presentations, video calls
- **Sound**: Optional soft chime (off by default)

### Weekly Summary

Delivered Sunday evening (configurable) via agent message:

```
📊 Your Week in Review
━━━━━━━━━━━━━━━━━━━
✅ 12 tasks completed
🤖 8 sub-agents spawned
🎯 2 milestones hit
⬆️ Leveled up to Builder (Lv 14)!
🔥 Streak: 14 days and counting

💡 Tip: You completed most tasks on Tuesday 
   and Thursday. Consider batching deep work 
   on those days.

Next week's focus: 3 tasks due for ZenithCred
```

### Design Philosophy

> **Rewarding, not annoying.** Every gamification element should make the user think *"Nice, I'm making progress"* — never *"Ugh, another popup."* If in doubt, make it less visible. The best gamification is the kind you notice when you want to, and forget about when you're focused.
