# Cron System Design

## Overview

Kira's cron system enables scheduled, autonomous agent work. Jobs run as isolated sessions — separate from the main conversation — and deliver results via messages or files.

Built on OpenClaw's native cron support (`openclaw cron`).

---

## 1. Schedule Types

### One-Shot

Run once at a specific time, then auto-delete.

```yaml
type: one-shot
run_at: "2026-02-11T15:00:00Z"
# Automatically removed after execution
```

**Use cases:** Reminders, delayed tasks, follow-ups.

### Recurring

Run at fixed intervals.

```yaml
type: recurring
interval: "30m"          # every 30 minutes
# or
interval: "6h"           # every 6 hours
# or
interval: "1d"           # daily
start_at: "2026-02-11T09:00:00Z"  # first run
end_at: "2026-12-31T23:59:59Z"    # optional expiry
```

### Cron Expression

Standard cron syntax for complex schedules.

```yaml
type: cron
expression: "0 9 * * 1-5"    # 9 AM weekdays
timezone: "UTC"
```

---

## 2. Job Types

### System Events (Main Session)

Delivered as messages to the main agent session. The main agent processes them within its conversation context.

```yaml
job_type: system_event
delivery: main_session
# Main agent sees this as a heartbeat-like message
# Has full conversation context
```

**Use cases:** Heartbeats, periodic memory maintenance, context-aware reminders.

### Agent Turns (Isolated)

Spawn an independent agent session. No access to main session history.

```yaml
job_type: agent_turn
delivery: channel          # or file
model: anthropic/claude-sonnet-4-20250514
tools: [web_search, web_fetch, read, write, message]
system_prompt: |
  You are a cron agent running a scheduled task.
  Complete your task and deliver results.
max_turns: 20
timeout: 120s
```

**Use cases:** Daily briefings, monitoring, research tasks, health checks.

---

## 3. Job Definition

```typescript
interface CronJob {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  
  // Schedule
  schedule: {
    type: 'one-shot' | 'recurring' | 'cron';
    expression?: string;           // cron expression
    interval?: string;             // recurring interval
    run_at?: string;               // one-shot time
    timezone: string;
  };
  
  // Execution
  execution: {
    type: 'system_event' | 'agent_turn';
    model?: string;                // for agent_turn
    tools?: string[];
    system_prompt?: string;
    task: string;                  // the actual task description
    max_turns?: number;
    timeout_seconds?: number;
    context_files?: string[];      // files to inject
  };
  
  // Delivery
  delivery: {
    target: 'main_session' | 'channel' | 'file';
    channel_id?: string;           // for channel delivery
    file_path?: string;            // for file delivery
    silent?: boolean;              // suppress notification
  };
  
  // Failure handling
  failure: {
    retry_count: number;           // 0 = no retries
    retry_delay_seconds: number;
    escalate_after_failures: number; // notify user after N consecutive failures
    escalation_channel?: string;
  };
  
  // Chaining
  chain?: {
    on_success?: string;           // job_id to trigger
    on_failure?: string;
    condition?: string;            // expression to evaluate on result
  };
  
  // Metadata
  created_by: string;
  created_at: string;
  last_run?: string;
  last_status?: 'success' | 'failure' | 'timeout';
  run_count: number;
  failure_count: number;
}
```

---

## 4. Example Jobs

### Daily Morning Briefing

```yaml
id: daily-briefing
name: "Morning Briefing"
description: "Daily summary of weather, calendar, and news"
enabled: true
schedule:
  type: cron
  expression: "0 9 * * *"         # 9 AM daily
  timezone: UTC
execution:
  type: agent_turn
  model: anthropic/claude-sonnet-4-20250514
  tools: [web_search, web_fetch, read, message]
  task: |
    Generate a morning briefing for the user:
    1. Weather forecast for today (check user location in preferences)
    2. Calendar events today (read from calendar integration)
    3. Top 3 news headlines relevant to user interests
    4. Any pending reminders or tasks from ~/kira/goals/active.yaml
    
    Format as a concise, friendly message. Send via message tool.
  max_turns: 15
  timeout_seconds: 120
  context_files:
    - ~/kira/memory/preferences.yaml
    - ~/kira/goals/active.yaml
delivery:
  target: channel
  channel_id: "7985502241"
failure:
  retry_count: 2
  retry_delay_seconds: 300
  escalate_after_failures: 3
```

