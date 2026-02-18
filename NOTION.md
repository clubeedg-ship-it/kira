# NOTION.md - Single Source of Truth

**Notion is the authoritative source for all business data.**
Local files are working drafts; Notion is canonical.

---

## Access

```bash
NOTION_KEY=$(cat ~/.config/notion/api_key)
# Version: 2025-09-03 (databases = "data sources")
```

## Key Databases

| Database | ID | Purpose |
|----------|-----|---------|
| Projects | `279a6c94-88ca-802a-b531-000b4470c5dd` | All companies and projects |
| Goals | `2fba6c94-88ca-81b3-9f46-000ba63ca67c` | Strategic goals |
| Monthly Goals | `2fba6c94-88ca-813e-b608-000b17435330` | Monthly targets |

## Key Project Pages

| Project | Page ID | Status |
|---------|---------|--------|
| oopuo (Holding) | `2cea6c94-88ca-80f7-b0ae-f78ad801d018` | Active |
| OTTOGEN.IO | `2a6a6c94-88ca-8094-92f1-fbdb5c839518` | Active |
| SentinAgro | `2b9a6c94-...` | Planning |
| ZenithCred | `2fba6c94-88ca-8139-93eb-ef70594fc529` | Pre-revenue |
| IAM | `29aa6c94-88ca-8091-a3bf-e3110142e489` | Active |
| Abura Cosmetics | `2b6a6c94-88ca-8024-a09c-d0c9448a048b` | Active |
| CuttingEdge | Multiple pages | Active |

## Agent Rules

1. **Read from Notion** before acting on any project
2. **Update Notion** after completing significant work
3. **Local files** (`~/kira/vdr/`, `~/kira/oopuo/`) are drafts only
4. **Sync direction**: Local → Notion (push up), never assume local is current

## Common Operations

### Query Projects
```bash
curl -s -X POST "https://api.notion.com/v1/data_sources/279a6c94-88ca-802a-b531-000b4470c5dd/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"page_size": 50}'
```

### Get Project Details
```bash
curl -s "https://api.notion.com/v1/pages/{page_id}" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03"
```

### Get Page Content
```bash
curl -s "https://api.notion.com/v1/blocks/{page_id}/children" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03"
```

### Update Page
```bash
curl -X PATCH "https://api.notion.com/v1/pages/{page_id}" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"properties": {...}}'
```

### Add Content to Page
```bash
curl -X PATCH "https://api.notion.com/v1/blocks/{page_id}/children" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"children": [...]}'
```

---

## VDR Migration Status

Files in `~/kira/vdr/` need to be migrated to their respective Notion pages:

| File | Target Page | Status |
|------|-------------|--------|
| zenithcred-*.md | ZenithCred | PENDING |
| ottogen-brand-strategy.md | OTTOGEN.IO | PENDING |
| sentinagro-*.md | SentinAgro | PENDING |
| abura-cosmetics-*.md | Abura Cosmetics | PENDING |
| iam-*.md | IAM | PENDING |
| cuttingedge-*.md | CuttingEdge | PENDING |
| oopuo-structure-workshop.md | oopuo | PENDING |

---

*When in doubt, query Notion. It's the truth.*
