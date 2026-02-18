# Permissions & Access Control

> **Goal:** Fine-grained control over what users and agents can do, with every sensitive action recorded.

---

## User Permissions

### Role-Based Access Control (RBAC)

Two roles (expandable later):

| Permission | User | Admin |
|------------|------|-------|
| Manage own agent | ✅ | ✅ |
| Manage own API keys | ✅ | ✅ |
| Manage own channels | ✅ | ✅ |
| Manage own files | ✅ | ✅ |
| View own usage/costs | ✅ | ✅ |
| Delete own account | ✅ | ✅ |
| View all users | ❌ | ✅ |
| Manage user quotas | ❌ | ✅ |
| Disable/enable users | ❌ | ✅ |
| View system audit log | ❌ | ✅ |
| System configuration | ❌ | ✅ |
| View other users' data | ❌ | ❌ |

### Session Management

- Users can view active sessions (device, IP, last active)
- Revoke individual sessions or "log out everywhere"
- Admin can force-revoke sessions for any user

---

## Agent Permissions (Autonomy Levels)

Agents operate within a permission framework that controls what they can do without asking.

### Autonomy Levels

| Level | Name | Description |
|-------|------|-------------|
| 0 | **Supervised** | Agent does nothing without explicit approval |
| 1 | **Cautious** (default) | Reads freely, writes with confirmation, no external actions |
| 2 | **Balanced** | Reads/writes freely, external actions with confirmation |
| 3 | **Autonomous** | Most actions without asking, confirms only destructive/irreversible |
| 4 | **Full Auto** | Everything permitted, audit log only |

### Permission Matrix by Level

| Action | L0 | L1 | L2 | L3 | L4 |
|--------|----|----|----|----|-----|
| Read files | Ask | ✅ | ✅ | ✅ | ✅ |
| Write/edit files | Ask | Ask | ✅ | ✅ | ✅ |
| Delete files | Ask | Ask | Ask | Ask | ✅ |
| Search web | Ask | ✅ | ✅ | ✅ | ✅ |
| Send messages (channels) | Ask | Ask | Ask | ✅ | ✅ |
| Send emails | Ask | Ask | Ask | Ask | ✅ |
| Create tasks/goals | Ask | Ask | ✅ | ✅ | ✅ |
| Run shell commands | Ask | Ask | Ask | Ask | ✅ |
| Install packages | Ask | Ask | Ask | Ask | Ask* |
| Access external APIs | Ask | Ask | Ask | ✅ | ✅ |
| Modify own SOUL.md | Ask | Ask | Ask | Ask | Ask |
| Spend money (API calls) | ✅ | ✅ | ✅ | ✅ | ✅ |

*Always requires confirmation for security-critical actions, even at L4.

### User Configuration

Settings > Agent > Autonomy:
- Slider or dropdown to select level
- Checkbox overrides for specific actions (e.g., "Always ask before sending emails" even at L3)
- "Trust ramp": start at L1, auto-suggest upgrade after 1 week of use

---

## File Permissions

### User File Boundaries

- Each user's files live in `/data/users/{user_id}/`
- Agent cannot access files outside this directory
- System enforces at OS level (separate process user) and application level (path validation)

### File Access Zones

```
/data/users/{user_id}/
├── agent/           # Agent config — agent: read, user: read/write
│   ├── SOUL.md      # Personality — user can edit, agent can suggest changes
│   └── config.json  # Agent settings
├── memory/          # Agent memory — agent: read/write, user: read
│   ├── graph.db     # Knowledge graph
│   └── daily/       # Daily logs
├── files/           # User files — agent: per autonomy level, user: full
│   ├── documents/
│   ├── imports/
│   └── exports/
├── channels/        # Channel configs — system: read/write, user: read
└── keys/            # API keys — system only (encrypted)
```

### Sensitive Files

Some files have elevated protection:
- `keys/*` — never readable by agent, only by system decryption service
- `channels/*` — tokens readable only by channel service
- `SOUL.md` — agent can read, must ask to modify

---

## API Permissions (External Services)

### Allowed Services

Configurable whitelist of external services the agent can access:

| Service | Default | Description |
|---------|---------|-------------|
| Web search | ✅ Allowed | Search engines |
| Web fetch | ✅ Allowed | Read public web pages |
| Email (read) | ❌ Disabled | Requires OAuth setup |
| Email (send) | ❌ Disabled | Requires explicit enable |
| Calendar | ❌ Disabled | Requires OAuth setup |
| GitHub | ❌ Disabled | Requires OAuth setup |
| Custom webhooks | ❌ Disabled | User-defined endpoints |

### Adding External Services

1. User goes to Settings > Integrations
2. Selects service → OAuth flow or API key entry
3. Sets permissions: read-only / read-write / full
4. Agent can now access that service within its autonomy level

### Rate Limiting

- Per-service rate limits to prevent abuse
- Default: 100 requests/hour per external service
- Configurable per service in settings

---

## Audit Log

### What's Logged

Every sensitive action creates an audit entry:

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action TEXT NOT NULL,
  category TEXT NOT NULL,     -- 'auth', 'agent', 'file', 'channel', 'api', 'admin'
  details JSONB,              -- action-specific data
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN
);
```

### Logged Actions

**Auth:**
- Login (success/failure), logout, password change, MFA enable/disable
- OAuth link/unlink, session revocation
- API key add/remove/rotate

**Agent:**
- Autonomy level change
- SOUL.md modification
- Agent created/deleted

**Files:**
- File delete (not reads/writes — too noisy)
- Bulk operations

**Channels:**
- Channel connected/disconnected
- Routing rules changed

**External API:**
- First use of a new external service
- Permission scope changes

**Admin:**
- User quota changes
- User disable/enable
- System config changes

### Retention

- Default: 90 days
- Admin can configure: 30 / 90 / 365 days / unlimited
- Exportable: CSV / JSON download

### User Access

- Users see their own audit log: Settings > Security > Activity Log
- Admins see all: Admin > Audit Log (filterable by user, action, date)

### Format Example

```json
{
  "id": "a1b2c3d4",
  "user_id": "user-123",
  "timestamp": "2026-02-11T09:45:00Z",
  "action": "api_key.rotated",
  "category": "auth",
  "details": {
    "provider": "anthropic",
    "key_prefix": "sk-ant-a...",
    "reason": "manual_rotation"
  },
  "ip_address": "192.168.1.100",
  "success": true
}
```

---

## Security Principles

1. **Least privilege:** Everything starts denied, permissions are granted
2. **Defense in depth:** Multiple enforcement layers (API, DB, filesystem, process)
3. **No silent failures:** Permission denials are logged and reported to user
4. **Transparent:** Users can always see what their agent did and why
5. **Revocable:** Every permission can be revoked instantly
6. **Auditable:** Every sensitive action has a paper trail
