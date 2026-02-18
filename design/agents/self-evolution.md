# Self-Evolution Design

## Overview

Kira agents improve over time by tracking goals, logging decisions, learning from mistakes, and incorporating user feedback. This is not AGI self-modification — it's structured, auditable adaptation of prompts, preferences, and procedures stored in workspace files.

---

## 1. Goal Management

### Goal Structure

```typescript
interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  priority: 1 | 2 | 3 | 4 | 5;       // 1 = highest
  created: string;                      // ISO timestamp
  updated: string;
  due?: string;                         // optional deadline
  parent_goal?: string;                 // for sub-goals
  progress: number;                     // 0-100
  notes: string[];                      // progress updates
  success_criteria: string[];           // how to know it's done
}
```

### Goal Storage

```yaml
# ~/kira/goals/active.yaml
goals:
  - id: g001
    title: "Design Kira multi-agent system"
    priority: 1
    status: active
    progress: 40
    success_criteria:
      - "All design docs written"
      - "Architecture reviewed by user"
      - "Implementation plan created"
    sub_goals:
      - id: g001a
        title: "Write agent system design docs"
        status: active
        progress: 80
      - id: g001b
        title: "Implement basic sub-agent spawning"
        status: paused
        progress: 0

  - id: g002
    title: "Daily briefing system"
    priority: 3
    status: active
    progress: 60
```

### Goal Lifecycle

```
User request or agent initiative
        │
        ▼
  ┌─────────────┐
  │ Create Goal  │ ← extract from conversation
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐     ┌──────────────┐
  │  Decompose   │────→│  Sub-Goals    │
  └──────┬──────┘     └──────────────┘
         │
         ▼
  ┌─────────────┐
  │   Execute    │ ← work on tasks, update progress
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  Complete/   │ ← verify success criteria
  │  Abandon     │
  └─────────────┘
```

**Goal review happens during heartbeats:**
- Check active goals, update progress estimates
- Flag stalled goals (no progress in 3+ days)
- Suggest re-prioritization to user when conflicts arise

---

## 2. Decision Logging

Every significant decision is recorded with rationale, so the agent (and user) can understand past reasoning.

### Decision Log Format

```typescript
interface Decision {
  id: string;
  timestamp: string;
  agent: string;                        // which agent made it
  category: string;                     // 'architecture' | 'tool_choice' | 'communication' | 'delegation' | 'self_config'
  description: string;                  // what was decided
  rationale: string;                    // why
  alternatives_considered: string[];    // what else was possible
  confidence: number;                   // 0-1
  outcome?: string;                     // filled in later
  outcome_rating?: 'good' | 'neutral' | 'bad';
}
```

### Storage

```jsonl
# ~/kira/memory/decisions.jsonl (append-only)
{"id":"d001","ts":"2026-02-11T09:50:00Z","agent":"main","cat":"delegation","desc":"Spawned sub-agent for design docs instead of writing inline","rationale":"5 files, each 2000+ words — would blow context window. Sub-agent can focus.","alternatives":["Write inline","Write sequentially with context management"],"confidence":0.9}
{"id":"d002","ts":"2026-02-11T10:00:00Z","agent":"main","cat":"tool_choice","desc":"Used web_search instead of web_fetch for battery research","rationale":"Need broad overview first, not specific page content","alternatives":["Direct web_fetch to known sources"],"confidence":0.7}
```

### When to Log Decisions

- Choosing to delegate vs. do inline
- Selecting a model for a sub-agent
- Choosing between tools for a task
- Deciding autonomy level for an ambiguous action
- Any non-obvious choice where an alternative existed

**Not logged:** Routine choices (which file to read first, formatting preferences).

---

## 3. Learning from Mistakes

### Error → Analysis → Update Pipeline

