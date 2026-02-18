# Virtual Data Room (VDR) — Document Management

> Every document you've ever worked with, intelligently organized, searchable, and connected to your knowledge graph. The agent reads, categorizes, summarizes, and cross-references everything automatically.

---

## 1. Structure & Organization

### 1.1 Data Model

```typescript
interface Document {
  id: string;
  name: string;
  type: DocumentType;
  mimeType: string;
  size: number;
  folder: string;              // folder ID (hierarchical)
  tags: string[];
  version: number;
  versions: DocumentVersion[];
  content?: string;            // extracted text/markdown for search
  summary?: string;            // agent-generated summary
  embedding?: number[];        // vector for semantic search
  linkedEntities: string[];    // knowledge graph entity IDs
  linkedTasks: string[];
  linkedProjects: string[];
  uploadedBy: string;          // user or agent
  createdAt: DateTime;
  updatedAt: DateTime;
  lastViewedAt: DateTime;
  metadata: Record<string, any>;  // extracted metadata (author, page count, etc.)
}

type DocumentType = 'markdown' | 'pdf' | 'image' | 'spreadsheet' | 'code' | 'presentation' | 'other';

interface DocumentVersion {
  version: number;
  uploadedBy: string;
  uploadedAt: DateTime;
  size: number;
  storagePath: string;         // local filesystem path under ~/kira/vdr/
  changelog?: string;
}

interface Folder {
  id: string;
  name: string;
  parentId?: string;           // null = root
  emoji?: string;
  color?: string;
  project?: string;            // linked project
  createdAt: DateTime;
  sortOrder: number;
}
```

### 1.2 Folder Hierarchy

```
📁 VDR Root
├── 📁 By Project
│   ├── 📁 🚀 Series A
│   │   ├── 📁 Pitch Materials
│   │   │   ├── pitch-deck-v3.pdf
│   │   │   ├── exec-summary.md
│   │   │   └── one-pager.pdf
│   │   ├── 📁 Financials
│   │   │   ├── financial-model.xlsx
│   │   │   └── cap-table.xlsx
│   │   ├── 📁 Legal
│   │   │   ├── term-sheet-draft.pdf
│   │   │   └── incorporation-docs.pdf
│   │   └── 📁 Investor Research
│   │       ├── sequoia-notes.md
│   │       └── a16z-notes.md
│   └── 📁 📱 Product
│       ├── 📁 Specs
│       ├── 📁 Research
│       └── 📁 Designs
├── 📁 By Type
│   ├── 📁 Pitch Decks
│   ├── 📁 Research
│   ├── 📁 Specs & PRDs
│   ├── 📁 Contracts & Legal
│   └── 📁 Meeting Notes
└── 📁 Inbox (unsorted uploads)
```

**Interactions:**
- Drag-and-drop files between folders
- Drag-and-drop to reorder folders
- Right-click folder: rename, move, delete, change color/emoji, share
- Create folder: right-click parent → "New folder" or `Cmd+Shift+F`
- Documents can appear in multiple folders via symbolic links (same doc, multiple locations)

### 1.3 Tagging System

Tags work alongside folders (not instead of):
- Auto-suggested by agent on upload
- Color-coded tag chips on each document
- Tag management: create, rename, merge, delete tags
- Filter by tag across all folders
- Smart tags (auto-applied): `#needs-review`, `#outdated`, `#draft`, `#final`

---

## 2. Document Types & Viewers

### 2.1 Markdown Files

- **Rendered view** (default): beautiful typography, syntax-highlighted code blocks, rendered LaTeX, clickable links
- **Edit mode**: split-pane or toggle — WYSIWYG editor with markdown shortcuts
- **Outline**: auto-generated table of contents from headings (sidebar)
- **Backlinks**: show all other documents that link to this one
- **Agent integration**: "Kira, expand this section" / "Kira, proofread this"

### 2.2 PDFs

- Embedded viewer with page navigation
- Thumbnail sidebar for quick page jumping
- Text selection and annotation (highlights, comments)
- Agent can read and summarize: "What are the key terms in this contract?"
- Search within PDF
- Extract text for full-text search index

