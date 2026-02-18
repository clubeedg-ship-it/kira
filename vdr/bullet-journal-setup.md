# Bullet Journal Setup - Notion Databases

Created: 2026-02-02

## Databases

### 🎯 Goals Database
- **ID:** `2fba6c94-88ca-8102-afb2-cae874f281bd`
- **URL:** https://www.notion.so/2fba6c9488ca8102afb2cae874f281bd

**Properties:**
| Property | Type | Notes |
|----------|------|-------|
| Goal | title | Main goal name |
| Area | relation | Links to Areas DB (279a6c94-88ca-8073-9f0d-cdac4455b4c3) |
| Type | select | Outcome / Habit / Project |
| Timeframe | select | Q1 / Q2 / Q3 / Q4 / Year / Ongoing |
| Status | select | Not Started / In Progress / Achieved / Abandoned |
| Progress | number | 0-100% (percent format) |
| Key Results | rich_text | Measurable outcomes |
| Why | rich_text | Motivation |
| Due Date | date | Target completion |

---

### 📅 Monthly Goals Database
- **ID:** `2fba6c94-88ca-81e0-938e-ceb20fcc7203`
- **URL:** https://www.notion.so/2fba6c9488ca81e0938eceb20fcc7203

**Properties:**
| Property | Type | Notes |
|----------|------|-------|
| Month | title | Format: "2026-02 February" |
| Theme | rich_text | Monthly focus |
| Goals | relation | Links to Goals DB |
| Wins | rich_text | End-of-month wins |
| Lessons | rich_text | What was learned |
| Score | number | 1-10 self-rating |

---

## Initial Goals Created

| Goal | Area | Type | Timeframe | Progress | Due Date | Page ID |
|------|------|------|-----------|----------|----------|---------|
| Launch IAM Website Rebrand | IAM | Project | Q1 | 40% | 2026-02-04 | `2fba6c94-88ca-81aa-bf6b-d43a1a4b7670` |
| Close ZenithCred Investment Round | ZenithCred | Outcome | Q1 | 20% | 2026-03-15 | `2fba6c94-88ca-8196-8f73-d63642a9d353` |
| Launch OTTOGEN.IO Website | OTTOGEN.IO | Project | Q1 | 20% | 2026-03-15 | `2fba6c94-88ca-81a4-8d93-d8b27bd2f161` |
| Launch Bot Triagem MVP | Bot Triagem Gestacional | Project | Q2 | 15% | 2026-05-15 | `2fba6c94-88ca-81ae-9f7e-ebe7de5253b6` |
| Grow Abura Sales | Abura Cosmetics | Outcome | Ongoing | 10% | - | `2fba6c94-88ca-812b-89fd-e7189f799b41` |

---

## Current Month

**2026-02 February**
- **ID:** `2fba6c94-88ca-8157-a819-e55a3c42c1f3`
- **Theme:** Foundation Building
- **Goals:** All 5 initial goals linked
- **Score:** (to be filled at month end)

---

## API Reference

```bash
# Get Notion API key
NOTION_KEY=$(cat ~/.config/notion/api_key)

# Query Goals
curl -s "https://api.notion.com/v1/databases/2fba6c94-88ca-8102-afb2-cae874f281bd/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -d '{}'

# Query Monthly Goals
curl -s "https://api.notion.com/v1/databases/2fba6c94-88ca-81e0-938e-ceb20fcc7203/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -d '{}'
```

---

## Notes

- Status uses `select` type (Notion API doesn't support creating `status` properties)
- Progress stored as decimal (0.40 = 40%)
- Goals linked to Areas via relation property
- Monthly Goals linked to Goals via relation property
