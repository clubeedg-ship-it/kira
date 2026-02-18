# Scalability

## Single User → Multi-User: What Changes

### Architecture Changes

| Component | Single User | Multi-User |
|-----------|-------------|------------|
| Authentication | None / local token | JWT + sessions, OAuth |
| Database | Single SQLite file | Per-user schemas or PostgreSQL |
| Memory/context | Single memory directory | Isolated per user |
| API keys | User's own keys | Shared managed keys or per-user BYOK |
| File storage | Local filesystem | Object storage (S3/MinIO) |
| Processes | Single gateway + dashboard | Shared gateway, per-user agent workers |
| Config | Single config file | Per-user settings in DB |

### Data Isolation

Every user's data must be fully isolated:
- Conversations, memory, files — no cross-user access
- API keys stored encrypted per user
- Agent context never shared between users

```typescript
// All queries scoped by user
const messages = await db.all(
  'SELECT * FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
  [userId]
);
```

---

## Resource Sharing

### Shared Infrastructure (Multi-User)

| Resource | Sharing Strategy |
|----------|-----------------|
| Local models (Ollama) | Shared instance, request queuing |
| Dashboard server | Shared, user sessions |
| Gateway | Shared, per-user routing |
| SQLite → PostgreSQL | Shared DB, row-level security |
| Cron scheduler | Shared, per-user job isolation |
| Embedding model | Shared, batch requests |

### Local Model Queuing

```typescript
// Single Ollama instance, queue requests
class ModelQueue {
  private queue: Array<{ request: ModelRequest; resolve: Function; reject: Function }> = [];
  private concurrency: number; // Based on GPU VRAM
  private active = 0;

  async enqueue(request: ModelRequest): Promise<ModelResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.processNext();
    });
  }

  private async processNext() {
    if (this.active >= this.concurrency || this.queue.length === 0) return;
    this.active++;
    const { request, resolve, reject } = this.queue.shift()!;
    try {
      resolve(await this.executeModel(request));
    } catch (err) {
      reject(err);
    } finally {
      this.active--;
      this.processNext();
    }
  }
}
```

---

## Horizontal Scaling

### Load Balancer Architecture

```
                    ┌─────────────┐
                    │   Nginx /   │
                    │   Caddy LB  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │  Kira #1   │ │ Kira #2│ │  Kira #3   │
        │ (gateway)  │ │(gateway)│ │ (gateway)  │
        └─────┬──────┘ └───┬───┘ └─────┬──────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │
                    │  (shared)   │
                    └─────────────┘
```

### Scaling Strategy

**v1.0**: Single instance (SQLite). Handles 1 user easily, up to ~10 with careful resource management.

**v1.x**: Vertical scaling. Bigger machine, more RAM, faster SSD. SQLite handles this fine up to ~50 concurrent users.

**v2.0**: Horizontal scaling. Multiple instances + PostgreSQL.

### Session Affinity

Agent conversations require session state. Options:
1. **Sticky sessions** — route same user to same instance (simplest)
2. **Shared state in Redis** — any instance can handle any user
3. **Stateless agents** — reload context from DB per request (highest latency)

**v1.0 recommendation**: Sticky sessions. Simple, works, no extra infrastructure.

---

## Database Scaling: SQLite → PostgreSQL

### Migration Path

**Phase 1 (v1.0): SQLite**
- Single file, zero config
- WAL mode for concurrent reads
- Perfect for single user / small team
- Limit: ~50 concurrent users, ~10GB database

**Phase 2 (v1.x): SQLite with read replicas**
- Main SQLite for writes
- Litestream for real-time replication
- Read replicas for dashboard queries
- Limit: ~100 concurrent users

**Phase 3 (v2.0): PostgreSQL**
- Full migration when SQLite limits are hit
- Row-level security for multi-tenancy
- Connection pooling (PgBouncer)
- Full-text search (tsvector replaces FTS5)

### Migration Tool

```typescript
// Abstract database interface — same API regardless of backend
interface Database {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

// Implementations
class SQLiteDatabase implements Database { /* ... */ }
class PostgresDatabase implements Database { /* ... */ }

// Factory
function createDatabase(config: DatabaseConfig): Database {
  if (config.type === 'postgresql') return new PostgresDatabase(config);
  return new SQLiteDatabase(config);
}
```

**SQL compatibility**: Write queries that work on both SQLite and PostgreSQL. Avoid SQLite-specific syntax. Use the query builder for complex queries.

---

## CDN for Static Assets

### Dashboard Static Files

```
Dashboard build output:
├── index.html          (2KB)
├── assets/
│   ├── app.abc123.js   (200KB gzipped)
│   ├── app.abc123.css  (30KB gzipped)
│   └── vendor.def456.js (150KB gzipped)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

**Self-hosted (v1.0):** Dashboard server serves static files directly. Good enough for single user.

**CDN (v2.0):** For cloud-hosted version:
- Static assets on Cloudflare R2 / AWS CloudFront
- Cache-busted filenames (content hash)
- ~50ms global load times vs ~200ms from origin

---

## Rate Limiting

### Per-User Limits

```typescript
import { RateLimiter } from './rate-limiter';

const limits = {
  // API requests
  api: new RateLimiter({ window: '1m', max: 60 }),           // 60 req/min
  
  // Agent conversations
  conversation: new RateLimiter({ window: '1h', max: 100 }), // 100 messages/hour
  
  // Sub-agent spawning
  subagent: new RateLimiter({ window: '1h', max: 20 }),      // 20 sub-agents/hour
  
  // Widget refresh
  widget: new RateLimiter({ window: '1m', max: 30 }),         // 30 refreshes/min
};

// Middleware
app.use('/api/chat', async (req, res, next) => {
  const userId = req.user.id;
  if (!await limits.conversation.check(userId)) {
    return res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many messages. Try again in a minute.' }
    });
  }
  next();
});
```

### v1.0 Scope

Rate limiting is **optional for single-user** but the infrastructure should exist:
- Prevents runaway sub-agents from burning budget
- Protects against bugs that create infinite loops
- Ready for multi-user when needed

### Scaling Summary

| Users | Database | Architecture | Infrastructure |
|-------|----------|-------------|----------------|
| 1 | SQLite | Single process | Any machine |
| 2–10 | SQLite | Single process | 2GB RAM, 2 cores |
| 10–50 | SQLite + Litestream | Single instance | 4GB RAM, 4 cores |
| 50–500 | PostgreSQL | Multi-instance + LB | Cloud VMs + managed DB |
| 500+ | PostgreSQL + Redis | Microservices | Kubernetes |
