# Server Cleanup Plan — oopuopu-cloud

*Audit date: 2026-03-07*

---

## Current State: Chaos

- **456GB used** of 662GB (69%)
- **93GB in /models/** (Ollama LLMs)
- ~50+ directories in /home/adminuser, most are abandoned experiments
- 25+ Docker containers (many stale)
- 13 PM2 processes (4 stopped/dead)
- Nomad running but unclear if used
- Wazuh security stack running (heavy)
- No clear project structure
- Vaultwarden exists but not properly exposed

---

## Target Structure

```
/home/adminuser/
├── oopuo/                    ← Company workspace (existing, keep)
│   └── backend/              ← Oopuo backend services
│
├── projects/                 ← ALL active projects (canonical location)
│   ├── chimera/              ← Core R&D
│   ├── iam-website/          ← Interactive Move
│   ├── solyx-website/        ← Solyx client work
│   ├── oopuo-website/        ← Main company site
│   ├── omiximo-inventory/    ← Inventory system
│   ├── omiximo-email/        ← Email automation
│   ├── vapi/                 ← Voice AI
│   └── nexus/                ← Nexus OS
│
├── kira/                     ← Kira workspace (keep as-is, it's organized)
│
├── infrastructure/           ← Server configs, docker-compose files
│   ├── docker/               ← All compose files
│   ├── nginx/                ← Nginx configs (symlinked to /etc/nginx)
│   └── scripts/              ← Maintenance scripts
│
├── archive/                  ← Old/unused projects (before deletion)
│
└── models/                   ← Ollama models (keep, needed)
```

---

## Cleanup Categories

### 🗑️ DELETE (abandoned experiments)
- `GLM-TTS/` — old TTS experiment
- `OpenHands/` — unused AI platform
- `agent-zero/` + `agent-zero-data/` — abandoned agent framework
- `ai-platform/` — old experiment
- `bouwer/` — old project
- `cryptpad/` — unused
- `flowsurface/` — unused
- `gemini-fullstack-langgraph-quickstart/` — tutorial/demo
- `langfuse/` — unused observability
- `mcp-servers/` — old MCP
- `mediamarkt-automation/` — old automation
- `my-pad/` — unused
- `persona-plex/` — abandoned
- `ralph-claude-code/` — old agent experiments
- `interactive/` — unclear, likely old
- `crypto/` — old experiment
- `kira-demo/` — old demo
- `kira-product/` — old version
- `jina-reader/` — unused

### 📦 ARCHIVE (move to ~/archive/)
- `kira-app/` — if superseded by current kira
- `kira-test/` — if tests passed and done
- `moltbot-core/` — if not active
- `stella-debts/` — if project done
- `kali-osint/` — if not actively used
- `lidar-configurator/` — if ZenithCred work paused

### ✅ KEEP & MOVE to ~/projects/
- `chimera/` → `projects/chimera/`
- `iam-website/` → `projects/iam-website/`
- `solyx-website/` → `projects/solyx-website/`
- `omiximo-inventory/` → `projects/omiximo-inventory/`
- `omiximo-email-automation/` → `projects/omiximo-email/`
- `vapi/` → `projects/vapi/`
- `nexus/` → `projects/nexus/`
- `oopuo/` → keep at ~/oopuo/ (backend)

### ✅ KEEP in place
- `kira/` — workspace, organized
- `models/` — Ollama models
- `master-sheet/` — reference docs

### 🧹 CLEAN loose files
- `cloudflared-linux-amd64.deb` + `.deb.1` — delete (40MB)
- `audit_nomad_consul.sh`, `client_nomad.sh` — move to infrastructure/scripts/
- `fix_evolution*.sh` — delete
- `maximise_internet_vm.sh`, `maximize_vm_resources.sh` — move to infrastructure/scripts/
- `startup-services.sh`, `startup-services.log` — move to infrastructure/scripts/
- `update.sh` — move to infrastructure/scripts/
- `check_storage.sh` — delete (empty)
- `wget-log` — delete

---

## Docker Cleanup

### Stop & Remove (stale):
- `kira-sandbox-*` (2 orphaned sandboxes)
- `neo4j-server-*` (orphaned)
- `nextjs-server-*` (orphaned)
- `scribe-service-*` (orphaned)
- `kali-osint` (if not active)

### Keep:
- `iam-*` (ghost, nginx, mysql) — IAM website
- `inventree-*` — inventory system
- `omiximo-*` — email automation + bridge
- `vapi-*` — voice AI
- `kira-test-*` — if actively used
- `lidaros-*` — if ZenithCred active

---

## PM2 Cleanup

### Remove (stopped/dead):
- `chat-sync` (stopped)
- `graph-sync` (stopped)
- `msg-proxy` (stopped)
- `voice-interceptor` (stopped)

### Keep:
- `openclaw-gateway` — core
- `openclaw-bridge` — core
- `kira-app` — active
- `kira-admin` — active
- `whatsapp-bridge` — active
- `whisper` — active
- `agent-log` — useful
- `gpu-router` — needed for Ollama
- `stella-tax` — review if needed

---

## Services Review

### Keep:
- Docker, Tailscale, Ollama, Nginx, SSH, fail2ban

### Review:
- **Nomad** — are you using it? If not, disable (saves RAM)
- **Wazuh** (dashboard + indexer + manager) — heavy security stack, do you need it?
- **Filebeat** — paired with Wazuh, disable if Wazuh goes
- **ModemManager** — unnecessary on a server, disable

---

## Vaultwarden Status
- Docker compose exists at ~/vaultwarden/
- Container NOT running
- Needs: start container, expose via Tailscale or nginx, connect Bitwarden clients
