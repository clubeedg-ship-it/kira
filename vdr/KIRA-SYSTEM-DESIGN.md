# Kira System Design — End-to-End Architecture

> **Author:** Kira  
> **Date:** 2026-02-24  
> **Purpose:** Define how every piece connects into a single working system. No orphan features.  
> **Status:** Draft for Otto's review

---

## The Problem

Right now Kira is a collection of disconnected capabilities:
- A Telegram bot that responds when spoken to
- A Notion integration with databases no one reads
- Cron jobs that mostly return HEARTBEAT_OK
- Memory files that are manually maintained
- Sub-agents that execute tasks but don't feed back into anything
- A context monitor that compacts conversations but loses strategic thread

**Result:** Otto manages Kira instead of Kira managing Otto's workload.

The vision is the opposite: Otto talks, Kira listens, extracts, proposes, executes, tracks, and reports. Otto's job is approve/reject/redirect.

---

## The System

### One Sentence

Every conversation produces goals and tasks. Every task gets pre-digested by sub-agents into a QA proposal. Every proposal waits for one human action: approve, reject, or redirect. Everything is tracked and gamified.

### Three Layers

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: CONVERSATION INTERFACE                        │
│  (Telegram, kira-test chat, voice — wherever Otto talks)│
│                                                         │
│  Every message passes through the Extraction Pipeline   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: THE BRAIN                                     │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Goal     │  │ Task     │  │ Extraction           │  │
│  │ Registry │←→│ Queue    │←─│ Pipeline             │  │
│  │          │  │          │  │ (conversation → task) │  │
│  └────┬─────┘  └────┬─────┘  └──────────────────────┘  │
│       │              │                                   │
│       │              ▼                                   │
│       │        ┌──────────┐                              │
│       │        │ Pre-     │                              │
│       └───────→│ Digester │ (sub-agents break work      │
│                │          │  into human-reviewable       │
│                │          │  proposals)                  │
│                └────┬─────┘                              │
│                     │                                    │
│                     ▼                                    │
│               ┌──────────┐                               │
│               │ QA Queue │ (proposals waiting for        │
│               │          │  human: approve/reject/edit)  │
│               └──────────┘                               │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: EXECUTION + TRACKING                          │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Sub-agent│  │ Progress │  │ Gamification          │  │
│  │ Executor │  │ Tracker  │  │ (XP, streaks, levels) │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Habit Tracker / Daily Routine                     │   │
│  │ (recurring patterns detected + managed)           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 1: Extraction Pipeline

### What It Does

Every message Otto sends — Telegram, kira-test chat, voice memo, forwarded email — passes through extraction before Kira responds.

### How It Works

```
Message arrives
    │
    ├─ 1. RESPOND (normal conversation — Kira answers)
    │
    └─ 2. EXTRACT (parallel, non-blocking)
         │
         ├─ Goal detection
         │   "We need multi-tenancy for LidarOS"
         │   → Goal: {title: "LidarOS multi-tenancy", project: "LidarOS", source: "conversation"}
         │
         ├─ Task detection
         │   "Fix the DNS issue tomorrow"
         │   → Task: {title: "Fix DNS issue", due: "tomorrow", priority: "high"}
         │
         ├─ Decision detection
         │   "Let's go with port 81"
         │   → Fact: {type: "decision", content: "LidarOS uses port 81"}
         │
         ├─ Preference detection
         │   "Never mention Windows to me"
         │   → Preference: {rule: "no Windows references", permanent: true}
         │
         └─ Commitment detection
             "I'll call the accountant Friday"
             → Task: {title: "Call accountant", due: "Friday", owner: "Otto"}
```

### Proposal, Not Presumption

Nothing gets silently added. Extraction produces **proposals** that surface naturally:

```
Otto: "Eventually this must be a multi-tenancy application, don't forget"

Kira: [responds normally about the architecture point]

Kira (inline or follow-up):
  "Captured:
   → Goal: Multi-tenancy for LidarOS
   → Added to LidarOS roadmap
   
   ✓ Confirm  ·  ✏ Edit  ·  ✗ Skip"
```

For high-confidence extractions (explicit "remind me", "don't forget", "TODO"), Kira confirms briefly and adds. For lower confidence ("we should eventually..."), Kira proposes and waits.

### Implementation

**Where it runs:** As part of the message processing pipeline in OpenClaw's main session. Not a separate service — it's woven into how Kira thinks about each message.

**Storage:**
- Goals → `~/kira/data/goals.json` (later: kira-test PostgreSQL)
- Tasks → `~/kira/data/tasks.json` (later: kira-test PostgreSQL)
- Decisions/preferences → Memory system (graph.db + MEMORY.md)

**Confidence thresholds:**
- High (>0.8): Auto-add + brief confirmation
- Medium (0.5-0.8): Propose inline, wait for response
- Low (<0.5): Note in memory, don't propose

---

## Layer 2: The Brain

### Goal Registry

A goal is a desired outcome with a timeline. Not a task.

