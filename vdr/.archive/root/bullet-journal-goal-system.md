# Bullet Journal Goal System for Notion

## Overview

A digital bullet journal system integrated with Notion for tracking goals, tasks, and progress. Inspired by Ryder Carroll's Bullet Journal method, adapted for digital + AI coordination.

---

## Core Components

### 1. 📅 Daily Log (Rapid Logging)
**Database: Daily Notes**

Each day has:
- **Date** (title)
- **Energy Level** (select: 🔴 Low / 🟡 Medium / 🟢 High)
- **Top 3** (text: 3 most important tasks)
- **Notes** (text: quick capture)
- **Gratitude** (text: 1 thing)
- **Tomorrow** (text: preview)

**Signifiers (use in text):**
- `•` Task
- `×` Completed
- `>` Migrated (moved to future)
- `<` Scheduled (moved to calendar)
- `○` Event
- `—` Note
- `!` Priority
- `*` Inspiration

### 2. 📆 Monthly Log
**Database: Monthly Goals**

Properties:
- **Month** (title: "2026-02 February")
- **Theme** (text: monthly focus)
- **Goals** (multi-select: linked to goal database)
- **Wins** (text: end-of-month reflection)
- **Lessons** (text: what learned)
- **Score** (number: 1-10 self-rating)

### 3. 🎯 Goal Tracker
**Database: Goals**

Properties:
- **Goal** (title)
- **Area** (relation: Areas database)
- **Type** (select: Outcome / Habit / Project)
- **Timeframe** (select: Q1 / Q2 / Q3 / Q4 / Year / Ongoing)
- **Status** (status: Not Started / In Progress / Achieved / Abandoned)
- **Progress** (number: 0-100%)
- **Key Results** (text: measurable outcomes)
- **Why** (text: motivation)
- **Due Date** (date)

### 4. 🔄 Collections (Themed Lists)
**Separate pages or databases for:**
- Ideas Inbox
- Reading List
- People to Meet
- Places to Go
- Projects Someday/Maybe
- Lessons Learned

---

## Workflows

### Morning Routine (5 min)
1. Open Daily Log for today
2. Set Energy Level
3. Review yesterday's incomplete tasks
4. Migrate (>) important ones to today
5. Write Top 3 for today

### Evening Routine (5 min)
1. Mark completed tasks (×)
2. Migrate unfinished important tasks (>)
3. Write 1 gratitude
4. Preview tomorrow (optional)

### Weekly Review (Sunday, 15 min)
1. Review all daily logs from the week
2. Count completed vs migrated tasks
3. Update Goal Tracker progress %
4. Plan next week's focus
5. Clear/archive done items

### Monthly Review (Last day, 30 min)
1. Complete Monthly Log
2. Review all goals - update status
3. Set next month's theme
4. Migrate any abandoned goals to Someday/Maybe
5. Score the month 1-10

---

## Notion Calendar Integration

Goals and Projects with dates show in Notion Calendar:
- **Goal due dates** → Calendar
- **Project deadlines** → Calendar  
- **Monthly reviews** → Recurring event

---

## AI Integration (Kira)

### Nightly Planner Cron (22:00)
Kira reviews:
- Upcoming deadlines (3-7 days)
- In-progress projects
- Weekly recurring tasks
- Goal progress

Outputs:
- Tomorrow's Top 3 recommendation
- Urgent alerts
- Weekly check-in reminders

### Heartbeat Checks
During heartbeats, Kira can:
- Update goal progress based on project status
- Remind about overdue tasks
- Suggest task migrations

### Voice Capture (Future)
Otto speaks → Kira transcribes → Creates Daily Log entry

---

## Visual System

### Status Colors
- 🔴 Urgent / Blocked / Low energy
- 🟡 In Progress / Medium priority
- 🟢 On Track / High energy / Completed
- ⚪ Not Started / Someday

### Progress Bars (in Notion)
Use formula property:
```
slice("██████████", 0, round(prop("Progress") / 10)) + slice("░░░░░░░░░░", 0, 10 - round(prop("Progress") / 10))
```

Shows: `████████░░` for 80%

---

## Quick Reference

| Symbol | Meaning | Action |
|--------|---------|--------|
| `•` | Task | Do it |
| `×` | Done | Celebrate |
| `>` | Migrated | Moved to future |
| `<` | Scheduled | On calendar |
| `○` | Event | Time-bound |
| `—` | Note | Reference |
| `!` | Priority | Do first |
| `*` | Inspiration | Save for later |

---

## Implementation Checklist

- [ ] Create Monthly Goals database
- [ ] Create Goals database with properties
- [ ] Add formula for progress bar
- [ ] Set up Daily Notes template
- [ ] Configure nightly planner cron
- [ ] Create weekly review template
- [ ] Create monthly review template
- [ ] Link Goals ↔ Areas ↔ Projects

---

## Example Goal Entry

**Goal:** Launch OTTOGEN.IO website
**Area:** OTTOGEN.IO
**Type:** Project
**Timeframe:** Q1
**Status:** In Progress
**Progress:** 20%
**Key Results:**
- Website live with 5 pages
- 10 cornerstone content pieces published
- 1000 unique visitors in first month
**Why:** Personal brand is the foundation for all ventures
**Due Date:** 2026-03-15
