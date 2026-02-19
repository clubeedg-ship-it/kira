# Document Card — Component Spec

> **Status:** ✅ DESIGNED | **Phase:** 3
> **Purpose:** Reusable card component for displaying documents in grid views. Used in File Browser, project detail, area view, and search results. Consistent visual treatment across all surfaces.

---

## 1. Card Anatomy

```
┌──────────────────┐
│ ┌──────────────┐ │
│ │              │ │  ← Thumbnail area (160×120px)
│ │  Thumbnail   │ │
│ │              │ │
│ └──────────────┘ │
│                  │
│ Platform         │  ← Title (text-sm, font-medium, max 2 lines)
│ Research.md      │
│                  │
│ 🤖 research      │  ← Creator (text-xs, with icon)
│ Email Campaign   │  ← Project tag (text-xs, area-colored pill)
│ 2h ago    4.2KB  │  ← Modified time + file size (text-xs, text-tertiary)
│                  │
└──────────────────┘
```

**Dimensions:** 200px wide × ~280px tall (flexible height based on title length).

---

## 2. Thumbnail Rendering

| File Type | Thumbnail |
|-----------|-----------|
| PDF | Rendered first page (200×120, white bg, drop shadow) |
| Image (png, jpg, svg) | Resized/cropped to fit (200×120, object-cover) |
| Markdown | First 4 lines rendered as mini text preview (monospace, 8px font) |
| Code | Syntax-highlighted first 8 lines (mini preview, colored) |
| Spreadsheet | Mini grid icon with cell hints |
| Other | Large file-type icon centered (📄, 📊, 📁) with extension label |

Thumbnail has 4px border-radius, subtle border (`--border-subtle`).

---

## 3. Metadata

| Element | Style | Source |
|---------|-------|--------|
| Title | text-sm, font-medium, `--text-primary`, max 2 lines ellipsis | document.title |
| Creator | text-xs, `--text-secondary`, icon prefix (🤖/👤) | document.creator |
| Project tag | text-xs, pill with area background color, truncated | document.project.title |
| Modified | text-xs, `--text-tertiary`, relative time ("2h ago") | document.updated_at |
| File size | text-xs, `--text-tertiary` | document.file_size (formatted: KB/MB) |

---

## 4. States

| State | Visual |
|-------|--------|
| Default | Standard card styling |
| Hover | Elevation increase (shadow-md), thumbnail brightens slightly, quick actions appear |
| Selected | Blue border (`--primary-400`), subtle blue tint background |
| Loading | Skeleton placeholder (thumbnail shimmer + text lines) |
| Dragging | Elevated, slight rotation, 80% opacity |

---

## 5. Quick Actions (on Hover)

Small icon buttons appear overlaid on the thumbnail on hover:

```
┌──────────────────┐
│ ┌──────────────┐ │
│ │         [👁][↓]│ │  ← Preview, Download
│ │  Thumbnail   │ │
│ │              │ │
│ └──────────────┘ │
```

| Icon | Action |
|------|--------|
| 👁 (eye) | Quick preview (opens document viewer) |
| ↓ (download) | Download file |

Right-click context menu: Open, Download, Copy link, Move to project, Tag, Delete.

---

## 6. Interactions

| Action | Behavior |
|--------|----------|
| Click card | Opens document viewer |
| Right-click | Context menu |
| Hover | Quick actions + elevation |
| Ctrl/Cmd+Click | Toggle selection (for bulk actions) |
| Drag | Drag to project in sidebar to re-assign |

---

## 7. Variants

### Compact Card (for embedding in other views)

Used in project detail sidebar, task detail linked items:

```
┌──────────────────────────────────────┐
│ 📄 Platform Research.md  │  4.2KB   │
│    🤖 research  ·  2h ago           │
└──────────────────────────────────────┘
```

Single row, no thumbnail. Icon + title + size on line 1, creator + time on line 2. Height: 48px.

### List Row (for list mode in File Browser)

Full-width row with columns: thumbnail (40×40), title, type badge, project, creator, modified, size. Height: 48px. Sortable columns.

---

*The Document Card is the visual atom for files. Consistent across all views: File Browser grid, project detail, search results. Rich metadata at a glance.*