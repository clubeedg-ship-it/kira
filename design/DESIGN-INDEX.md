# Kira — Design Directory Index

> **Master Plan:** [`KIRA-DESIGN-MASTER-PLAN.md`](../KIRA-DESIGN-MASTER-PLAN.md)  
> **SOP Engine Spec:** [`KIRA-SOP-ENGINE.md`](../KIRA-SOP-ENGINE.md)  
> **Rule:** No code until each section is signed off.

---

## New Design Structure (from Design Refactor)

### Phase 0: Foundation ✅
| File | Status | Description |
|------|--------|-------------|
| `sop-engine/data-model.md` | ✅ DESIGNED | Full SQLite schema (15 tables) |
| `sop-engine/state-machines.md` | ✅ DESIGNED | Status transitions for every entity |
| `sop-engine/priority-algorithm.md` | ✅ DESIGNED | Scoring formula, weights, examples |
| `sop-engine/cascade-rules.md` | ✅ DESIGNED | Parent entity change cascades |
| `sop-engine/api-endpoints.md` | ✅ DESIGNED | REST API for all SOP entities |
| `sop-engine/review-cadence.md` | ✅ DESIGNED | Daily/weekly/quarterly review specs |
| `ui/design-system.md` | 🔴 SCAFFOLD | Color, typography, spacing, motion |
| `ui/component-library.md` | 🔴 SCAFFOLD | Reusable UI components |

### Phase 1: Core Screens
| File | Status | Description |
|------|--------|-------------|
| `screens/command-center.md` | 🔴 SCAFFOLD | Home screen / mission control |
| `screens/inbox.md` | 🔴 SCAFFOLD | Unified inbox + input queue |
| `screens/operations/today-view.md` | 🔴 SCAFFOLD | Daily execution view |
| `screens/operations/task-detail.md` | 🔴 SCAFFOLD | Task detail panel |
| `screens/operations/board-view.md` | 🔴 SCAFFOLD | Kanban view |
| `screens/operations/project-detail.md` | 🔴 SCAFFOLD | Project detail |
| `screens/operations/quick-add.md` | 🔴 SCAFFOLD | Fast task creation |
| `ui/navigation.md` | 🟡 PARTIAL | Sitemap and routing |

### Phase 2: Backend Logic
| File | Status | Description |
|------|--------|-------------|
| `backend/heartbeat-process.md` | 🔴 SCAFFOLD | Separate heartbeat process |
| `backend/triage-engine.md` | 🔴 SCAFFOLD | Message processing pipeline |
| `backend/sop-agent-integration.md` | 🔴 SCAFFOLD | Agent ↔ SOP mapping |
| `backend/event-system.md` | 🔴 SCAFFOLD | Real-time SSE events |

### Phase 3: Advanced Screens
| File | Status | Description |
|------|--------|-------------|
| `screens/operations/timeline-view.md` | 🔴 SCAFFOLD | Gantt chart |
| `screens/operations/area-view.md` | 🔴 SCAFFOLD | Area deep-dive |
| `screens/operations/review-view.md` | 🔴 SCAFFOLD | Review ceremony UI |
| `screens/operations/list-view.md` | 🔴 SCAFFOLD | Filtered list |
| `screens/operations/objective-detail.md` | 🔴 SCAFFOLD | Objective detail |
| `screens/documents/*` | 🔴 SCAFFOLD | VDR redesign (6 files) |
| `screens/agent-monitor.md` | 🔴 SCAFFOLD | Agent live monitor |

### Phase 4: Memory & Knowledge
| File | Status | Description |
|------|--------|-------------|
| `memory/v2/temporal-graph.md` | 🔴 SCAFFOLD | Time-travel queries |
| `memory/v2/entity-resolution.md` | 🔴 SCAFFOLD | Disambiguation |
| `memory/v2/confidence-decay.md` | 🔴 SCAFFOLD | Fact aging |
| `memory/v2/proactive-injection.md` | 🔴 SCAFFOLD | Event-driven context |
| `memory/v2/sub-agent-distillation.md` | 🔴 SCAFFOLD | Agent → knowledge |
| `memory/v2/heartbeat-memory.md` | 🔴 SCAFFOLD | Memory maintenance |

