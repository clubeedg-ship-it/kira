# 15 — Error Handling

> No white screens. No silent failures. Every error has a recovery path.

---

## Principles

1. **Crash one page, not the app** — Error boundaries per route
2. **Show what happened** — Real error message, not "Something went wrong"
3. **Offer a way out** — Every error state has a button (retry, go home, refresh)
4. **Log everything** — Server errors logged with request ID, user ID, stack trace
5. **Never expose internals** — User sees friendly message, server logs get the stack

---

## Frontend Error Handling

### Error Boundary (per route)

```tsx
// Wraps each <Route> child
<ErrorBoundary fallback={<PageError />}>
  <TasksPage />
</ErrorBoundary>
```

**PageError shows:**
- Red warning icon
- "This page encountered an error"
- Error message (sanitized — no stack traces)
- [Retry] button (remounts the component)
- [Go Home] button (navigates to /)

### API Error Handling

```typescript
// Every API call goes through apiFetch (from auth.ts)
// Handles: 401 → refresh token, 429 → rate limit message, 5xx → server error

try {
  const tasks = await apiFetch('/api/tasks');
  setTasks(tasks);
} catch (e) {
  if (e instanceof AuthError) {
    // Redirect to login (handled by AuthGuard)
    return;
  }
  setError(e.message);  // Show in-page error banner
}
```

### Loading + Error + Empty States

Every data-fetching component has 3 states:

```tsx
function TasksPage() {
  const { data, loading, error } = useQuery('/api/tasks');
  
  if (loading) return <TasksSkeleton />;
  if (error) return <PageError message={error} onRetry={refetch} />;
  if (data.length === 0) return <EmptyState icon="✅" message="No tasks yet" action="Create Task" />;
  
  return <TasksBoard tasks={data} />;
}
```

---

## Backend Error Handling

### Global Error Handler

```typescript
// Wraps every route handler
async function handleRequest(req, res) {
  try {
    await routeHandler(req, res);
  } catch (e) {
    const requestId = req.headers['x-request-id'] || ulid();
    
    // Log full error server-side
    console.error(`[${requestId}] ${req.method} ${req.url} — ${e.stack}`);
    
    // Return sanitized error to client
    const status = e.statusCode || 500;
    const message = status < 500 ? e.message : 'Internal server error';
    
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      data: null,
      error: { code: e.code || 'INTERNAL', message, requestId },
      meta: { timestamp: new Date().toISOString() },
    }));
  }
}
```

### Error Classes

```typescript
class AppError extends Error {
  constructor(message: string, public statusCode: number, public code: string) {
    super(message);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) { super(`${resource} not found`, 404, 'NOT_FOUND'); }
}

class ForbiddenError extends AppError {
  constructor() { super('Access denied', 403, 'FORBIDDEN'); }
}

class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(`Rate limit exceeded. Try again in ${retryAfter}s`, 429, 'RATE_LIMITED');
  }
}

class QuotaExceededError extends AppError {
  constructor(quota: string) {
    super(`${quota} quota exceeded. Upgrade your plan.`, 429, 'QUOTA_EXCEEDED');
  }
}
```

---

## What v1 Got Wrong (Never Again)

| Mistake | Prevention |
|---------|-----------|
| API returned envelope, frontend expected raw array | Single `apiFetch()` that always unwraps `.data` |
| `useApi` hook didn't send auth token | Auth token injected by `apiFetch()`, not per-component |
| One page crash = white screen | Error boundary on every route |
| No error messages for API failures | Toast/banner system for non-fatal errors |
| Tailwind missing = unstyled pages with no visible error | Build verification step: check CSS file size > 10KB |
