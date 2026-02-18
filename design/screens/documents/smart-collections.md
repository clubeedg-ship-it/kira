# Smart Collections

> **Status:** ✅ DESIGNED | **Phase:** 3
> **Purpose:** Auto-generated and user-created saved filter presets for documents. Like smart playlists in music — dynamic views that auto-update based on filter criteria.

---

## 1. Built-in Collections

Always available, auto-maintained by the system:

| Collection | Filter Logic |
|-----------|-------------|
| All Documents | No filter (default) |
| Research Outputs | creator_type = agent AND agent_capability = 'research' |
| Drafts Pending Review | linked to input_queue item with status = 'pending' AND queue_type = 'verify' |
| This Week's Deliverables | created_at >= start_of_week |
| Recently Accessed | ORDER BY last_accessed DESC LIMIT 20 |
| Agent Outputs | creator_type = agent |
| By Area: [area_name] | Auto-created per area. One collection per active area. |

---

## 2. Custom Collections

Users create custom collections by saving a filter combination.

**Creation flow:** Apply filters in File Browser → click "Save as Collection" → name it → saved.

**Schema:**
```json
{
  "id": "...",
  "name": "Client X Documents",
  "icon": "📂",
  "filters": {
    "entities": ["Client X"],
    "area_id": "ai-receptionist",
    "type": ["pdf", "md"]
  },
  "sort": "modified_desc",
  "created_at": "..."
}
```

**Dynamic:** Collections are saved queries, not static lists. Adding a document tagged with "Client X" automatically appears in the collection.

---

## 3. UI Integration

Collections appear as horizontal pill tabs in the File Browser toolbar. Click to apply. Active collection highlighted. [+ New Collection] at end. Right-click collection → Edit, Delete, Rename.

---

## 4. Data Loading

`GET /api/v1/documents/collections` — returns list of all collections with document counts.

`GET /api/v1/documents?collection=:id` — applies collection's saved filters.

---

*Smart Collections replace folders with dynamic, filter-based views. Documents auto-organize themselves. Create a collection once, and it stays up to date forever.*