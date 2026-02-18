# Agent Interaction Patterns

> Five ways to interact with Kira. Chat is primary. Everything else is optional.

---

## 1. Chat (Primary Interface)

### Text Chat

The main way users interact. Natural language, no commands needed.

```
User: "What's on my plate today?"
Agent: [shows priorities]

User: "Research GraphQL vs REST for our API"  
Agent: [spawns sub-agent, returns results]

User: "Remember that the client prefers email over Slack"
Agent: [stores to memory, confirms]
```

**Power features in chat:**
- **Slash commands** (optional shortcut): `/tasks`, `/goals`, `/status`, `/focus`
- **@mentions**: `@research find me...` (routes to research sub-agent)
- **Inline task creation**: Surround with `[]` → `[Call dentist tomorrow]` auto-creates task
- **Voice messages**: Transcribed and processed like text

### Voice Chat

- Push-to-talk or wake word (configurable)
- Agent responds with TTS (natural voice, configurable personality)
- Ideal for: morning briefing while getting ready, hands-free task capture, driving
- Transcription shown in chat for reference

### Chat UX Details

```
┌──────────────────────────────────────────┐
│ Kira 🟢                          ⚙️ 🔔  │
├──────────────────────────────────────────┤
│                                          │
│  Agent: "Morning! Top 3 for today..."    │
│                                          │
│  ┌──────────────────────────────┐        │
│  │ 📋 Today's Priorities         │        │
│  │ 1. □ Fix auth bug      [→]  │        │
│  │ 2. □ Review proposal   [→]  │        │
│  │ 3. □ Write blog post   [→]  │        │
│  │         [✅ Accept Plan]      │        │
│  └──────────────────────────────┘        │
│                                          │
│  You: "Looks good, starting on #1"       │
│                                          │
│  Agent: "Loading context for auth bug... │
│  Here's where you left off..."           │
│                                          │
├──────────────────────────────────────────┤
│ [📎] [🎤] [Type a message...    ] [Send] │
└──────────────────────────────────────────┘
```

**Rich messages:** Agent can send cards, checklists, buttons, and inline actions — not just text.

---

## 2. Dashboard (Visual Interface)

### Layout

```
┌───────┬──────────────────────────────────┐
│       │  Dashboard                  ⚙️   │
│ 📊    ├──────────────────────────────────┤
│ Home  │ ┌─────────┐ ┌─────────────────┐ │
│       │ │ 🎯 Goals │ │ 📋 Today        │ │
│ 📋    │ │          │ │                 │ │
│ Tasks │ │ ZCred 58%│ │ □ Fix auth bug  │ │
│       │ │ Blog  40%│ │ □ Review prop   │ │
│ 🎯    │ │          │ │ ☑ Send cap tbl  │ │
│ Goals │ └─────────┘ └─────────────────┘ │
│       │ ┌─────────┐ ┌─────────────────┐ │
│ 💬    │ │ 📊 Stats │ │ 🤖 Agents       │ │
│ Chat  │ │          │ │                 │ │
│       │ │ Lv 9  ⚡ │ │ Research: ✅    │ │
│ 🏆    │ │ 🔥 17day │ │ Cleanup: 🔄    │ │
│ Profile│ │ 143 XP/d│ │                 │ │
│       │ └─────────┘ └─────────────────┘ │
└───────┴──────────────────────────────────┘
```

### Widgets

- **Goals**: Progress bars, milestone tracking, click to expand
- **Today**: Task list with checkboxes, drag to reorder
- **Stats**: XP, streak, level, weekly trend sparkline
- **Agents**: Active sub-agents and their status
- **Calendar**: Today's events (if connected)
- **Quick Add**: Floating action button → new task/goal/note

### Customization

- Drag to rearrange widgets
- Resize widgets (small/medium/large)
- Hide widgets you don't use
- Custom widgets (future): embed charts, external data

---

## 3. Notifications (Proactive)

### Notification Types

| Type | Channel | Example |
|---|---|---|
| **Urgent** | Push + badge + sound | "Investor demo is in 1 hour. Prep ready?" |
| **Important** | Push + badge | "Auth bug fix unblocked staging deploy" |
| **Informational** | Badge only | "Research complete. Report ready." |
| **Summary** | In-app only | "Weekly summary available" |

### Notification Rules