```json
{
  "id": "goal-001",
  "title": "LidarOS multi-tenancy",
  "project": "LidarOS/IAM",
  "status": "proposed",       // proposed → active → achieved → archived
  "source": "conversation",   // conversation | manual | decomposition
  "source_date": "2026-02-24",
  "parent_goal": null,        // for sub-goals
  "milestones": [],           // decomposed by sub-agent
  "progress": 0,              // 0-100, computed from task completion
  "owner": "kira",            // who drives it: otto | kira | agent
  "notes": "Otto mentioned during LidarOS review"
}
```

**Goal lifecycle:**
1. **Proposed** — extracted from conversation, awaiting confirmation
2. **Active** — confirmed by Otto, decomposed into milestones/tasks
3. **Achieved** — all milestones complete
4. **Archived** — no longer relevant

### Task Queue

Tasks are atomic units of work with a clear done state.

```json
{
  "id": "task-001",
  "title": "Design tenant isolation for LidarOS",
  "goal_id": "goal-001",
  "status": "queued",         // queued → predigesting → proposed → approved → in_progress → done
  "executor": "kira",         // otto | kira | sub-agent
  "priority": "high",
  "due": null,
  "proposal": null,           // filled by pre-digester
  "xp_value": 30,
  "created": "2026-02-24",
  "source": "goal-decomposition"
}
```

### Pre-Digester (The Key Differentiator)

When a task enters the queue with `executor: "otto"` (human task), it doesn't just sit there. A sub-agent picks it up and produces a **QA proposal** — everything Otto needs to act on it with minimal friction.

**What a proposal looks like:**

```
Task: "Review and sign partnership NDA"

Pre-digested by Kira:
─────────────────────────────
Summary: NDA from ZenithCred partner. Standard mutual NDA, 2-year term.

Key points I found:
• Section 3.1 — Non-compete clause covers 12 months (aggressive)
• Section 5.2 — Governing law is Dutch (favorable)  
• Section 7 — Auto-renewal unless cancelled 30 days prior

My recommendation: Sign with one edit — reduce non-compete to 6 months.

Draft email to their legal attached.

Actions:
  ✓ Sign as-is
  ✏ Sign with suggested edit (I'll send the email)
  ✗ Reject — tell me why and I'll draft a response
  ⏭ Defer to next week
─────────────────────────────
```

For **technical tasks** (code, infrastructure):
```
Task: "Add tenant isolation to LidarOS backend"

Pre-digested by Kira:
─────────────────────────────
Approach: Add tenant_id to all API routes, 
          separate data dirs per tenant, 
          auth middleware for tenant scoping.

Files to change: 8 (config.py, main.py, 5 routers, docker-compose)
Estimated effort: ~2 hours agent work
Risk: Low — additive change, no breaking modifications

I can implement this. Want me to:
  ✓ Go ahead — I'll PR it for your review
  ✏ Adjust approach first (tell me what)  
  ✗ Not now
─────────────────────────────
```

For **human-only tasks** (calls, meetings, decisions):
```
Task: "Call accountant about Q1 filing"

Pre-digested by Kira:
─────────────────────────────
Context: Q1 deadline is April 15. Last filing was Oct 2025.
You'll need: BTW numbers, bank statements Jan-Mar, receipts folder.

I prepared:
• Checklist of documents to have ready
• 3 available time slots this week (from your calendar)
• Draft talking points

Actions:
  ✓ I'll call now (mark done after)
  📅 Schedule for [slot] — I'll remind you 30 min before
  ⏭ Push to next week
─────────────────────────────
```

**Implementation:** Sub-agents spawned via `sessions_spawn`. Each gets context (goal, task, relevant memory) and a clear output format. Results stored in `task.proposal`.

### QA Queue

The QA queue is where proposals land. It's the **primary interface between Kira and Otto** for async work.

