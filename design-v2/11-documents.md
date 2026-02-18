# 11 — Documents (VDR)

> Not a file manager. A living knowledge base that agents curate and users navigate visually.

---

## Design Philosophy

**Anti-patterns (what we're NOT building):**
- ❌ Windows Explorer / Finder file tree with folders and lists
- ❌ Flat file dump with search
- ❌ Notion's bland text-heavy page list

**What we ARE building:**
- ✅ Visual card grid — each document/folder is a card with banner, icon, metadata
- ✅ Spatial organization — drag cards, group them, create visual hierarchy
- ✅ Agent-curated — Kira organizes, tags, and enriches documents automatically
- ✅ More beautiful than Notion — rich visual design, not a spreadsheet

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  📄 Documents          [+ New] [⚡ Agent Organize] [🔍 Search] │
│  Home > Projects > ZenithCred                    [Grid│List]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ ▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓ │          │
│  │ ▓ banner  ▓ │  │ ▓ banner  ▓ │  │ ▓ banner  ▓ │          │
│  │ ▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓ │          │
│  │             │  │             │  │             │          │
│  │ 📊 Pitch    │  │ 📋 Financial │  │ 💡 Research  │          │
│  │    Deck     │  │    Model    │  │    Notes    │          │
│  │             │  │             │  │             │          │
│  │ 12 pages    │  │ Spreadsheet │  │ 3.2K words  │          │
│  │ Updated 2h  │  │ Updated 1d  │  │ Updated 5d  │          │
│  │ ⚡ Agent     │  │ 👤 Otto     │  │ ⚡ Agent     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   ┌────┐    │  │             │  │             │          │
│  │   │ 📁 │    │  │  ▓▓▓▓▓▓▓▓▓ │  │  ▓▓▓▓▓▓▓▓▓ │          │
│  │   └────┘    │  │  ▓ image ▓ │  │  ▓▓▓▓▓▓▓▓▓ │          │
│  │             │  │  ▓▓▓▓▓▓▓▓▓ │  │             │          │
│  │ 📁 Pilot    │  │ 🖼️ Mockup  │  │ 📄 Contracts │          │
│  │    Targets  │  │    v3.png  │  │    Draft    │          │
│  │             │  │             │  │             │          │
│  │ 4 items     │  │ 2.1 MB     │  │ 8 pages     │          │
│  │ Updated 3d  │  │ Updated 1w  │  │ Updated 2d  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Card Anatomy

### Document Card
```
┌──────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← Banner area (120px)
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │     - Custom image upload
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │     - Auto-generated gradient based on file type
│                      │     - Image preview for images
│ 📊 Title             │  ← Icon (auto by type or custom) + title
│    Subtitle / desc   │  ← Optional description
│                      │
│ 12 pages · 2h ago    │  ← Metadata line (size, date)
│ ⚡ Kira              │  ← Creator badge (agent or user)
│ [tag] [tag]          │  ← Tags (auto or manual)
└──────────────────────┘
```

### Folder Card
```
┌──────────────────────┐
│                      │
│      ┌─────────┐     │  ← Large folder icon or custom icon
│      │  📁/🎯  │     │     Custom emoji or uploaded icon
│      └─────────┘     │
│                      │
│ ZenithCred           │  ← Folder name
│ Investment Round      │  ← Description
│                      │
│ 12 items · Updated 2h│  ← Item count + last modified
│ [investor] [deck]    │  ← Tags
└──────────────────────┘
```

---

## Card Customization

Users AND agents can customize cards:

| Property | How |
|----------|-----|
| **Banner** | Upload image, pick from gallery, or auto-gradient |
| **Icon** | Emoji picker, upload custom, or auto-detect from file type |
| **Color** | Card accent color (border/banner tint) |
| **Description** | Short text below title |
| **Tags** | Manual or agent-assigned |
| **Pin** | Pin to top of folder |

### Auto-Generated Defaults

When a file is created (by user or agent), defaults are applied:

| File Type | Icon | Banner |
|-----------|------|--------|
| `.md` | 📝 | Purple gradient |
| `.pdf` | 📄 | Red gradient |
| `.xlsx/.csv` | 📊 | Green gradient |
| `.png/.jpg` | 🖼️ | Image preview |
| `.json` | ⚙️ | Blue gradient |
| Folder | 📁 | Teal gradient |
| Agent-created | ⚡ | Violet gradient |

---

## Hierarchy & Navigation

### Breadcrumb Path
```
Home > Projects > ZenithCred > Investment Round
```
Click any breadcrumb to jump back. "Home" is root.

### Folder Structure (Agent-Organized)

Agents create and maintain folder structures automatically:

```
📁 Projects/
├── 📁 ZenithCred/
│   ├── 📁 Investment Round/
│   │   ├── 📊 Pitch Deck v2.1
│   │   ├── 📋 Financial Projections
│   │   └── 📄 Term Sheet Draft
│   ├── 📁 Product/
│   │   ├── 📝 Product Design v1.2
│   │   └── 📁 Research/
│   └── 📁 Pilots/
│       ├── 📋 Target List
│       └── 📁 Company Profiles/
├── 📁 OttoGen/
│   ├── 📝 Webinar Outline
│   └── 📁 Content/
└── 📁 IAM/
    └── 📊 Competitive Analysis

📁 Personal/
├── 📝 Meeting Notes
└── 📁 Ideas/

📁 Templates/
└── 📝 Pitch Deck Template
```

### How Agents Grow the VDR

1. **Auto-filing:** When Kira creates a document (research, analysis, draft), it places it in the correct folder based on context, or creates a new folder if needed.

2. **Tagging:** Agent auto-tags documents based on content analysis: `[investor]`, `[research]`, `[draft]`, `[final]`, `[urgent]`

3. **Enrichment:** Agent adds descriptions, suggests banners, links related documents.

4. **Reorganization:** User can ask "Kira, organize my documents" → agent restructures, merges duplicates, suggests new folders.

5. **Version tracking:** When a document is updated, the old version is archived (accessible via "History" on the card).

### Agent Actions on Documents

```typescript
// Agent can call these via tool_use
createDocument({ path, content, title, icon?, banner?, tags? })
createFolder({ path, icon?, description? })
moveDocument({ from, to })
tagDocument({ path, tags })
enrichDocument({ path, description?, banner? })
```

---

## Interactions

### Card Click → Preview

Clicking a card opens a preview panel (slide-in from right or modal):
- Markdown: rendered
- Images: displayed
- PDFs: embedded viewer
- Spreadsheets: table view
- Code: syntax highlighted
- Unknown: download prompt

### Context Menu (right-click or ⋮)

- Open
- Edit metadata (icon, banner, description, tags)
- Move to...
- Duplicate
- Download
- Share link (future)
- Delete

### Drag & Drop

- Drag cards to reorder within folder
- Drag cards into folder cards to move
- Drag files from desktop to upload

### Upload

- Drag files from desktop onto the page
- Click [+ New] → File upload or Create document (markdown editor)
- Paste images directly

---

## Search

Global search across all documents:
- Full-text search in document content
- Search by tags, file type, creator
- Results shown as cards (same visual style)

---

## View Modes

| Mode | Layout |
|------|--------|
| **Grid** (default) | Card grid, responsive columns |
| **List** | Compact rows with icon, title, metadata (for power users) |

Toggle via button in toolbar. Preference saved.

---

## Design Tokens

Cards:
- Background: `#13151D`
- Border: `#1E2030`
- Border radius: 12px
- Banner height: 120px
- Card width: 200-280px (responsive)
- Hover: subtle lift + border glow (`#7C3AED20`)
- Selected: violet border

Banner gradients:
- Purple: `linear-gradient(135deg, #7C3AED, #4C1D95)`
- Red: `linear-gradient(135deg, #EF4444, #991B1B)`
- Green: `linear-gradient(135deg, #22C55E, #166534)`
- Blue: `linear-gradient(135deg, #3B82F6, #1E3A8A)`
- Teal: `linear-gradient(135deg, #14B8A6, #134E4A)`
- Violet (agent): `linear-gradient(135deg, #8B5CF6, #6D28D9)`