### Memory Maintenance

```yaml
id: memory-maintenance
name: "Memory Maintenance"
description: "Curate memory, prune old data, update MEMORY.md"
enabled: true
schedule:
  type: cron
  expression: "0 3 * * *"         # 3 AM daily (quiet hours)
  timezone: UTC
execution:
  type: agent_turn
  model: anthropic/claude-sonnet-4-20250514
  tools: [read, write, edit, exec]
  task: |
    Perform memory maintenance:
    1. Review memory files from the past 3 days
    2. Extract important facts and update MEMORY.md
    3. Check for outdated entries in MEMORY.md and remove them
    4. Run context monitor: node ~/chimera/scripts/context-monitor.js
    5. Prune empty or redundant daily memory files older than 30 days
    6. Write a brief maintenance report to ~/kira/memory/maintenance-log.md
  max_turns: 30
  timeout_seconds: 300
  context_files:
    - ~/kira/MEMORY.md
delivery:
  target: file
  file_path: ~/kira/memory/maintenance-log.md
  silent: true
failure:
  retry_count: 1
  retry_delay_seconds: 600
  escalate_after_failures: 5
```

### Health Check

```yaml
id: health-check
name: "System Health Check"
description: "Check system health, disk space, services"
enabled: true
schedule:
  type: recurring
  interval: "6h"
execution:
  type: agent_turn
  model: google/gemini-2.0-flash-001   # cheap and fast
  tools: [exec, read, write, message]
  task: |
    Run system health checks:
    1. Disk space: df -h (alert if any partition > 85%)
    2. Memory: free -h
    3. Running services: systemctl status openclaw
    4. Git status: any uncommitted changes in ~/kira?
    5. Error log: check ~/kira/memory/errors.jsonl for new entries
    
    Only message the user if something needs attention.
    Write results to ~/kira/memory/health/latest.json
  max_turns: 10
  timeout_seconds: 60
delivery:
  target: file
  file_path: ~/kira/memory/health/latest.json
  silent: true
failure:
  retry_count: 1
  retry_delay_seconds: 60
  escalate_after_failures: 2
```

### Reminder (One-Shot)

```yaml
id: reminder-abc123
name: "Meeting Reminder"
description: "Remind user about dentist appointment"
enabled: true
schedule:
  type: one-shot
  run_at: "2026-02-11T14:30:00Z"
execution:
  type: agent_turn
  model: google/gemini-2.0-flash-001
  tools: [message]
  task: |
    Send a reminder to the user:
    "🦷 Hey! Your dentist appointment is in 30 minutes (3 PM)."
  max_turns: 1
  timeout_seconds: 10
delivery:
  target: channel
  channel_id: "7985502241"
failure:
  retry_count: 3
  retry_delay_seconds: 30
  escalate_after_failures: 1
```

---

## 5. Autonomous Work Patterns

### Research Monitoring

```yaml
# Monitor a topic and alert on significant developments
id: monitor-ai-news
schedule:
  type: cron
  expression: "0 */4 * * *"       # every 4 hours
execution:
  type: agent_turn
  task: |
    Search for significant AI news in the last 4 hours.
    Compare with ~/kira/memory/ai-news-last.json.
    If anything genuinely significant (not routine), message the user.
    Update ai-news-last.json with current state.
  context_files:
    - ~/kira/memory/ai-news-last.json
```

### Metrics Collection