- **Max 5 push notifications per day** (configurable)
- **Quiet hours**: No push during sleep hours (auto-detected or configured)
- **Batching**: Multiple low-priority notifications → single digest
- **Smart timing**: Notifications arrive at natural break points when possible
- **One-tap actions**: "Mark done" / "Snooze 1h" / "Open" directly from notification

### Notification Content

```
┌─────────────────────────────────┐
│ 🤖 Kira                    now  │
│                                 │
│ Research on multi-currency      │
│ support is done. Found 3 good   │
│ options. Top pick: Stripe.      │
│                                 │
│ [View Report]  [Add to Tasks]   │
└─────────────────────────────────┘
```

---

## 4. Background (Autonomous Work)

### What Agents Do Autonomously

| Activity | Trigger | User Notification |
|---|---|---|
| Research tasks | User requests or agent suggests | Report when complete |
| Memory maintenance | Nightly | None (silent) |
| Document scanning | New doc added to project | Extracted items for review |
| Task housekeeping | Daily | Morning briefing includes changes |
| Monitoring | Continuous | Only on anomalies |
| Recurring tasks | Scheduled | Confirmation when auto-completed |

### Agent Status Visibility

```
┌─────────────────────────────────┐
│ 🤖 Active Agents                │
│                                 │
│ 🔄 Research: Multi-currency     │
│    Started 23 min ago           │
│    [View Progress] [Cancel]     │
│                                 │
│ ✅ Cleanup: Task reorganization  │
│    Completed 2 hours ago        │
│    [View Results]               │
│                                 │
│ 😴 No other agents running      │
└─────────────────────────────────┘
```

### Transparency

- Users can always see what agents are doing
- Every autonomous action is logged
- Agent explains reasoning when asked: *"I reorganized your tasks because 3 had passed their due dates"*
- No irreversible actions without permission (delete, send, publish)

---

## 5. Override (Control & Correction)

### Stop

```
User: "Stop" / "Cancel" / "Nevermind"
Agent: [Immediately stops current action]
       "Stopped. What would you like instead?"
```

- Works mid-sentence, mid-research, mid-workflow
- Background agents: "Stop the research agent" → kills specific agent
- Emergency: "Stop everything" → halts all background agents

### Redirect

```
User: "Actually, focus on the blog post instead"
Agent: "Switching context. Here's where you left off with the blog..."
```

- Agent saves context of interrupted task
- Seamless pickup when returning: *"Want to continue with the auth bug?"*

### Correct

```
User: "That's not right — the deadline is March, not April"
Agent: "My mistake! Updated the deadline to March 15. 
        This changes the timeline — want me to adjust milestones?"
```

```
User: "Stop suggesting breaks, I'm in the zone"
Agent: "Got it — no break reminders today. I'll include them 
        tomorrow unless you say otherwise."
```

### Undo

```
User: "Undo that" / "Put it back"
Agent: [Reverts last action]
       "Reverted. Task is back in 'In Progress.'"
```

- Last 10 actions are undoable
- Agent confirms what was undone
- Complex undos (multi-step): agent explains what will be reversed

### Preference Overrides

```
User: "Be more concise"
Agent: "Noted. Keeping it short from now on."

User: "Don't create tasks from casual conversation"
Agent: "Got it. I'll only create tasks when you explicitly ask."

User: "Reset to defaults"
Agent: "All preferences reset. Back to friendly + proactive mode."
```

Preferences persist across sessions. Stored in user profile, editable from settings.

---

## Interaction Mode Matrix

| Need | Best Mode | Why |
|---|---|---|
| Quick task capture | Chat (text/voice) | Fastest input |
| Review progress | Dashboard | Visual overview |
| Deep work | Chat + background agents | Agent assists without context switch |
| On the go | Mobile chat + notifications | Minimal UI, maximum utility |
| Planning | Dashboard + chat | See the big picture, discuss details |
| Correction | Chat (any mode) | Natural language override |

---

## Design Philosophy

- **Chat-first, dashboard-second**: If you can do it in chat, you should. Dashboard is for visualization, not input.
- **Always interruptible**: No modal that blocks, no workflow that traps. Say "stop" and it stops.
- **Transparent**: Users see what agents do, why they did it, and can reverse it.
- **Progressive disclosure**: New users see simple chat. Power users discover commands, widgets, and automation.
