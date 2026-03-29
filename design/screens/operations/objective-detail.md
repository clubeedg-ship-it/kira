# Objective Detail

> **Status:** ✅ DESIGNED | **Phase:** 3
> **Route:** `/operations/objective/:id`
> **Purpose:** View a single quarterly objective with its key results, child projects, and progress tracking. The OKR dashboard for one goal.

---

## 1. Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR │  ← AI Receptionist > Launch Email Sales (Q1 2026)      │
│         │                                                        │
│         │  ┌─ HEADER ─────────────────────────────────────────┐  │
│         │  │ Launch email sales for AI Receptionist            │  │
│         │  │ Q1 2026 (Jan 1 – Mar 31)  Status: [active ▾]    │  │
│         │  │ Overall: ████████░░ 72%                          │  │
│         │  └──────────────────────────────────────────────────┘  │
│         │                                                        │
│         │  ┌─ KEY RESULTS ────────────────────────────────────┐  │
│         │  │                                                   │  │
│         │  │ KR1: Acquire 50 paying customers                  │  │
│         │  │ ████████░░░░░░░░░░░░ 24/50 (48%)                │  │
│         │  │ [Update →] Current: [24] Target: 50               │  │
│         │  │                                                   │  │
│         │  │ KR2: Reach €5,000 MRR                            │  │
│         │  │ ██████░░░░░░░░░░░░░░ €2,100/€5,000 (42%)        │  │
│         │  │ [Update →] Current: [2100] Target: 5000           │  │
│         │  │                                                   │  │
│         │  │ KR3: Customer NPS > 40                           │  │
│         │  │ ████████████████████ 45/40 (100%) ✅             │  │
│         │  │                                                   │  │
│         │  │ [+ Add Key Result]                                │  │
│         │  └──────────────────────────────────────────────────┘  │
│         │                                                        │
│         │  ┌─ PROJECTS ───────────────────────────────────────┐  │
│         │  │ ┌───────────┐ ┌───────────┐ ┌───────────┐       │  │
│         │  │ │Email Camp.│ │Outreach   │ │Onboarding │       │  │
│         │  │ │██████░░  │ │████░░░░  │ │░░░░░░░░  │       │  │
│         │  │ │Active     │ │Active     │ │Planning   │       │  │
│         │  │ └───────────┘ └───────────┘ └───────────┘       │  │
│         │  │ [+ Add Project]                                   │  │
│         │  └──────────────────────────────────────────────────┘  │
│         │                                                        │
│         │  ┌─ TIMELINE ───────────────────────────────────────┐  │
│         │  │ Jan ░░░░████████████████████████████░░░░ Mar     │  │
│         │  │              ▲ NOW (72%)                          │  │
│         │  └──────────────────────────────────────────────────┘  │
│         │                                                        │
│         │  ┌─ DECISIONS & PRINCIPLES ─────────────────────────┐  │
│         │  │ 📌 "Focus on dental practices first" (Feb 5)     │  │
│         │  │ 📌 "Never discount > 15% on first deal" (Feb 12) │  │
│         │  └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Sections

### 2.1 Header
Objective title (editable), quarter, date range, status, overall progress (auto-calculated as average of key result percentages).

### 2.2 Key Results
Each KR: title, progress bar (current_value / target_value), percentage, unit. Click [Update] to change current_value inline. Completed KRs show ✅. [+ Add Key Result] at bottom.

### 2.3 Projects
Card grid of child projects. Each: title, progress bar, status badge. Click → project detail. [+ Add Project] creates project pre-linked to this objective.

### 2.4 Timeline
Horizontal bar showing objective's date range. Progress fill shows how far through the quarter + actual progress. If progress lags behind time, the gap is highlighted red.

### 2.5 Decisions & Principles
Decisions made in context of this objective (from `decisions` table). Principles created during this objective's lifecycle. Click to view/edit.

---

## 3. Data Loading

`GET /api/v1/objectives/:id?expand=key_results,projects,decisions,principles`

---

## 4. Interactions

| Action | Behavior |
|--------|----------|
| Update KR value | Inline number input, instant save |
| Add key result | Modal: title, metric_type, target, unit |
| Add project | Modal: title, description, owner, deadline |
| Score objective | Status → completed/failed/deferred (at quarter end) |
| Edit title/dates | Inline editing |

---

*The Objective Detail is your OKR dashboard. Track key results, see which projects contribute, and know if you're on pace for the quarter.*