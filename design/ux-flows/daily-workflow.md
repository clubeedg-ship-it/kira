# A Day with Kira

> What a typical productive day looks like for a Kira user. The agent is a rhythm, not an interruption.

---

## 🌅 Morning (First Check-in)

**Trigger:** User's first interaction of the day (opens app, sends message, or agent sends morning brief at configured time).

```
Agent: "Good morning, Otto! Here's your Thursday:

        🎯 Top 3 Priorities:
        1. 🔴 Fix auth bug (blocks staging deploy, due today)
        2. 🟡 Review partnership proposal (meeting tomorrow)
        3. 🟢 Write blog post draft (no deadline, but 3 days stale)
        
        📅 Calendar:
        • 10:00 — Standup (30 min)
        • 14:00 — Investor check-in (45 min)
        
        🔥 Streak: Day 17
        ⚡ 2,340 / 3,162 XP to Level 10
        
        Plan your day or dive in?"
```

**User options:**
- "Looks good" → Agent locks in priorities
- "Swap #2 and #3" → Adjusts
- "Add: call accountant" → Adds to today
- "What about the ZenithCred stuff?" → Agent shows related tasks
- Just start working → Agent takes silence as approval

**Background:** Agent pre-loads context for top priorities (relevant docs, last conversation, blockers).

---

## 💻 Working Session (Mid-Morning)

### Active Assistance

User works on their top priority. Agent is available but not intrusive.

```
User: "Starting on the auth bug. What do we know?"

Agent: "From your notes and git history:
        • Bug: JWT refresh token expires but client doesn't re-auth
        • First reported 5 days ago in staging  
        • You started a fix branch: fix/auth-refresh
        • Last commit was Tuesday, added retry logic
        
        Want me to pull up the code diff or check if there are 
        related issues in the error logs?"
```

### Sub-Agent Spawning

```
User: "Can you research best practices for JWT refresh while I code?"

Agent: "On it. Spawning a research agent now. I'll have a summary 
        in ~10 minutes. Keep coding."
        
[10 minutes later]

Agent: "Research done. TL;DR:
        • Use rotating refresh tokens (new token each refresh)
        • Set refresh token expiry to 7 days, access token to 15 min
        • Store refresh token in httpOnly cookie, not localStorage
        • Implement token family tracking to detect theft
        
        Full report saved. Want me to create subtasks from these?"
```

### Task Completion

```
User: "Auth bug is fixed. Pushing now."

Agent: "✅ 'Fix auth bug' marked complete! +30 XP
        
        This unblocks:
        • Deploy to staging
        • Run integration tests
        
        Want to tackle staging deploy next, or take a break?
        You've been at it for 2.5 hours."
```

---

## 🍽️ Lunch / Break

### Break Reminder

```
Agent: "You've been focused for 3 hours straight — nice work! 
        The staging deploy can wait 30 min. Take a break?
        
        I'll keep working on:
        • Organizing your notes from this morning
        • Prepping context for the 2pm investor call"
```

**If user ignores:** No follow-up. Agent doesn't nag.  
**If user says "good idea":** Agent goes quiet, sets a soft 30-min timer.

### During Break

Agent works autonomously:
- Organizes completed task notes into memory
- Pre-reads documents for upcoming meeting
- Checks for new emails/messages that need attention
- Updates goal progress percentages

---

## 🏢 Afternoon Session

### Pre-Meeting Prep

```
[1:45 PM]
Agent: "Investor check-in in 15 minutes. Quick prep:
        
        📊 Since last call:
        • Auth bug fixed (they asked about this)
        • 3 new features shipped
        • User testing scheduled for next week
        
        📋 Their likely questions:
        • Timeline to launch (you said April — still on track)
        • Burn rate (you mentioned reviewing this)
        
        Want me to pull up the latest metrics dashboard?"
```

### Post-Meeting

```
[2:50 PM]
Agent: "How did the investor call go? Any action items?"

User: "Good. They want a demo by March 15. Also need to send 
       them the updated cap table."

Agent: "Got it. Created:
        1. ✅ Prepare investor demo (due Mar 12, 3 days buffer)
        2. ✅ Send updated cap table (due tomorrow — quick task?)
        
        I also added 'March 15 demo' as a milestone under ZenithCred.
        Progress is now 52% to launch."
```

### Context Switching

```
User: "Switching to the blog post now."

Agent: "Here's where you left off:
        • Title: '5 Things I Learned Building a Fintech'
        • Outline: 5 sections, 2 drafted
        • Last edited: Monday
        
        Want me to draft sections 3-4 based on your outline? 
        You can edit while I write."
```

---

## 🌆 Evening Wind-Down

### Day Summary

```
[6:00 PM — or when user seems to be wrapping up]

Agent: "Solid day, Otto! Here's your wrap-up:

        ✅ Completed (4):
        • Fix auth bug
        • Deploy to staging  
        • Send cap table to investors
        • Draft blog post sections 3-4
        
        🔄 In Progress:
        • Blog post (80% — just needs conclusion + editing)
        
        📊 Stats:
        • +145 XP today
        • 🔥 Streak: Day 17
        • Goal: ZenithCred 55% → 58%
        
        Tomorrow's suggested focus:
        1. Finish blog post (quick win)
        2. Start demo preparation
        3. Review partnership proposal (meeting Friday)
        
        Anything to adjust for tomorrow?"
```

### Evening Mode

- Agent switches to reflective tone
- No proactive suggestions unless urgent
- Available if user wants to brain-dump ideas or plan

```
User: "Oh, I just thought of something — we need to add 
       multi-currency support before launch."

Agent: "Good catch. Added to ZenithCred backlog. 
        Priority: Medium (not blocking launch but important).
        Want me to research payment providers that support 
        multi-currency overnight?"

User: "Yeah, do that."

Agent: "Will do. You'll have a report tomorrow morning. 
        Have a good evening! 🌙"
```

---

## 🌙 Night (Autonomous Mode)

While the user sleeps, Kira works:

### Research Tasks
- Completes the multi-currency research
- Compiles findings into a structured report
- Saves to memory for morning briefing

### Memory Maintenance
- Reviews today's conversations
- Extracts important facts and decisions
- Updates long-term memory
- Prunes outdated information

### Task Housekeeping
- Updates task statuses based on git activity
- Checks for overdue tasks, adjusts dates if needed
- Pre-generates tomorrow's priority list

### Monitoring
- Checks for important emails/messages
- Monitors deployments (if configured)
- Flags anything urgent for morning briefing

**No notifications sent at night** unless user configured emergency alerts.

---

## Weekly Rhythm

| Day | Special |
|---|---|
| **Monday** | Week planning: *"Last week you completed 18 tasks. This week's focus?"* |
| **Wednesday** | Mid-week check: *"Halfway through — on track for 3/4 goals this week"* |
| **Friday** | Wrap-up prompt: *"Anything to finish before the weekend?"* |
| **Sunday** | Weekly summary + next week preview (see user-engagement.md) |

---

## What Makes This Better Than Notion + ChatGPT

1. **Continuity**: Kira remembers yesterday, last week, last month. ChatGPT starts fresh.
2. **Proactive**: Kira comes to you with priorities. Notion waits for you to open it.
3. **Autonomous work**: Kira researches, organizes, and preps while you sleep.
4. **Context-aware**: Kira knows your calendar, your goals, your patterns.
5. **One interface**: Chat replaces dashboard-hopping. Ask and it's done.
6. **Momentum**: XP, streaks, and progress bars make consistency visible and rewarding.
