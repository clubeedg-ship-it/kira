# Error Handling

## Error Categories

### 1. Transient Errors (Retry)

Temporary failures that resolve on their own.

| Error | Detection | Handling | User Communication |
|-------|-----------|----------|--------------------|
| API rate limit (429) | HTTP status code | Retry after `Retry-After` header, max 3 retries | Silent if resolved in <5s; otherwise "Thinking..." indicator |
| Network timeout | Request timeout | Retry once after 2s | Silent if resolved; "Having trouble reaching [service]..." if not |
| Database busy/locked | SQLite BUSY error | Retry with backoff (100ms, 500ms, 2s) | Never shown — always resolves |
| Temporary API error (500/502/503) | HTTP status code | Retry 3x with exponential backoff | "The AI service is having issues, retrying..." |

**Retry Policy:**
```typescript
interface RetryConfig {
  maxRetries: number;       // Default: 3
  baseDelay: number;        // Default: 1000ms
  maxDelay: number;         // Default: 30000ms
  backoffFactor: number;    // Default: 2
  retryableStatuses: number[]; // [408, 429, 500, 502, 503, 504]
}

async function withRetry<T>(fn: () => Promise<T>, config: RetryConfig): Promise<T> {
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === config.maxRetries || !isRetryable(err)) throw err;
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );
      await sleep(delay);
    }
  }
}
```

### 2. Permanent Errors (Report)

Failures that won't resolve without intervention.

| Error | Detection | Handling | User Communication |
|-------|-----------|----------|--------------------|
| Invalid API key | 401/403 from provider | Stop retrying, flag config issue | "Your API key for [provider] is invalid. Update it in Settings → API Keys." |
| Model not available | 404 or model-specific error | Fall back to next model in chain | "Switched to [fallback model] — your preferred model isn't available right now." |
| Out of credits | 402 or balance check | Stop API calls | "You've run out of API credits. Add more at [provider dashboard link]." |
| Corrupt database | integrity_check fails | Restore from backup | "I had a database issue and restored from backup. You may have lost the last [N] messages." |
| Incompatible config | Schema validation failure | Use defaults, log warning | "Some settings were invalid and reset to defaults. Check Settings to review." |

### 3. User-Fixable Errors (Guide)

Errors the user can resolve with guidance.

| Error | Detection | Handling | User Communication |
|-------|-----------|----------|--------------------|
| Missing API key | Empty config field | Block feature, guide setup | "To use AI features, add your OpenRouter API key: `kira config set openrouter.key YOUR_KEY`" |
| Port in use | EADDRINUSE | Try next port, or guide user | "Port 3001 is in use. Either stop the other app or run `kira config set dashboard.port 3002`" |
| Disk full | Disk check <1% free | Guide cleanup | "Disk is full. Run `kira cleanup` to free space, or delete old logs manually." |
| Permission denied | EACCES on file ops | Guide fix | "Can't write to [path]. Check permissions: `chmod 755 [path]`" |
| Unsupported Node version | Startup version check | Block startup | "Kira requires Node.js 20+. You have [version]. Install via: `nvm install 20`" |

---

## API Error Response Format

All API endpoints return errors in a consistent format:

```typescript
interface ApiError {
  error: {
    code: string;           // Machine-readable: "RATE_LIMITED", "AUTH_FAILED"
    message: string;        // Human-readable: "Too many requests, try again in 30s"
    details?: unknown;      // Additional context (validation errors, etc.)
    retryable: boolean;     // Can the client retry?
    retryAfter?: number;    // Seconds to wait before retry
  };
}
```

**HTTP status mapping:**

| Code | Status | When |
|------|--------|------|
| `VALIDATION_ERROR` | 400 | Bad request body |
| `AUTH_REQUIRED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Valid token but insufficient permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Dependency down |

**Example:**
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again in 30 seconds.",
    "retryable": true,
    "retryAfter": 30
  }
}
```

---

## Frontend Error Boundaries

### Component-Level Crash Isolation

Each major UI section is wrapped in an error boundary so one crash doesn't take down the whole app.

```tsx
// Boundary zones:
<ErrorBoundary fallback={<ChatError />}>
  <ChatPanel />           {/* If chat crashes, other panels survive */}
</ErrorBoundary>

<ErrorBoundary fallback={<WidgetError />}>
  <WidgetGrid />          {/* Bad widget doesn't kill dashboard */}
</ErrorBoundary>

<ErrorBoundary fallback={<SettingsError />}>
  <SettingsPanel />
</ErrorBoundary>
```

### Widget Sandboxing

User-generated widgets run in sandboxed iframes:
- Widget crash → iframe shows error, rest of dashboard unaffected
- Widget infinite loop → killed after 5s timeout
- Widget memory limit → 50MB per iframe

### Error UI Patterns

**Inline error** (non-blocking):
> ⚠️ Couldn't load weather widget. [Retry] [Remove Widget]

**Toast notification** (transient):
> "Saved!" / "Connection restored" / "Failed to send — retrying..."

**Full-page error** (fatal):
> "Something went wrong. [Reload] [Report Bug]"
> Shows error ID for support.

---

## Agent Error Handling

### Tool Call Failures

When a tool call fails during agent execution:

1. **Retry once** if the error is transient (network, timeout)
2. **Skip and continue** if the tool is non-critical (e.g., web search fails → respond without it)
3. **Report to user** if the tool is critical to the request

```typescript
async function executeToolCall(tool: string, args: unknown): Promise<ToolResult> {
  try {
    return await tools[tool].execute(args);
  } catch (err) {
    if (isRetryable(err)) {
      return await tools[tool].execute(args); // One retry
    }
    
    // Return error as tool result — let the LLM decide how to handle
    return {
      error: true,
      message: `Tool '${tool}' failed: ${err.message}`,
    };
  }
}
```

The LLM receives the error as a tool result and can:
- Try an alternative approach
- Ask the user for help
- Report the failure gracefully

### Sub-Agent Crashes

When a sub-agent (spawned for a background task) crashes:

1. Log the crash with full context (task, input, error, partial output)
2. **Do NOT retry automatically** (sub-agents can be expensive)
3. Report to main agent: "Sub-agent for [task] failed: [error]"
4. Main agent decides: retry, skip, or ask user

```typescript
interface SubAgentResult {
  status: 'success' | 'failed' | 'timeout';
  output?: string;
  error?: string;
  tokensUsed: number;
  durationMs: number;
}
```

### Timeout Handling

| Operation | Timeout | On Timeout |
|-----------|---------|------------|
| Main agent response | 120s | Send partial response + "I'm taking too long, let me try a simpler approach" |
| Sub-agent task | 60s | Kill, report failure to main agent |
| Tool call | 30s | Return error to LLM |
| Widget generation | 10s | Return fallback widget |

### Error Logging for Agent Failures

Every agent error is logged with:
```json
{
  "timestamp": "2026-02-11T09:51:00Z",
  "level": "error",
  "component": "agent",
  "event": "tool_call_failed",
  "agent_id": "main",
  "session_id": "abc123",
  "tool": "web_search",
  "error": "ETIMEDOUT",
  "input_tokens": 1500,
  "elapsed_ms": 30000,
  "user_message": "What's the weather?",
  "recovery": "skipped_tool"
}
```
