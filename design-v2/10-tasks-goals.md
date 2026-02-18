# 10 — Tasks & Goals

Per-user, stored in `/data/users/{id}/kira.db`.

## Tasks Schema
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo', -- todo | in_progress | review | done
  priority INTEGER DEFAULT 2, -- 0=critical, 1=high, 2=medium, 3=low
  due_date TEXT,
  tags TEXT, -- JSON array
  position REAL DEFAULT 0, -- for ordering within column
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

## Goals Schema
```sql
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active', -- active | completed | archived
  target_date TEXT,
  progress INTEGER DEFAULT 0, -- 0-100
  milestones TEXT, -- JSON array of { title, done }
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

## API: See 05-api-spec.md
