---
name: kira-agents
description: Interact with Kira's C-suite agent registry and job orchestration queue. List agents, submit tasks, check job status, and view activity.
metadata:
  {
    "openclaw": { "emoji": "👔", "requires": { "anyBins": ["node", "sqlite3"] } },
  }
---

# Kira Agents Skill

Interact with Kira's C-suite agent registry and job orchestration queue. Use this skill to list agents, submit tasks, check job status, and view activity.

## Commands

### List all agents
Show all registered C-suite agents with their status, role, and department.
```bash
node /home/adminuser/kira/src/index.js agents
```

### Submit a job to an agent
Assign a task to a specific agent by their ID.
```bash
node /home/adminuser/kira/src/index.js job submit <agent_id> <description>
```

Agent IDs:
- `cfo` - Chief Financial Officer (finance, budgets, runway)
- `cmo` - Chief Marketing Officer (growth, branding, content)
- `coo` - Chief Operating Officer (operations, logistics, process)
- `cto` - Chief Technology Officer (architecture, infrastructure, tech)
- `qa` - Quality Assurance (testing, validation, standards)
- `researcher` - Research Analyst (market research, competitive intel)

Example:
```bash
node /home/adminuser/kira/src/index.js job submit cfo "Prepare Q1 runway analysis for Oopuo Holdings"
```

### Check job status
Get details on a specific job by ID.
```bash
node /home/adminuser/kira/src/index.js job status <job_id>
```

### List recent jobs
Show the 20 most recent jobs with status and assignment.
```bash
node /home/adminuser/kira/src/index.js job list
```

## Database Queries

For deeper agent and job queries, use SQLite directly at `~/.kira/kira.db`.

### Agent details
```bash
sqlite3 ~/.kira/kira.db "SELECT id, label, role, department, status, capabilities FROM agents;"
```

### Jobs by status
```bash
sqlite3 ~/.kira/kira.db "SELECT id, title, status, agent_id, priority, created_at FROM jobs WHERE status = '<status>' ORDER BY priority DESC LIMIT 10;"
```
Status values: `pending`, `running`, `completed`, `failed`

### Jobs for a specific agent
```bash
sqlite3 ~/.kira/kira.db "SELECT id, title, status, priority, created_at FROM jobs WHERE agent_id = '<agent_id>' ORDER BY created_at DESC LIMIT 10;"
```

### Blackboard messages (inter-agent coordination)
```bash
sqlite3 ~/.kira/kira.db "SELECT agent_id, type, topic, content, priority, timestamp FROM blackboard WHERE resolved = 0 ORDER BY timestamp DESC LIMIT 10;"
```

## Tips

- Always list agents first to confirm available agent IDs
- Use `job list` to check current workload before submitting new jobs
- Check the blackboard for active coordination between agents
- Jobs are queued by priority (1-10, higher = more urgent)