### 2.3 Images

- **Single view**: full preview with zoom
- **Gallery view**: grid of thumbnails for folders with multiple images
- **Lightbox**: click to view full-screen with prev/next navigation
- **OCR**: agent extracts text from screenshots, whiteboards, handwritten notes
- **Metadata**: EXIF data, dimensions, file size

### 2.4 Spreadsheets

- Basic table renderer (read-only for .xlsx/.csv)
- Column sorting and filtering
- Agent can analyze: "What's the total revenue?" / "Create a chart from column B"
- Export to other formats
- For complex spreadsheets: "Open in Google Sheets" link

### 2.5 Code Files

- Syntax highlighting (all major languages)
- Line numbers
- Copy button
- Agent can explain: "What does this code do?"
- Link to related tasks/issues

### 2.6 Presentations

- Slide-by-slide viewer
- Thumbnail strip navigation
- Fullscreen presentation mode
- Agent can review: "Does this deck flow well?" / "What's missing?"

---

## 3. AI Features

### 3.1 Auto-Categorization

On file upload:
1. Agent reads/OCRs the document
2. Classifies document type and topic
3. Suggests folder placement: "This looks like a pitch deck → Series A / Pitch Materials?"
4. Suggests tags: `#pitch-deck`, `#series-a`, `#q1-2026`
5. User confirms or adjusts (one click)
6. If user always accepts, agent starts auto-filing silently

### 3.2 Summary Generation

Every document gets an auto-generated summary:
- **One-liner**: shown in list view (e.g., "Q4 financial projections showing 3x revenue growth")
- **Full summary**: shown in detail view, 2-3 paragraphs
- **Key points**: bullet list of main takeaways
- **Action items**: extracted TODOs and next steps (linkable to task system)
- Regenerate on demand: "Kira, resummarize this with focus on risks"

### 3.3 Cross-Referencing

Agent continuously maps connections between documents:
- **Entity matching**: "This doc mentions 'Sequoia' — linked to entity 'Sequoia Capital' in graph"
- **Topic overlap**: "Documents A and B both discuss market sizing — show comparison?"
- **Version detection**: "This file is similar to one uploaded 2 weeks ago — is it an update?"
- **Citation tracking**: "Document X references data from Document Y"

Visualized as:
- Relationship lines in a document graph view (mini knowledge graph for docs)
- "Related documents" section in document detail view
- Inline highlights: hover over an entity mention to see its graph card

### 3.4 Gap Analysis

Agent proactively identifies missing content:
- **Pitch deck review**: "Your deck has no slide on competitive landscape"
- **Due diligence checklist**: "For Series A, you're missing: audited financials, IP assignment agreements"
- **Project completeness**: "Project X has specs but no timeline document"
- Configurable checklists: define what a "complete" folder should contain

### 3.5 Search

#### Full-Text Search
- Indexes all text content (extracted from PDFs, OCR from images, markdown, code)
- Instant results as you type
- Highlights matching text in preview
- Filters: by folder, type, tag, date, author

#### Semantic Search
- Vector embeddings for every document
- "Find documents about fundraising strategy" → returns relevant docs even without exact keyword match
- "Find something similar to this document" → nearest-neighbor search
- Natural language: "What did we decide about pricing?" → searches across all docs and conversations

#### Combined Search UI
```
┌───────────────────────────────────────┐
│ 🔍 Search documents...               │
│ ┌─────────────────────────────────┐  │
│ │ Filters: [Type ▾] [Tag ▾]      │  │
│ │ [Folder ▾] [Date ▾]            │  │
│ └─────────────────────────────────┘  │
│                                       │
│ Results for "fundraising strategy":   │
│                                       │
│ 📄 Series A Strategy.md         0.95 │
│    "Our approach to fundraising..."   │
│    📁 Series A / Pitch Materials      │
│                                       │
│ 📄 Board Deck Q4.pdf            0.87 │
│    "...fundraising timeline and..."   │
│    📁 Series A / Investor Research    │
│                                       │
│ 📝 Meeting Notes Jan 22.md      0.82 │
│    "Discussed fundraising with..."    │
│    📁 Meeting Notes                   │
└───────────────────────────────────────┘
```

