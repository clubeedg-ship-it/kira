# User Engagement & Gamification System

> Kira's gamification makes productivity feel like progress in an RPG — rewarding without being patronizing, visible without being distracting.
>
> **Updated:** SOP Engine integration (Section 6), Agent XP (Section 7)

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

---

## 6. SOP Engine Integration 🔵 NEW

XP sources now map to the SOP hierarchy. Every layer of the hierarchy generates XP, creating a natural incentive to use the full system.

### SOP-Specific XP Sources

| Action | XP | Layer |
|--------|-----|-------|
| Complete a task (L4) | 10-50 | Task |
| Complete a milestone | 100 | Project |
| Complete a project (L3) | 250 | Project |
| Achieve an objective (L2) | 750 | Objective |
| Hit a key result target | 200 | Objective |
| Process input queue item | 15 | Input Queue |
| Complete daily review | 30 | Review |
| Complete weekly review | 100 | Review |
| Complete quarterly planning | 500 | Review |
| Create a new principle | 50 | Principles |
| Log a decision | 25 | Decisions |
| Decision outcome validated | 40 | Decisions |
| Clear all pending input queue items | 75 | Input Queue |

### SOP Achievements

| Achievement | Description | Rarity | XP |
|---|---|---|---|
| First Principle | Create your first operating principle | Common | 50 |
| Principled Leader | 25 principles with confidence > 0.7 | Epic | 500 |
| Decision Maker | Log 50 decisions | Rare | 200 |
| Quarterly Champion | Score 80%+ on all quarterly objectives | Epic | 1,000 |
| Zero Queue | Process all input queue items in under 10 minutes | Rare | 150 |
| Review Ritual | Complete 4 consecutive weekly reviews | Rare | 250 |
| Cadence Master | Complete daily reviews for 30 straight days | Epic | 500 |
| Area Expert | Complete 10 projects in a single area | Epic | 750 |
| Full Stack CEO | Have active objectives in every area | Rare | 300 |

### Level Milestones Tied to SOP

Level titles gain meaningful context:

| Level | SOP Milestone |
|-------|--------------|
| 5 (Explorer) | "You've completed your first 3 projects" |
| 10 (Builder) | "You've maintained a 30-day review cadence" |
| 20 (Master) | "You've completed 100 tasks and 10 projects" |
| 30 (Architect) | "You've run 4 quarterly planning cycles" |

---

## 7. Agent XP & Leaderboard 🔵 NEW

Agents also earn XP and "level up" based on performance. This is fun, motivating, and provides a quick signal of agent reliability.

### Agent XP Sources

| Action | XP |
|--------|-----|
| Task completed successfully | 20 |
| Task approved by user (verify → approve) | 30 |
| Task rejected (redo/dismiss) | -10 |
| Project completed | 150 |
| Decision option chosen by user | 15 |
| Fast completion (under estimated time) | +10 bonus |

### Agent Levels

Same curve as user XP. Agent level shown in agent monitor and agent cards.

```
Level 1-3:   Rookie Agent 🌱
Level 4-7:   Capable Agent 🧭
Level 8-12:  Reliable Agent 🔨
Level 13-18: Expert Agent ⚡
Level 19+:   Elite Agent 👑
```

### Agent Leaderboard

Shown in Agent Monitor as a fun sidebar widget:

```
🏆 Agent Leaderboard (this week)
1. 🤖 research-agent  — 340 XP  ⚡ Expert
2. 🤖 comms-agent     — 280 XP  🔨 Reliable
3. 🤖 code-agent      — 190 XP  🧭 Capable
```

Metrics: approval rate, avg completion time, tasks completed, cost efficiency.

### Agent Performance in Reviews

Weekly review includes agent performance section: which agents were most productive, which had highest approval rates, which were most cost-efficient. Uses agent XP as a quick summary metric.

---

*Gamification drives engagement. SOP integration makes it meaningful. Agent XP makes it fun. The whole system rewards doing the right things consistently.*