```
Error occurs (tool failure, user correction, bad output)
        │
        ▼
  ┌─────────────────┐
  │  Log the Error    │ → memory/errors.jsonl
  └──────┬──────────┘
         │
         ▼
  ┌─────────────────┐
  │  Root Cause       │ ← What went wrong? Why?
  │  Analysis         │
  └──────┬──────────┘
         │
         ▼
  ┌─────────────────┐
  │  Procedure Update │ ← Update relevant config/prompt/workflow
  └──────┬──────────┘
         │
         ▼
  ┌─────────────────┐
  │  Verify Fix       │ ← Next occurrence handled correctly?
  └─────────────────┘
```

### Error Log

```typescript
interface ErrorRecord {
  id: string;
  timestamp: string;
  agent: string;
  category: 'tool_failure' | 'wrong_output' | 'user_correction' | 'timeout' | 'escalation_missed' | 'permission_error';
  description: string;
  root_cause: string;
  fix_applied: string;
  fix_location: string;             // which file was updated
  recurrence_count: number;         // times this class of error has happened
}
```

### Example Error → Fix Cycle

```jsonl
# Error: Agent used markdown tables in Discord
{"id":"e001","ts":"2026-02-10T15:00:00Z","cat":"wrong_output","desc":"Sent markdown table in Discord channel — rendered as garbage","root_cause":"Forgot platform formatting rules","fix":"Added explicit check in AGENTS.md platform formatting section","fix_location":"AGENTS.md","recurrence":0}

# Error: Sub-agent timed out on research task
{"id":"e002","ts":"2026-02-11T08:00:00Z","cat":"timeout","desc":"Researcher agent timed out at 300s — topic too broad","root_cause":"Default timeout too low for deep research","fix":"Updated researcher specialist default timeout to 600s","fix_location":"config/specialists.yaml","recurrence":0}
```

### Pattern Detection

During heartbeats, the agent reviews recent errors:

```python
# Pseudocode for pattern detection
errors = load_recent_errors(days=7)
categories = group_by(errors, 'category')

for cat, group in categories:
    if len(group) >= 3:
        # Recurring pattern — needs systemic fix
        create_improvement_task(
            title=f"Fix recurring {cat} errors",
            context=group,
            priority=2
        )
```

---

## 4. Self-Improvement

### What Agents Can Modify

| File | What Changes | Why |
|------|-------------|-----|
| `AGENTS.md` | Behavioral rules, conventions | Learned better practices |
| `HEARTBEAT.md` | Heartbeat checklist | New checks needed, old ones retired |
| `TOOLS.md` | Tool-specific notes | Learned device names, preferences |
| `config/specialists.yaml` | Specialist agent configs | Tuned timeouts, models, prompts |
| `prompts/*.md` | Agent system prompts | Improved instructions based on outcomes |
| `config/autonomy.yaml` | Autonomy level overrides | User feedback on what needs approval |

### Self-Modification Protocol

```
1. Agent identifies improvement opportunity
2. Agent drafts the change
3. If change affects safety/autonomy:
   → Present to user for approval (RED action)
4. If change is behavioral/performance:
   → Apply and report (YELLOW action)
5. Log the change in decisions.jsonl
6. Monitor for improvement in subsequent interactions
```

### Example: Prompt Self-Improvement

```markdown
# Before (researcher prompt)
You are a research agent. Search the web and compile findings.

# Agent notices: research outputs lack source citations
# Self-improvement applied:

# After (researcher prompt)  
You are a research agent. Search the web and compile findings.

## Requirements
- Every claim must include a source URL
- Rate source reliability (high/medium/low)
- Distinguish facts from speculation
- Include "Last verified: {date}" for time-sensitive claims
```

---

## 5. Feedback Loops

### User Correction → Preference Update

```
User: "Don't use bullet points for everything, I prefer prose"
        │
        ▼
  Agent updates preferences:
  1. memory/preferences.yaml: { formatting: { prefer_prose: true, avoid_bullet_lists: true } }
  2. MEMORY.md: "User prefers prose over bullet lists"
  3. Applies immediately to current and future responses
```

