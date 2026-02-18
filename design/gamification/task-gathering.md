# Task Gathering & Goal Discovery

> Kira doesn't wait for you to manually create tasks. It listens, reads, and infers — then proposes, never assumes.

---

## 1. Conversation Mining

### Detection Patterns

The agent scans every conversation for actionable language:

| Pattern | Example | Confidence |
|---|---|---|
| "I need to..." | *"I need to call the accountant"* | High |
| "We should..." | *"We should update the landing page"* | Medium |
| "Don't forget to..." | *"Don't forget to renew the domain"* | High |
| "TODO" / "todo" | *"todo: fix the login bug"* | High |
| "Remind me to..." | *"Remind me to check the deploy tomorrow"* | High |
| "Let's..." (action) | *"Let's schedule a demo for Friday"* | Medium |
| "I have to..." | *"I have to finish the report by Thursday"* | High |
| Deadline mentions | *"The proposal is due March 15"* | High |
| Conditional plans | *"If the client approves, we'll need to start dev"* | Low (noted, not created) |

### Proposal Flow

```
User: "I need to update the pitch deck before Friday's meeting"

Agent: "📌 New task detected:
        Task: Update pitch deck
        Due: Friday (Feb 13)
        Project: [auto-suggested based on context]
        Priority: High (deadline this week)
        
        ✅ Add  |  ✏️ Edit  |  ❌ Skip"
```

**One-click confirmation** — the task is pre-filled. User just taps "Add" or adjusts.

### Smart Categorization

Agent uses context to auto-categorize:
- **Project**: Inferred from conversation topic, recent project activity, or keywords
- **Priority**: Based on deadline, language urgency ("ASAP" = high), and user's current workload
- **Tags**: Auto-generated from content (e.g., "finance", "client", "dev")
- **Assignee**: Self (default) or agent (if user says "can you..." / "research...")

### Batch Detection

When multiple tasks emerge in one conversation:

```
Agent: "I caught 3 potential tasks from our conversation:
        1. ✅ Update pitch deck (due Friday)
        2. ✅ Email client re: timeline change
        3. ✅ Research competitor pricing
        
        Add all  |  Review each  |  Skip all"
```

---

## 2. Document Scanning

### Trigger

When a document is added to VDR (Virtual Data Room) or shared with the agent:
- PDF, DOCX, markdown, spreadsheets
- Emails forwarded to Kira
- Meeting notes (pasted or transcribed)

### Extraction Pipeline

```
Document → Parse → Extract → Categorize → Present
```

#### What Gets Extracted

| Type | Example | Presentation |
|---|---|---|
| **Action items** | "Team to deliver mockups by March 1" | → Task proposal |
| **Deadlines** | "Filing deadline: April 15, 2026" | → Calendar event + reminder task |
| **Dependencies** | "Pending legal review before launch" | → Blocking relationship |
| **Risks** | "Budget may not cover phase 2" | → Flagged note on project |
| **Decisions** | "Agreed to use React Native for mobile" | → Memory fact |
| **People/contacts** | "Contact: jane@example.com (legal)" | → Contact note |

### Presentation

```
Agent: "I read the ZenithCred partnership agreement. Here's what I found:

        📋 Action Items (3):
        1. Execute NDA by Feb 28
        2. Provide financial statements for due diligence
        3. Schedule kickoff meeting with their CTO
        
        📅 Deadlines:
        - Closing date: March 31, 2026
        
        ⚠️ Risks:
        - Exclusivity clause in Section 4.2 limits other partnerships
        
        Want me to create tasks for the action items?"
```

### User Control

- **Auto-scan**: On by default for documents explicitly shared with Kira
- **Never auto-scan**: User's entire filesystem. Only documents in designated project folders or explicitly shared.
- **Approval required**: Every extracted item needs user confirmation before becoming a task
- **Confidence indicators**: Items the agent is less sure about are marked with "?" 

---

## 3. Email/Calendar Integration (Future)

### Email → Tasks

```
Incoming email: "Hi, can you send the updated financials by EOD Thursday?"

Agent: "📧 Email from Sarah (re: Due Diligence):
        Detected action item: Send updated financials
        Due: Thursday EOD
        
        ✅ Create task  |  📧 Draft reply  |  ❌ Ignore"
```

### Calendar → Context

- Morning briefing includes today's calendar events
- Agent adjusts available work time based on meetings
- Pre-meeting prep: *"You have a call with investors at 2pm. Want me to pull up the latest metrics?"*
- Post-meeting: *"How did the investor call go? Any action items?"*

### Meeting Notes → Tasks

