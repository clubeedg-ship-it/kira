# Oopuo Server Architecture v2.0

> **Document:** Definitive server architecture and migration plan  
> **Author:** Kira (AI Infrastructure Architect)  
> **Date:** 2026-03-07  
> **Server:** oopuopu-cloud | Ubuntu 24.04 | 26GB RAM | 10 CPU | 662GB disk | NVIDIA GPU | Proxmox LXC  
> **Status:** APPROVED — Ready for execution

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Target Directory Structure](#3-target-directory-structure)
4. [Service Architecture](#4-service-architecture)
5. [Port Allocation Table](#5-port-allocation-table)
6. [Service Management Policy](#6-service-management-policy)
7. [Migration Plan](#7-migration-plan)
8. [Resource Optimization](#8-resource-optimization)
9. [Security Hardening](#9-security-hardening)
10. [Backup Strategy](#10-backup-strategy)
11. [Development Workflow](#11-development-workflow)
12. [Monitoring & Observability](#12-monitoring--observability)
13. [Naming Conventions](#13-naming-conventions)
14. [Oopuo Standard Server Template](#14-oopuo-standard-server-template)
15. [Appendix: Full Command Reference](#15-appendix-full-command-reference)

---

## 1. Executive Summary

This document transforms a chaotic development server into a professional, reproducible infrastructure platform. The architecture is designed to:

- **Free ~14GB RAM** by disabling unused services (Wazuh, Nomad, Filebeat)
- **Reclaim ~35GB disk** by archiving abandoned projects and removing dead environments
- **Establish a canonical directory structure** that maps directly to Oopuo's business units
- **Create a reproducible template** for enterprise client deployments
- **Professionalize service management** with clear PM2/Docker/systemd boundaries

### Impact Summary

| Metric | Before | After |
|--------|--------|-------|
| RAM in use | ~24GB | ~10GB |
| Disk used | 456GB | ~420GB |
| Home directories | 50+ | 12 |
| Running containers | 30+ | ~20 |
| PM2 processes | 13 | 9 |
| Systemd bloat services | 4 | 0 |

---

## 2. Current State Analysis

### 2.1 RAM Waste (14GB recoverable)

| Service | RAM | Status | Action |
|---------|-----|--------|--------|
| Wazuh (3 services) | ~13GB | Running, unused | **DISABLE** |
| Nomad | ~200MB | Running, unused | **DISABLE** |
| Filebeat | ~100MB | Running, paired w/ Wazuh | **DISABLE** |
| ModemManager | ~50MB | Running, useless on server | **DISABLE** |

### 2.2 Disk Waste (~35GB recoverable)

| Item | Size | Action |
|------|------|--------|
| miniconda3 | 19GB | Archive → delete after confirming nothing depends on it |
| vllm-env | 13GB | Archive → delete (Ollama is primary) |
| Abandoned projects (20+) | ~2GB | Archive |
| Dead Docker images | ~1GB+ | Prune |
| Duplicate cloudflared .deb files | 40MB | Delete |

### 2.3 Project Chaos

```
ACTIVE (12 projects):     kira, chimera, iam-website, solyx-website, omiximo-*, vapi, nexus, stella-debts, master-sheet, vaultwarden
ABANDONED (20+ dirs):     GLM-TTS, OpenHands, agent-zero, bouwer, cryptpad, flowsurface, etc.
DUPLICATES (5 kira's):    kira, kira-app, kira-test, kira-demo, kira-product
EVALUATE (7 items):       kira-app, kira-test, kali-osint, lidar-configurator, moltbot-core, oopuo/backend, vllm-env
```

---

## 3. Target Directory Structure

```
/home/adminuser/
│
├── kira/                          # 🧠 AI Agent workspace (OpenClaw/Kira) — THE HEART
│   ├── docs/                      #    Architecture docs, runbooks
│   ├── memory/                    #    Agent memory system
│   ├── scripts/                   #    Automation scripts
│   ├── skills/                    #    Agent skill definitions
│   └── projects/                  #    Agent-managed project builds
│       └── oopuo-website/         #    Oopuo company website
│
├── chimera/                       # 🔬 Privacy-preserving AI compute R&D
│   ├── memory/
│   ├── scripts/
│   ├── src/
│   └── tests/
│
├── projects/                      # 📁 All active projects (organized by client/purpose)
│   ├── oopuo/                     #    Oopuo internal projects
│   │   ├── website/               #    → symlink to ~/kira/projects/oopuo-website
│   │   └── vaultwarden/           #    Self-hosted password manager
│   ├── omiximo/                   #    Omiximo client projects
│   │   ├── inventory/             #    InvenTree system
│   │   ├── email-automation/      #    Email automation
│   │   └── middleware/            #    Bridge service
│   ├── iam/                       #    Interactive Move
│   │   └── website/               #    Ghost CMS website
│   ├── solyx/                     #    Solyx Energy
│   │   └── website/               #    Next.js website
│   ├── vapi/                      #    Voice AI platform
│   ├── nexus/                     #    Nexus OS (AI agentic system — DO NOT archive)
│   ├── stella/                    #    Stella
│   │   └── debts/                 #    Tax/debt tracker
│   └── zenithcred/                #    ZenithCred (if active)
│       └── lidar-configurator/    #    LiDAR config tool
│
├── models/                        # 🤖 AI models (Ollama — 93GB)
│
├── master-sheet/                  # 📋 Reference documents & assets
│
├── archive/                       # 📦 Archived projects (timestamped)
│   ├── 2026-03-07/                #    Archive date
│   │   ├── kira-app/
│   │   ├── kira-test/
│   │   ├── kira-demo/
│   │   ├── kira-product/
│   │   ├── oopuo-backend/
│   │   ├── moltbot-core/
│   │   ├── kali-osint/
│   │   └── ...
│   └── abandoned/                 #    Clearly dead projects
│       ├── GLM-TTS/
│       ├── OpenHands/
│       ├── agent-zero/
│       └── ... (20+ projects)
│
├── tmp/                           # 🗑️ Temporary workspace (auto-cleaned)
│
└── .config/                       # System configs (existing)
```

### 3.1 Key Design Decisions

1. **`~/kira/` stays at root** — It's the AI agent's workspace, it needs fast access. Not moved into projects/.
2. **`~/chimera/` stays at root** — Core R&D, same level as kira.
3. **`~/projects/` is the ONE place** for all client/product work, organized by client.
4. **`~/models/` stays at root** — 93GB, shared resource, not project-specific.
5. **`~/archive/` with dates** — Nothing is deleted, everything is archived first.
6. **Symlinks bridge old → new** for any running services during transition.

---

## 4. Service Architecture

### 4.1 Service Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        NGINX (reverse proxy)                     │
│  :80 → routing │ :8888 → Ollama proxy │ domain-based routing     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────── PM2 MANAGED ────────────┐  ┌── DOCKER STACKS ──┐ │
│  │                                      │  │                    │ │
│  │  CORE PLATFORM                       │  │  iam-website       │ │
│  │  ├─ openclaw-gateway    (:3100)      │  │  ├─ ghost  (:2368) │ │
│  │  ├─ openclaw-bridge     (:3200)      │  │  ├─ nginx  (:3007) │ │
│  │  ├─ kira-app            (:3008)      │  │  └─ mysql          │ │
│  │  ├─ kira-admin          (:3009)      │  │                    │ │
│  │  └─ whatsapp-bridge     (:3300)      │  │  omiximo-inventory │ │
│  │                                      │  │  ├─ server (:9000) │ │
│  │  AI SERVICES                         │  │  ├─ frontend(:1441)│ │
│  │  ├─ whisper             (:3400)      │  │  ├─ worker         │ │
│  │  └─ gpu-router          (:3500)      │  │  ├─ db             │ │
│  │                                      │  │  └─ redis          │ │
│  │  APPLICATIONS                        │  │                    │ │
│  │  ├─ stella-tax          (:3600)      │  │  omiximo-email     │ │
│  │  ├─ solyx-website       (:3010)      │  │  └─ app    (:8085) │ │
│  │  └─ agent-log           (:3700)      │  │                    │ │
│  │                                      │  │  omiximo-bridge    │ │
│  └──────────────────────────────────────┘  │  └─ app    (:8003) │ │
│                                             │                    │ │
│  ┌──────── SYSTEMD MANAGED ────────┐       │  vapi              │ │
│  │  ollama         (:11434)        │       │  ├─ frontend(:3001)│ │
│  │  nginx          (:80/8888)      │       │  └─ backend (:8000)│ │
│  │  tailscaled                     │       │                    │ │
│  │  docker                         │       │  vaultwarden       │ │
│  └─────────────────────────────────┘       │  └─ app    (:8080) │ │
│                                             └────────────────────┘ │
│                                                                    │
│  ┌──── vLLM (GPU — PRIMARY INFERENCE) ────────────────────────┐   │
│  │  Model: qwen3-14b (or swap)                                 │   │
│  │  Port: 8000 | OpenAI-compatible API                         │   │
│  │  RTX 4090 24GB | PagedAttention | Continuous batching       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌──── OLLAMA (CPU — EMBEDDINGS ONLY) ───────────────────────┐   │
│  │  Model: nomic-embed-text                                    │   │
│  │  Port: 11434 | No GPU allocation                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 Active Services Inventory

| Service | Manager | Port(s) | Project Dir | Status |
|---------|---------|---------|-------------|--------|
| openclaw-gateway | PM2 | 3100 | ~/kira | ✅ CORE |
| openclaw-bridge | PM2 | 3200 | ~/kira | ✅ CORE |
| kira-app | PM2 | 3008 | ~/kira | ✅ CORE |
| kira-admin | PM2 | 3009 | ~/kira | ✅ CORE |
| whatsapp-bridge | PM2 | 3300 | ~/kira | ✅ CORE |
| whisper | PM2 | 3400 | ~/kira | ✅ AI |
| gpu-router | PM2 | 3500 | ~/kira | ✅ AI |
| agent-log | PM2 | 3700 | ~/kira | ✅ CORE |
| stella-tax | PM2 | 3600 | projects/stella/debts | ✅ APP |
| solyx-website | PM2 | 3010 | projects/solyx/website | ✅ APP |
| iam-website | Docker | 3007 | projects/iam/website | ✅ APP |
| omiximo-inventory | Docker | 9000,1441 | projects/omiximo/inventory | ✅ APP |
| omiximo-email | Docker | 8085 | projects/omiximo/email-automation | ✅ APP |
| omiximo-bridge | Docker | 8003 | projects/omiximo/middleware | ✅ APP |
| vapi | Docker | 3001,8000 | projects/vapi | ✅ APP |
| vaultwarden | Docker | 8080 | projects/oopuo/vaultwarden | ⏸️ Stopped |
| ollama | systemd | 11434 | - | ✅ AI |
| nginx | systemd | 80,8888 | - | ✅ INFRA |
| tailscaled | systemd | - | - | ✅ INFRA |

---

## 5. Port Allocation Table

### 5.1 Port Ranges

| Range | Category | Notes |
|-------|----------|-------|
| **80, 443** | Nginx reverse proxy | Public entry points |
| **3000–3099** | Web frontends | Client-facing UIs |
| **3100–3199** | OpenClaw platform | Gateway, internal APIs |
| **3200–3299** | Bridge services | OpenClaw bridge, integrations |
| **3300–3399** | Messaging | WhatsApp, Telegram bridges |
| **3400–3499** | AI services | Whisper, STT, TTS |
| **3500–3599** | AI routing | GPU router, model proxies |
| **3600–3699** | Applications | Stella, misc apps |
| **3700–3799** | Logging & monitoring | Agent-log, metrics |
| **8000–8099** | Docker backends | API servers |
| **8080–8099** | Docker apps | Vaultwarden, misc |
| **8888** | Ollama proxy | Nginx → :11434 with API key |
| **9000–9099** | Docker heavy services | InvenTree, MinIO |
| **11434** | Ollama (direct) | Local only via Tailscale |

### 5.2 Complete Port Map

| Port | Service | Protocol | Exposure |
|------|---------|----------|----------|
| 80 | Nginx | HTTP | Public |
| 81 | LiDAR frontend (Docker) | HTTP | Nginx proxied |
| 1441 | InvenTree frontend | HTTP | Internal |
| 3001 | VAPI frontend | HTTP | Internal |
| 3007 | IAM website (Nginx→Ghost) | HTTP | Internal |
| 3008 | Kira app | HTTP | Internal |
| 3009 | Kira admin | HTTP | Internal |
| 3010 | Solyx website | HTTP | Nginx proxied |
| 3100 | OpenClaw gateway | HTTP | Internal |
| 3200 | OpenClaw bridge | HTTP | Internal |
| 3300 | WhatsApp bridge | HTTP | Internal |
| 3400 | Whisper STT | HTTP | Internal |
| 3500 | GPU router | HTTP | Internal |
| 3600 | Stella tax | HTTP | Internal |
| 3700 | Agent log | HTTP | Internal |
| 5432 | PostgreSQL (kira-test) | TCP | Internal |
| 6379 | Redis (kira-test) | TCP | Internal |
| 8000 | **vLLM inference** (OpenAI-compatible) | HTTP | Localhost → nginx |
| 8010 | VAPI backend (moved from 8000) | HTTP | Internal |
| 8003 | Omiximo bridge | HTTP | Internal |
| 8080 | Vaultwarden | HTTP | Internal |
| 8085 | Omiximo email automation | HTTP | Internal |
| 8888 | **Inference proxy** (nginx → vLLM + Ollama embeddings) | HTTP | Tailscale |
| 9000 | InvenTree server | HTTP | Internal |
| 9002 | MinIO (kira-test) | HTTP | Internal |
| 11434 | Ollama (embeddings only, CPU) | HTTP | localhost |

---

## 6. Service Management Policy

### When to Use What

| Manager | Use For | Why |
|---------|---------|-----|
| **systemd** | OS-level services (nginx, ollama, tailscaled, docker) | Boot-time, system-critical, auto-restart |
| **PM2** | Node.js apps, single-process services | Easy deploy, log management, ecosystem file |
| **Docker Compose** | Multi-container stacks, databases, isolated environments | Reproducible, isolated, includes data deps |

### Rules

1. **Never mix managers** for one service. If it's in Docker, don't also PM2 it.
2. **PM2 for Node.js apps** that Otto actively develops and deploys frequently.
3. **Docker for anything with databases** or complex dependencies.
4. **systemd only for system services** — never for application code.

### PM2 Ecosystem File

Create `/home/adminuser/kira/ecosystem.config.js` as the single source of truth:

```javascript
module.exports = {
  apps: [
    // === CORE PLATFORM ===
    {
      name: 'openclaw-gateway',
      script: 'openclaw',
      args: 'gateway start --foreground',
      cwd: '/home/adminuser/kira',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'openclaw-bridge',
      script: './node_modules/.bin/openclaw-bridge',
      cwd: '/home/adminuser/kira',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'kira-app',
      script: 'npm',
      args: 'start',
      cwd: '/home/adminuser/kira',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'kira-admin',
      script: 'npm',
      args: 'run admin',
      cwd: '/home/adminuser/kira',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'whatsapp-bridge',
      script: 'npm',
      args: 'run whatsapp',
      cwd: '/home/adminuser/kira',
      env: { NODE_ENV: 'production' }
    },

    // === AI SERVICES ===
    {
      name: 'whisper',
      script: 'npm',
      args: 'run whisper',
      cwd: '/home/adminuser/kira',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'gpu-router',
      script: 'npm',
      args: 'run gpu-router',
      cwd: '/home/adminuser/kira',
      env: { NODE_ENV: 'production' }
    },

    // === APPLICATIONS ===
    {
      name: 'stella-tax',
      script: 'npm',
      args: 'start',
      cwd: '/home/adminuser/projects/stella/debts',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'agent-log',
      script: 'npm',
      args: 'run log',
      cwd: '/home/adminuser/kira',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'solyx-website',
      script: 'npm',
      args: 'start',
      cwd: '/home/adminuser/projects/solyx/website',
      env: { NODE_ENV: 'production', PORT: 3010 }
    }
  ]
};
```

> **Note:** The exact `script` and `args` fields above are templates. Verify each service's actual start command from the current PM2 config before applying: `pm2 show <name>` for each.

---

## 7. Migration Plan

### Phase 0: Pre-Flight (5 min)

```bash
# Snapshot current state
date=$(date +%Y-%m-%d)
mkdir -p ~/archive/${date}
pm2 save
pm2 list > ~/archive/${date}/pm2-state.txt
docker ps -a > ~/archive/${date}/docker-state.txt
df -h > ~/archive/${date}/disk-state.txt
free -h > ~/archive/${date}/ram-state.txt
crontab -l > ~/archive/${date}/crontab.txt 2>/dev/null
```

### Phase 1: Disable System Bloat (immediate RAM recovery)

```bash
# === WAZUH — recovers ~13GB RAM ===
sudo systemctl stop wazuh-manager wazuh-indexer wazuh-dashboard
sudo systemctl disable wazuh-manager wazuh-indexer wazuh-dashboard

# === NOMAD — recovers ~200MB RAM ===
sudo systemctl stop nomad
sudo systemctl disable nomad

# === FILEBEAT — recovers ~100MB RAM ===
sudo systemctl stop filebeat
sudo systemctl disable filebeat

# === MODEMMANAGER — recovers ~50MB RAM ===
sudo systemctl stop ModemManager
sudo systemctl disable ModemManager

# Verify
free -h
# Expected: ~14GB RAM freed
```

### Phase 2: Clean Dead PM2 Processes

```bash
# Remove stopped processes
pm2 delete chat-sync
pm2 delete graph-sync
pm2 delete msg-proxy
pm2 delete voice-interceptor
pm2 save
```

### Phase 3: Clean Dead Docker Containers

```bash
# Stop and remove orphaned containers
docker stop kira-sandbox-ba0987da kira-sandbox-d5a11c42
docker rm kira-sandbox-ba0987da kira-sandbox-d5a11c42

docker stop neo4j-server-1e1db3b8-4b0e-1587-f26c-d7cb736e3446
docker rm neo4j-server-1e1db3b8-4b0e-1587-f26c-d7cb736e3446

docker stop nextjs-server-e59a2865-49c5-b895-f593-9e180d234b19
docker rm nextjs-server-e59a2865-49c5-b895-f593-9e180d234b19

docker stop scribe-service-761c448a-2e8f-07f3-1e8b-09c9a1e27aba
docker rm scribe-service-761c448a-2e8f-07f3-1e8b-09c9a1e27aba

# Remove all exited containers
docker rm github-mcp-server evolution_api evolution_postgres ollama agent-zero openhands-app- n8n
docker rm langfuse_langfuse-web_1 langfuse_postgres_1 langfuse_redis_1 langfuse_minio_1
docker rm bouwer-orchestrator bouwer-vdr bouwer-calendar bouwer-messenger
docker rm cryptpad vaultwarden  # Note: vaultwarden data preserved in volume

# Prune unused images and volumes (CAREFUL — only after above)
docker image prune -a --filter "until=720h"  # Remove images not used in 30 days
docker volume prune  # REVIEW output before confirming
```

### Phase 4: Create Project Structure

```bash
# Create the canonical structure
mkdir -p ~/projects/{oopuo,omiximo,iam,solyx,stella,zenithcred}
mkdir -p ~/archive/2026-03-07/abandoned
mkdir -p ~/tmp
```

### Phase 5: Move Active Projects

```bash
# === OMIXIMO ===
mv ~/omiximo-inventory ~/projects/omiximo/inventory
mv ~/omiximo-email-automation ~/projects/omiximo/email-automation
mv ~/omiximo-middleware ~/projects/omiximo/middleware

# === IAM ===
mv ~/iam-website ~/projects/iam/website

# === SOLYX ===
mv ~/solyx-website ~/projects/solyx/website

# === VAPI ===
mv ~/vapi ~/projects/vapi

# === NEXUS ===
mv ~/nexus ~/projects/nexus

# === STELLA ===
mv ~/stella-debts ~/projects/stella/debts

# === VAULTWARDEN ===
mv ~/vaultwarden ~/projects/oopuo/vaultwarden

# === ZENITHCRED ===
mv ~/lidar-configurator ~/projects/zenithcred/lidar-configurator

# === OOPUO WEBSITE (symlink) ===
ln -s ~/kira/projects/oopuo-website ~/projects/oopuo/website

# === CREATE BACKWARD-COMPAT SYMLINKS (temporary, for running services) ===
ln -s ~/projects/omiximo/inventory ~/omiximo-inventory
ln -s ~/projects/omiximo/email-automation ~/omiximo-email-automation
ln -s ~/projects/omiximo/middleware ~/omiximo-middleware
ln -s ~/projects/iam/website ~/iam-website
ln -s ~/projects/solyx/website ~/solyx-website
ln -s ~/projects/vapi ~/vapi-link  # avoid conflict
ln -s ~/projects/stella/debts ~/stella-debts-link
```

> **IMPORTANT:** After moving Docker-based projects, you MUST restart their containers from the new path:
> ```bash
> cd ~/projects/omiximo/inventory && docker compose up -d
> cd ~/projects/iam/website && docker compose up -d
> # etc.
> ```
> Test each service after moving. The symlinks provide fallback.

### Phase 6: Archive Abandoned Projects

```bash
# === DEFINITELY DEAD — move to archive ===
for dir in GLM-TTS OpenHands agent-zero agent-zero-data ai-platform bouwer cryptpad crypto \
  flowsurface gemini-fullstack-langgraph-quickstart langfuse mcp-servers mediamarkt-automation \
  my-pad persona-plex ralph-claude-code interactive jina-reader openhands-workspace \
  kira-demo kira-product; do
  [ -d ~/$dir ] && mv ~/$dir ~/archive/2026-03-07/abandoned/
done

# === EVALUATE — archive but keep accessible ===
for dir in kira-app kira-test moltbot-core kali-osint; do
  [ -d ~/$dir ] && mv ~/$dir ~/archive/2026-03-07/
done

# === OOPUO BACKEND — save data dir only ===
[ -d ~/oopuo ] && mv ~/oopuo ~/archive/2026-03-07/oopuo-old

# === INVENTREE ROOT DIRS (orphaned) ===
[ -d ~/inventory ] && mv ~/inventory ~/archive/2026-03-07/
[ -d ~/inventree ] && mv ~/inventree ~/archive/2026-03-07/
```

### Phase 7: Handle Large Environments (19GB recovery)

```bash
# === MINICONDA (19GB) — all envs are for dead projects ===
# Envs: GLM-TTS, OpenHands, deep-research-gemini, ui-test — ALL abandoned
conda env list 2>/dev/null  # Verify nothing active
mv ~/miniconda3 ~/archive/2026-03-07/miniconda3
# After 30 days with no issues: rm -rf ~/archive/2026-03-07/miniconda3
# If you need Python envs later, use venv (already on system)

# === VLLM-ENV (13GB) — KEEP & UPGRADE ===
# vLLM becomes the PRIMARY inference engine (replacing Ollama for GPU models)
# See Phase 7.5 (vLLM Migration) for full setup
cd ~/vllm-env && source bin/activate && pip install --upgrade vllm
```

### Phase 8: Clean Misc Files

```bash
# Remove duplicate cloudflared debs
rm ~/cloudflared-linux-amd64.deb ~/cloudflared-linux-amd64.deb.1

# Remove orphan scripts from home
mv ~/audit_nomad_consul.sh ~/archive/2026-03-07/
mv ~/client_nomad.sh ~/archive/2026-03-07/
mv ~/maximise_internet_vm.sh ~/archive/2026-03-07/
mv ~/maximize_vm_resources.sh ~/archive/2026-03-07/
mv ~/fix_evolution*.sh ~/archive/2026-03-07/
mv ~/startup-services.sh ~/archive/2026-03-07/
mv ~/startup-services.log ~/archive/2026-03-07/
mv ~/update.sh ~/archive/2026-03-07/
mv ~/check_storage.sh ~/archive/2026-03-07/
mv ~/wget-log ~/archive/2026-03-07/
mv ~/UX_CONVERSION.md.save ~/archive/2026-03-07/

# Clean dead dotfiles
rm -rf ~/.openhands-state
rm -rf ~/.ralph
rm -rf ~/.qwen
rm -rf ~/.gemini
rm -rf ~/.codex
```

### Phase 9: Review Docker Stacks to Keep/Remove

#### KEEP as-is:
- `iam-*` — IAM website stack
- `inventree-*` — Omiximo inventory
- `omiximo-email-automation` — Email automation
- `omiximo-bridge` — Middleware
- `vapi-*` — Voice AI

#### REVIEW with Otto:
- `kira-test-*` — Is the test stack actively used? If not, stop it to free ports 5432, 6379, 3008.
- `lidaros-*` — ZenithCred active? If paused, stop containers but keep compose file.
- `kali-osint` — Useful OSINT toolbox? If not active, stop.

```bash
# === STOP containers pending review (don't remove) ===
# Only run after confirming with Otto:
# docker compose -f ~/projects/zenithcred/lidar-configurator/docker-compose.yml down
# docker stop kali-osint && docker rm kali-osint
# cd ~/archive/2026-03-07/kira-test && docker compose down
```

### Phase 10: Update Service Paths

After moving projects, update PM2 configs:

```bash
# Check current PM2 start paths
pm2 show stella-tax | grep "exec cwd"
pm2 show solyx-website 2>/dev/null | grep "exec cwd"  # If managed by PM2

# Update PM2 for moved projects (stella-tax example)
pm2 delete stella-tax
cd ~/projects/stella/debts && pm2 start npm --name stella-tax -- start
pm2 save
```

Update nginx configs if any reference old paths (they reference ports, not paths, so likely fine).

### Phase 11: Final Verification

```bash
# Check all services
pm2 list
docker ps
curl -s localhost:3007 > /dev/null && echo "IAM: OK" || echo "IAM: FAIL"
curl -s localhost:3010 > /dev/null && echo "Solyx: OK" || echo "Solyx: FAIL"
curl -s localhost:9000 > /dev/null && echo "InvenTree: OK" || echo "InvenTree: FAIL"
curl -s localhost:8085 > /dev/null && echo "Omiximo Email: OK" || echo "Omiximo Email: FAIL"
curl -s localhost:8003 > /dev/null && echo "Omiximo Bridge: OK" || echo "Omiximo Bridge: FAIL"
curl -s localhost:3001 > /dev/null && echo "VAPI Frontend: OK" || echo "VAPI Frontend: FAIL"
curl -s localhost:8000 > /dev/null && echo "VAPI Backend: OK" || echo "VAPI Backend: FAIL"
curl -s localhost:11434/api/tags > /dev/null && echo "Ollama: OK" || echo "Ollama: FAIL"

# Check disk/RAM improvement
df -h /
free -h
```

---

## 7.5 Phase: vLLM Migration (Ollama → vLLM as Primary Inference)

### Why

Ollama is a dev tool. This server is a **production inference hotspot** — a mini GPU provider serving Kira, client apps, chatbots, and any system needing local AI. vLLM is purpose-built for this:
- **5-10x more concurrent requests** (continuous batching)
- **20-40% faster token/s** (PagedAttention)
- **Native OpenAI-compatible API** (drop-in for any SDK)
- **Production metrics** (Prometheus, request queuing)
- **What GPU providers actually run internally**

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   NGINX (:8888)                          │
│              API key authentication                      │
│                                                          │
│    ┌─────────────────┐    ┌──────────────────────┐      │
│    │   vLLM (:8000)  │    │  Ollama (:11434)     │      │
│    │   PRIMARY       │    │  EMBEDDINGS ONLY     │      │
│    │                 │    │                      │      │
│    │  qwen3:14b      │    │  nomic-embed-text    │      │
│    │  (or swap model)│    │  (CPU, no GPU)       │      │
│    │                 │    │                      │      │
│    │  OpenAI API     │    │  /api/embeddings     │      │
│    │  /v1/chat/...   │    │                      │      │
│    │  /v1/models     │    │                      │      │
│    │                 │    │                      │      │
│    │  GPU: RTX 4090  │    │  CPU only            │      │
│    │  24GB VRAM      │    │  ~200MB RAM          │      │
│    └─────────────────┘    └──────────────────────┘      │
│                                                          │
│    Any client (Kira, Solyx chatbot, MSTA, external)     │
│    → POST https://oopuo-cloud:8888/v1/chat/completions  │
│    → Standard OpenAI SDK, just change base_url           │
└─────────────────────────────────────────────────────────┘
```

### vLLM Setup Steps

```bash
# ╔══════════════════════════════════════════╗
# ║  STEP 1: Upgrade vLLM environment       ║
# ╚══════════════════════════════════════════╝

cd ~/vllm-env
source bin/activate
pip install --upgrade vllm

# ╔══════════════════════════════════════════╗
# ║  STEP 2: Download model from HuggingFace║
# ╚══════════════════════════════════════════╝

# vLLM uses HuggingFace model IDs, not Ollama's format
# Qwen3-14B (same model as ollama qwen3:14b)
# It will auto-download on first run, or pre-download:
huggingface-cli download Qwen/Qwen3-14B --local-dir ~/models/qwen3-14b

# For coding tasks:
# huggingface-cli download Qwen/Qwen2.5-Coder-14B-Instruct --local-dir ~/models/qwen2.5-coder-14b

# ╔══════════════════════════════════════════╗
# ║  STEP 3: Create vLLM systemd service    ║
# ╚══════════════════════════════════════════╝

sudo tee /etc/systemd/system/vllm.service << 'EOF'
[Unit]
Description=vLLM Inference Server
After=network.target docker.service

[Service]
Type=simple
User=adminuser
WorkingDirectory=/home/adminuser
Environment="PATH=/home/adminuser/vllm-env/bin:/usr/local/bin:/usr/bin"
ExecStart=/home/adminuser/vllm-env/bin/python -m vllm.entrypoints.openai.api_server \
    --model /home/adminuser/models/qwen3-14b \
    --host 127.0.0.1 \
    --port 8000 \
    --max-model-len 8192 \
    --gpu-memory-utilization 0.85 \
    --dtype auto \
    --trust-remote-code \
    --served-model-name qwen3-14b \
    --enable-prefix-caching
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable vllm
sudo systemctl start vllm

# ╔══════════════════════════════════════════╗
# ║  STEP 4: Update Nginx proxy             ║
# ╚══════════════════════════════════════════╝

# Replace ollama-proxy with vllm-proxy
sudo tee /etc/nginx/sites-available/inference-proxy << 'EOF'
# Oopuo Inference API — vLLM backend
# OpenAI-compatible: /v1/chat/completions, /v1/models, etc.

server {
    listen 8888;
    server_name _;

    # API key authentication
    if ($http_authorization != "Bearer oopuo-ollama-001") {
        return 401;
    }

    # vLLM inference (GPU)
    location /v1/ {
        proxy_pass http://127.0.0.1:8000/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;  # Long for generation
        proxy_send_timeout 120s;
    }

    # Ollama embeddings (CPU)
    location /api/embeddings {
        proxy_pass http://127.0.0.1:11434/api/embeddings;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/inference-proxy /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/ollama-proxy
sudo nginx -t && sudo systemctl reload nginx

# ╔══════════════════════════════════════════╗
# ║  STEP 5: Reconfigure Ollama (embeddings)║
# ╚══════════════════════════════════════════╝

# Remove GPU models from Ollama (vLLM handles them now)
ollama rm qwen3:14b
ollama rm qwen2.5-coder:14b
ollama rm granite3.3:2b
ollama rm ministral-3:3b

# Keep ONLY embeddings
# ollama list should show only: nomic-embed-text

# Disable GPU for Ollama (CPU-only for embeddings)
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf << 'EOF'
[Service]
Environment="CUDA_VISIBLE_DEVICES="
Environment="OLLAMA_NUM_GPU=0"
EOF
sudo systemctl daemon-reload
sudo systemctl restart ollama

# ╔══════════════════════════════════════════╗
# ║  STEP 6: Update client configs          ║
# ╚══════════════════════════════════════════╝

# Any system using Ollama API format → switch to OpenAI format
# Before: POST http://localhost:11434/api/generate
# After:  POST http://localhost:8000/v1/chat/completions
#
# Or via the proxy (for external/Tailscale access):
#   POST http://oopuo-cloud:8888/v1/chat/completions
#   Header: Authorization: Bearer oopuo-ollama-001
#
# Works with ANY OpenAI SDK:
#   from openai import OpenAI
#   client = OpenAI(base_url="http://oopuo-cloud:8888/v1", api_key="oopuo-ollama-001")
#   client.chat.completions.create(model="qwen3-14b", messages=[...])

# ╔══════════════════════════════════════════╗
# ║  STEP 7: Verify                         ║
# ╚══════════════════════════════════════════╝

# Test vLLM directly
curl http://localhost:8000/v1/models

# Test via proxy
curl -H "Authorization: Bearer oopuo-ollama-001" http://localhost:8888/v1/models

# Test inference
curl -X POST http://localhost:8888/v1/chat/completions \
  -H "Authorization: Bearer oopuo-ollama-001" \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen3-14b", "messages": [{"role": "user", "content": "Hello"}], "max_tokens": 50}'

# Test embeddings (still via Ollama)
curl http://localhost:8888/api/embeddings \
  -H "Authorization: Bearer oopuo-ollama-001" \
  -d '{"model": "nomic-embed-text", "prompt": "test"}'
```

### Model Swapping

To serve a different model, just update the vLLM service:

```bash
# Edit the model path in the service
sudo systemctl edit vllm
# Change --model and --served-model-name
sudo systemctl restart vllm
```

For **multi-model serving** (future), run multiple vLLM instances on different ports:
```
vLLM :8000 → qwen3-14b (general)
vLLM :8001 → qwen2.5-coder-14b (coding)
Nginx routes /v1/code/* → :8001, /v1/* → :8000
```

### Performance Comparison (expected on RTX 4090)

| Metric | Ollama | vLLM |
|--------|--------|------|
| Single request tok/s | ~40-60 | ~50-80 |
| 5 concurrent requests | queued (1 at a time) | **all served simultaneously** |
| 10 concurrent requests | timeout risk | handled with batching |
| VRAM efficiency | ~70% | ~85% (PagedAttention) |
| Max context (14B model, 24GB VRAM) | ~8K | ~12-16K |

### Port Update

| Port | Before | After |
|------|--------|-------|
| 8000 | VAPI backend | **vLLM inference** |
| 8888 | Ollama proxy (nginx) | **Inference proxy** (nginx → vLLM + Ollama embeddings) |
| 11434 | Ollama (all models) | Ollama (embeddings only, CPU) |

> ⚠️ **Port conflict:** VAPI backend currently uses :8000. Move VAPI backend to :8010 before starting vLLM.

```bash
# Fix VAPI port conflict
cd ~/projects/vapi
# Edit docker-compose.yml: change backend port 8000 → 8010
# Update nginx config if proxied
docker compose up -d
```

---

## 8. Resource Optimization

### 8.1 RAM Budget (post-cleanup)

| Service | Estimated RAM | Category |
|---------|--------------|----------|
| Ollama (idle) | 500MB | AI |
| Ollama (inference) | 4-8GB | AI (dynamic) |
| PM2 processes (9) | ~900MB | Platform |
| Docker containers (~15) | ~2GB | Apps |
| OS + nginx + systemd | ~1GB | System |
| **Buffer for AI inference** | **~14GB** | Available |
| **Total** | ~26GB | |

### 8.2 GPU Allocation

The NVIDIA GPU is dedicated to Ollama for model inference. No other service should compete for VRAM.

```bash
# Check GPU utilization
nvidia-smi

# Ollama GPU config (in /etc/systemd/system/ollama.service or env)
OLLAMA_NUM_GPU=999  # Use all available GPU layers
```

---

## 9. Security Hardening

### 9.1 Firewall (UFW)

```bash
# Reset and configure
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS (if serving public sites)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Tailscale (managed automatically, but ensure)
sudo ufw allow in on tailscale0

# Ollama proxy (only via Tailscale)
# Port 8888 should NOT be exposed publicly — nginx binds to 0.0.0.0 currently
# TODO: Bind to tailscale IP only or localhost

# Enable
sudo ufw enable
```

### 9.2 Ollama API Security

The current nginx proxy on :8888 uses an API key. Ensure:

```nginx
# /etc/nginx/sites-available/ollama-proxy
server {
    listen 100.100.239.67:8888;  # Tailscale IP only
    
    location / {
        # Require API key header
        if ($http_x_api_key != "YOUR_API_KEY") {
            return 401;
        }
        proxy_pass http://127.0.0.1:11434;
    }
}
```

### 9.3 Service Exposure Rules

| Access Level | Services | How |
|-------------|----------|-----|
| **Public (nginx)** | IAM website, Solyx website | Port 80 via nginx |
| **Tailscale only** | Ollama proxy, all internal APIs | Bind to 100.100.239.67 |
| **Localhost only** | Databases, Redis, MinIO | Docker network / 127.0.0.1 |

### 9.4 Secrets Management

- **Vaultwarden** for team password management (restart when needed)
- **`.env` files** per project for service secrets — NEVER commit to git
- Add to all projects' `.gitignore`: `.env`, `.env.*`, `*.key`, `*.pem`

---

## 10. Backup Strategy

### 10.1 What to Back Up

| Priority | Data | Size | Method |
|----------|------|------|--------|
| **CRITICAL** | ~/kira/ (agent workspace, memory, config) | ~3GB | Daily rsync |
| **CRITICAL** | ~/chimera/ (R&D, memory, code) | ~80MB | Daily rsync |
| **CRITICAL** | Docker volumes (databases) | ~5GB | Weekly pg_dump + volume backup |
| **HIGH** | ~/projects/ (all active projects) | ~2GB | Daily rsync |
| **HIGH** | ~/.openclaw/ (agent config) | ~50MB | Daily rsync |
| **HIGH** | ~/master-sheet/ | ~2MB | Daily rsync |
| **MEDIUM** | ~/models/ (Ollama) | 93GB | Only if custom fine-tunes exist |
| **LOW** | ~/archive/ | Variable | Monthly offsite |

### 10.2 Backup Script

```bash
#!/bin/bash
# /home/adminuser/kira/scripts/backup.sh
# Run daily via cron: 0 3 * * * /home/adminuser/kira/scripts/backup.sh

BACKUP_DIR="/backup/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Critical data
rsync -az --delete ~/kira/ "$BACKUP_DIR/kira/"
rsync -az --delete ~/chimera/ "$BACKUP_DIR/chimera/"
rsync -az --delete ~/projects/ "$BACKUP_DIR/projects/"
rsync -az --delete ~/master-sheet/ "$BACKUP_DIR/master-sheet/"
rsync -az --delete ~/.openclaw/ "$BACKUP_DIR/openclaw-config/"

# Database dumps
docker exec inventree-db pg_dump -U inventree inventree > "$BACKUP_DIR/inventree.sql" 2>/dev/null
docker exec iam-mysql mysqldump -u root -p"$MYSQL_ROOT_PW" ghost > "$BACKUP_DIR/ghost.sql" 2>/dev/null
docker exec kira-test-postgres-1 pg_dump -U postgres > "$BACKUP_DIR/kira-test.sql" 2>/dev/null

# Retention: keep 7 daily, 4 weekly
find /backup/ -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR"
```

### 10.3 Offsite Backup

For enterprise-grade backup, consider:
- **Backblaze B2** (~$5/TB/month) with `rclone`
- **Hetzner Storage Box** (~€3/TB/month, NL-based = GDPR compliant)

```bash
# Example with rclone to Backblaze B2
rclone sync /backup/ b2:oopuo-backups --transfers 4
```

---

## 11. Development Workflow

### 11.1 Git Workflow

```
main          ─────●─────────●─────────●──── (production)
                    │                   ▲
develop       ─────●────●────●─────────┤ (staging/integration)
                         │             │
feature/xyz   ───────────●─────────────┘ (feature branches)
```

**Rules:**
1. `main` = production. Always deployable. Protected branch.
2. `develop` = integration branch. Features merge here first.
3. `feature/*` = individual features. Branch from `develop`.
4. Deploy = merge `develop` → `main` + `pm2 restart` or `docker compose up -d`.

### 11.2 Deployment Commands

```bash
# Node.js app (PM2)
cd ~/projects/solyx/website
git pull origin main
npm install --production
pm2 restart solyx-website

# Docker stack
cd ~/projects/iam/website
git pull origin main
docker compose pull
docker compose up -d

# Zero-downtime restart for PM2
pm2 reload <app-name>
```

### 11.3 Environment Management

```
.env.example    → Committed to git (template, no secrets)
.env            → Local only (gitignored, actual secrets)
.env.production → Production overrides (gitignored)
```

---

## 12. Monitoring & Observability

### 12.1 Lightweight Stack (replacing Wazuh)

Wazuh was overkill. Replace with:

| Tool | Purpose | RAM |
|------|---------|-----|
| **PM2 built-in** | Process monitoring, logs | 0 (included) |
| **ctop** | Docker container monitoring | ~10MB |
| **netdata** (optional) | System metrics dashboard | ~100MB |
| **Uptime Kuma** (optional) | Service uptime monitoring | ~80MB |

```bash
# Install ctop for Docker monitoring
sudo apt install -y ctop

# PM2 monitoring
pm2 monit          # Real-time
pm2 logs           # Aggregated logs
pm2 logs --lines 100 <service>  # Per-service

# System monitoring (already available)
htop               # CPU/RAM
nvidia-smi         # GPU
docker stats       # Container resources
```

### 12.2 Health Check Script

```bash
#!/bin/bash
# /home/adminuser/kira/scripts/health-check.sh

echo "=== Server Health Check ==="
echo "Date: $(date)"
echo ""

echo "--- RAM ---"
free -h | head -2

echo ""
echo "--- Disk ---"
df -h / | tail -1

echo ""
echo "--- GPU ---"
nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader 2>/dev/null || echo "No GPU"

echo ""
echo "--- PM2 ---"
pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status) (cpu: \(.monit.cpu)%, mem: \(.monit.memory / 1024 / 1024 | floor)MB)"' 2>/dev/null

echo ""
echo "--- Docker ---"
docker ps --format "{{.Names}}: {{.Status}}" | sort

echo ""
echo "--- Service Checks ---"
for port in 3007 3008 3010 8003 8085 9000 11434; do
  name=$(grep -m1 "$port" /home/adminuser/kira/docs/server-architecture-v2.md | head -1)
  curl -sf "http://localhost:$port" > /dev/null 2>&1 && echo "Port $port: ✅" || echo "Port $port: ❌"
done
```

---

## 13. Naming Conventions

### 13.1 Directory Names

- **Lowercase, hyphenated:** `email-automation`, `lidar-configurator`
- **No redundant prefixes:** `projects/omiximo/inventory` NOT `projects/omiximo/omiximo-inventory`
- **Client as namespace:** `projects/{client}/{project}`

### 13.2 Docker Containers

- **Pattern:** `{client}-{service}` or `{project}-{component}`
- **Examples:** `iam-ghost`, `iam-nginx`, `inventree-server`, `vapi-backend`
- **Docker Compose project names:** Match the directory name

### 13.3 PM2 Process Names

- **Pattern:** `{function}` or `{project}-{function}`
- **Examples:** `openclaw-gateway`, `stella-tax`, `gpu-router`, `whisper`
- **No random suffixes or IDs**

### 13.4 Git Repositories

- **Pattern:** `{org}/{project}` on GitHub/GitLab
- **Examples:** `oopuo/kira`, `oopuo/chimera`, `oopuo/solyx-website`

---

## 14. Oopuo Standard Server Template

This section defines the reproducible server architecture that Oopuo deploys for enterprise clients.

### 14.1 Template Overview

```
OOPUO STANDARD SERVER v1.0
━━━━━━━━━━━━━━━━━━━━━━━━━━

Purpose: On-premise AI infrastructure for enterprise clients
Base OS: Ubuntu 24.04 LTS
Minimum: 16GB RAM, 4 CPU, 200GB disk, NVIDIA GPU (optional)

Components:
├── AI Engine (Ollama + model routing)
├── Agent Platform (OpenClaw/Kira)
├── Service Mesh (Docker + PM2)
├── Reverse Proxy (Nginx)
├── Secret Management (Vaultwarden)
├── Network (Tailscale mesh)
├── Monitoring (PM2 + ctop + health checks)
└── Backup (automated daily)
```

### 14.2 Standard Directory Layout

```
/home/{client-user}/
├── kira/                    # AI Agent (customized per client)
├── models/                  # AI models (selected per use case)
├── projects/                # Client applications
│   └── {project-name}/
├── config/                  # Server configuration
│   ├── nginx/
│   ├── docker/
│   └── env/
├── backups/                 # Local backup staging
├── scripts/                 # Automation
│   ├── backup.sh
│   ├── health-check.sh
│   └── deploy.sh
└── docs/                    # Server documentation
    └── architecture.md
```

### 14.3 Provisioning Script (Bootstrap)

```bash
#!/bin/bash
# oopuo-server-bootstrap.sh
# Usage: curl -sSL https://deploy.oopuo.com/bootstrap.sh | bash

set -e

echo "=== Oopuo Standard Server Bootstrap v1.0 ==="

# System updates
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx docker.io docker-compose-plugin ufw htop jq

# Node.js (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install --lts
npm install -g pm2

# Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Directory structure
mkdir -p ~/projects ~/models ~/config/{nginx,docker,env} ~/backups ~/scripts ~/docs

# Firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow in on tailscale0
sudo ufw --force enable

# Docker user group
sudo usermod -aG docker $USER

echo "=== Bootstrap complete ==="
echo "Next steps:"
echo "  1. tailscale up"
echo "  2. Install AI models: ollama pull qwen3"
echo "  3. Deploy OpenClaw/Kira"
echo "  4. Configure nginx reverse proxy"
```

### 14.4 Client Deployment Checklist

```markdown
## Client Deployment Checklist

- [ ] Server provisioned (Ubuntu 24.04, specs confirmed)
- [ ] Bootstrap script executed
- [ ] Tailscale connected to Oopuo mesh
- [ ] SSH access configured (key-based only)
- [ ] Ollama installed + models pulled
- [ ] OpenClaw/Kira deployed and configured
- [ ] Client-specific projects deployed
- [ ] Nginx configured with SSL (Let's Encrypt)
- [ ] Firewall rules verified
- [ ] Backup script configured and tested
- [ ] Health check script installed
- [ ] Monitoring operational
- [ ] Vaultwarden deployed (if needed)
- [ ] Documentation delivered to client
- [ ] Handover meeting completed
```

### 14.5 Scaling Tiers

| Tier | RAM | CPU | GPU | Disk | Use Case |
|------|-----|-----|-----|------|----------|
| **Starter** | 16GB | 4 | None | 200GB | Small models, basic AI agent |
| **Standard** | 32GB | 8 | RTX 3060 | 500GB | Mid-size models, full agent suite |
| **Professional** | 64GB | 16 | RTX 4090 | 1TB | Large models, multi-agent, production |
| **Enterprise** | 128GB+ | 32+ | A100/H100 | 2TB+ | Enterprise-scale, multi-tenant |

---

## 15. Appendix: Full Command Reference

### Complete Migration — Copy-Paste Ready

Run these in order. Each phase is independent — you can pause between them.

```bash
# ╔══════════════════════════════════════════╗
# ║  PHASE 0: SNAPSHOT CURRENT STATE         ║
# ╚══════════════════════════════════════════╝

date_stamp=$(date +%Y-%m-%d)
mkdir -p ~/archive/${date_stamp}
pm2 save
pm2 list > ~/archive/${date_stamp}/pm2-state.txt
docker ps -a > ~/archive/${date_stamp}/docker-state.txt
df -h > ~/archive/${date_stamp}/disk-state.txt
free -h > ~/archive/${date_stamp}/ram-state.txt

# ╔══════════════════════════════════════════╗
# ║  PHASE 1: DISABLE BLOAT SERVICES        ║
# ╚══════════════════════════════════════════╝

sudo systemctl stop wazuh-manager wazuh-indexer wazuh-dashboard
sudo systemctl disable wazuh-manager wazuh-indexer wazuh-dashboard
sudo systemctl stop nomad && sudo systemctl disable nomad
sudo systemctl stop filebeat && sudo systemctl disable filebeat
sudo systemctl stop ModemManager && sudo systemctl disable ModemManager
echo "RAM freed:"; free -h

# ╔══════════════════════════════════════════╗
# ║  PHASE 2: CLEAN PM2                     ║
# ╚══════════════════════════════════════════╝

pm2 delete chat-sync graph-sync msg-proxy voice-interceptor
pm2 save

# ╔══════════════════════════════════════════╗
# ║  PHASE 3: CLEAN DOCKER                  ║
# ╚══════════════════════════════════════════╝

docker stop kira-sandbox-ba0987da kira-sandbox-d5a11c42 2>/dev/null
docker rm kira-sandbox-ba0987da kira-sandbox-d5a11c42 2>/dev/null
docker stop neo4j-server-1e1db3b8-4b0e-1587-f26c-d7cb736e3446 2>/dev/null
docker rm neo4j-server-1e1db3b8-4b0e-1587-f26c-d7cb736e3446 2>/dev/null
docker stop nextjs-server-e59a2865-49c5-b895-f593-9e180d234b19 2>/dev/null
docker rm nextjs-server-e59a2865-49c5-b895-f593-9e180d234b19 2>/dev/null
docker stop scribe-service-761c448a-2e8f-07f3-1e8b-09c9a1e27aba 2>/dev/null
docker rm scribe-service-761c448a-2e8f-07f3-1e8b-09c9a1e27aba 2>/dev/null
docker rm github-mcp-server evolution_api evolution_postgres ollama agent-zero openhands-app- n8n 2>/dev/null
docker rm langfuse_langfuse-web_1 langfuse_postgres_1 langfuse_redis_1 langfuse_minio_1 2>/dev/null
docker rm bouwer-orchestrator bouwer-vdr bouwer-calendar bouwer-messenger cryptpad 2>/dev/null

# ╔══════════════════════════════════════════╗
# ║  PHASE 4: CREATE STRUCTURE               ║
# ╚══════════════════════════════════════════╝

mkdir -p ~/projects/{oopuo,omiximo,iam,solyx,stella,zenithcred}
mkdir -p ~/archive/2026-03-07/abandoned
mkdir -p ~/tmp

# ╔══════════════════════════════════════════╗
# ║  PHASE 5: MOVE ACTIVE PROJECTS          ║
# ╚══════════════════════════════════════════╝

mv ~/omiximo-inventory ~/projects/omiximo/inventory
mv ~/omiximo-email-automation ~/projects/omiximo/email-automation
mv ~/omiximo-middleware ~/projects/omiximo/middleware
mv ~/iam-website ~/projects/iam/website
mv ~/solyx-website ~/projects/solyx/website
mv ~/vapi ~/projects/vapi
mv ~/nexus ~/projects/nexus
mv ~/stella-debts ~/projects/stella/debts
mv ~/vaultwarden ~/projects/oopuo/vaultwarden
mv ~/lidar-configurator ~/projects/zenithcred/lidar-configurator
ln -s ~/kira/projects/oopuo-website ~/projects/oopuo/website

# Backward-compat symlinks for Docker
ln -s ~/projects/omiximo/inventory ~/omiximo-inventory
ln -s ~/projects/omiximo/email-automation ~/omiximo-email-automation
ln -s ~/projects/omiximo/middleware ~/omiximo-middleware
ln -s ~/projects/iam/website ~/iam-website
ln -s ~/projects/solyx/website ~/solyx-website

# ╔══════════════════════════════════════════╗
# ║  PHASE 6: ARCHIVE ABANDONED             ║
# ╚══════════════════════════════════════════╝

for dir in GLM-TTS OpenHands agent-zero agent-zero-data ai-platform bouwer cryptpad crypto \
  flowsurface gemini-fullstack-langgraph-quickstart langfuse mcp-servers mediamarkt-automation \
  my-pad persona-plex ralph-claude-code interactive jina-reader openhands-workspace \
  kira-demo kira-product; do
  [ -d ~/$dir ] && mv ~/$dir ~/archive/2026-03-07/abandoned/
done

for dir in kira-app kira-test moltbot-core kali-osint oopuo inventory inventree; do
  [ -d ~/$dir ] && mv ~/$dir ~/archive/2026-03-07/
done

# ╔══════════════════════════════════════════╗
# ║  PHASE 7: LARGE ENVIRONMENTS            ║
# ╚══════════════════════════════════════════╝

# CHECK FIRST: conda env list
mv ~/miniconda3 ~/archive/2026-03-07/miniconda3
mv ~/vllm-env ~/archive/2026-03-07/vllm-env

# ╔══════════════════════════════════════════╗
# ║  PHASE 8: CLEAN MISC                    ║
# ╚══════════════════════════════════════════╝

rm -f ~/cloudflared-linux-amd64.deb ~/cloudflared-linux-amd64.deb.1
mv ~/audit_nomad_consul.sh ~/client_nomad.sh ~/maximise_internet_vm.sh \
   ~/maximize_vm_resources.sh ~/fix_evolution*.sh ~/startup-services.sh \
   ~/startup-services.log ~/update.sh ~/check_storage.sh ~/wget-log \
   ~/UX_CONVERSION.md.save ~/archive/2026-03-07/ 2>/dev/null
rm -rf ~/.openhands-state ~/.ralph ~/.qwen ~/.gemini ~/.codex

# Remove clawd symlink (now at ~/kira)
rm -f ~/clawd

# ╔══════════════════════════════════════════╗
# ║  PHASE 9: VERIFY                        ║
# ╚══════════════════════════════════════════╝

echo "=== Final State ==="
ls ~/
echo "---"
ls ~/projects/
echo "---"
pm2 list
echo "---"
docker ps
echo "---"
df -h /
free -h
```

---

## Post-Migration: Clean Home Directory

After full migration, `~/` should contain only:

```
/home/adminuser/
├── kira/           # AI Agent (heart of the system)
├── chimera/        # Privacy AI R&D
├── nexus/          # AI OS project
├── projects/       # All client projects
│   ├── oopuo/
│   ├── omiximo/
│   ├── iam/
│   ├── solyx/
│   ├── stella/
│   ├── vapi/
│   └── zenithcred/
├── models/         # AI models (vLLM HuggingFace + Ollama embeddings)
├── vllm-env/       # vLLM Python environment (inference engine)
├── master-sheet/   # Reference docs
├── archive/        # Archived projects
├── tmp/            # Temp workspace
└── [dotfiles]      # .config, .ssh, .pm2, etc.
```

**14 directories instead of 50+.** Clean, professional, enterprise-ready.

---

*This document is the single source of truth for server architecture. Update it when making infrastructure changes.*

*— Kira, Oopuo AI Infrastructure*
