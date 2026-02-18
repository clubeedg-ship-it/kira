# SOP Engine ↔ Agent Integration

> **Status:** ✅ DESIGNED | **Phase:** 2
> **Purpose:** Defines how the multi-agent system maps onto the SOP engine hierarchy. How agents get assigned work, execute tasks, report results, and create input queue items.

---

## 1. Integration Overview

The SOP engine is the data layer (tasks, projects, dependencies). The agent system is the execution layer. They communicate through shared database tables: agents read from `tasks`, write to `agent_work_log` and `input_queue`. The orchestrator (kira-coo) sits between them, assigning work, monitoring progress, and handling escalations.

---

## 2. Agent Registration

Every agent lives in the `agents` table with: name, role (orchestrator/specialist/worker), capabilities (JSON array of task types), autonomy level (autonomous/checkpoint/supervised), area assignments (JSON array or null for all), model preference, and max concurrent task limit.

### Built-in Agents

| Agent | Role | Capabilities | Autonomy | Areas |
|-------|------|-------------|----------|-------|
| `kira-coo` | orchestrator | routing, planning, review | autonomous | All |
| `research-agent` | specialist | research, compare, analyze | checkpoint | All |
| `comms-agent` | specialist | draft, reply, schedule | checkpoint | All |
| `code-agent` | specialist | build, fix, deploy, test | checkpoint | Tech areas |

---

## 3. Task Assignment Flow

A task is assignable when: `executor_type='agent'`, `status='todo'`, all dependencies resolved, and target agent has capacity. The orchestrator queries assignable tasks by priority_score, matches to available agents by capability and area, then spawns agent subprocess.

### Task Type Mapping

| Task Pattern | Capability | Agent |
|-------------|-----------|-------|
| Research, Compare, Analyze, Find | `research` | research-agent |
| Draft, Write email, Reply, Schedule | `email`, `write` | comms-agent |
| Build, Fix, Configure, Deploy, Test | `code` | code-agent |
| Design, Create (ambiguous) | — | → input_queue for user classification |

---

## 4. Agent Work Cycle

1. Build context (task, project, related docs, principles, memory)
2. Execute (LLM call with agent system prompt and tools)
3. Save output to VDR under project directory
4. Log work to `agent_work_log`
5. If `requires_input != 'no'`: create input_queue entry, task → 'waiting'
6. If `requires_input == 'no'`: task → 'done', cascade check for unblocked dependents
7. Agent status → 'idle'

### Failure Handling

| Failure | Response |
|---------|----------|
| LLM API error | Retry 3x, then block + escalate |
| Time limit (30min) | Kill, log partial, block + escalate |
| User rejects output | Task → 'todo', agent retries with feedback |
| Tool failures (3x) | Escalate to human |

---

## 5. Input Queue Integration

### Creating Items

Agent creates input_queue entry with: task_id, agent_id, queue_type (verify/decide/classify), title, description, deliverable path, area_id, priority.

### Resolution Effects

| User Action | Task | Queue | Cascade |
|------------|------|-------|---------|
| Approve | → done | → resolved (approved) | Unblock dependents |
| Edit & Approve | → done | → resolved (edited) | Unblock dependents |
| Redo | → todo (re-queued) | → resolved (redo + notes) | Agent retries |
| Dismiss | → cancelled | → dismissed | Check dependents |
| Choose option (decide) | Continues | → resolved (option chosen) | Agent continues |
| Delegate to agent | executor → agent | → resolved (delegated) | Agent picks up |

### Dependency Cascade

After task completion: query dependents → if all blockers done → if agent-executable, mark 'todo' for next cycle; if human, notify via SSE.

---

## 6. Cost Tracking

Every LLM call logs: agent_id, task_id, model, tokens, cost_usd. Aggregated by: agent/day, project, area.

### Cost Limits

| Limit | Default | Effect |
|-------|---------|--------|
| Per agent/day | $5.00 | Agent pauses |
| Global/day | $20.00 | All agents pause |
| Per task | $2.00 | Escalate to human |

---

## 7. Performance Metrics

Tracked per agent: completion rate (30d), approval rate, redo rate, avg completion time, cost per task. Agents earn XP (+10 first-try approval, +5 edited approval, -3 redo, -5 failure). Level = XP / 100.

---

## 8. Orchestrator Logic

### Task Decomposition

User describes goal → orchestrator creates full SOP hierarchy (objective → project → milestones → tasks) → classifies executors → sets dependencies → presents as input_queue 'verify' for user approval.

### Load Balancing

Priority: critical path first → deadline → explicit priority → area activity. Agent selection: matching capability + idle → queue if busy.

### Escalation

| Trigger | Action |
|---------|--------|
| Stuck > 30min | Pause + blocker item |
| 3 failures same task | Reclassify as human |
| Queue unprocessed > 3d | Daily reminder |
| Project at risk (< 7d, behind) | High-priority alert |

---

## 9. API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/agents` | GET | List agents |
| `/api/v1/agents/:id` | GET | Agent detail + stats |
| `/api/v1/agents/:id` | PATCH | Update config |
| `/api/v1/agents/:id/assign` | POST | Manual task assignment |
| `/api/v1/agents/:id/pause` | POST | Pause agent |
| `/api/v1/agents/:id/resume` | POST | Resume agent |
| `/api/v1/agents/:id/work-log` | GET | Work history |
| `/api/v1/agents/:id/costs` | GET | Cost breakdown |
| `/api/v1/orchestrator/assign` | POST | Trigger assignment cycle |
| `/api/v1/orchestrator/decompose` | POST | Decompose goal → SOP |

---

*The SOP-Agent integration bridges planning and execution. The SOP engine defines WHAT and WHO. Agents execute. The input queue is the handoff. Together: a semi-autonomous execution engine.*