---

## 4. Sharing & Export

### 4.1 Shareable Links

- Generate a public or password-protected link for any document or folder
- Configurable permissions: view only, download, comment
- Expiration: auto-expire after X days
- Access tracking: see who viewed, when, how long, which pages
- Revoke access anytime

### 4.2 Data Room View (Investor-Ready)

Special curated view for external sharing:
```
┌──────────────────────────────────────────┐
│ 🏢 Kira — Series A Data Room           │
│ Prepared for: Sequoia Capital            │
│ Last updated: Feb 11, 2026               │
├──────────────────────────────────────────┤
│ 📁 Company Overview                      │
│   ├── Executive Summary.pdf              │
│   ├── Pitch Deck v3.pdf                  │
│   └── One Pager.pdf                      │
│ 📁 Financials                            │
│   ├── Financial Model.xlsx               │
│   ├── Revenue Projections.pdf            │
│   └── Cap Table.xlsx                     │
│ 📁 Product                               │
│   ├── Product Demo Video.mp4             │
│   └── Technical Architecture.pdf         │
│ 📁 Legal                                 │
│   ├── Certificate of Incorporation.pdf   │
│   └── IP Assignment Agreements.pdf       │
├──────────────────────────────────────────┤
│ 📊 Analytics: 3 views, avg 12min        │
└──────────────────────────────────────────┘
```

Features:
- Drag documents into the data room from main VDR
- Custom ordering within the data room
- Watermarking option (viewer's email stamped on PDFs)
- NDA gate: require agreement before viewing
- Per-investor customization: different data rooms for different investors

### 4.3 Export

- **Single document**: download original or as PDF
- **Folder**: download as ZIP
- **Entire VDR**: full export with folder structure
- **Custom export**: select specific docs → ZIP/PDF bundle
- **Print view**: clean, formatted version optimized for printing

---

## 5. Upload & Ingestion

### 5.1 Upload Methods

- **Drag-and-drop**: onto any folder or the main area
- **File picker**: traditional upload dialog
- **Paste**: Cmd+V to upload from clipboard (images, text)
- **Email forwarding**: forward to a dedicated email → auto-ingests attachments
- **Agent creation**: agent generates documents directly into VDR
- **Web clipper**: save web pages as markdown (browser extension or agent)
- **API**: programmatic upload for integrations

### 5.2 Ingestion Pipeline

```
Upload → Store in ~/kira/vdr/{user_id}/{folder}/ → Extract text/OCR → Generate embedding
                                    ↓
                        Agent processes:
                        - Classify type
                        - Generate summary
                        - Extract entities → add to graph
                        - Suggest folder/tags
                        - Find cross-references
                        - Check for duplicates

> **v1.0: SQLite. Migration path to PostgreSQL documented in cost/scalability.md**
> Files stored on local filesystem under `~/kira/vdr/`. Migration to S3/R2 for multi-instance deployments documented in cost/scalability.md.
```

Processing is async — document is immediately available, AI features populate over seconds.

---

## 6. Version History

Every document maintains full version history:

```
┌────────────────────────────────────────┐
│ 📄 pitch-deck.pdf — Version History   │
├────────────────────────────────────────┤
│ v3 (current) — Feb 10, Otto           │
│   "Updated financial projections"      │
│   [View] [Download] [Restore]          │
│                                        │
│ v2 — Feb 3, Kira (agent)              │
│   "Added competitive landscape slide"  │
│   [View] [Download] [Restore] [Diff]   │
│                                        │
│ v1 — Jan 28, Otto                      │
│   "Initial upload"                     │
│   [View] [Download] [Restore] [Diff]   │
└────────────────────────────────────────┘
```

- **Diff view** (for markdown/text): side-by-side comparison with highlighted changes
- **Restore**: one-click revert to any previous version
- **Auto-versioning**: new version created on re-upload of same filename
- **Agent edits**: when agent modifies a document, it creates a new version with changelog
