# 03 — Multi-Tenancy

> Every user is a universe. No cross-user data leakage. Ever.

---

## Data Model

### Shared (System-Level)

One SQLite DB: `/data/system.db`

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- ULID
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT,               -- bcrypt, null if OAuth-only
  role TEXT DEFAULT 'user',         -- user | admin
  tier TEXT DEFAULT 'free',         -- free | free-access | pro | self-hosted
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'none', -- none | active | past_due | canceled
  email_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT,
  disabled INTEGER DEFAULT 0
);

-- Sessions (JWT tracking)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,         -- SHA-256 of refresh token
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  revoked INTEGER DEFAULT 0
);

-- Usage (aggregate, for billing/admin)
CREATE TABLE usage_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_usage_user ON usage_log(user_id, created_at);

-- Rate limiting
CREATE TABLE rate_limits (
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  window_start INTEGER NOT NULL,    -- Unix timestamp
  count INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, endpoint, window_start)
);
```

### Per-User (Isolated)

Each user gets: `/data/users/{user_id}/`

```
/data/users/{user_id}/
├── kira.db              # Chat sessions, messages, tasks, goals
├── memory.db            # 4-layer memory (episodic, semantic, procedural, working)
├── settings.db          # Provider config, preferences (encrypted keys)
└── files/               # Uploaded documents, VDR
```

**Every query** against a per-user DB is inherently scoped — the file itself belongs to one user. No `WHERE user_id = ?` needed at the DB level because the entire database is the user's.

### Why Per-User SQLite (Not Shared DB + Row-Level Filtering)

1. **Impossible to leak** — physically separate files
2. **Easy backup/export** — tar the user's directory, done
3. **Easy deletion** — rm -rf the directory, GDPR complete
4. **No query mistakes** — can't forget WHERE user_id = X if there's no user_id column
5. **Performance** — each user's DB is small, fast, fits in OS cache
6. **Concurrency** — WAL mode handles the user's own concurrent reads/writes

### What About Scale?

At 10,000 users with 3 SQLite files each = 30,000 files. Linux handles this fine. At 100,000+ users, migrate to PostgreSQL with row-level security. That's a v3 problem.

---

## Isolation Enforcement

### Layer 1: API Middleware

```typescript
// Every authenticated request gets user_id injected
function authMiddleware(req, res, next) {
  const token = extractBearerToken(req);
  const payload = verifyJWT(token);
  req.userId = payload.sub;
  req.userRole = payload.role;
  next();
}
```

### Layer 2: Database Access

```typescript
// DB connection factory — always returns THIS user's DB
function getUserDb(userId: string, dbName: string): Database {
  const dbPath = join(DATA_DIR, 'users', userId, `${dbName}.db`);
  // Path traversal check
  if (!dbPath.startsWith(join(DATA_DIR, 'users', userId))) {
    throw new Error('Access denied');
  }
  return new Database(dbPath);
}
```

### Layer 3: File Access

```typescript
// File operations scoped to user directory
function getUserFilePath(userId: string, relativePath: string): string {
  const userDir = join(DATA_DIR, 'users', userId, 'files');
  const resolved = resolve(userDir, relativePath);
  // Prevent path traversal
  if (!resolved.startsWith(userDir)) {
    throw new Error('Access denied: path traversal attempt');
  }
  return resolved;
}
```

### Layer 4: LLM Calls

Each user's LLM calls are independent. No shared context, no shared conversation history. The system prompt is generated per-user from their own memory and config.

---

## Admin Access

Admins can:
- View user list (id, email, display_name, tier, last_login, usage_summary)
- Adjust quotas and tiers
- Disable/enable accounts
- View aggregate usage stats
- View system health

Admins **cannot**:
- Read any user's chat history
- Access any user's memory
- Decrypt any user's API keys
- Impersonate a user

---

## Quotas

```typescript
interface Quotas {
  messagesPerDay: number;    // -1 = unlimited
  tokensPerMonth: number;    // -1 = unlimited
  storageMb: number;
  maxChannels: number;
  maxSubAgents: number;
}

const TIER_DEFAULTS: Record<string, Quotas> = {
  free:        { messagesPerDay: 50, tokensPerMonth: 500_000, storageMb: 100, maxChannels: 1, maxSubAgents: 0 },
  'free-access': { messagesPerDay: -1, tokensPerMonth: -1, storageMb: 5000, maxChannels: 10, maxSubAgents: 5 }, // testing accounts — Pro features, no charge
  pro:         { messagesPerDay: -1, tokensPerMonth: -1, storageMb: 5000, maxChannels: 10, maxSubAgents: 5 },
  self:        { messagesPerDay: -1, tokensPerMonth: -1, storageMb: -1, maxChannels: -1, maxSubAgents: -1 },
};
```

Quota checks happen in middleware before the request reaches the route handler.

---

## Data Lifecycle

### Export
User can export all their data as a ZIP:
- All SQLite databases (as SQL dumps)
- All files
- Memory graph as JSON

### Deletion
1. User requests deletion
2. Account disabled immediately
3. 30-day grace period (user can cancel)
4. After 30 days: delete user directory, remove from system.db
5. Retain: anonymized usage stats for billing records
