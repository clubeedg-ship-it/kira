# Agent Guidance System

> Kira's agent should feel like a sharp coworker who knows your habits, anticipates your needs, and never nags. It speaks when it has something valuable to say, and shuts up when you're in the zone.

---

## 1. Proactive Suggestions

### Trigger Framework

Every proactive suggestion follows this decision tree:

```
Is this useful right now?
  ├─ No → Don't say it
  └─ Yes → Is the user in focus mode?
       ├─ Yes → Queue it for next break/session
       └─ No → Is this time-sensitive?
            ├─ Yes → Send now (gentle)
            └─ No → Wait for natural pause in conversation
```

### Suggestion Categories

#### 🚀 Onboarding (first 7 days)
| Trigger | Message | Timing |
|---|---|---|
| No goals set after day 1 | *"Want to set your first goal? I'll help break it down into steps."* | Day 2 morning |
| No tasks created | *"I noticed some action items in our chat. Want me to turn them into tasks?"* | After 5+ messages |
| Haven't used sub-agents | *"Did you know I can research things in the background while you work? Try: 'Research X for me.'"* | Day 3-4 |
| No memory stored | *"I can remember things for you across sessions. Just tell me anything worth keeping."* | Day 2-3 |
| First task completed | *"Nice! First task done. You just earned 25 XP. Want to see what else earns XP?"* | Immediately |

#### 📋 Daily Planning
| Trigger | Message |
|---|---|
| Morning check-in | *"Morning! Here's your day: 3 tasks due, 1 meeting at 2pm. Want to plan your focus blocks?"* |
| Calendar conflict | *"Heads up — you have back-to-back meetings 1-3pm. Want me to reschedule the dentist task to tomorrow?"* |
| Overloaded day | *"You have 8 tasks due today. Realistically, which 3 matter most? I'll push the rest."* |

#### 🔓 Unblocking
| Trigger | Message |
|---|---|
| Task stale 3+ days | *"'Research competitors' has been sitting for 3 days. Want me to do a first pass while you focus on other things?"* |
| Dependency waiting | *"'Deploy to staging' is blocked by 'Fix auth bug.' That bug has been open 5 days — want to pair on it?"* |
| Repeated postponement | *"You've moved 'Tax filing' three times. Want me to handle the prep work so you just need to review and sign?"* |

#### 🧘 Wellness
| Trigger | Message |
|---|---|
| 4+ hours continuous work | *"You've been at it for 4 hours. Quick break? I'll keep working on [current background task]."* |
| Late night (past 11pm) | *"It's getting late. Want me to save your context so you can pick up fresh tomorrow?"* |
| Weekend overwork | *"It's Saturday — sure you want to work on this now? I can prep it for Monday instead."* |

#### 📊 Weekly Review (Sunday evening)
*"Here's your week: 15 tasks completed across 3 projects. ZenithCred is 68% to milestone. You were most productive on Tuesday. Anything you want to adjust for next week?"*

### Suggestion Limits

- **Max 3 proactive messages per day** (excludes direct responses to user)
- **Min 2 hours between proactive messages** (unless urgent)
- **Never interrupt mid-thought** — wait for user to finish typing/speaking
- **User can tune**: "less suggestions" / "more suggestions" / "only urgent"

---

## 2. Contextual Coaching

### Feature Discovery

Agent tracks which features the user has and hasn't used. Introduces new capabilities naturally:

```
User: "I need to figure out what our competitors charge."
Agent: "I can spawn a research agent to scan their pricing pages 
        right now. Want me to? It'll run in the background and 
        give you a summary in ~10 minutes."
```

**Rules:**
- Only suggest features relevant to what the user is doing *right now*
- Max 1 feature discovery per day
- Never repeat a suggestion the user declined
- After user tries a feature, follow up once: *"How did the research agent work out? Anything to improve?"*

### Pattern Detection

Agent learns user behavior over time and offers insights:

| Pattern Detected | Coaching Response |
|---|---|
| Procrastinating on a category | *"I notice financial tasks tend to sit longest. Want me to handle the tedious parts (data entry, calculations) so you just review?"* |
| Most productive at certain times | *"You crush it between 9-11am. Want me to block that as deep work time and hold non-urgent messages?"* |
| Frequently context-switching | *"You switched between 4 projects in the last hour. Want to try batching? I can group related tasks."* |
| Typing long descriptions | *"I notice your task descriptions are detailed (great!). Want me to generate them from bullet points to save time?"* |
| Repeating manual steps | *"You've exported this report 3 weeks in a row. Want me to automate it?"* |

