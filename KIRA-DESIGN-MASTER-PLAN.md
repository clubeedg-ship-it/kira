# KIRA — Design Master Plan
## Everything That Must Be Designed Before Code

> **Date:** 2026-02-18
> **Status:** Planning Document
> **Rule:** No code until each section is signed off.

---

## How to Read This Document

Each design item has a status:

- ✅ **DESIGNED** — Spec exists in repo and is complete enough to build from
- 🟡 **PARTIAL** — Spec exists but has gaps, needs revision or expansion
- 🔴 **MISSING** — No spec exists, must be written from scratch
- 🟢 **NEW** — New requirement not in original design scope (added from this session)

Each section ends with a concrete deliverable: what file to create/update and what it must contain.

---

## PART 1: INFORMATION ARCHITECTURE & DATA MODEL

### 1.1 SOP Engine — The Hierarchy 🟢 NEW

The deterministic operating system that replaces the flat tasks/goals schema. Five-layer tree: Vision → Areas → Objectives → Projects → Tasks. With agent assignment, executor classification, dependency DAG, input queue, time blocks, review cadence, principles engine, and decision log.

**Existing:** `design-v2/10-tasks-goals.md` (flat, insufficient)
**New spec:** `KIRA-SOP-ENGINE.md` (created this session)
**Remaining work:**
- Define exact API endpoints for CRUD on each entity
- Define cascade rules (delete project → what happens to tasks?)
- Define the "inbox" flow for orphan tasks (no project assigned)
- Define priority scoring formula precisely (weights, normalization)
- Define how quarterly planning ceremony works in the UI
- State machine diagrams for each entity's status transitions

**Deliverable:** Update `design-v2/10-tasks-goals.md` to reference the SOP engine. Create `design/sop-engine/` directory with:
```
design/sop-engine/
├── data-model.md          — Full SQLite schema (from SOP ENGINE doc)
├── state-machines.md       — Status transition diagrams for every entity
├── priority-algorithm.md   — Scoring formula, weights, examples
├── cascade-rules.md        — What happens when parent entities change
├── api-endpoints.md        — REST API for all SOP entities
└── review-cadence.md       — How daily/weekly/quarterly reviews work in practice
```

### 1.2 Memory System — From File-Based to Graph-Native 🟡 PARTIAL

Your 4-layer memory is architecturally sound but the implementation is duct tape.

**Existing specs:** `design/memory/4-layer-system.md` ✅, `design/memory/sqlite-schema.md` ✅, `design/memory/retrieval-pipeline.md` ✅, `design/memory/nlp-graph-layer.md` ✅, `design/memory/learning-loop.md` ✅

**What's missing:**
- **Temporal reasoning** — Memories need timestamps AND temporal queries
- **Entity disambiguation** — When user says "the client" in conversation, which client?
- **Memory confidence decay** — Facts should lose confidence over time unless reinforced
- **Proactive memory injection** — Auto-load context before meetings
- **Cross-session memory continuity** — Sub-agent findings should auto-distill into knowledge graph
- **Heartbeat memory** — Separate memory maintenance loop (not main agent context)

**Deliverable:** Create `design/memory/v2/` directory with: temporal-graph.md, entity-resolution.md, confidence-decay.md, proactive-injection.md, sub-agent-distillation.md, heartbeat-memory.md

### 1.3 Unified Inbox — Message Aggregation Layer 🔴 MISSING

All inbound messages across ALL channels feed through a single processing pipeline before reaching you.

**Channels:** Email, WhatsApp, Telegram, Discord, Signal
**Pipeline:** Normalize → Classify → Extract → Match → Route → Store

**Deliverable:** Create `design/unified-inbox/` directory with: message-schema.md, bridges.md, triage-engine.md, notification-rules.md, thread-tracking.md, reply-routing.md, ui-spec.md

---

## PART 2: FRONTEND — UX/UI DESIGN

### 2.1 Design System & Visual Language 🔴 MISSING
**Deliverable:** Create `design/ui/` with: design-system.md, component-library.md, iconography.md, layout-system.md, motion-language.md

### 2.2 Navigation & Information Architecture 🟡 PARTIAL
**Primary Navigation (Left Sidebar):**
🏠 Command Center | 📥 Inbox | 💬 Chat | 📋 Operations | 📄 Documents | 🧠 Knowledge | 📊 Dashboards | ⚙️ Settings

### 2.3 Command Center (Home Screen) 🔴 MISSING
Mission control: today's date, top 3 priorities, input queue badge, active agents, key result progress, blockers.

### 2.4 Unified Inbox UI 🔴 MISSING
Two-column layout, filtering by channel/area/urgency/type, batch actions, quick actions, thread view.

### 2.5 Chat UI 🟡 PARTIAL
Existing `design/dashboard/chat-ui.md` needs SOP integration section.

