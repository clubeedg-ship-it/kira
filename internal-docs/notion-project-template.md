# Notion Project Template Standard

## Hierarchy

```
AREA (e.g., IAM, CuttingEdge, ZenithCred)
├── 📁 VDR (Virtual Data Room) — lives here, evolves with area
├── 📊 Area Overview
│   └── All projects in this area (relation view)
│
└── PROJECT (specific initiative within area)
    ├── 📋 Project Overview
    │   ├── Goal
    │   ├── What's being built
    │   └── How it works
    ├── 🔗 Quick Navigation
    ├── 📊 Task Tracker (inline database)
    ├── 📑 Document Index (inline database)
    ├── ✅ Phase Checklist (sequential to-dos)
    └── 📅 Deadlines
```

## Why VDR at Area Level?

VDR contains:
- Business plans, financial models, pitch decks
- Legal docs, contracts, cap tables
- Technical docs, architecture decisions
- Marketing materials, brand assets

These evolve with the **venture** (Area), not specific projects. Multiple projects feed INTO the same VDR.

Example:
- **IAM Area** → VDR with all IAM docs
  - Project: Website Rebrand → creates docs that go into IAM VDR
  - Project: Email Outreach → creates docs that go into IAM VDR
  - Project: Sales Expansion → creates docs that go into IAM VDR

---

## Project Page Template

### 📋 Project Overview
**Goal:** [One sentence]

**What's being built:** [Brief description]

**How it works:** [Process/approach]

---

### 🔗 Quick Navigation
- [Link to Area VDR]
- [Link to related projects]

---

### 📊 Task Tracker
| Task | Owner | Status | Due |
|------|-------|--------|-----|
| ... | Kira/Otto | ... | ... |

**Owner options:** Kira (agent), Otto (human), Both

---

### 📑 Document Index
| Document | Location | Status |
|----------|----------|--------|
| ... | ~/kira/vdr/... | Draft/Final |

---

### ✅ Phase Checklist

Sequential steps in natural language. Format: `CATEGORY - Description`

- [ ] RESEARCH - Understand market and requirements
- [ ] DESIGN - Create mockups/specs
- [ ] BUILD - Development/execution
- [ ] TEST - Verify quality
- [ ] LAUNCH - Go live
- [ ] ITERATE - Gather feedback, improve

---

### 📅 Deadlines

| Milestone | Date | Status |
|-----------|------|--------|
| ... | YYYY-MM-DD | On track / At risk / Done |

---

## Area Page Template

### 🎯 [Area Name]

**What:** [One sentence description of the venture]

**Status:** Active / On Hold / Sold

**Owner:** Otto

---

### 📁 VDR (Virtual Data Room)
[Embedded child page with all documents for this venture]

- Business Model
- Financial Projections
- Technical Architecture
- Marketing Strategy
- Legal / Contracts
- Pitch Materials

---

### 📊 Active Projects
[Relation to Projects database, filtered by this Area]

---

### 📝 Notes / Context
[Running notes about the venture, strategic decisions, investor conversations, etc.]

---

## Implementation Checklist

- [ ] Move VDR from project pages to area pages
- [ ] Create Area pages for all ventures
- [ ] Link projects to their areas
- [ ] Apply template to existing projects
- [ ] Set up Task Tracker databases per project
- [ ] Set up Document Index databases per project
