#!/bin/bash
set -e

API_KEY=$(cat ~/.config/notion/api_key)
NOTION_VERSION="2022-06-28"
COMMAND_CENTER="300a6c94-88ca-8123-a75e-f9238180e463"
LOG_FILE="$HOME/kira/vdr/notion-vdr-sync-log.md"

echo "# Notion VDR Sync Log" > "$LOG_FILE"
echo "Date: $(date -u)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

notion_api() {
  local method=$1 url=$2 data=$3
  curl -s -X "$method" "https://api.notion.com/v1$url" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Notion-Version: $NOTION_VERSION" \
    -H "Content-Type: application/json" \
    ${data:+-d "$data"}
}

# 1. Create "📚 Research & VDR" page
echo "Creating Research & VDR page..."
PARENT_RESP=$(notion_api POST /pages '{
  "parent": {"page_id": "'"$COMMAND_CENTER"'"},
  "properties": {"title": {"title": [{"text": {"content": "📚 Research & VDR"}}]}},
  "children": []
}')
VDR_PAGE_ID=$(echo "$PARENT_RESP" | jq -r '.id')
echo "- 📚 Research & VDR: $VDR_PAGE_ID" >> "$LOG_FILE"
echo "Created VDR page: $VDR_PAGE_ID"

if [ "$VDR_PAGE_ID" = "null" ] || [ -z "$VDR_PAGE_ID" ]; then
  echo "ERROR creating parent page:"
  echo "$PARENT_RESP" | jq .
  exit 1
fi

echo "" >> "$LOG_FILE"
echo "## Child Pages" >> "$LOG_FILE"