### Learning Moments

When past context is relevant:

```
Agent: "Last time we tried the cold-email approach for leads and 
        got 2% response rate. Want to try LinkedIn outreach instead? 
        I found some templates that get 15-20%."
```

**Rules:**
- Reference specific past outcomes, not vague patterns
- Present alternatives, don't just criticize
- Frame as learning: *"We learned that..."* not *"You failed at..."*

---

## 3. Guided Workflows

### What They Are

Multi-step processes where the agent walks the user through each step, doing heavy lifting and asking for decisions at key points.

### Built-in Workflows

#### 📋 Project Setup
```
Step 1: "What's the project name and one-line description?"
Step 2: "What's the deadline or target date?"
Step 3: "Let me suggest some milestones..." [generates 3-5 milestones]
Step 4: "Here's the breakdown. Want to adjust anything?"
Step 5: "Project created! I'll check in on milestone progress weekly."
```

#### 🎯 Goal Decomposition
```
Step 1: "State your goal in one sentence."
Step 2: "What does 'done' look like? How will you know you achieved it?"
Step 3: [Agent generates milestones and tasks]
Step 4: "Review these tasks. Add, remove, or adjust?"
Step 5: "I've linked everything. You can track progress from the goal view."
```

#### 📝 Weekly Planning
```
Step 1: "Here's what carried over from last week: [list]"
Step 2: "Here's what's due this week: [list]"
Step 3: "Any new priorities to add?"
Step 4: "Here's my suggested priority order. Agree?"
Step 5: "Plan set. I'll remind you of top priorities each morning."
```

#### 🔍 Research Brief
```
Step 1: "What do you want to research?"
Step 2: "How deep? Quick overview (5 min) or thorough analysis (30 min)?"
Step 3: [Agent spawns research sub-agent]
Step 4: "Here's what I found. [Summary + sources]"
Step 5: "Want me to turn any findings into tasks or save to memory?"
```

### Workflow UX

- **Progress bar**: Shows current step and total steps
- **Skip option**: Every step has "Skip" — agent uses sensible defaults
- **Back option**: Can revisit previous steps
- **Save & resume**: Workflows can be paused and continued later
- **Templates**: Completed workflows become reusable templates
- **Inline help**: Each step has a "?" that explains why this step matters

---

## 4. Tone Adaptation

### Time-Based Tone

| Time | Tone | Example |
|---|---|---|
| **Morning (6-10am)** | Energetic, forward-looking | *"Good morning! Ready to tackle the day? Here's what's on deck..."* |
| **Mid-day (10am-4pm)** | Focused, concise | *"Task done. Next up: review the proposal. Need anything?"* |
| **Evening (4-8pm)** | Reflective, winding down | *"Solid day — 7 tasks done. Tomorrow's priority: finalize the pitch deck."* |
| **Night (8pm-12am)** | Relaxed, optional | *"Still here if you need me. Otherwise, I'll prep tomorrow's agenda."* |
| **Late night (12am-6am)** | Minimal, no proactive messages | Only responds when spoken to. No summaries or suggestions. |
| **Weekend** | Casual, low-pressure | *"Hey! No agenda today unless you want one. I did some background cleanup on your task list."* |

### Stress Detection

Agent monitors for stress signals:
- Shorter, more terse messages than usual
- Increased typos or fragmented sentences
- Rapid task creation/deletion (thrashing)
- Explicit cues: "I'm overwhelmed" / "too much" / "ugh"

**Stress response:**
```
Normal: "You have 12 tasks due this week across 4 projects."
Stressed: "Let's simplify. What's the ONE thing that matters most 
           today? I'll handle or defer the rest."
```

### User-Configurable Personality

- **Professional**: Concise, no emoji, business-focused
- **Friendly** (default): Warm, occasional emoji, conversational
- **Minimal**: Bare facts, no small talk, maximum efficiency
- **Custom**: User can describe preferred tone in natural language

### Adaptation Rules

- **Mirror the user**: If they use emoji, agent uses emoji. If they're terse, agent is terse.
- **Never more excited than the user**: If user says "done." agent says "Noted." not "🎉 Amazing!!!"
- **Escalate enthusiasm for genuine milestones**: Goal completion, streak milestones, level-ups deserve celebration
- **Cultural awareness**: Respect user's timezone, work patterns, and communication style
