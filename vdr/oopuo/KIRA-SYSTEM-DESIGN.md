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

## Document Accessibility Problem

**Current state:** Design docs, system specs, and deliverables are markdown files on a Linux server. Otto needs SSH or me to read them. This is garbage compared to the old P.A.R.A. Notion structure where everything was a click away on any device.

**Requirement:** Every document that matters must be accessible like a Notion page — browser, phone, instant. Server-side markdown is for agents, not humans.

**Options:**
1. **Notion sync** — Push key docs to Notion pages automatically (maintains the P.A.R.A. structure Otto already knows). Agent writes locally, syncs to Notion for human access.
2. **kira-test VDR** — The dashboard's document viewer (design/screens/documents/) already specifies this. When built, docs render in the web UI with search and navigation.
3. **Both** — Notion for now (immediate), VDR later (native).

**Rule:** If Otto can't read it in 2 taps, it doesn't exist for decision-making.

---

## Coherence Check: This Doc vs Existing Design Docs

I compared this system design against all 96 design documents in `~/kira-test/design/`. Here's what aligns, what conflicts, and what's missing.

### ✅ Aligned

| This Doc | Existing Spec | Notes |
|----------|---------------|-------|
| Extraction Pipeline | `gamification/task-gathering.md` | Same concept — conversation mining, confidence thresholds, proposal flow, batch detection. Task-gathering doc is MORE detailed (document scanning, email integration, recurring task detection, priority inference). This doc should reference it, not redefine it. |
| Pre-Digester / QA Queue | `backend/sop-agent-integration.md` | The "input queue" in SOP spec IS the QA queue. Same flow: agent does work → creates input_queue item → user approves/rejects/edits. My doc reinvents this with different terminology. |
| Goal decomposition | `gamification/task-gathering.md` §4 | Goal → milestone → task breakdown already fully specified. |
| Executive Advisor behavior | `gamification/agent-guidance.md` | Proactive suggestions, daily planning, unblocking, wellness checks, weekly review — all specified with trigger frameworks and suggestion limits. |
| Autonomy levels | `agents/autonomy-levels.md` | GREEN/YELLOW/RED maps to my AUTONOMOUS/CHECKPOINT/APPROVAL. Already more detailed. |
| Morning brief / evening wrap | `backend/heartbeat-process.md` | Already designed as separate heartbeat process with Haiku for triage, Sonnet for briefs. Cost targets, state tracking, cron schedules all specified. |
| Gamification | `gamification/user-engagement.md` | XP, levels, streaks, celebrations — fully designed including SOP integration and agent XP. |

### ⚠️ Conflicts

| Issue | This Doc Says | Existing Spec Says |
|-------|---------------|-------------------|
| **Storage** | JSON files (`goals.json`, `tasks.json`) | SQLite with 15-table SOP schema (`sop-engine/data-model.md`). The SOP engine is the canonical data layer. JSON files would be a parallel system that diverges. |
| **Heartbeat model** | Heartbeat in main session scans for goals/tasks | Heartbeat is a SEPARATE process with minimal context, cheap model (Haiku), doesn't share main agent context window (`backend/heartbeat-process.md`). |
| **Triage** | Extraction happens in main conversation flow | Triage engine is a 7-stage pipeline running in the heartbeat process, not main agent (`backend/triage-engine.md`). |
| **Terminology** | "QA Queue", "Pre-Digester" | "Input Queue", "Agent Work Cycle" — same concepts, different names. Should use the existing terms. |

### ❌ Missing from This Doc (Exists in Design)

| Missing | Where It's Specified |
|---------|---------------------|
| SOP hierarchy (Area → Objective → Project → Milestone → Task) | `sop-engine/data-model.md` — the full entity model with 15 tables |
| State machines for every entity | `sop-engine/state-machines.md` — precise status transitions |
| Priority algorithm (weighted scoring) | `sop-engine/priority-algorithm.md` — formula with tuneable weights |
| Cascade rules (parent status changes propagate) | `sop-engine/cascade-rules.md` |
| Review cadence (daily/weekly/monthly/quarterly ceremonies) | `sop-engine/review-cadence.md` |
| Agent registration and capabilities | `agents/multi-agent-system.md` + `sop-agent-integration.md` |
| Cost tracking per agent/task | `sop-agent-integration.md` §6 |
| Triage engine (7-stage message processing) | `backend/triage-engine.md` — classify, extract, match, route, store |
| Widget engine | `dashboard/interactive-widgets.md` + `agents/widget-agent.md` |
| Self-improvement loops | `agents/dgm-self-improvement.md` + `agents/self-evolution.md` |
| Memory v2 (temporal graph, entity resolution, confidence decay) | `memory/v2/*.md` — 6 design docs |
| Unified inbox with multi-channel bridges | `unified-inbox/*.md` — 7 design docs |
| Onboarding wizard | `onboarding/*.md` — 3 design docs |
| Chat UI | `dashboard/chat-ui.md` — 1036 lines |
| Mobile strategy | `screens/mobile/*.md` — 6 design docs |

### Verdict

**My system design doc is a simplified re-explanation of things already designed in detail.** The existing 96 docs form a comprehensive product spec. My doc adds value in two areas:

1. **The "what changes immediately" section** — connecting existing designs to what Kira (me, the running agent) should do RIGHT NOW in the current Telegram-based setup
2. **The honest problem statement** — naming what's broken and why

But the architecture? It's already designed. The problem isn't missing design — it's that **none of it has been built into the running product**.

---

## Revised Recommendation

Instead of yet another design doc, the actual next step is:

### Build the kira-test product.

The design exists. 96 docs. The SOP engine backend is mostly built (14/15 tasks done). What's missing is:

1. **TASK-016: Chat Interface** — the conversation surface where extraction happens
2. **TASK-017: Task Extraction** — the conversation mining that auto-captures goals/tasks
3. **The triage engine** — the 7-stage pipeline that classifies and routes every message
4. **The input queue UI** — where Otto sees proposals and approves/rejects

These 4 things, connected, ARE the system. Everything else (gamification, mobile, widgets) is enhancement.

---

## Open Questions for Otto

1. **Document access** — Should I sync key docs to Notion now? Or wait for kira-test VDR?
2. **Start building?** — The designs exist. Should I start implementing TASK-016 → 017 → triage engine → input queue? Or do you want to review/adjust designs first?
3. **Approval granularity** — The autonomy levels doc has GREEN/YELLOW/RED. Do you agree with those boundaries?
4. **Push-back tolerance** — Agent guidance doc says max 3 proactive messages/day, min 2h between. Right for you?
5. **Where to build** — kira-test repo (proper product) or prototype in current Telegram setup first?
