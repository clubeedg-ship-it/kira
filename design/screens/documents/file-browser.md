# File Browser — Main Document View

> **Status:** ✅ DESIGNED | **Phase:** 3
> **Route:** `/documents`
> **Purpose:** The primary document management view. Grid or list of all documents with smart filtering, search, and project-context organization. NOT a file tree — a queryable, filterable document surface.

---

## 1. Design Intent

Documents in Kira are not stored in folders — they're tagged with SOP metadata (project, area, agent). The File Browser surfaces them through smart filters and collections. Think Spotlight meets Notion's database view: every file is richly tagged and instantly queryable.

---

## 2. Layout — Desktop

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR │  DOCUMENTS                                             │
│         │                                                        │
│         │  ┌─ TOOLBAR ─────────────────────────────────────────┐ │
│         │  │ [🔍 Search documents...]                          │ │
│         │  │ [All Areas ▾] [All Projects ▾] [All Types ▾]     │ │
│         │  │ [Creator ▾] [Date ▾] │ View: [▦ Grid] [☰ List]  │ │
│         │  │ Collections: [All] [Research] [Drafts] [Client X] │ │
│         │  └───────────────────────────────────────────────────┘ │
│         │                                                        │
│         │  ┌─ GRID VIEW ──────────────────────────────────────┐ │
│         │  │ ┌──────────┐ ┌──────────┐ ┌──────────┐          │ │
│         │  │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │          │ │
│         │  │ │ │ 📊   │ │ │ │ 📝   │ │ │ │ 📄   │ │          │ │
│         │  │ │ │ thumb │ │ │ │ thumb │ │ │ │ thumb │ │          │ │
│         │  │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │          │ │
│         │  │ │Platform  │ │ Welcome  │ │ DNS      │          │ │
│         │  │ │Research  │ │ Sequence │ │ Setup    │          │ │
│         │  │ │🤖research│ │ 🤖comms  │ │ 🤖code   │          │ │
│         │  │ │Email Cmp.│ │ Email Cmp│ │ Email Cmp│          │ │
│         │  │ │ 2h ago   │ │ 4h ago   │ │ 1d ago   │          │ │
│         │  │ └──────────┘ └──────────┘ └──────────┘          │ │
│         │  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Toolbar

### 3.1 Search
Full-text search across document titles, content summaries, and extracted entities. Debounced 300ms.

### 3.2 Filters
| Filter | Options |
|--------|---------|
| Area | All, or specific area |
| Project | All, or specific project (cascades from area) |
| Type | All, PDF, Document, Image, Code, Spreadsheet, Markdown |
| Creator | All, specific agent, "You", "External" (email attachments) |
| Date | Any time, today, this week, this month, custom range |

### 3.3 Smart Collections
Pre-defined and custom filtered views. Click to apply filter preset.

**Built-in:** All Documents, Research Outputs, Drafts Pending Review, This Week's Deliverables, Agent Outputs.

**Custom:** User-created saved filter combinations (e.g., "Client X Documents").

### 3.4 View Toggle
Grid (card thumbnails) or List (compact rows with metadata columns).

---

## 4. Document Card (Grid Mode)

```
┌──────────────┐
│ ┌──────────┐ │
│ │ Thumbnail│ │  ← Auto-generated preview (PDF page 1, image thumb, markdown render)
│ │          │ │
│ └──────────┘ │
│ Platform     │  ← Title (max 2 lines)
│ Research     │
│ 🤖 research  │  ← Creator
│ Email Camp.  │  ← Project tag
│ 2h ago       │  ← Last modified
└──────────────┘
```

Card size: 200px wide, ~260px tall. 4-5 columns on desktop. Hover: shows quick actions (preview, download, open, delete).

---

## 5. Document Row (List Mode)

| Thumbnail | Title | Type | Project | Creator | Modified | Size |
|-----------|-------|------|---------|---------|----------|------|
| 📊 | Platform Research | MD | Email Campaign | 🤖 research | 2h ago | 4.2KB |
| 📝 | Welcome Sequence | MD | Email Campaign | 🤖 comms | 4h ago | 8.1KB |

Sortable columns. Click row → document viewer. Right-click → context menu.

---

## 6. Upload

Drag-and-drop zone (dashed border appears when dragging files). Also: [+ Upload] button opens file picker. Uploaded files auto-tagged with current filter context (area, project). Multi-file upload supported.

---

## 7. Bulk Actions

Select multiple (checkbox on hover). Floating bar: [📁 Move to project] [🏷 Tag] [📥 Download] [🗑 Delete].

---

## 8. Data Loading

`GET /api/v1/documents?area_id=...&project_id=...&type=...&creator=...&sort=modified&limit=30&offset=0`

Paginated. Grid: infinite scroll. List: pagination controls.

---

## 9. Mobile

Grid: 2 columns. List: simplified rows (title + type icon + date). Upload via share sheet or camera. Pull-to-refresh.

---

*The File Browser replaces traditional folder trees with a queryable, metadata-rich document surface. Every file is tagged by project, area, and creator — findable in seconds.*