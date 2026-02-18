# Heartbeat Process — Separate Background Worker

> **Status:** ✅ DESIGNED | **Phase:** 2
> **Purpose:** Standalone background process that runs on a schedule (every 5 minutes), handling system maintenance without consuming the main agent's context window. This is the "autonomic nervous system" — it keeps things running without conscious attention.

---

## 1. Design Intent

The heartbeat was originally part of the main agent conversation loop, consuming context window tokens for maintenance tasks. This design separates it into an independent process with its own cron schedule, minimal context, and cheap model usage.

**Key principle:** The heartbeat never holds conversation history. It reads from and writes to the database. The main agent reads from the database. They never share a context window.

---

## 2. Architecture

```
┌───────────────────────────────────────────────────┐
│  MAIN AGENT (Opus/Sonnet)                         │
│  Context: Conversation history + user context      │
│  Triggered by: User message                        │
│  Reads: SOP database, memory, agent status         │
│  DOES NOT: Run heartbeats, check messages          │
└───────────────────────────────────────────────────┘
        │ reads from shared DB │
┌───────────────────────────────────────────────────┐
│  HEARTBEAT PROCESS (Haiku/Sonnet)                  │
│  Context: Minimal (heartbeat state + today's data) │
│  Triggered by: Cron (every 5 minutes)              │
│  Cost target: < $0.10/day                          │
│  Does: Maintenance, triage, checks, briefs         │
│  Writes: SOP database, input queue, notifications  │
└───────────────────────────────────────────────────┘
```

---

## 3. Tick Jobs (Every 5 Minutes)

Each tick runs a series of fast, cheap checks. Total tick duration target: < 30 seconds.

### 3.1 New Message Check (< 5s)

Query each bridge for new messages since last check. For each new message → run through triage engine (see triage-engine.md). Updates `heartbeat_state.last_message_check`.

### 3.2 Agent Completion Check (< 3s)

Query `agent_work_log` for entries since last check. For completed tasks: update task status, create input_queue items if needed, check dependency cascades.

### 3.3 Deadline Warning Check (< 2s)

Query tasks where `due_date` is approaching. Create notifications: overdue (immediate), due today (if not already notified), due this week (once at week start).

### 3.4 Dependency Resolution Check (< 2s)

Query `dependencies` table for blocked items where all blockers are now done. Unblock them: update status, assign to agent if executor_type='agent', notify if human.

### 3.5 Memory Maintenance (< 10s, every 30 min)

Only runs every 6th tick. Tasks: compact short-term memory (promote to long-term), run graph enrichment (extract new entity relationships), prune stale facts (confidence decay), pre-load context for upcoming calendar events.

### 3.6 Stale Item Check (< 2s, hourly)

Find input_queue items pending > configured threshold (default 3 days). Escalate: bump priority, send reminder notification.

### 3.7 Health Check (< 1s)

Verify: API keys valid, bridge connections alive, disk space adequate, database not corrupted. Log health status. Alert on failures.

---

## 4. Scheduled Jobs

### 4.1 Morning Brief (06:00)

Uses Sonnet to generate a structured daily brief. Collects: today's scheduled tasks, overnight agent completions, pending input queue items, calendar events, deadline warnings, key result progress. Outputs a structured brief stored in `reviews` table (type='daily') and pushed as notification.

### 4.2 Evening Close (20:00)

Automated daily close: roll incomplete tasks to tomorrow (update scheduled_date), calculate daily stats (completed, created, input queue processed), update key_results with any new metrics, create daily review entry.

### 4.3 Review Triggers

| Review | Trigger | Action |
|--------|---------|--------|
| Weekly | Friday 17:00 | Create input_queue item: "Weekly review ready" with pre-generated summary |
| Monthly | Last day of month | Create input_queue item with monthly objective progress |
| Quarterly | Last week of quarter | Create input_queue item with quarterly planning template |

---

## 5. State Tracking

```sql
CREATE TABLE heartbeat_state (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Keys:
-- last_tick              — datetime of last heartbeat run
-- last_message_check     — datetime of last bridge poll
-- last_memory_maintenance — datetime of last memory cycle
-- last_stale_check       — datetime of last stale item scan
-- last_health_check      — datetime of last health verification
-- tick_count_today       — integer, resets at midnight
-- daily_cost             — float, cumulative heartbeat cost today
-- brief_generated_today  — boolean
-- close_generated_today  — boolean
```

---

## 6. Model Usage & Cost

| Job | Model | Frequency | Est. Cost/Day |
|-----|-------|-----------|---------------|
| Tick checks (no LLM) | None | Every 5 min | $0.00 |
| Triage (per message) | Haiku | Per message | ~$0.001/msg |
| Morning brief | Sonnet | Once/day | ~$0.02 |
| Evening close | Sonnet | Once/day | ~$0.01 |
| Memory maintenance | Haiku | Every 30 min | ~$0.01 |
| **Total** | | | **< $0.05/day** |

---

## 7. Configuration

Stored in `heartbeat_config` (or settings table):

| Setting | Default | Description |
|---------|---------|-------------|
| `heartbeat_interval` | 5 min | Time between ticks (1-15 min) |
| `morning_brief_time` | 06:00 | When to generate morning brief |
| `evening_close_time` | 20:00 | When to run evening close |
| `auto_rollover` | true | Roll incomplete tasks to next day |
| `stale_threshold_days` | 3 | Days before input queue items escalate |
| `memory_maintenance_interval` | 30 min | How often to run memory cycle |
| `weekly_review_day` | 5 (Friday) | Day of week for weekly review trigger |
| `cost_limit_daily` | $0.10 | Daily cost cap for heartbeat |

---

## 8. Error Handling

| Error | Response |
|-------|----------|
| Bridge connection failed | Log, retry next tick, alert after 3 consecutive failures |
| LLM API timeout | Skip LLM-dependent jobs this tick, retry next tick |
| Database locked | Wait 1s, retry once, skip tick if still locked |
| Cost limit reached | Disable LLM-dependent jobs, continue DB-only checks |
| Heartbeat process crash | Systemd auto-restart, log crash, alert |

---

## 9. Monitoring

**SSE events emitted by heartbeat:**
- `system.heartbeat` — emitted each tick (used by UI health indicator)
- `system.brief_generated` — morning brief ready
- `system.review_due` — review triggered

**Dashboard indicator:** Small pulse dot in the header bar showing heartbeat is alive. Green = last tick < 10 min ago. Yellow = 10-30 min. Red = > 30 min (heartbeat may be down).

---

*The heartbeat is the background autonomic system. It keeps Kira alive, aware, and maintained without requiring the main agent's attention. Cheap, fast, essential.*