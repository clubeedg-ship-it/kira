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
- 🔵 **NEW** — New requirement not in original design scope

Each section ends with a concrete deliverable: what file to create/update and what it must contain.

---

## PART 1: INFORMATION ARCHITECTURE & DATA MODEL

### 1.1 SOP Engine — The Hierarchy 🔵 NEW

The deterministic operating system that replaces the flat tasks/goals schema. Five-layer tree: Vision → Areas → Objectives → Projects → Tasks. With agent assignment, executor classification, dependency DAG, input queue, time blocks, review cadence, principles engine, and decision log.

**New spec:** `KIRA-SOP-ENGINE.md`

**Deliverable:** `design/sop-engine/` directory:
```
design/sop-engine/
├── data-model.md          — Full SQLite schema
├── state-machines.md       — Status transition diagrams
├── priority-algorithm.md   — Scoring formula, weights, examples
├── cascade-rules.md        — What happens when parent entities change
├── api-endpoints.md        — REST API for all SOP entities
└── review-cadence.md       — How daily/weekly/quarterly reviews work
```

### 1.2 Memory System — From File-Based to Graph-Native 🟡 PARTIAL

4-layer memory is architecturally sound. Missing: temporal reasoning, entity disambiguation, confidence decay, proactive injection, cross-session continuity, heartbeat memory.

**Deliverable:** `design/memory/v2/` directory:
```
design/memory/v2/
├── temporal-graph.md         — Temporal dimensions, time-travel queries
├── entity-resolution.md      — Disambiguation pipeline
├── confidence-decay.md       — How facts age, reinforcement mechanics
├── proactive-injection.md    — Event-driven context loading
├── sub-agent-distillation.md — Auto-extracting knowledge from agent work
└── heartbeat-memory.md       — Separate memory maintenance process
```

### 1.3 Unified Inbox — Message Aggregation Layer 🔴 MISSING

All inbound messages across ALL channels feed through a single processing pipeline.

```
Email ───┐
WhatsApp──┤
Telegram──┤──→ UNIFIED INBOX ──→ TRIAGE ENGINE ──→ Input Queue / Direct Chat
Discord ──┤
Signal ──┘
```

**Deliverable:** `design/unified-inbox/` directory:
```
design/unified-inbox/
├── message-schema.md        — Normalized format for all channels
├── bridges.md               — Per-channel bridge requirements
├── triage-engine.md         — Classification pipeline
├── notification-rules.md    — What surfaces immediately, what batches
├── thread-tracking.md       — Grouping related messages
├── reply-routing.md         — Composing replies from dashboard
└── ui-spec.md               — Dashboard inbox view
```

---

## PART 2: FRONTEND — UX/UI DESIGN

### 2.1 Design System & Visual Language 🔴 MISSING

**Deliverable:** `design/ui/` — design-system.md, component-library.md, iconography.md, layout-system.md, motion-language.md

### 2.2 Navigation & Information Architecture 🟡 PARTIAL

Primary navigation (left sidebar):
```
🏠 Command Center   ← Morning brief, today's priorities, active agents
📥 Inbox            ← Unified inbox (all channels + input queue)
💬 Chat             ← Direct conversation with Kira
📋 Operations       ← SOP engine: areas, objectives, projects, tasks
📄 Documents        ← VDR (redesigned)
🧠 Knowledge        ← Memory graph explorer
📊 Dashboards       ← Custom widget dashboards
⚙️ Settings         ← Agents, channels, schedule, preferences
```

### 2.3 Command Center (Home Screen) 🔴 MISSING

Mission control dashboard showing: Top 3 priorities, input queue badge, active agents, key result progress, blockers.

### 2.4 Unified Inbox UI 🔴 MISSING

Two-column layout merging external messages and internal input queue.

### 2.5 Chat UI 🟡 PARTIAL

Existing `design/dashboard/chat-ui.md` needs SOP integration section.

### 2.6 Operations View (SOP Engine UI) 🔴 MISSING

