# Internal API Reference

## Memory Core

### Log Event
```javascript
const { logEvent } = require('./scripts/memory/memory-core');

logEvent({
  type: 'task',
  summary: 'Description',
  outcome: 'success',
  importance: 8,
  tags: ['tag1']
});
```

### Recall Memory
```javascript
const { recall } = require('./scripts/memory/memory-core');

const results = recall({
  text: 'search term',
  task: 'find procedure for X',
  topic: 'blackboard topic',
  limit: 10
});
```

### Get Status
```javascript
const { status } = require('./scripts/memory/memory-core');
console.log(status());
```

## Episodes

### Log
```javascript
const { log } = require('./scripts/memory/episodes');

log({
  type: 'task',
  summary: 'What happened',
  outcome: 'success',
  importance: 7,
  tags: ['tag']
});
```

### Search
```javascript
const { search } = require('./scripts/memory/episodes');

search({
  text: 'keyword',
  type: 'task',
  outcome: 'success',
  since: '2026-02-01',
  limit: 20
});
```

## Procedures

### Save
```javascript
const { save } = require('./scripts/memory/procedures');

save({
  name: 'Procedure Name',
  description: 'What it does',
  steps: [{action: 'step1'}, {action: 'step2'}],
  tags: ['workflow']
});
```

### Find Best Match
```javascript
const { findBest } = require('./scripts/memory/procedures');

const matches = findBest('deploy to production', ['devops']);
```

## Blackboard

### Post
```javascript
const { post } = require('./scripts/memory/blackboard');

post({
  type: 'discovery',
  topic: 'memory',
  content: 'Found a pattern',
  priority: 'high'
});
```

### Query
```javascript
const { query } = require('./scripts/memory/blackboard');

query({
  type: 'request',
  unresolved: true,
  limit: 10
});
```

## Embeddings

### Embed Text
```javascript
const { embed } = require('./scripts/memory/embeddings');

const result = await embed('text to embed');
// { text: '...', vector: [...768 floats...] }
```

### Semantic Search
```javascript
const { search } = require('./scripts/memory/embeddings');

const results = await search('query', 10);
// [{ text: '...', score: 0.85 }, ...]
```

## Ollama (Local LLM)

### Generate
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:32b-instruct-q4_K_M",
  "prompt": "Your prompt",
  "stream": false
}'
```

### Embeddings
```bash
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "Text to embed"
}'
```

## Dashboard API

### GET /api/state
Returns current memory state:
```json
{
  "timestamp": "ISO8601",
  "episodes": [...],
  "blackboard": [...],
  "procedures": [...],
  "reflections": {...},
  "stats": {
    "totalEpisodes": 12,
    "unresolvedBlackboard": 2,
    "procedures": 2
  }
}
```

### GET /api/stream
Server-Sent Events stream. Emits state every 2 seconds.
```javascript
const evtSource = new EventSource('/api/stream');
evtSource.onmessage = (e) => {
  const state = JSON.parse(e.data);
};
```
