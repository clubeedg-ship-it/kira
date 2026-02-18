# Command Center Research: Unified Web Interface for Otto's Business

**Date:** 2025-02-09  
**Goal:** Replace Notion + Telegram + SSH with ONE self-hosted web interface  
**Requirements:** Docs, Tasks, Graph Visualization, Chat Integration, File Browser

---

## Tool-by-Tool Assessment

### 1. AFFiNE
| Criteria | Status |
|----------|--------|
| Docker self-host | ✅ Yes, production Docker images available |
| Graph visualization | ❌ No graph view (requested by community, not implemented) |
| Task management | ⚠️ Basic (kanban in edgeless mode) |
| API | ⚠️ Limited public API |
| Markdown from disk | ❌ No native disk sync |
| Desktop app | ✅ Yes (Electron) |
| Active maintenance | ✅ Very active |

**Verdict:** Beautiful Notion clone but missing graph view entirely. Not suitable as command center.

### 2. AppFlowy
| Criteria | Status |
|----------|--------|
| Docker self-host | ✅ Yes (AppFlowy-Cloud, complex multi-container) |
| Graph visualization | ❌ No |
| Task management | ✅ Kanban, calendar views |
| API | ⚠️ Limited |
| Markdown from disk | ❌ No native disk reading |
| Desktop app | ✅ Yes (Flutter-based) |
| Active maintenance | ✅ Very active, Rust backend |

**Verdict:** Good Notion alternative but no graph, no chat integration. Heavy for what we need.

### 3. Logseq
| Criteria | Status |
|----------|--------|
| Docker self-host | ⚠️ Hacky — static export or community Docker images, read-only in browser |
| Graph visualization | ✅ Excellent built-in graph view |
| Task management | ⚠️ Basic (TODO/DONE states, queries) |
| API | ❌ No server API (local app only) |
| Markdown from disk | ✅ Native — works directly with markdown files on disk |
| Desktop app | ✅ Yes (Electron) |
| Active maintenance | ⚠️ Slowing down, Logseq DB version in flux |

**Verdict:** Best graph + markdown combo but fundamentally a local app. Can't serve as a web dashboard.

### 4. Outline
| Criteria | Status |
|----------|--------|
| Docker self-host | ✅ Yes, mature Docker setup |
| Graph visualization | ❌ No |
| Task management | ❌ No (wiki/docs only) |
| API | ✅ Full REST API (RPC-style) |
| Markdown from disk | ⚠️ Import only, no live sync |
| Desktop app | ❌ Web only |
| Active maintenance | ✅ Very active |

**Verdict:** Excellent wiki with great API, but docs-only. No tasks, no graph.

### 5. Huly ⭐
| Criteria | Status |
|----------|--------|
| Docker self-host | ✅ Yes (docker-compose, but heavy: 4GB RAM, 35GB disk) |
| Graph visualization | ❌ No knowledge graph |
| Task management | ✅ Full — issues, kanban, sprints, time tracking |
| API | ✅ Yes |
| Markdown from disk | ❌ No |
| Desktop app | ❌ Web only |
| Active maintenance | ✅ Very active |
| Chat built-in | ✅ Yes — Slack-like channels, DMs, video calls |

**Verdict:** Closest to "all-in-one" — has chat + tasks + docs. But NO graph visualization and very resource-heavy. Missing file browser and Telegram integration.

### 6. Plane
| Criteria | Status |
|----------|--------|
| Docker self-host | ✅ Yes, excellent Docker support (500K+ pulls) |
| Graph visualization | ❌ No |
| Task management | ✅ Full — issues, kanban, sprints, epics, cycles |
| API | ✅ Full REST API + webhooks + OAuth |
| Markdown from disk | ❌ No |
| Desktop app | ❌ Web only |
| Active maintenance | ✅ Very active (44K GitHub stars) |

**Verdict:** Best open-source Jira/Linear alternative. Great for tasks but nothing else we need.

### 7. Twenty
| Criteria | Status |
|----------|--------|
| Docker self-host | ✅ Yes |
| Graph visualization | ❌ No (relationship views between CRM entities) |
| Task management | ⚠️ Basic (tasks/notes on CRM objects) |
| API | ✅ Full GraphQL + REST |
| Markdown from disk | ❌ No |
| Desktop app | ❌ Web only |
| Active maintenance | ✅ Very active |

