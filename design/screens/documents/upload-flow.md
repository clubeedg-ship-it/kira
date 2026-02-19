# Upload Flow — How Documents Enter the System

> **Status:** ✅ DESIGNED | **Phase:** 3
> **Purpose:** Defines all entry points for documents into Kira's VDR, and the auto-enrichment pipeline that runs on every new document.

---

## 1. Entry Points

### 1.1 Manual Upload
**Trigger:** Drag-and-drop onto File Browser, or [+ Upload] button → file picker.
**Behavior:** Files upload with progress bar. Auto-tagged with current filter context (area, project). Multi-file supported. Max file size: 50MB.

### 1.2 Agent Output
**Trigger:** Agent saves deliverable during task execution.
**Behavior:** Automatically saved to `/vdr/{area}/{project}/` path. Tagged with: agent_id, task_id, project_id, area_id. Linked to agent_work_log entry. Creates input_queue item if task requires_input='verify'.

### 1.3 Email Attachment
**Trigger:** Triage engine detects attachment in inbound email.
**Behavior:** Extracted, stored in VDR. Tagged with: sender, area (from triage classification), thread reference. Notification: "New attachment from [sender]".

### 1.4 Chat Attachment
**Trigger:** User sends file in conversation with Kira.
**Behavior:** Stored in VDR. Tagged with conversation context. If sent during task discussion, auto-linked to that task/project.

### 1.5 API Upload
**Trigger:** External integration pushes file via API.
**Behavior:** `POST /api/v1/documents/upload` with file + metadata. Used by: external tools, webhooks, integrations.

---

## 2. Auto-Enrichment Pipeline

Every new document (regardless of entry point) runs through this pipeline:

```
NEW DOCUMENT
    │
    ├─ 1. Store file + generate thumbnail (< 2s)
    ├─ 2. Extract text content if applicable (< 5s)
    ├─ 3. Generate AI summary (Haiku, < 3s)
    ├─ 4. Extract entities (people, companies, concepts)
    ├─ 5. Link to project (from context or entity matching)
    ├─ 6. Find related documents (entity overlap)
    └─ 7. Emit SSE event: system.document_added
```

**Cost:** ~$0.001 per document (Haiku for summary + entity extraction).

### Thumbnail Generation

| Type | Thumbnail |
|------|-----------|
| PDF | Rendered image of page 1 |
| Image | Resized to 200x200 |
| Markdown | First 3 lines rendered as preview |
| Code | Syntax-highlighted first 10 lines |
| Other | File type icon with extension label |

---

## 3. Upload UI

### Desktop: Drag-and-Drop Zone

When dragging files over the File Browser, a dashed-border overlay appears:

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│                                       │
│   📎 Drop files here to upload        │
│   They'll be tagged to: Email Campaign│
│                                       │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

### Upload Progress

Multi-file upload shows stacked progress bars. Each file: name, size, progress %. Cancel button per file. When complete: thumbnail fades in at the appropriate position in the grid.

### Mobile

Upload via: share sheet (share any file to Kira), camera capture (photo → document), or in-app file picker.

---

## 4. Post-Upload Tagging Modal

After manual upload, a brief modal appears to confirm/adjust metadata:

```
┌─ UPLOADED: report.pdf ─────────────────────┐
│ Area:    [AI Receptionist ▾] (auto-detected)│
│ Project: [Email Campaign ▾]                 │
│ Tags:    [+ Add tags]                       │
│                                             │
│ [Save]  [Save & Open]                       │
└─────────────────────────────────────────────┘
```

Auto-detected values from current context. User can adjust. Skip button for bulk uploads.

---

*Documents enter Kira through 5 paths but all converge on the same enrichment pipeline. Every file gets a summary, entities, and project context — automatically.*