### Preference Storage

```yaml
# ~/kira/memory/preferences.yaml
formatting:
  prefer_prose: true
  code_style: "detailed comments"
  response_length: "thorough but not padded"
  
communication:
  tone: "casual, direct"
  humor: "appreciated, dry"
  emoji_usage: "minimal"
  report_frequency: "batched, not per-action"
  
workflow:
  auto_commit: true
  preferred_tools:
    search: web_search          # over web_fetch for initial research
    editor: edit                # over write for modifications
  delegation_threshold: "complex multi-file tasks"
  
schedule:
  active_hours: "08:00-23:00 UTC"
  preferred_briefing_time: "09:00 UTC"
  quiet_hours: "23:00-08:00 UTC"
```

### Feedback Integration Flow

```
User correction/preference expressed
        │
        ▼
  ┌──────────────────┐
  │ Extract preference│ ← NLP: what is the user actually asking for?
  └──────┬───────────┘
         │
         ▼
  ┌──────────────────┐
  │ Update storage    │ ← preferences.yaml, MEMORY.md, relevant configs
  └──────┬───────────┘
         │
         ▼
  ┌──────────────────┐
  │ Apply immediately │ ← current session behavior changes
  └──────┬───────────┘
         │
         ▼
  ┌──────────────────┐
  │ Propagate         │ ← sub-agent prompts updated, specialist configs
  └──────────────────┘
```

---

## 6. Performance Metrics

### What Agents Track

```typescript
interface AgentMetrics {
  // Efficiency
  avg_response_time_ms: number;
  avg_tokens_per_task: number;
  tasks_completed: number;
  tasks_failed: number;
  
  // Quality
  user_corrections: number;           // times user corrected output
  escalations_needed: number;         // times sub-agent escalated
  retry_count: number;                // tool retries
  
  // Cost
  daily_token_usage: { input: number; output: number };
  daily_cost_usd: number;
  cost_per_task_avg: number;
  
  // Self-improvement
  self_modifications: number;         // config/prompt changes
  errors_fixed: number;
  recurring_errors: number;           // errors that happened 3+ times
  
  // Memory
  memory_facts_stored: number;
  memory_retrievals: number;
  context_compactions: number;
}
```

### Daily Metrics Report

```yaml
# Auto-generated: ~/kira/memory/metrics/2026-02-11.yaml
date: "2026-02-11"
summary:
  tasks_completed: 12
  tasks_failed: 1
  user_corrections: 2
  sub_agents_spawned: 4
  total_cost_usd: 3.45
  
efficiency:
  avg_response_time_ms: 4200
  avg_tokens_per_task: 15000
  longest_task: { description: "Battery research", duration_s: 340, tokens: 85000 }
  
quality:
  corrections:
    - "Used wrong date format — updated preference"
    - "Too verbose in summary — noted preference for conciseness"
  errors:
    - { type: "timeout", task: "API integration research", resolved: true }

improvements_applied:
  - "Updated researcher timeout to 600s"
  - "Added date format preference to preferences.yaml"
```

### Weekly Review (Automated via Cron)

```markdown
# Weekly Self-Review — Week of 2026-02-10

## What Went Well
- Completed 45 tasks with 93% success rate
- User corrections down 30% from last week
- Average response time improved by 15%

## What Needs Improvement
- 3 timeout errors on research tasks → increased default timeout
- Still occasionally using bullet lists (user prefers prose)
- Cost trending up: $24.50 this week vs $18.00 last week

## Changes Made
- Researcher timeout: 300s → 600s
- Added prose preference check to response generation
- Switched low-priority sub-agents from sonnet to haiku (-$3/week est.)

## Goals Progress
- g001 (Multi-agent system): 40% → 80%
- g002 (Daily briefings): 60% → 60% (stalled — needs user input)
```
