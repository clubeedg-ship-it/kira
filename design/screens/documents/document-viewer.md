# Document Viewer

> **Status:** ✅ DESIGNED | **Phase:** 3
> **Route:** `/documents/:id`
> **Purpose:** Inline document preview with AI-enriched metadata sidebar. View any document without downloading, with full context about its origin, related items, and version history.

---

## 1. Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Back to Documents    "Platform Research.md"    [↓ Download] [⋮]│
├────────────────────────────────────────┬─────────────────────────┤
│                                        │ METADATA                │
│  DOCUMENT PREVIEW (65%)                │ (35% sidebar)           │
│                                        │                         │
│  ┌──────────────────────────────────┐  │ 📝 Summary              │
│  │                                  │  │ Compares 3 email        │
│  │  # Email Platform Comparison     │  │ platforms for dental    │
│  │                                  │  │ practice clients...     │
│  │  ## Brevo                        │  │                         │
│  │  - Pricing: €29/mo               │  │ 🏷 Entities             │
│  │  - Best for: SMB email           │  │ Brevo, Mailchimp,       │
│  │  - API: REST + SMTP              │  │ SendGrid, Client X      │
│  │                                  │  │                         │
│  │  ## Mailchimp                    │  │ 📎 Context              │
│  │  - Pricing: $13/mo               │  │ Task: Research platforms │
│  │  - Best for: Marketing           │  │ Agent: 🤖 research      │
│  │  ...                             │  │ Project: Email Campaign  │
│  │                                  │  │ Created: Feb 18, 09:45  │
│  └──────────────────────────────────┘  │                         │
│                                        │ 🔗 Related Docs          │
│                                        │ • Email strategy draft   │
│                                        │ • DNS setup guide        │
│                                        │                         │
│                                        │ 💬 Referenced In         │
│                                        │ • Chat: "Set up email"  │
│                                        │                         │
│                                        │ 📜 Versions              │
│                                        │ v2 (current) Feb 18     │
│                                        │ v1 Feb 18 09:32         │
│                                        │                         │
└────────────────────────────────────────┴─────────────────────────┘
```

---

## 2. Document Preview (Left Panel)

Renders document inline based on type:

| Type | Renderer |
|------|----------|
| Markdown (.md) | Rendered HTML with syntax highlighting for code blocks |
| PDF (.pdf) | Embedded PDF viewer (pdf.js) with page navigation |
| Images (.png, .jpg, .svg) | Full-size image with zoom/pan |
| Code (.py, .js, .ts, etc.) | Syntax-highlighted with line numbers |
| Plain text (.txt, .csv) | Monospace rendered text |
| Other | Download prompt with file info |

---

## 3. Metadata Sidebar (Right Panel)

### 3.1 AI Summary
Auto-generated one-paragraph summary. Generated on first view by Haiku. Cached. [Regenerate] button.

### 3.2 Extracted Entities
People, companies, concepts extracted from document content. Each clickable → knowledge graph.

### 3.3 Context
Origin chain: which task produced this, which agent worked on it, which project it belongs to, creation timestamp. Each clickable → navigates to source.

### 3.4 Related Documents
Documents that share entities or belong to same project. Algorithmically linked. Clickable.

### 3.5 Referenced In
Conversations and tasks that link to this document. Clickable.

### 3.6 Version History
List of versions with timestamps. Click to view that version. Diff button between versions.

---

## 4. Actions

| Action | Button | Effect |
|--------|--------|--------|
| Download | ↓ button | Download original file |
| Edit | ✏️ (markdown only) | Switch to edit mode with markdown editor |
| Delete | ⋮ → Delete | Confirm dialog → remove |
| Move | ⋮ → Move to project | Reassign project tag |
| Share | ⋮ → Copy link | Copy shareable link |

---

## 5. Mobile
Full-screen preview. Metadata accessible via bottom sheet (swipe up). Pinch to zoom on images/PDFs.

---

*The Document Viewer makes every file a first-class citizen with AI context. You never just see a file — you see where it came from, what it means, and how it connects to your work.*