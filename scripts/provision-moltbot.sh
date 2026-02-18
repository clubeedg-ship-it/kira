#!/bin/bash
# ============================================================================
# provision-moltbot.sh - Spawn a new Clawdbot instance (moltbot)
# 
# Creates a fully isolated Clawdbot with its own:
#   - Telegram bot
#   - Config file
#   - State directory  
#   - Workspace
#   - Systemd service
#
# Usage:
#   ./provision-moltbot.sh <bot_name> <telegram_token> [options]
#
# Example:
#   ./provision-moltbot.sh chimera-marketing "123456:ABC..." --project chimera
#   ./provision-moltbot.sh interior-vdr "789012:DEF..." --project interior
#
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Defaults
BASE_PORT=19000
CLAWDBOT_HOME="$HOME/.clawdbot-bots"
WORKSPACE_BASE="$HOME/moltbots"
MODEL="anthropic/claude-sonnet-4-20250514"

# Parse arguments
BOT_NAME=""
TELEGRAM_TOKEN=""
PROJECT=""
SOUL_TEMPLATE=""
START_NOW=false

usage() {
    echo "Usage: $0 <bot_name> <telegram_token> [options]"
    echo ""
    echo "Arguments:"
    echo "  bot_name        Unique identifier (lowercase, no spaces)"
    echo "  telegram_token  Bot token from @BotFather"
    echo ""
    echo "Options:"
    echo "  --project NAME    Project this bot belongs to (chimera, interior, etc.)"
    echo "  --soul FILE       Path to custom SOUL.md template"
    echo "  --model MODEL     LLM model to use (default: claude-sonnet-4-20250514)"
    echo "  --start           Start the bot immediately after provisioning"
    echo "  --port PORT       Override base port (default: auto-assigned)"
    echo ""
    echo "Examples:"
    echo "  $0 chimera-marketing 123:ABC --project chimera --start"
    echo "  $0 interior-vdr 456:DEF --project interior --soul ~/templates/interior-soul.md"
    exit 1
}

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT="$2"
            shift 2
            ;;
        --soul)
            SOUL_TEMPLATE="$2"
            shift 2
            ;;
        --model)
            MODEL="$2"
            shift 2
            ;;
        --start)
            START_NOW=true
            shift
            ;;
        --port)
            BASE_PORT="$2"
            shift 2
            ;;
        --help|-h)
            usage
            ;;
        *)
            if [[ -z "$BOT_NAME" ]]; then
                BOT_NAME="$1"
            elif [[ -z "$TELEGRAM_TOKEN" ]]; then
                TELEGRAM_TOKEN="$1"
            else
                echo -e "${RED}Unknown argument: $1${NC}"
                usage
            fi
            shift
            ;;
    esac
done

# Validate required args
if [[ -z "$BOT_NAME" ]] || [[ -z "$TELEGRAM_TOKEN" ]]; then
    echo -e "${RED}Error: bot_name and telegram_token are required${NC}"
    usage
fi

# Validate bot name (lowercase, alphanumeric, hyphens)
if [[ ! "$BOT_NAME" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$ ]]; then
    echo -e "${RED}Error: bot_name must be lowercase alphanumeric with hyphens${NC}"
    exit 1
fi

