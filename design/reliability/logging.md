# Logging

## Structured JSON Logging

All Kira processes use structured JSON logging. No `console.log` in production.

### Log Format

```json
{
  "timestamp": "2026-02-11T09:51:00.123Z",
  "level": "info",
  "component": "gateway",
  "event": "request_completed",
  "message": "Agent response sent",
  "data": {
    "session_id": "abc123",
    "model": "claude-sonnet-4-20250514",
    "input_tokens": 1200,
    "output_tokens": 350,
    "duration_ms": 2840
  },
  "trace_id": "req-7f8a9b"
}
```

### Logger Implementation

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level(label) { return { level: label }; },
  },
  timestamp: pino.isoTime,
  redact: {
    paths: ['data.api_key', 'data.password', 'data.email', 'data.ip'],
    censor: '[REDACTED]',
  },
});

// Usage:
logger.info({ event: 'agent_started', session_id: 'abc' }, 'Agent session started');
logger.error({ event: 'tool_failed', tool: 'web_search', err }, 'Tool call failed');
```

**Library**: [pino](https://github.com/pinojs/pino) — fast, structured, JSON-native.

---

## Log Levels

| Level | When | Example |
|-------|------|---------|
| `debug` | Verbose internal state; disabled in production | "Parsed 3 tool calls from response" |
| `info` | Normal operations worth recording | "Agent response sent (2.8s, 350 tokens)" |
| `warn` | Something unexpected but handled | "API rate limited, retrying in 5s" |
| `error` | Something failed, needs attention | "Tool 'web_search' timed out after 30s" |
| `fatal` | Process cannot continue | "Database corrupt, shutting down" |

**Default levels:**
- Production: `info`
- Development: `debug`
- Configurable via `LOG_LEVEL` env var or `kira config set log.level debug`

---

## Log Rotation

Using `pino-roll` for file rotation:

```typescript
import { join } from 'path';

const transport = pino.transport({
  target: 'pino-roll',
  options: {
    file: join(KIRA_DATA_DIR, 'logs', 'kira'),
    frequency: 'daily',
    dateFormat: 'yyyy-MM-dd',
    limit: { count: 30 },  // Keep 30 days
    mkdir: true,
    extension: '.log',
  },
});
```

**File structure:**
```
~/.kira/logs/
├── kira.2026-02-11.log       # Today
├── kira.2026-02-10.log       # Yesterday
├── kira.2026-02-09.log       # ...
├── crashes/
│   └── gateway-2026-02-11T09:51:00.json
└── audit/
    └── config-changes.log     # Security-relevant changes
```

**Size limits:**
- Max file size: 100MB (rotate early if hit)
- Max total log size: 1GB (prune oldest if exceeded)
- Crash logs: keep 90 days

---

## Log Aggregation

### Single Searchable View

The dashboard provides a unified log viewer at `/dashboard/logs`:

- **Real-time streaming** via WebSocket (tail -f equivalent)
- **Search**: Full-text search across all log files
- **Filter by**: level, component, event, time range, trace_id
- **Context**: Click a log entry to see surrounding entries (±10 lines)

### Implementation

Logs are indexed into SQLite FTS5 for fast search:

```sql
CREATE VIRTUAL TABLE log_index USING fts5(
  timestamp,
  level,
  component,
  event,
  message,
  data,
  content='',               -- External content (logs stay in files)
  contentless_delete=1
);
```

Indexing happens asynchronously — a background worker tails log files and inserts into FTS. Slight delay (1-2s) is acceptable.

### CLI Access

```bash
kira logs                      # Tail all logs
kira logs --level error        # Only errors
kira logs --component agent    # Only agent logs
kira logs --since "1 hour ago" # Time filter
kira logs --search "timeout"   # Full-text search
kira logs --trace req-7f8a9b   # Follow a request
```

---

## Privacy: PII Scrubbing

### Automatic Redaction

Using pino's built-in `redact` option, the following paths are always scrubbed:

```typescript
const REDACT_PATHS = [
  'data.api_key',
  'data.password',
  'data.token',
  'data.email',
  'data.ip',
  'data.user_input',      // Don't log what the user typed
  'data.agent_response',  // Don't log full LLM responses
];
```

### What IS Logged

- Token counts and costs (not content)
- Model names and response times
- Tool names and success/failure (not arguments)
- Session IDs (pseudonymous)
- Error messages and stack traces

### What is NOT Logged

- User messages (content)
- Agent responses (content)
- API keys or tokens
- File contents
- Personal information

### Audit Log

Security-relevant events go to a separate audit log (not auto-purged):

- Config changes (who changed what, when)
- API key additions/removals
- Login attempts (if multi-user)
- Data exports/deletions

---

## Performance Logging

### Slow Query Detection

```typescript
// Database wrapper
async function query(sql: string, params: unknown[]): Promise<unknown> {
  const start = performance.now();
  const result = await db.all(sql, params);
  const duration = performance.now() - start;
  
  if (duration > 100) { // >100ms is slow for SQLite
    logger.warn({
      event: 'slow_query',
      sql: sql.substring(0, 200), // Truncate for safety
      duration_ms: Math.round(duration),
      rows: result.length,
    }, 'Slow database query');
  }
  
  return result;
}
```

### Slow API Call Detection

```typescript
// HTTP client wrapper
const API_SLOW_THRESHOLD: Record<string, number> = {
  'openrouter': 10000,  // LLM calls can be slow
  'default': 5000,
};

function logSlowApi(provider: string, endpoint: string, durationMs: number) {
  const threshold = API_SLOW_THRESHOLD[provider] || API_SLOW_THRESHOLD.default;
  if (durationMs > threshold) {
    logger.warn({
      event: 'slow_api',
      provider,
      endpoint,
      duration_ms: durationMs,
      threshold_ms: threshold,
    }, `Slow API call to ${provider}`);
  }
}
```

### Request Tracing

Every incoming request gets a `trace_id` that propagates through all internal calls:

```typescript
import { randomBytes } from 'crypto';

function generateTraceId(): string {
  return `req-${randomBytes(3).toString('hex')}`;
}

// Middleware
app.use((req, res, next) => {
  req.traceId = req.headers['x-trace-id'] || generateTraceId();
  // Attach to pino child logger
  req.log = logger.child({ trace_id: req.traceId });
  next();
});
```

This allows following a single user request through gateway → agent → tool calls → sub-agents → response.
