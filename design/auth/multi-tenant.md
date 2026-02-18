# Multi-Tenant Architecture

> **Goal:** Multiple users share one Kira deployment with complete data isolation. No user can ever see another user's data.

---

## User Accounts

### Registration Methods

| Method | Flow |
|--------|------|
| Email + Password | Register → verify email → login |
| Google OAuth | Click → consent → auto-create account |
| GitHub OAuth | Click → consent → auto-create account |
| Invite link | Admin generates link → recipient clicks → creates account with pre-set role |

### Account Data Model

```typescript
interface User {
  id: string;             // UUID v4
  email: string;          // unique, verified
  displayName: string;
  passwordHash?: string;  // bcrypt, null if OAuth-only
  oauthProviders: {       // linked OAuth accounts
    provider: 'google' | 'github';
    providerId: string;
  }[];
  role: 'user' | 'admin';
  createdAt: Date;
  lastLoginAt: Date;
  setupCompleted: boolean;
  quotas: UserQuotas;
  preferences: UserPreferences;
}

interface UserQuotas {
  maxTokensPerDay: number;    // -1 = unlimited
  maxStorageMb: number;       // default: 500
  maxChannels: number;        // default: 5
  maxSubAgents: number;       // default: 3
}
```

### Authentication Flow

1. **Login:** Email/password or OAuth → issue JWT (access token, 15min) + refresh token (30 days)
2. **Session:** Access token in `Authorization: Bearer` header; refresh silently
3. **MFA (future):** TOTP via authenticator app, required for admin role
4. **Password requirements:** 8+ chars, breached password check (HaveIBeenPwned API, k-anonymity)

---

## Session Isolation

### Principle: Every User Is a Universe

Each user's data lives in a completely separate namespace. There is no shared state between users except system-level configuration.

### Isolation Boundaries

```
User A                          User B
├── agent/                      ├── agent/
│   ├── SOUL.md                │   ├── SOUL.md
│   ├── MEMORY.md              │   ├── MEMORY.md
│   └── config.json            │   └── config.json
├── memory/                     ├── memory/
│   ├── graph.db               │   ├── graph.db
│   └── daily/                 │   └── daily/
├── files/                      ├── files/
├── channels/                   ├── channels/
│   ├── telegram.json          │   ├── discord.json
│   └── discord.json           │   └── signal.json
└── keys/                       └── keys/
    ├── anthropic (encrypted)      ├── anthropic (encrypted)
    └── openrouter (encrypted)     └── openrouter (encrypted)
```

### Implementation

- **File system:** Each user gets `/data/users/{user_id}/` — all files scoped here
- **Database:** All tables include `user_id` column; every query includes `WHERE user_id = ?`
- **Memory graph:** Separate SQLite database per user (`/data/users/{id}/memory/graph.db`)
- **Agent process:** Each active user gets their own agent process with isolated context
- **API keys:** Stored per-user, encrypted with per-user key
- **Logs:** Per-user log files, never co-mingled

### What's Shared (System-Level Only)
- Application code and dependencies
- System configuration (port, domain, feature flags)
- Authentication infrastructure
- Usage metrics (anonymized)

---

## Data Boundaries

### No Cross-User Data Leakage

**Enforced at multiple layers:**

1. **API layer:** Middleware injects `user_id` from JWT; all service calls scoped to that user
2. **Database layer:** Row-level security; queries always filtered by `user_id`
3. **File system layer:** Chroot-like scoping; agent cannot access paths outside user directory
4. **Agent layer:** Agent's system prompt includes only that user's SOUL.md, memory, context
5. **LLM layer:** Each user's conversation history is separate; no shared context window

**Attack vectors we defend against:**

| Vector | Defense |
|--------|---------|
| IDOR (direct object reference) | All object access checks `user_id` ownership |
| Path traversal | Canonicalize paths, reject `../` |
| Agent prompt injection | Agent can only read files in user's directory |
| Shared model context | Each user's LLM calls are independent API calls |
| Log leakage | Per-user log files; no cross-user data in shared logs |
| Admin abuse | Admin actions are audit-logged; admin cannot read encrypted keys |

### Data Deletion

- User requests deletion → 30-day grace period → permanent delete
- Deletes: all files, memory graph, channel configs, encrypted keys, conversation history
- Retains (anonymized): aggregate usage stats for billing
- Compliance: GDPR right to erasure

---

## Admin Role

### Capabilities

| Action | Admin | User |
|--------|-------|------|
| View own agent/memory/files | ✅ | ✅ |
| Manage own API keys | ✅ | ✅ |
| View user list | ✅ | ❌ |
| View user quotas/usage | ✅ | ❌ |
| Modify user quotas | ✅ | ❌ |
| Disable/enable users | ✅ | ❌ |
| View audit logs | ✅ | ❌ |
| System configuration | ✅ | ❌ |
| Read other users' data | ❌ | ❌ |
| Access other users' keys | ❌ | ❌ |

**Key principle:** Admins manage the platform, not user data. Admins cannot read another user's conversations, memory, or decrypted API keys.

### Admin Dashboard

- **User management:** List users, see status (active/setup/disabled), last active
- **Usage overview:** Total tokens used, storage consumed, active channels
- **Quota management:** Set per-user or default quotas
- **Invite links:** Generate signup links with optional role pre-assignment
- **System health:** API provider status, channel connectivity, error rates
- **Audit log viewer:** Filterable log of sensitive actions

---

## Team Features (Future)

### Shared Projects
- A user creates a "project" and invites other users
- Project has its own file space, tasks, and goals
- Each user's agent can access shared project files (read-only or read-write per member)
- Project memory is separate from personal memory

### Shared Agents
- A team can create a shared agent (e.g., "Team Assistant")
- Shared agent has its own SOUL.md, memory, channels
- Multiple users can talk to it; it maintains context per-user but has shared project knowledge
- Ownership: team admin controls the shared agent

### Shared Memory Subsets
- Users can "share" specific memory nodes with teammates
- E.g., share a decision log, project notes, meeting summaries
- Shared memories are read-only copies (originals stay with owner)
- Revokable: owner can un-share at any time

### Access Model for Teams
```
Team
├── Members (user_id[], role: owner|admin|member)
├── Projects
│   ├── Files (shared)
│   ├── Tasks (shared)
│   └── Access control (per-member permissions)
├── Shared Agent (optional)
│   ├── SOUL.md
│   ├── Memory (shared context)
│   └── Channels (team channels)
└── Shared Memories (curated subsets)
```

---

## Scaling Considerations

> **v1.0: SQLite. Migration path to PostgreSQL documented in cost/scalability.md**

### Single Instance (MVP)
- All users on one server
- SQLite per user for memory graph
- Shared SQLite (WAL mode) for auth, metadata, usage tracking
- File system storage for user data

### Multi-Instance (Future)
- Users assigned to instances by consistent hashing
- Shared auth service (JWT validation at gateway)
- Object storage (S3) for user files
- Migration to PostgreSQL for shared auth/metadata database

### Resource Limits
- Agent process: max 512MB RAM, 30s CPU per turn
- File storage: configurable per-user quota (default 500MB)
- Conversation history: rolling window, oldest archived
- Channel connections: max 5 per user (configurable)