```yaml
id: daily-metrics
schedule:
  type: cron
  expression: "0 23 * * *"        # end of day
execution:
  type: agent_turn
  task: |
    Compile daily metrics from:
    - memory/agent-costs.json
    - memory/decisions.jsonl (today's entries)
    - memory/errors.jsonl (today's entries)
    - memory/audit-log.jsonl (today's entries)
    
    Write summary to memory/metrics/YYYY-MM-DD.yaml
    If it's Sunday, also generate weekly review.
```

---

## 6. Job Chaining

Jobs can trigger other jobs based on results.

```yaml
# Chain: Research → Summarize → Deliver
id: weekly-research
schedule:
  type: cron
  expression: "0 8 * * 1"         # Monday 8 AM
execution:
  task: "Research trends in {topic}, write findings to ~/kira/tmp/research-raw.md"
chain:
  on_success: weekly-research-summarize

---
id: weekly-research-summarize
schedule:
  type: none                       # only triggered by chain
execution:
  task: "Summarize ~/kira/tmp/research-raw.md into a 500-word brief"
  context_files:
    - ~/kira/tmp/research-raw.md
chain:
  on_success: weekly-research-deliver

---
id: weekly-research-deliver
schedule:
  type: none
execution:
  task: "Send the research brief to the user"
  tools: [read, message]
```

### Conditional Chaining

```yaml
chain:
  condition: "result.contains('ALERT')"
  on_match: alert-handler
  on_no_match: null                # do nothing
```

---

## 7. Failure Handling

### Retry Strategy

```
Attempt 1 → Failure
  ↓ wait retry_delay_seconds
Attempt 2 → Failure
  ↓ wait retry_delay_seconds * 2 (exponential backoff)
Attempt 3 → Failure
  ↓
Escalation (if consecutive_failures >= escalate_after_failures)
  ↓
Notify user: "⚠️ Cron job '{name}' has failed {N} times. Last error: {error}"
```

### Failure States

```typescript
type JobStatus = 
  | 'scheduled'      // waiting for next run
  | 'running'        // currently executing
  | 'success'        // last run succeeded
  | 'failure'        // last run failed
  | 'disabled'       // manually disabled after repeated failures
  | 'expired';       // one-shot that has run, or recurring past end_at
```

### Auto-Disable

After `escalate_after_failures * 3` consecutive failures, the job is automatically disabled to prevent resource waste. User must manually re-enable.

---

## 8. User-Facing Management

### Natural Language Interface

```
User: "Show me my cron jobs"
Agent: Lists all jobs with status, next run time, last result

User: "Run the health check now"
Agent: Triggers immediate execution of health-check job

User: "Remind me to call mom in 2 hours"
Agent: Creates one-shot reminder job

User: "Check AI news every morning at 8"
Agent: Creates recurring cron job

User: "Pause the daily briefing"
Agent: Sets enabled: false on daily-briefing job

User: "Delete the old reminder"
Agent: Removes the job
```

### Job List Display

```
📋 Scheduled Jobs

✅ daily-briefing     | 9 AM daily      | Last: ✓ 2h ago    | Next: tomorrow 9 AM
✅ memory-maintenance | 3 AM daily      | Last: ✓ 7h ago    | Next: tomorrow 3 AM
✅ health-check       | Every 6h        | Last: ✓ 1h ago    | Next: in 5h
⏸️ monitor-ai-news   | Every 4h        | Paused             |
⚠️ weekly-research   | Mon 8 AM        | Last: ✗ (timeout)  | Next: Mon 8 AM
```

### CLI Management

```bash
# List jobs
openclaw cron list

# Create job from YAML
openclaw cron create --file job.yaml

# Run immediately
openclaw cron run --id daily-briefing

# Enable/disable
openclaw cron enable --id monitor-ai-news
openclaw cron disable --id monitor-ai-news

# View history
openclaw cron history --id daily-briefing --limit 10

# Delete
openclaw cron delete --id reminder-abc123
```
