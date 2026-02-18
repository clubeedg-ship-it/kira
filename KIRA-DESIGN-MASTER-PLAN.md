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
- 🔵 **NEW** — New requirement not in original design scope (added from this session)

Each section ends with a concrete deliverable: what file to create/update and what it must contain.

---

## PART 1: INFORMATION ARCHITECTURE & DATA MODEL

### 1.1 SOP Engine — The Hierarchy 🔵 NEW

The deterministic operating system that replaces the flat tasks/goals schema. Five-layer tree: Vision → Areas → Objectives → Projects → Tasks. With agent assignment, executor classification, dependency DAG, input queue, time blocks, review cadence, principles engine, and decision log.

**Existing:** `design-v2/10-tasks-goals.md` (flat, insufficient)
**New spec:** `KIRA-SOP-ENGINE.md` (created this session)
**Remaining work:**
- Define exact API endpoints for CRUD on each entity ✅
- Define cascade rules (delete project → what happens to tasks?) ✅
- Define the "inbox" flow for orphan tasks (no project assigned) ✅
- Define priority scoring formula precisely (weights, normalization) ✅
- Define how quarterly planning ceremony works in the UI ✅
- State machine diagrams for each entity's status transitions ✅

**Deliverable:** `design/sop-engine/` directory — ✅ ALL COMPLETE

### 1.2 Memory System — From File-Based to Graph-Native 🟡 PARTIAL

Your 4-layer memory is architecturally sound but the implementation is duct tape.

**Existing specs:** `design/memory/` — All ✅
**New specs needed:** `design/memory/v2/` — 🔴 SCAFFOLDED

- Temporal reasoning, entity disambiguation, confidence decay
- Proactive memory injection, sub-agent distillation, heartbeat memory

### 1.3 Unified Inbox — Message Aggregation Layer 🔴 SCAFFOLDED

All inbound messages across ALL channels feed through a single processing pipeline.
**Deliverable:** `design/unified-inbox/` — 7 files scaffolded

---

## PART 2: FRONTEND — UX/UI DESIGN

### 2.1 Design System & Visual Language 🔴 SCAFFOLDED
**Deliverable:** `design/ui/` — 6 files scaffolded

### 2.2 Navigation & Information Architecture 🟡 PARTIAL
**Deliverable:** `design/ui/navigation.md` — partial (routes defined)

### 2.3 Command Center (Home Screen) 🔴 SCAFFOLDED
**Deliverable:** `design/screens/command-center.md`

### 2.4 Unified Inbox UI 🔴 SCAFFOLDED
**Deliverable:** `design/screens/inbox.md`

### 2.5 Chat UI 🟡 PARTIAL
**Deliverable:** Update `design/dashboard/chat-ui.md` with SOP integration section

### 2.6 Operations View (SOP Engine UI) 🔴 SCAFFOLDED
**Deliverable:** `design/screens/operations/` — 10 files scaffolded

### 2.7 Documents / VDR (Redesigned) 🔴 SCAFFOLDED
**Deliverable:** `design/screens/documents/` — 6 files scaffolded

### 2.8 Knowledge Graph Explorer 🟡 PARTIAL
**Deliverable:** Update `design/dashboard/knowledge-graph.md`

### 2.9 Agent Monitor 🔴 SCAFFOLDED
**Deliverable:** `design/screens/agent-monitor.md`

### 2.10 Settings 🟡 PARTIAL
**Deliverable:** Update `design/dashboard/settings.md`

### 2.11 Mobile Experience 🔴 SCAFFOLDED
**Deliverable:** `design/screens/mobile/` — 6 files scaffolded

---

## PART 3: BACKEND LOGIC

### 3.1 Heartbeat as Separate Process 🔴 SCAFFOLDED
**Deliverable:** `design/backend/heartbeat-process.md`

### 3.2 Triage Engine 🔴 SCAFFOLDED
**Deliverable:** `design/backend/triage-engine.md`

### 3.3 Agent Orchestration with SOP Engine 🔴 SCAFFOLDED
**Deliverable:** `design/backend/sop-agent-integration.md`

### 3.4 Real-time Event System 🔴 SCAFFOLDED
**Deliverable:** `design/backend/event-system.md`

### 3.5 API Specification (Complete) 🔴 SCAFFOLDED
**Deliverable:** `design/api/v3-complete.md`

---

## PART 4: GAMIFICATION & ENGAGEMENT

### 4.1 XP & Progression System 🟡 PARTIAL
**Deliverable:** Update `design/gamification/user-engagement.md`

### 4.2 Onboarding / First Run 🟡 PARTIAL
**Deliverable:** Update `design-v2/21-onboarding-experience.md`

---

## PART 5: DESIGN EXECUTION ORDER

### Phase 0: Foundation ✅ COMPLETE
1. `design/sop-engine/data-model.md` ✅
2. `design/sop-engine/state-machines.md` ✅
3. `design/sop-engine/priority-algorithm.md` ✅
4. `design/sop-engine/cascade-rules.md` ✅
5. `design/sop-engine/api-endpoints.md` ✅
6. `design/sop-engine/review-cadence.md` ✅

### Phase 1: Core Screens (Next)
7. `design/ui/design-system.md` — Visual foundation
8. `design/screens/command-center.md` — Home screen
9. `design/screens/inbox.md` — Unified inbox
10. `design/screens/operations/today-view.md` — Daily execution
11. `design/screens/operations/task-detail.md` — Single task
12. `design/screens/operations/board-view.md` — Kanban

### Phase 2: Backend Logic
13. `design/backend/heartbeat-process.md`
14. `design/backend/triage-engine.md`
15. `design/backend/sop-agent-integration.md`
16. `design/backend/event-system.md`

### Phase 3: Advanced Screens
17–22. Timeline, area, review, documents, agent monitor

### Phase 4: Memory & Knowledge
23–28. Temporal graph, entity resolution, confidence decay, proactive injection

### Phase 5: Unified Inbox Infrastructure
29–31. Bridges, triage engine, reply routing

### Phase 6: Mobile & Polish
32–35. Mobile views, gamification, onboarding, full API spec

---

## TOTAL DESIGN FILES

| Category | Files | Status |
|----------|-------|--------|
| SOP Engine | 6 | ✅ Designed |
| Memory v2 | 6 | 🔴 Scaffolded |
| Unified Inbox | 7 | 🔴 Scaffolded |
| UI Foundation | 6 | 🔴 Scaffolded |
| Screen Specs | ~18 | 🔴 Scaffolded |
| Backend Logic | 4 | 🔴 Scaffolded |
| Mobile | 6 | 🔴 Scaffolded |
| API | 1 | 🔴 Scaffolded |
| **TOTAL** | **~54** | **6 designed, 48 scaffolded** |

---

*Full original design plan with detailed requirements for each section is in the project knowledge base.*
