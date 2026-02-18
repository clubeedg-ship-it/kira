#!/bin/bash
# ============================================================================
# moltbot-manager.sh - Manage moltbot fleet
#
# Commands:
#   list              List all moltbots
#   status [name]     Show status (all or specific)
#   start <name>      Start a moltbot
#   stop <name>       Stop a moltbot
#   restart <name>    Restart a moltbot
#   logs <name>       Show logs for a moltbot
#   remove <name>     Remove a moltbot (stops service, removes files)
#   project <name>    List bots for a project
#
# ============================================================================

set -e

CLAWDBOT_HOME="$HOME/.clawdbot-bots"
REGISTRY_FILE="$CLAWDBOT_HOME/registry.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

cmd_list() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🤖 Moltbot Fleet${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [[ ! -f "$REGISTRY_FILE" ]]; then
        echo -e "${YELLOW}No moltbots provisioned yet.${NC}"
        echo -e "Run: ${CYAN}provision-moltbot.sh <name> <token>${NC}"
        return
    fi
    
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}Install jq for better output${NC}"
        cat "$REGISTRY_FILE"
        return
    fi
    
    local count=$(jq '.bots | length' "$REGISTRY_FILE")
    if [[ "$count" == "0" ]]; then
        echo -e "${YELLOW}No moltbots provisioned yet.${NC}"
        return
    fi
    
    printf "\n%-20s %-15s %-8s %-10s\n" "NAME" "PROJECT" "PORT" "STATUS"
    printf "%-20s %-15s %-8s %-10s\n" "----" "-------" "----" "------"
    
    jq -r '.bots[] | "\(.name)|\(.project)|\(.port)|\(.service)"' "$REGISTRY_FILE" | while IFS='|' read -r name project port service; do
        local status="unknown"
        if systemctl --user is-active "$service" &>/dev/null; then
            status="${GREEN}running${NC}"
        else
            status="${RED}stopped${NC}"
        fi
        printf "%-20s %-15s %-8s " "$name" "${project:-—}" "$port"
        echo -e "$status"
    done
    echo ""
}

cmd_status() {
    local name="$1"
    
    if [[ -z "$name" ]]; then
        # Status for all
        cmd_list
        return
    fi
    
    local service="clawdbot-$name"
    echo -e "${BLUE}Status: $name${NC}"
    systemctl --user status "$service" --no-pager 2>/dev/null || echo -e "${RED}Service not found${NC}"
}

cmd_start() {
    local name="$1"
    if [[ -z "$name" ]]; then
        echo -e "${RED}Usage: $0 start <name>${NC}"
        exit 1
    fi
    
    local service="clawdbot-$name"
    echo -e "${BLUE}Starting $name...${NC}"
    systemctl --user enable --now "$service"
    sleep 1
    systemctl --user status "$service" --no-pager
}

cmd_stop() {
    local name="$1"
    if [[ -z "$name" ]]; then
        echo -e "${RED}Usage: $0 stop <name>${NC}"
        exit 1
    fi
    
    local service="clawdbot-$name"
    echo -e "${BLUE}Stopping $name...${NC}"
    systemctl --user stop "$service" 2>/dev/null || true
    echo -e "${GREEN}Stopped.${NC}"
}

cmd_restart() {
    local name="$1"
    if [[ -z "$name" ]]; then
        echo -e "${RED}Usage: $0 restart <name>${NC}"
        exit 1
    fi
    
    local service="clawdbot-$name"
    echo -e "${BLUE}Restarting $name...${NC}"
    systemctl --user restart "$service"
    sleep 1
    systemctl --user status "$service" --no-pager
}

cmd_logs() {
    local name="$1"
    if [[ -z "$name" ]]; then
        echo -e "${RED}Usage: $0 logs <name>${NC}"
        exit 1
    fi
    
    local service="clawdbot-$name"
    journalctl --user -u "$service" -f --no-pager
}

cmd_remove() {
    local name="$1"
    if [[ -z "$name" ]]; then
        echo -e "${RED}Usage: $0 remove <name>${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}This will remove moltbot '$name' completely.${NC}"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    
    local service="clawdbot-$name"
    local config_dir="$CLAWDBOT_HOME/$name"
    local workspace="$HOME/moltbots/$name"
    
    # Stop and disable service
    echo -e "${BLUE}Stopping service...${NC}"
    systemctl --user stop "$service" 2>/dev/null || true
    systemctl --user disable "$service" 2>/dev/null || true
    rm -f "$HOME/.config/systemd/user/$service.service"
    systemctl --user daemon-reload
    
    # Remove from registry
    if [[ -f "$REGISTRY_FILE" ]] && command -v jq &> /dev/null; then
        TMP=$(mktemp)
        jq --arg name "$name" '.bots = [.bots[] | select(.name != $name)]' "$REGISTRY_FILE" > "$TMP" && mv "$TMP" "$REGISTRY_FILE"
    fi
    
    # Remove config dir
    if [[ -d "$config_dir" ]]; then
        echo -e "${BLUE}Removing config: $config_dir${NC}"
        rm -rf "$config_dir"
    fi
    
    # Ask about workspace
    if [[ -d "$workspace" ]]; then
        echo -e "${YELLOW}Workspace exists at: $workspace${NC}"
        read -p "Remove workspace too? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$workspace"
            echo -e "${GREEN}Workspace removed.${NC}"
        else
            echo -e "${CYAN}Workspace preserved.${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ Moltbot '$name' removed.${NC}"
}

cmd_project() {
    local project="$1"
    if [[ -z "$project" ]]; then
        echo -e "${RED}Usage: $0 project <project_name>${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}Moltbots for project: $project${NC}"
    
    if [[ ! -f "$REGISTRY_FILE" ]] || ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}Registry not found or jq not installed${NC}"
        return
    fi
    
    jq -r --arg p "$project" '.bots[] | select(.project == $p) | "  - \(.name) (port \(.port))"' "$REGISTRY_FILE"
}

# Main
case "${1:-}" in
    list|ls)
        cmd_list
        ;;
    status)
        cmd_status "$2"
        ;;
    start)
        cmd_start "$2"
        ;;
    stop)
        cmd_stop "$2"
        ;;
    restart)
        cmd_restart "$2"
        ;;
    logs)
        cmd_logs "$2"
        ;;
    remove|rm)
        cmd_remove "$2"
        ;;
    project)
        cmd_project "$2"
        ;;
    *)
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  list              List all moltbots"
        echo "  status [name]     Show status"
        echo "  start <name>      Start a moltbot"
        echo "  stop <name>       Stop a moltbot"
        echo "  restart <name>    Restart a moltbot"
        echo "  logs <name>       Follow logs"
        echo "  remove <name>     Remove a moltbot"
        echo "  project <name>    List bots for a project"
        ;;
esac