**Verdict:** CRM, not a command center. Wrong tool for this job.

### 8. NocoDB
| Criteria | Status |
|----------|--------|
| Docker self-host | ✅ Easy single-container |
| Graph visualization | ❌ No |
| Task management | ⚠️ Kanban view exists but it's a spreadsheet tool |
| API | ✅ Full REST API |
| Markdown from disk | ❌ No |
| Desktop app | ❌ Web only |
| Active maintenance | ✅ Active |

**Verdict:** Airtable replacement. Could be a component (task tracking backend) but not the dashboard.

### 9. Trilium Notes ⭐⭐
| Criteria | Status |
|----------|--------|
| Docker self-host | ✅ Easy Docker deployment |
| Graph visualization | ✅ Relation maps, link maps, mind maps |
| Task management | ⚠️ Basic (labels, TODO notes, scripting) |
| API | ✅ Full REST API + advanced scripting |
| Markdown from disk | ⚠️ Import, not live sync from disk |
| Desktop app | ✅ Yes (Electron) |
| Active maintenance | ✅ TriliumNext fork is actively maintained |

**Verdict:** **Strongest single candidate.** Has graph visualization + API + scripting. Could be extended with custom widgets for task board and chat. The scripting system is uniquely powerful — you can build custom views inside Trilium itself.

### 10. Neo4j Browser
| Criteria | Status |
|----------|--------|
| Docker self-host | ✅ Easy |
| Graph visualization | ✅ Purpose-built for this |
| Task management | ❌ No |
| API | ✅ Full (Cypher, REST, Bolt) |
| Markdown from disk | ❌ No |
| Desktop app | ✅ Neo4j Desktop |
| Active maintenance | ✅ Yes |

**Verdict:** Overkill for our use case. Our graph is in SQLite, not Neo4j. The visualization is great but it's a database tool, not a dashboard.

---

## Summary Matrix

| Tool | Docs | Tasks | Graph | Chat | Files | API | Docker | **Score** |
|------|------|-------|-------|------|-------|-----|--------|-----------|
| Trilium | ✅ | ⚠️ | ✅ | ❌ | ⚠️ | ✅ | ✅ | **5/7** |
| Huly | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | **5/7** |
| Plane | ⚠️ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | **3/7** |
| AFFiNE | ✅ | ⚠️ | ❌ | ❌ | ❌ | ⚠️ | ✅ | **2.5/7** |
| Logseq | ✅ | ⚠️ | ✅ | ❌ | ✅ | ❌ | ⚠️ | **3.5/7** |
| Outline | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | **3/7** |

**No single tool covers all 5 requirements.**

---

## Path A: Use an Existing App (Trilium Notes + Customization)

### Why Trilium
- **Only tool with BOTH graph visualization AND scripting API**
- Custom widgets can embed iframes (Telegram web, file browser)
- Relation maps visualize entity connections natively
- REST API allows external tools to push data in
- TriliumNext fork is actively maintained with community support
- Lightweight: single Docker container, SQLite backend

### What exists:
- ✅ Note-taking / docs (core feature)
- ✅ Graph/relation visualization (built-in)
- ✅ REST API for integration
- ✅ Docker self-hosting

### What needs building:
- 🔧 Task management — custom widget or script using Trilium's label system + custom render
- 🔧 Telegram integration — webhook receiver that creates/updates notes via API
- 🔧 File browser — custom widget that reads ~/kira/vdr/ (Trilium scripts can exec server-side)
- 🔧 Graph from SQLite — script to sync ~/chimera/memory/graph.db → Trilium relation maps

### Effort estimate: ~2-3 weeks of scripting within Trilium

### Pros:
- Single app, single container
- Extensible via built-in scripting (no separate codebase)
- Already has the hardest feature (graph visualization)
- Desktop app for offline access

### Cons:
- Task management will feel bolted-on
- Trilium's UI is functional but not beautiful
- Scripting system has a learning curve
- Not designed for real-time chat

---

## Path B: Build a Custom Dashboard