# Calculate port (find next available)
find_next_port() {
    local port=$BASE_PORT
    while [[ -d "$CLAWDBOT_HOME/$BOT_NAME" ]] || ss -tuln 2>/dev/null | grep -q ":$port "; do
        port=$((port + 10))
    done
    # Also check existing configs for port conflicts
    for config in "$CLAWDBOT_HOME"/*/clawdbot.json; do
        if [[ -f "$config" ]]; then
            local used_port=$(grep -o '"port":[[:space:]]*[0-9]*' "$config" 2>/dev/null | grep -o '[0-9]*' || true)
            if [[ "$used_port" == "$port" ]]; then
                port=$((port + 10))
            fi
        fi
    done
    echo $port
}

PORT=$(find_next_port)

# Paths
CONFIG_DIR="$CLAWDBOT_HOME/$BOT_NAME"
STATE_DIR="$CLAWDBOT_HOME/$BOT_NAME/state"
WORKSPACE="$WORKSPACE_BASE/$BOT_NAME"
CONFIG_FILE="$CONFIG_DIR/clawdbot.json"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🤖 Provisioning Moltbot: ${GREEN}$BOT_NAME${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Config:    $CONFIG_DIR"
echo -e "  State:     $STATE_DIR"
echo -e "  Workspace: $WORKSPACE"
echo -e "  Port:      $PORT"
echo -e "  Project:   ${PROJECT:-none}"
echo ""

# Check if already exists
if [[ -d "$CONFIG_DIR" ]]; then
    echo -e "${YELLOW}Warning: Bot '$BOT_NAME' already exists at $CONFIG_DIR${NC}"
    read -p "Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Create directories
echo -e "${BLUE}[1/5]${NC} Creating directories..."
mkdir -p "$CONFIG_DIR"
mkdir -p "$STATE_DIR"
mkdir -p "$WORKSPACE"
mkdir -p "$WORKSPACE/memory"

# Generate gateway token
GATEWAY_TOKEN=$(openssl rand -hex 24)

# Create config
echo -e "${BLUE}[2/5]${NC} Writing config..."
cat > "$CONFIG_FILE" << EOF
{
  "meta": {
    "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "createdBy": "provision-moltbot.sh",
    "botName": "$BOT_NAME",
    "project": "${PROJECT:-unassigned}"
  },
  "agents": {
    "defaults": {
      "workspace": "$WORKSPACE",
      "model": "$MODEL",
      "maxConcurrent": 2
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "$TELEGRAM_TOKEN",
      "dmPolicy": "pairing",
      "groupPolicy": "denyAll"
    }
  },
  "gateway": {
    "port": $PORT,
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "$GATEWAY_TOKEN"
    }
  },
  "session": {
    "ttl": "24h"
  }
}
EOF

# Create workspace files
echo -e "${BLUE}[3/5]${NC} Setting up workspace..."

# AGENTS.md
cat > "$WORKSPACE/AGENTS.md" << 'EOF'
# AGENTS.md - Moltbot Workspace

You are a specialized agent. Read SOUL.md to understand your purpose.

## Memory
- Daily notes: `memory/YYYY-MM-DD.md`
- Long-term: `MEMORY.md`

## Notion (Project Management)
All moltbots have Notion access for project tracking.
- API key: `~/.config/notion/api_key`
- Use Notion API for: pages, databases, project tracking
- Read the Notion skill for API patterns

## Communication
You can coordinate with other moltbots via the main Kira orchestrator.
When you complete significant work, report back.

## Safety
- Don't share data between projects unless explicitly told to
- Ask before external actions (emails, posts, etc.)
EOF

# SOUL.md (custom or default)
if [[ -n "$SOUL_TEMPLATE" ]] && [[ -f "$SOUL_TEMPLATE" ]]; then
    cp "$SOUL_TEMPLATE" "$WORKSPACE/SOUL.md"
else
    cat > "$WORKSPACE/SOUL.md" << EOF
# SOUL.md - $BOT_NAME

**Project:** ${PROJECT:-General}
**Role:** Specialized assistant

## Purpose
[Define your specific purpose here]

## Expertise
[What are you good at?]

## Boundaries
- Stay focused on your domain
- Coordinate with other bots through Kira when needed
- Report significant progress/blockers

---
*This file defines who you are. Update it as you learn.*
EOF
fi

# USER.md
cat > "$WORKSPACE/USER.md" << EOF
# USER.md - About Your Human

- **Name:** Otto
- **Telegram:** @coringa_dfato

## Notes
This moltbot was created for the ${PROJECT:-general} project.
EOF

# MEMORY.md
cat > "$WORKSPACE/MEMORY.md" << EOF
# MEMORY.md - Long-term Memory

*Created: $(date +%Y-%m-%d)*

## Project Context
- Bot: $BOT_NAME
- Project: ${PROJECT:-unassigned}

---
*Add important learnings, decisions, and context here.*
EOF

# TOOLS.md
cat > "$WORKSPACE/TOOLS.md" << 'EOF'
# TOOLS.md - Local Tool Configuration

## Notion
All moltbots have Notion access for project management.

- **API Key:** `~/.config/notion/api_key`
- **Version:** 2025-09-03
- **Docs:** https://developers.notion.com

### Quick Reference
```bash
NOTION_KEY=$(cat ~/.config/notion/api_key)

# Search
curl -X POST "https://api.notion.com/v1/search" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -d '{"query": "..."}'

# Query database
curl -X POST "https://api.notion.com/v1/databases/{id}/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03"
```

### Project Databases
<!-- Add your project-specific database IDs here -->
- VDR: (add ID)
- Tasks: (add ID)
- Notes: (add ID)

---
*Add more tool-specific notes as you learn them.*
EOF

# Create HEARTBEAT.md from template
echo -e "${BLUE}[4/6]${NC} Setting up memory system..."
if [[ -f "$HOME/moltbot-core/templates/HEARTBEAT.md" ]]; then
    sed "s/{{BOT_NAME}}/$BOT_NAME/g" "$HOME/moltbot-core/templates/HEARTBEAT.md" > "$WORKSPACE/HEARTBEAT.md"
fi

# Ensure moltbot-core scripts are executable
chmod +x "$HOME/moltbot-core/scripts/"*.js 2>/dev/null || true

# Create systemd service
echo -e "${BLUE}[5/6]${NC} Creating systemd service..."
SERVICE_NAME="clawdbot-$BOT_NAME"
SERVICE_FILE="$HOME/.config/systemd/user/$SERVICE_NAME.service"

mkdir -p "$HOME/.config/systemd/user"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Clawdbot Gateway ($BOT_NAME)
After=network.target

[Service]
Type=simple
Environment=CLAWDBOT_CONFIG_PATH=$CONFIG_FILE
Environment=CLAWDBOT_STATE_DIR=$STATE_DIR
Environment=CLAWDBOT_GATEWAY_PORT=$PORT
ExecStart=/home/linuxbrew/.linuxbrew/bin/node /home/linuxbrew/.linuxbrew/lib/node_modules/clawdbot/dist/entry.js gateway --port $PORT
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload

# Registry entry for orchestrator
echo -e "${BLUE}[6/6]${NC} Registering bot..."
REGISTRY_FILE="$CLAWDBOT_HOME/registry.json"
if [[ ! -f "$REGISTRY_FILE" ]]; then
    echo '{"bots":[]}' > "$REGISTRY_FILE"
fi

# Add to registry using jq if available, otherwise simple append
if command -v jq &> /dev/null; then
    TMP=$(mktemp)
    jq --arg name "$BOT_NAME" \
       --arg project "${PROJECT:-}" \
       --arg port "$PORT" \
       --arg workspace "$WORKSPACE" \
       --arg config "$CONFIG_FILE" \
       --arg service "$SERVICE_NAME" \
       '.bots = [.bots[] | select(.name != $name)] + [{
         name: $name,
         project: $project,
         port: ($port | tonumber),
         workspace: $workspace,
         config: $config,
         service: $service,
         createdAt: (now | todate)
       }]' "$REGISTRY_FILE" > "$TMP" && mv "$TMP" "$REGISTRY_FILE"
else
    echo -e "${YELLOW}Note: Install jq for proper registry management${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Moltbot '$BOT_NAME' provisioned successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "To start manually:"
echo -e "  ${BLUE}CLAWDBOT_CONFIG_PATH=$CONFIG_FILE CLAWDBOT_STATE_DIR=$STATE_DIR clawdbot gateway --port $PORT${NC}"
echo ""
echo -e "To enable as service:"
echo -e "  ${BLUE}systemctl --user enable --now $SERVICE_NAME${NC}"
echo ""
echo -e "To check status:"
echo -e "  ${BLUE}systemctl --user status $SERVICE_NAME${NC}"
echo ""

# Start if requested
if [[ "$START_NOW" == true ]]; then
    echo -e "${BLUE}Starting $SERVICE_NAME...${NC}"
    systemctl --user enable --now "$SERVICE_NAME"
    sleep 2
    systemctl --user status "$SERVICE_NAME" --no-pager
fi
