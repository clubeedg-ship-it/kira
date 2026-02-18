# Updates & Versioning

## Semantic Versioning

Kira follows [semver](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR** (1.x → 2.x): Breaking changes to config format, API, or database schema
- **MINOR** (1.1 → 1.2): New features, non-breaking
- **PATCH** (1.1.0 → 1.1.1): Bug fixes, security patches

Pre-release: `1.0.0-beta.1`, `1.0.0-rc.1`

---

## Self-Update Mechanism

### Check for Updates

```typescript
interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseNotes: string;
  breakingChanges: boolean;
  downloadUrl: string;
  publishedAt: string;
}

async function checkForUpdates(): Promise<UpdateInfo> {
  const response = await fetch('https://api.kira.ai/releases/latest');
  // or: npm view @kira/core version
  return response.json();
}
```

**When to check:**
- On startup (non-blocking)
- Daily background check
- Manual: `kira update --check`

### Update Flow

```
1. Check for update
2. Download new version (in background)
3. Verify checksum
4. Run pre-update migrations (if needed)
5. Backup current state
6. Apply update
7. Run post-update migrations
8. Restart services
9. Verify health checks pass
10. Show changelog to user
```

### By Distribution Method

**npx/npm:**
```bash
kira update                  # Interactive: shows changelog, asks confirmation
kira update --yes            # Auto-confirm
# Under the hood: npm update @kira/core @kira/dashboard @kira/cli
```

**Docker:**
```bash
docker pull ghcr.io/kira-ai/kira:latest
docker compose up -d
# Container entrypoint runs migrations automatically on startup
```

**Desktop (Tauri):**
- Tauri updater checks GitHub releases
- Shows in-app notification: "Update available: v1.2.0"
- One-click update, auto-restart

---

## Database Migrations

### Schema Migration System

```typescript
// migrations/001_initial.ts
export const up = async (db: Database) => {
  await db.exec(`
    CREATE TABLE messages (...);
    CREATE TABLE sessions (...);
  `);
};

export const down = async (db: Database) => {
  await db.exec(`
    DROP TABLE messages;
    DROP TABLE sessions;
  `);
};

// Migration runner
interface Migration {
  version: number;
  name: string;
  up: (db: Database) => Promise<void>;
  down: (db: Database) => Promise<void>;
}
```

### Migration Tracking

```sql
CREATE TABLE _migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  checksum TEXT NOT NULL     -- SHA256 of migration file
);
```

### Migration Rules

1. **Never modify** an existing migration — create a new one
2. **Always reversible** — every `up` has a `down`
3. **Atomic** — each migration runs in a transaction
4. **Tested** — migrations have unit tests with fixture data
5. **Backup first** — auto-backup database before running migrations

### Config Migrations

Config format changes are handled similarly:

```typescript
// config-migrations/002_rename_api_key.ts
export function migrate(config: Record<string, unknown>) {
  // v1.1: renamed 'openrouter_key' to 'openrouter.api_key'
  if (config.openrouter_key) {
    config.openrouter = { api_key: config.openrouter_key };
    delete config.openrouter_key;
  }
  return config;
}
```

---

## Rollback

### Automatic Rollback

If an update fails (health checks don't pass within 60s):

```
1. Stop new version
2. Restore database from pre-update backup
3. Restore previous binary/packages
4. Restart with old version
5. Alert user: "Update to v1.2.0 failed. Rolled back to v1.1.3. Error: [details]"
```

### Manual Rollback

```bash
kira rollback                    # Rollback to previous version
kira rollback --to 1.1.0         # Rollback to specific version

# Docker
docker run -d ... ghcr.io/kira-ai/kira:1.1.3    # Pin specific version
```

### Rollback Data

Each update creates a rollback snapshot:

```
~/.kira/rollback/
├── 1.1.3/
│   ├── packages.json           # Package versions
│   ├── kira.db.backup           # Database snapshot
│   └── config.backup.json       # Config snapshot
```

Keep last **3 rollback snapshots**. Older ones are pruned.

---

## Changelog

### User-Facing Changelog

After update, show "What's New" on first dashboard visit:

```typescript
// Stored in the release metadata
interface Release {
  version: string;
  date: string;
  highlights: string[];      // Top 3 bullet points
  changes: {
    added: string[];
    changed: string[];
    fixed: string[];
    removed: string[];
  };
  breakingChanges?: string[]; // Migration notes
}
```

**Display:**
- Dashboard: Modal on first visit after update
- CLI: Printed after `kira update` completes
- Chat: Agent mentions "I've been updated to v1.2.0! New: [highlights]"

### Changelog File

Standard `CHANGELOG.md` in repo, following [Keep a Changelog](https://keepachangelog.com/) format. Auto-generated from conventional commits where possible.