### Phase 5: Unified Inbox Infrastructure
| File | Status | Description |
|------|--------|-------------|
| `unified-inbox/message-schema.md` | 🔴 SCAFFOLD | Normalized format |
| `unified-inbox/bridges.md` | 🔴 SCAFFOLD | Channel bridges |
| `unified-inbox/triage-engine.md` | 🔴 SCAFFOLD | Classification pipeline |
| `unified-inbox/notification-rules.md` | 🔴 SCAFFOLD | Notification strategy |
| `unified-inbox/thread-tracking.md` | 🔴 SCAFFOLD | Cross-channel threads |
| `unified-inbox/reply-routing.md` | 🔴 SCAFFOLD | Reply from dashboard |
| `unified-inbox/ui-spec.md` | 🔴 SCAFFOLD | Points to screens/inbox.md |

### Phase 6: Mobile & Polish
| File | Status | Description |
|------|--------|-------------|
| `screens/mobile/*` | 🔴 SCAFFOLD | Mobile views (6 files) |
| `api/v3-complete.md` | 🔴 SCAFFOLD | Unified API spec |

---

## Existing Design (Pre-refactor, still valid)

These files remain in place and are referenced by the new structure:

### `design/architecture/`
- `system-overview.md` — Core system architecture
- `tech-stack.md` — Technology choices
- `data-flow.md` — Data flow diagrams
- `api-spec.md` — Original API spec (superseded by sop-engine/api-endpoints.md + api/v3-complete.md)

### `design/agents/`
- `multi-agent-system.md` — Agent orchestration (needs SOP integration update)
- `autonomy-levels.md` — Agent autonomy framework
- `cron-system.md` — Scheduled agent tasks
- `dgm-self-improvement.md` — Self-improvement loops
- `self-evolution.md` — System evolution
- `widget-agent.md` — Widget generation agent

### `design/memory/`
- `4-layer-system.md` — Core memory architecture ✅
- `sqlite-schema.md` — Memory DB schema ✅
- `retrieval-pipeline.md` — Memory retrieval ✅
- `nlp-graph-layer.md` — NLP and graph layer ✅
- `learning-loop.md` — Learning loop ✅

### `design/dashboard/`
- `chat-ui.md` — Chat interface (needs SOP integration section)
- `component-map.md` — Component mapping (needs navigation update)
- `interactive-widgets.md` — Widget system
- `knowledge-graph.md` — Knowledge graph UI (needs temporal + SOP update)
- `settings.md` — Settings UI (needs SOP + inbox expansion)
- `tasks-goals.md` — **SUPERSEDED by sop-engine/**
- `vdr.md` — Document system (superseded by screens/documents/)

### `design/gamification/`
- `user-engagement.md` — XP & progression (needs SOP XP integration)
- `task-gathering.md` — Task extraction pipeline
- `agent-guidance.md` — Agent guidance system

### `design-v2/`
- 21 numbered specs — Original v2 design. Many superseded by new structure. Key ones that remain relevant: auth (04), billing (19), onboarding (21).

---

## File Count

| Category | New Files | Status |
|----------|-----------|--------|
| SOP Engine | 6 | ✅ Designed |
| UI Foundation | 6 | 🔴 5 scaffold, 1 partial |
| Screen Specs | 18 | 🔴 All scaffold |
| Backend Logic | 4 | 🔴 All scaffold |
| Memory v2 | 6 | 🔴 All scaffold |
| Unified Inbox | 7 | 🔴 All scaffold |
| API | 1 | 🔴 Scaffold |
| Mobile | 6 | 🔴 All scaffold |
| **Total New** | **54** | **6 designed, 48 scaffold** |