### 2.6 Operations View (SOP Engine UI) 🔴 MISSING
**View modes:** Board (Kanban), List (Things 3), Timeline (Gantt), Area, Today, Review
**Deliverable:** Create `design/screens/operations/` with: board-view.md, list-view.md, timeline-view.md, area-view.md, today-view.md, review-view.md, task-detail.md, project-detail.md, objective-detail.md, quick-add.md

### 2.7 Documents / VDR (Redesigned) 🟡 PARTIAL
Better than Notion: project-context files, smart collections, AI-enriched metadata, inline preview, version timeline, linked context.
**Deliverable:** Create `design/screens/documents/`

### 2.8 Knowledge Graph Explorer 🟡 PARTIAL
Needs temporal slider, SOP overlay, confidence visualization.

### 2.9 Agent Monitor 🔴 MISSING
Live view: agent status, current tasks, progress, cost tracking, pause/cancel/inspect.

### 2.10 Settings 🟡 PARTIAL
Needs SOP config, inbox channels, agent management, notification preferences.

### 2.11 Mobile Experience 🔴 MISSING
Mobile-first: Chat, Inbox (swipe), Today, Quick Capture, Notifications.
**Deliverable:** Create `design/screens/mobile/`

---

## PART 3: BACKEND LOGIC

### 3.1 Heartbeat as Separate Process 🟢 NEW
Separate from main agent. Cron-driven. Memory maintenance, inbox triage, agent work check, schedule check, review triggers, health monitoring, brief generation.
**Deliverable:** Create `design/backend/heartbeat-process.md`

### 3.2 Triage Engine 🔴 MISSING
Every inbound message goes through: Normalize → Classify → Extract → Match → Route → Store. Must be FAST (Haiku-tier, <500ms).
**Deliverable:** Create `design/backend/triage-engine.md`

### 3.3 Agent Orchestration with SOP Engine 🟡 PARTIAL
Agents registered in `agents` table, assigned to areas. Executor_type drives assignment. Work log feeds back into SOP.
**Deliverable:** Create `design/backend/sop-agent-integration.md`

### 3.4 Real-time Event System 🟡 PARTIAL
SSE events: AGENT_STATUS_CHANGED, TASK_STATUS_CHANGED, INPUT_QUEUE_ITEM_ADDED, MESSAGE_RECEIVED, REVIEW_DUE, etc.
**Deliverable:** Create `design/backend/event-system.md`

### 3.5 Memory System v2 🟡 PARTIAL
See Part 1, Section 1.2.

### 3.6 API Specification (Complete) 🟡 PARTIAL
Needs expansion for SOP CRUD, inbox, input queue, agents, events, knowledge graph.
**Deliverable:** Create `design/api/v3-complete.md`

---

## PART 4: GAMIFICATION & ENGAGEMENT

### 4.1 XP & Progression System 🟡 PARTIAL
XP from task completion, review completion, principle creation, input queue processing. Agent XP and leaderboard.

### 4.2 Onboarding / First Run 🟡 PARTIAL
Needs SOP setup guide, channel connection, agent introduction, first task walkthrough.

---

## PART 5: DESIGN EXECUTION ORDER

### Phase 0: Foundation (Do First)
1. `design/ui/design-system.md`
2. `design/sop-engine/data-model.md`
3. `design/sop-engine/state-machines.md`
4. `design/sop-engine/api-endpoints.md`

### Phase 1: Core Screens
5. `design/screens/command-center.md`
6. `design/screens/inbox.md`
7. `design/screens/operations/today-view.md`
8. `design/screens/operations/task-detail.md`
9. `design/screens/operations/board-view.md`

### Phase 2: Backend Logic
10. `design/backend/heartbeat-process.md`
11. `design/backend/triage-engine.md`
12. `design/backend/sop-agent-integration.md`
13. `design/backend/event-system.md`

### Phase 3: Advanced Screens
14-18. Timeline, Area, Review, Documents, Agent Monitor

### Phase 4: Memory & Knowledge
19-22. Temporal graph, heartbeat memory, proactive injection, knowledge graph updates

### Phase 5: Unified Inbox Infrastructure
23-25. Bridges, triage engine, reply routing

### Phase 6: Mobile & Polish
26-29. Mobile views, gamification, onboarding, full API spec

---

## TOTAL DESIGN FILES TO PRODUCE

| Category | Files | Status |
|----------|-------|--------|
| SOP Engine | 6 | ✅ Designed |
| Memory v2 | 6 | 🔴 Scaffold |
| Unified Inbox | 7 | 🔴 Scaffold |
| UI Foundation | 5 | 🔴 Scaffold |
| Screen Specs | ~18 | 🔴 Scaffold |
| Backend Logic | 4 | 🔴 Scaffold |
| Updates to Existing | ~8 | 🟡 Revisions |
| **TOTAL** | **~54 design documents** | |

Every one of these docs should be complete enough that a coding agent can implement from it without asking questions.