**Delivery:** 
- Telegram: batch digest (morning brief + on-demand)
- kira-test UI: dedicated inbox view
- Never more than 3-5 proposals at a time (don't overwhelm)

**Otto's options on every proposal:**
- **Approve** → Kira executes (or marks done for human tasks)
- **Reject** → Kira notes why, adjusts approach
- **Edit** → Otto modifies, Kira re-processes
- **Defer** → Goes back to queue with new date
- **Delegate** → Reassign executor (otto ↔ kira ↔ specific agent)

---

## Layer 3: Execution + Tracking

### Progress Tracking

Every goal has a computed progress based on its task tree:

```
Goal: LidarOS multi-tenancy (45%)
├── Milestone: Backend isolation (60%)
│   ├── ✅ Design tenant model
│   ├── ✅ Add tenant_id to config
│   ├── 🔄 Modify API routes (in progress)
│   └── ⬜ Test isolation
├── Milestone: Frontend tenant switching (30%)
│   ├── ✅ Design tenant selector UI
│   ├── ⬜ Implement tenant context
│   └── ⬜ Test multi-tenant login
└── Milestone: Deployment (0%)
    ├── ⬜ Docker multi-tenant config
    └── ⬜ Documentation
```

### Gamification

Tied to the kira-test design (XP, levels, streaks) but works immediately in Telegram too:

```
Otto approves a proposal → task executes → completes
→ +30 XP
→ "Level 12 — Builder. ZenithCred is now 68% to launch."
```

**Daily streak:** Any meaningful interaction (approve a proposal, complete a task, send a goal) counts. Streak builds accountability without demanding busywork.

### Habit Tracker

Detected from patterns, not manually configured:

```
Kira notices: Otto checks Omiximo orders every morning around 9am.

Kira proposes: "I see you check orders every morning. Want me to:
  A) Auto-run the check and only alert you if something's wrong
  B) Add it as a daily recurring task (9:00 AM)
  C) Keep doing it manually"
```

Habits feed into the routine system (existing kira-routine skill) but with auto-detection instead of manual setup.

---

## Executive Advisor Mode

Not a feature. A behavior. Kira should challenge Otto's decisions when it has reason to:

### When Kira Pushes Back

1. **Overcommitment** — "You have 12 active goals. The top 3 cover 80% of revenue impact. Should we pause the other 9?"
2. **Misaligned effort** — "You've spent 6 hours on infrastructure today. The 60/30/10 ratio says revenue should get 4 of those hours."
3. **Missed opportunities** — "You mentioned the Qwerty order 3 days ago but haven't confirmed. Want me to follow up?"
4. **Contrarian check** — "Everyone's building AI wrappers. Here's why Chimera's approach is different — and here's the one risk I see."
5. **Pattern recognition** — "Last 3 Tuesdays you hit a productivity wall around 2pm. Consider scheduling deep work in the morning."

### How It Surfaces

- **Morning brief:** Strategic, not just a task list. "Here's what matters today and why."
- **Weekly review (Sunday):** Honest assessment. What progressed, what stalled, what should be killed.
- **Real-time:** When Otto makes a decision in conversation, Kira can challenge it once. If Otto confirms, Kira executes without further debate.

---

## Implementation Priority

### Phase 1: The Core Loop (This Week)

Build the minimum viable system that demonstrates the full loop:

1. **Extraction pipeline** — Every Telegram message scanned for goals/tasks/decisions
2. **Goal + Task storage** — Simple JSON files (migrate to kira-test DB later)
3. **Pre-digester** — Sub-agent that takes a task and produces a proposal
4. **QA delivery** — Proposals delivered via Telegram with inline buttons (approve/reject/defer)
5. **Progress tracking** — Goal progress computed and visible

**This is the atomic unit.** Everything else builds on top.

### Phase 2: Intelligence (Next Week)

6. **Habit detection** — Pattern recognition from conversation + action history  
7. **Executive advisor behavior** — Morning briefs that challenge, weekly reviews that are honest
8. **Gamification** — XP on task completion, streaks on daily engagement

### Phase 3: Scale (kira-test)

9. **Migrate to kira-test** — Goals/tasks in PostgreSQL, proposals in inbox UI, chat interface
10. **TASK-016 (Chat)** → **TASK-017 (Extraction)** → **TASK-019 (Onboarding)**
11. **Multi-user** — The system works for anyone, not just Otto

---

## What Changes Immediately

### Heartbeats

Stop returning HEARTBEAT_OK. Every heartbeat should:
1. Check if any new goals/tasks were extracted since last beat
2. Run pre-digester on queued tasks
3. Deliver ready proposals to Otto (if appropriate time)
4. Update progress on active goals
5. Log what was done (not "nothing to report")

### Conversation Behavior

After every substantive exchange with Otto:
1. Respond normally
2. Extract any goals/tasks/decisions (parallel)
3. Confirm extractions naturally (not robotic)
4. Queue for pre-digestion if needed

### Morning Brief

Not "here are your tasks." Instead:

```
Morning, Otto.

3 things that matter today:
1. Qwerty order — still unconfirmed. €8,920 sitting. (Propose: I draft a follow-up email)
2. LidarOS — ready for hardware test. Docker is live at lidar.zenithcred.com
3. RTX 5060 stock — still -21. Need purchase details to reconcile.

1 proposal ready for review:
→ [ZenithCred pitch deck update — I revised sections 3-5. Review?]

Your streak: 🔥 4 days. 230 XP to Level 13.
```

---

## What This Is NOT

- Not another Notion database nobody reads
- Not a dashboard with charts nobody opens  
- Not a collection of scripts that run independently
- Not a feature list to impress — it's a system that works

The test: **Can Otto wake up, read one message from Kira, and know exactly what needs his attention today — with everything pre-digested so his only job is decide?**

If yes, the system works. If no, iterate until it does.

---

## Open Questions for Otto

1. **Proposal delivery preference** — Telegram inline buttons? Separate morning digest? Both?
2. **Approval granularity** — Should low-stakes tasks (fix a typo, update a doc) auto-execute without approval? Or everything goes through QA?
3. **Goal hierarchy** — Should company-level goals (Oopuo $1B) cascade to project goals (LidarOS multi-tenancy) automatically? Or keep them flat?
4. **Push-back tolerance** — How often should Kira challenge decisions? Once and accept? Persistent if data supports it?
5. **Start with Telegram or kira-test?** — Build the loop in Telegram first (immediate, works now) or go straight to kira-test (proper UI, more effort)?
