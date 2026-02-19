# Version History — Document Evolution Timeline

> **Status:** ✅ DESIGNED | **Phase:** 3
> **Purpose:** Track how documents evolve over time. See every version, who created it (agent or human), diff between versions, and restore previous versions. Critical for the agent→human review workflow.

---

## 1. Design Intent

In Kira, documents are frequently created by agents and then edited by humans. Version history captures this evolution: agent draft v1 → human edits v2 → agent revision v3. Every version is preserved, diffable, and restorable.

---

## 2. Location

Version history appears in the Document Viewer's metadata sidebar (Section 3.6 of document-viewer.md). Can also be expanded to a full-panel view.

---

## 3. Version Timeline

```
┌─ VERSION HISTORY ──────────────────────────────────────┐
│                                                         │
│ ● v3 (current)                        Feb 18, 14:32    │
│ │ 👤 You — Edited pricing section                      │
│ │ [View] [Diff with v2]                                │
│ │                                                       │
│ ● v2                                  Feb 18, 11:15    │
│ │ 🤖 comms-agent — Revised after feedback              │
│ │ [View] [Diff with v1] [Restore]                      │
│ │                                                       │
│ ● v1                                  Feb 18, 09:45    │
│   🤖 comms-agent — Initial draft                       │
│   [View] [Restore]                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Version Entry Fields

| Field | Source |
|-------|--------|
| Version number | Auto-incremented |
| Timestamp | When saved |
| Author | Agent name or "You" |
| Author type icon | 🤖 or 👤 |
| Change summary | Auto-generated (Haiku) or manual note |
| Actions | View, Diff, Restore |

---

## 4. Version Creation Triggers

| Trigger | Version Created |
|---------|----------------|
| Agent saves output to VDR | v1 (initial) |
| Agent revises after redo request | v(n+1) with "Revised after feedback" |
| User edits document in-app | v(n+1) with auto-diff summary |
| User uploads replacement file | v(n+1) with "Replaced by upload" |

**Auto-save:** For in-app markdown editing, versions are created on explicit save (not on every keystroke). Drafts are held in local state until saved.

---

## 5. Diff View

Side-by-side or inline diff for text-based documents (Markdown, code, plain text).

```
┌─ DIFF: v2 → v3 ───────────────────────────────────────┐
│                                                         │
│  ## Pricing                                            │
│ - Recommended: €49/month per location                  │
│ + Recommended: €59/month per location                  │
│ + Includes: setup fee waived for annual commitment     │
│                                                         │
│  ## Features                                           │
│  No changes in this section.                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

| Element | Style |
|---------|-------|
| Added lines | Green background + "+" prefix |
| Removed lines | Red background + "−" prefix |
| Unchanged | Normal, collapsible |
| Context | 3 lines shown around each change |

For non-text files (PDF, images): side-by-side visual comparison. For images: overlay slider.

---

## 6. Restore

Click [Restore] on any previous version → confirmation modal: "Restore v1? This will create a new version (v4) with the content from v1. No versions will be deleted."

Restore creates a NEW version (preserving history), it doesn't delete later versions.

---

## 7. Storage

```sql
CREATE TABLE document_versions (
  id           TEXT PRIMARY KEY,
  document_id  TEXT NOT NULL REFERENCES documents(id),
  version      INTEGER NOT NULL,
  content_hash TEXT NOT NULL,          -- SHA-256 of file content
  file_path    TEXT NOT NULL,          -- path to versioned file
  author_type  TEXT NOT NULL,          -- 'agent', 'human'
  author_id    TEXT,                   -- agent_id or user_id
  summary      TEXT,                   -- auto-generated change description
  file_size    INTEGER,
  created_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(document_id, version)
);
```

---

## 8. API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/documents/:id/versions` | GET | List all versions |
| `/api/v1/documents/:id/versions/:v` | GET | Get specific version content |
| `/api/v1/documents/:id/versions/:v/diff/:v2` | GET | Diff between two versions |
| `/api/v1/documents/:id/versions/:v/restore` | POST | Restore to this version |

---

*Version history makes the agent→human workflow transparent. See exactly how a document evolved from agent draft to final version, with every step preserved and diffable.*