# Pipeline Tracker — Google Sheets Design Spec
*Kira | Feb 8, 2026*

---

## Overview
A single Google Sheet that gives Otto a real-time view of all companies, tasks, and progress. Updated by Kira from Notion data.

---

## Sheet Structure

### Tab 1: Dashboard (Overview)
| Column | Content |
|--------|---------|
| Company | Name + status emoji (🟢 Active, 🟡 Funded, 🔴 Parked) |
| Priority | P1/P2/P3 |
| Monthly Revenue | Current month actual |
| ARR | Annualized |
| Pipeline Value | Deals in progress |
| Tasks Active | Count |
| Tasks Blocked | Count |
| Next Milestone | Description + date |
| Health Score | 1-10 (calculated) |

**Conditional formatting:** Red if blocked > 0, green if revenue growing, yellow if stale (no task movement in 7 days)

### Tab 2-8: Company Tabs (one per company)

Each company tab has columns:
| Column | Purpose |
|--------|---------|
| Task | Name/description |
| Stage | Research → Draft → Critique → Refine → Done |
| Owner | Otto / Kira / Contractor name |
| Priority | P1-P3 |
| Due Date | Target |
| Status | Not Started / In Progress / Blocked / Done |
| Blocker | What's blocking (if any) |
| Notes | Context |
| Notion ID | For sync reference |

**Stages flow (Kanban-style):**
```
Research → Draft → Critique → Refine → Done
```

### Tab 9: Financial Summary
| Row | Content |
|-----|---------|
| Revenue by company by month (Jan-Dec 2026) |
| Expenses by category |
| Cash position |
| Burn rate |
| Runway (months) |
| Funding pipeline (expected vs received) |

### Tab 10: Investor Pipeline (ZenithCred + Chimera)
| Column | Content |
|--------|---------|
| Investor Name | |
| Fund | |
| Stage | Identified → Contacted → Meeting → Due Diligence → Term Sheet → Closed |
| Contact | Email/LinkedIn |
| Last Touch | Date |
| Next Action | |
| Notes | |

---

## Auto-Update from Notion (via Kira)

### Sync Mechanism
Kira runs a daily sync (part of morning brief cron):
1. Query Notion Tasks DB for all tasks
2. Map to appropriate company tab
3. Update stage, status, owner
4. Calculate dashboard metrics

### Implementation Notes
- Google Sheets API via service account
- Script: `~/kira/scripts/workflows/notion-to-sheets.js` (to build)
- Runs on cron: daily at 6:00 AM Amsterdam (before morning brief)
- Can also be triggered manually by Kira

### Data Flow
```
Notion Tasks DB → Kira sync script → Google Sheets API → Tracker Sheet
```

---

## NOT Building Yet
This is the design spec only. Build when:
1. Google Sheets API service account is set up
2. Otto approves the design
3. Notion data is stable enough to sync reliably

**Estimated build time:** 4-6 hours (script + sheet setup + testing)
