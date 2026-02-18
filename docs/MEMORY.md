# Memory System Guide

## Quick Start

### Log an Event
```bash
node ~/kira/scripts/memory/memory-core.js log '{
  "type": "task",
  "summary": "What you did",
  "outcome": "success",
  "importance": 8,
  "tags": ["project", "feature"]
}'
```

### Search Memory
```bash
# Text search in episodes
node ~/kira/scripts/memory/episodes.js search '{"text":"sales","limit":10}'

# Vector/semantic search
node ~/kira/scripts/memory/embeddings.js search "sales automation" 5
```

### Run Self-Reflection
```bash
node ~/kira/scripts/memory/reflection.js run 7  # Last 7 days
```

### Check Status
```bash
node ~/kira/scripts/memory/memory-core.js status
```

## Event Types

| Type | Use For |
|------|---------|
| `interaction` | Conversations, Q&A |
| `task` | Work completed |
| `decision` | Choices made |
| `learning` | New knowledge |
| `error` | Failures to learn from |
| `milestone` | Significant achievements |
| `consolidation` | Memory maintenance |

## Importance Scale

| Score | Meaning |
|-------|---------|
| 1-3 | Routine, forgettable |
| 4-6 | Normal work |
| 7-8 | Significant |
| 9-10 | Critical milestone |

## Blackboard Types

| Type | Purpose |
|------|---------|
| `discovery` | Agent found something useful |
| `request` | Agent needs help |
| `response` | Reply to a request |
| `fact` | Verified information |
| `procedure` | Suggested workflow |

## Procedures

### Save a Procedure
```bash
node ~/kira/scripts/memory/procedures.js save \
  "Procedure Name" \
  "Description of what it does" \
  '[{"action":"step1"},{"action":"step2"}]'
```

### Find Best Procedure
```bash
node ~/kira/scripts/memory/procedures.js find "task description"
```

### Record Usage
```bash
node ~/kira/scripts/memory/procedures.js usage proc-id true  # success
node ~/kira/scripts/memory/procedures.js usage proc-id false # failure
```

## Embeddings

### Index All Episodes
```bash
node ~/kira/scripts/memory/embeddings.js index
```

### Check Ollama Status
```bash
node ~/kira/scripts/memory/embeddings.js status
```

## Reflection Output

The reflection system generates:
1. **Stats**: Event counts, success rates
2. **Insights**: Patterns discovered
3. **Recommendations**: Suggested improvements

Reflections are saved to `memory/reflections/reflection-YYYY-MM-DD.json`

## Best Practices

1. **Log significant events** — Don't over-log routine tasks
2. **Use appropriate importance** — Reserve 9-10 for real milestones
3. **Tag consistently** — Use established tags for searchability
4. **Reflect regularly** — Run reflection weekly or after failures
5. **Extract procedures** — When a task succeeds, save the workflow