```
User pastes or dictates meeting notes.

Agent: "From your meeting notes, I found:
        1. Follow up with design team on wireframes
        2. Schedule user testing for next week  
        3. Decision: Go with pricing tier B
        
        Create tasks for items 1-2? I'll save item 3 to memory."
```

---

## 4. Goal Decomposition

### The Flow

```
User: "I want to launch ZenithCred by April"

Agent: "Great goal! Let me break that down. A few questions first:
        1. What's the current state? (idea / prototype / MVP / beta)
        2. Is April a hard deadline or a target?
        3. Who else is involved?"

User: "We have a prototype. Hard deadline. Just me and a developer."

Agent: "Here's a proposed breakdown:

        🎯 Goal: Launch ZenithCred by April 2026
        
        Milestone 1: Feature-complete MVP (Feb 28)
        ├── Finish auth system
        ├── Build credit scoring engine  
        ├── Implement payment integration
        └── Create admin dashboard
        
        Milestone 2: Testing & QA (Mar 15)
        ├── Write integration tests
        ├── Run user testing (5 users)
        ├── Fix critical bugs
        └── Performance optimization
        
        Milestone 3: Launch Prep (Mar 28)
        ├── Set up production infrastructure
        ├── Create landing page
        ├── Prepare launch email
        └── Legal review (terms, privacy)
        
        Milestone 4: Launch (Apr 1)
        ├── Deploy to production
        ├── Announce on social media
        └── Monitor first 48 hours
        
        Adjust anything? Then I'll create all tasks and 
        track progress automatically."
```

### Ongoing Tracking

- Goal progress bar: aggregated from milestone/task completion
- Weekly check-in: *"ZenithCred is 45% to launch. Milestone 1 is on track. Anything blocking?"*
- Auto-alerts when milestones are at risk (tasks overdue within a milestone)
- Burndown-style visualization available on dashboard

---

## 5. Recurring Task Detection

### Pattern Recognition

Agent tracks repeated behaviors:

| Observation | Suggestion |
|---|---|
| User checks email every morning at 9am | *"You check email every morning. Want me to make it a recurring task with a 9am reminder?"* |
| Weekly report written every Friday | *"You write a weekly report every Friday. Want me to auto-generate a draft from your completed tasks?"* |
| Monthly invoice sent around the 1st | *"Looks like invoicing happens monthly. Want a recurring task with a template?"* |

### Suggestion Timing

- Only suggest after **3+ occurrences** of a pattern
- Present the pattern with evidence: *"You've done this 4 Fridays in a row"*
- One-click to create recurring task
- Agent can auto-execute recurring tasks if authorized: *"I sent the weekly report draft to your email. Review when ready."*

### Cron Integration

For technical users, recurring tasks can map to actual cron jobs:
- *"Want me to run this backup every night at 2am?"*
- Agent creates the cron, monitors execution, alerts on failure

---

## 6. Priority Inference

### Priority Signals

| Signal | Weight | Example |
|---|---|---|
| Explicit deadline | High | "Due Friday" → urgent if it's Wednesday |
| User-stated priority | High | "This is the most important thing" |
| Goal alignment | Medium | Task contributes to primary goal → boosted |
| Blocking relationships | High | If task blocks 3 others → critical |
| Staleness | Medium | Open 7+ days without progress → needs attention |
| Recency | Low | Recently created tasks get slight boost |
| Pattern | Low | User tends to do X-type tasks first → suggest similar |

### Daily Priority Suggestion

Every morning (or first check-in):

```
Agent: "Your top 3 for today:
        1. 🔴 Fix auth bug (blocks 2 other tasks, due tomorrow)
        2. 🟡 Update pitch deck (meeting Friday, needs review time)
        3. 🟢 Research competitor pricing (no deadline, but feeds into strategy)
        
        Sound right? Or want to swap anything?"
```

### Dynamic Re-Prioritization

When new information arrives:
```
Agent: "Heads up — Sarah just sent an urgent email about compliance docs 
        due tomorrow. I'd bump 'competitor research' to next week and 
        prioritize this instead. Want me to adjust?"
```

**Rules:**
- Agent **suggests** priority changes, never auto-rearranges without permission
- User can say "my priorities are final" to disable re-prioritization for the day
- Emergency override: only for genuinely time-sensitive items (deadline <24h)

---

## Design Philosophy

### Propose, Don't Presume
Every gathered task is a **proposal**. The user always confirms. Kira never silently adds tasks to your list.

### Minimal Friction
One tap to confirm, one tap to dismiss. No forms, no modals, no "are you sure?"

### Context Is King
Every suggestion comes with *why* — the agent explains its reasoning so the user can make informed decisions quickly.

### Learn and Adapt
If user consistently rejects certain types of suggestions (e.g., "stop turning my casual mentions into tasks"), the agent learns and adjusts thresholds.