### Architecture
```
┌─────────────────────────────────────────────┐
│              Next.js / HTMX App              │
│                (port 3000)                   │
├──────────┬──────────┬──────────┬─────────────┤
│  Doc     │  Task    │  Graph   │   Chat      │
│  Viewer  │  Board   │  View    │   Panel     │
│          │          │          │             │
│ marked/  │ SQLite   │ vis.js   │ Telegram    │
│ mdx      │ or       │ or d3    │ Bot API     │
│ renders  │ Notion   │ reads    │ webhook     │
│ ~/vdr/   │ API      │ graph.db │             │
├──────────┴──────────┴──────────┴─────────────┤
│              File Browser Panel              │
│         (reads ~/kira/vdr/ directly)         │
└─────────────────────────────────────────────┘
```

### Tech stack recommendation:
- **Framework:** Next.js 14+ (App Router) — SSR, API routes, file system access
- **Graph:** vis.js (simpler) or d3-force (more control) reading from graph.db via better-sqlite3
- **Docs:** @mdx-js/mdx or marked for rendering markdown from ~/kira/vdr/
- **Tasks:** SQLite table (simple) or Notion API bridge (if keeping Notion)
- **Chat:** Telegram Bot API long-polling or webhook → WebSocket to browser
- **File browser:** Node.js fs module, serve file tree as JSON API
- **UI:** Tailwind + shadcn/ui for rapid, clean components

### What exists (libraries/APIs):
- ✅ vis.js / d3.js — mature graph visualization
- ✅ marked / MDX — markdown rendering
- ✅ better-sqlite3 — read graph.db directly
- ✅ Telegram Bot API — well-documented
- ✅ shadcn/ui — production-ready components

### What needs building:
- 🔧 Dashboard layout with panels/tabs (~2 days)
- 🔧 Markdown doc viewer + file tree (~2 days)
- 🔧 Graph visualization component reading graph.db (~3 days)
- 🔧 Task board UI + backend (~3 days)
- 🔧 Telegram chat panel integration (~2 days)
- 🔧 File browser with preview (~1 day)
- 🔧 Auth (basic, since single-user) (~1 day)

### Effort estimate: ~2 weeks for MVP

### Pros:
- **Exactly what you need, nothing more**
- Full control over UX and features
- Lightweight — single Next.js process
- Reads directly from existing files (vdr/, graph.db)
- No migration needed — works with current data
- Can evolve incrementally
- Modern, fast UI

### Cons:
- You have to build and maintain it
- No mobile app (unless PWA)
- No offline editing (web-only)
- Every new feature is custom code

---

## 🏆 RECOMMENDATION

**Go with Path B (Custom Dashboard)** for these reasons:

1. **No existing tool fits.** The closest (Trilium) still needs heavy customization, and you'd be fighting its UI paradigm instead of building your own.

2. **Your data already exists.** Graph in SQLite, docs in markdown, tasks in Notion — a custom dashboard just *reads* from these. No migration.

3. **It's actually less work.** Building 5 panels in Next.js (~2 weeks) vs. learning Trilium's scripting system and bending it to do things it wasn't designed for (~2-3 weeks with worse results).

4. **Future-proof.** Want to add a new panel? Just add a React component. With Trilium, you're limited by their plugin system.

5. **The graph visualization is the killer feature** and vis.js/d3 will look better than anything Trilium produces.

### Suggested MVP Phases:

**Phase 1 (Week 1):** File browser + Doc viewer + Graph visualization
- These read from existing data, no new infrastructure needed
- Immediate value: stop SSHing to read files

**Phase 2 (Week 2):** Task board + Chat panel  
- Task board: start with Notion API read, migrate to local SQLite later
- Chat: Telegram webhook → display recent messages

**Phase 3 (Ongoing):** Polish + features
- Search across all panels
- Keyboard shortcuts
- Graph filtering/querying
- Task creation from chat messages

### Alternative hybrid approach:
If building feels like too much, use **Huly** for tasks+chat+docs and build a **standalone graph viewer** as a small web app (vis.js + graph.db). Two tools instead of one, but less custom code.

---

## Files Referenced
- `~/kira/vdr/` — Document/file storage (markdown, PDFs)
- `~/chimera/memory/graph.db` — SQLite knowledge graph
- Notion API — Current task management
- Telegram Bot API — Current chat interface