View modes: Board, List, Timeline, Area, Today, Review.

**Deliverable:** `design/screens/operations/` — board-view.md, list-view.md, timeline-view.md, area-view.md, today-view.md, review-view.md, task-detail.md, project-detail.md, objective-detail.md, quick-add.md

### 2.7 Documents / VDR (Redesigned) 🟡 PARTIAL

**Deliverable:** `design/screens/documents/` — file-browser.md, document-viewer.md, smart-collections.md, upload-flow.md, version-history.md, document-card.md

### 2.8 Knowledge Graph Explorer 🟡 PARTIAL

Needs temporal slider, SOP overlay, confidence visualization.

### 2.9 Agent Monitor 🔴 MISSING

Live view of all active agents: status, current task, progress, cost, controls.

### 2.10 Settings 🟡 PARTIAL

Needs SOP config, inbox channels, agent management, notification preferences.

### 2.11 Mobile Experience 🔴 MISSING

**Deliverable:** `design/screens/mobile/` — mobile-strategy.md, chat-mobile.md, inbox-mobile.md, today-mobile.md, quick-capture.md, notifications.md

---

## PART 3: BACKEND LOGIC

### 3.1 Heartbeat as Separate Process 🔵 NEW

Separate cron-driven process: memory maintenance, inbox triage, agent work check, schedule check, review triggers, morning/evening brief generation.

### 3.2 Triage Engine 🔴 MISSING

Pipeline: Normalize → Classify → Extract → Match → Route → Store. Haiku-tier, < 500ms.

### 3.3 Agent Orchestration with SOP Engine 🟡 PARTIAL

Agents registered in agents table, assigned to areas, work log feeds SOP engine.

### 3.4 Real-time Event System 🟡 PARTIAL

Events: AGENT_STATUS_CHANGED, TASK_STATUS_CHANGED, INPUT_QUEUE_ITEM_ADDED, MESSAGE_RECEIVED, REVIEW_DUE, KEY_RESULT_UPDATED, DEPENDENCY_UNBLOCKED, DOCUMENT_ADDED, MEMORY_UPDATED, NOTIFICATION.

### 3.5 API Specification (Complete) 🟡 PARTIAL

**Deliverable:** `design/api/v3-complete.md` — single source of truth for all endpoints.

---

## PART 4: GAMIFICATION & ENGAGEMENT

### 4.1 XP & Progression System 🟡 PARTIAL

Needs SOP-integrated XP sources: task completion, review completion, principle creation, input queue processing.

### 4.2 Onboarding / First Run 🟡 PARTIAL

Needs SOP setup guide, channel connection, agent introduction.

---

## PART 5: DESIGN EXECUTION ORDER

### Phase 0: Foundation (Do First)
1. `design/ui/design-system.md`
2. `design/sop-engine/data-model.md` ✅
3. `design/sop-engine/state-machines.md` ✅
4. `design/sop-engine/api-endpoints.md` ✅

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
14-18. Timeline, area, review views, VDR redesign, agent monitor

### Phase 4: Memory & Knowledge
19-22. Temporal graph, heartbeat memory, proactive injection, knowledge graph updates

### Phase 5: Unified Inbox Infrastructure
23-25. Bridges, triage engine, reply routing

### Phase 6: Mobile & Polish
26-29. Mobile views, gamification, onboarding, full API spec

---

## TOTAL DESIGN FILES

| Category | Files | Status |
|----------|-------|--------|
| SOP Engine | 6 | ✅ Designed |
| Memory v2 | 6 | 🔴 Scaffold |
| Unified Inbox | 7 | 🔴 Scaffold |
| UI Foundation | 6 | 🔴 Scaffold |
| Screen Specs | ~18 | 🔴 Scaffold |
| Backend Logic | 4 | 🔴 Scaffold |
| Updates to Existing | ~8 | 🟡 Revisions |
| **TOTAL** | **~54 design documents** | |

Every one of these docs should be complete enough that a coding agent can implement from it without asking questions.