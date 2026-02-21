# Agent Output Specification

Every agent must output work in this standard format. Write outputs to `~/kira/agents/outputs/` as JSON files.

## Output Types

### task
Creates a task for Otto or another agent.
```json
{
  "type": "task",
  "agent": "strategist",
  "timestamp": "2026-02-21T20:00:00Z",
  "task": {
    "title": "Follow up with HERAN Partners",
    "description": "They match ZenithCred thesis perfectly. Send intro email.",
    "priority": "high",
    "sourceContext": "Portfolio review found ZenithCred stalled — no investor outreach in 2 weeks",
    "keyPoints": ["€90M HealthTech fund", "Antwerp-based", "Thesis: digital health + gamification"],
    "assignee": "user",
    "project": "zenithcred",
    "dueDate": "2026-02-24"
  }
}
```

### document
Creates or updates a working document.
```json
{
  "type": "document",
  "agent": "strategist",
  "timestamp": "2026-02-21T20:00:00Z",
  "document": {
    "title": "Weekly Portfolio Review — W8 2026",
    "filename": "portfolio-review-w8.md",
    "category": "strategy",
    "content": "# Portfolio Review...",
    "replaces": "portfolio-review-w7.md"
  }
}
```

### decision
Requires Otto's input. Goes to inbox.
```json
{
  "type": "decision",
  "agent": "strategist",
  "timestamp": "2026-02-21T20:00:00Z",
  "decision": {
    "question": "Should we pause SentinAgro to focus resources on ZenithCred?",
    "recommendation": "Yes — SentinAgro has no near-term revenue path. ZenithCred has 20 VCs mapped and a seed round target.",
    "evidence": [
      "SentinAgro: 0 revenue, 0 pilots, no MVP",
      "ZenithCred: €1.1M seed target, 20 VCs identified, pilot proposal ready",
      "Otto's time split: 10% on each, neither getting enough attention"
    ],
    "options": [
      {"label": "Pause SentinAgro", "description": "Focus 100% on ZenithCred for 3 months"},
      {"label": "Keep both", "description": "Continue spreading attention"},
      {"label": "Kill SentinAgro", "description": "Remove from portfolio entirely"}
    ],
    "urgency": "this_week"
  }
}
```

### fact
Feeds the knowledge graph.
```json
{
  "type": "fact",
  "agent": "researcher",
  "timestamp": "2026-02-21T20:00:00Z",
  "fact": {
    "entity": "HERAN Partners",
    "key": "fund_size",
    "value": "€90M",
    "confidence": 0.9,
    "source": "https://heranpartners.com/about"
  }
}
```

### alert
Urgent notification.
```json
{
  "type": "alert",
  "agent": "operator",
  "timestamp": "2026-02-21T20:00:00Z",
  "alert": {
    "severity": "critical",
    "message": "Disk usage at 92% on Proxmox host",
    "action": "Clean Docker images and old logs"
  }
}
```

## File Naming
`~/kira/agents/outputs/{agent}-{timestamp}-{type}.json`

Example: `strategist-2026-02-21T2000-decision.json`

## Processing
Kira (main session) reads outputs on heartbeat and routes them:
- task → creates in operations system / notifies Otto
- document → saves to ~/kira/vdr/{category}/
- decision → sends to Otto via Telegram/WebUI
- fact → feeds into knowledge graph
- alert → immediate notification if critical
