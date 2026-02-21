# Architecture Separation — Kira (Personal) vs Product
## Feb 20, 2026

---

## Current Reality: One VM, Everything Tangled

```
VM: 192.168.0.222 (Tailscale: 100.100.239.67, Public: 185.239.62.65)
Ubuntu 24.04 | 26GB RAM (19GB used) | 10 cores | 662GB disk (76% full)
GPU: 24GB VRAM (9.8GB used by Whisper)
```

### What's Running (32 processes)

#### LAYER 1: Kira Personal (YOU + ME)
```
Port  │ Process              │ What                          │ Memory
──────┼──────────────────────┼───────────────────────────────┼────────
18789 │ openclaw-gateway     │ My brain (Opus 4.6 via Claude)│ ~200MB
3847  │ kira-dashboard       │ Your personal WebUI           │ 167MB
3848  │ chat-sync            │ Telegram ↔ WebUI mirror       │ 1.3GB ⚠️
3850  │ msg-proxy            │ NLP enrichment proxy          │ 351MB
3852  │ whisper              │ Voice transcription (GPU)     │ 546MB
3853  │ gpu-router           │ GPU VRAM time-sharing         │ 42MB
3851  │ agent-log            │ Agent session viewer          │ 128MB
─     │ graph-sync           │ NLP graph extraction daemon   │ 96MB
─     │ openclaw-bridge      │ WebUI ↔ OpenClaw bridge       │ 72MB
                                                    SUBTOTAL: ~2.9GB
```

#### LAYER 2: The Product (kira-test)
```
Port  │ Container            │ What                          │ Memory
──────┼──────────────────────┼───────────────────────────────┼────────
5173  │ kira-test-app        │ React frontend + Express API  │ ~300MB
3008  │ (same container)     │ Express backend               │ (shared)
─     │ kira-test-worker     │ BullMQ background jobs        │ ~150MB
5432  │ kira-test-postgres   │ PostgreSQL (30+ tables)       │ ~200MB
6379  │ kira-test-redis      │ Redis (queues, pub/sub, SSE)  │ ~50MB
9002  │ kira-test-minio      │ S3-compatible storage         │ ~100MB
─     │ kira-sandbox-*       │ Per-user sandbox containers   │ ~50MB each
                                                    SUBTOTAL: ~850MB+
```

#### LAYER 3: Client Products
```
Port  │ Container/Process    │ What                          │ Memory
──────┼──────────────────────┼───────────────────────────────┼────────
1441  │ inventree-frontend   │ Omiximo inventory UI          │ ~50MB
9000  │ inventree-server     │ InvenTree API                 │ ~300MB
─     │ inventree-worker     │ Background tasks              │ ~100MB
─     │ inventree-db         │ PostgreSQL                    │ ~100MB
─     │ inventree-redis      │ Redis                         │ ~30MB
8003  │ omiximo-bridge       │ Custom bridge API             │ ~50MB
8085  │ omiximo-email-auto   │ Email automation              │ ~50MB
3001  │ vapi-frontend        │ VAPI Sales Machine UI         │ ~50MB
8000  │ vapi-backend         │ VAPI API                      │ ~80MB
3870  │ stella-tax           │ Stella Vic's Tax AI           │ 98MB
3855  │ (unknown)            │ ?                             │ ?
                                                    SUBTOTAL: ~900MB+
```

#### LAYER 4: Infrastructure
```
Port  │ Service              │ What                          │ Memory
──────┼──────────────────────┼───────────────────────────────┼────────
9200  │ wazuh-indexer        │ SIEM log storage              │ ~2GB
─     │ wazuh-manager        │ SIEM event processing         │ ~500MB
55000 │ wazuh-dashboard      │ SIEM web UI                   │ ~300MB
7474  │ neo4j                │ Graph database                │ ~500MB
11434 │ ollama               │ Local LLM (STOPPED but port)  │ 0
80    │ nginx                │ Reverse proxy                 │ ~10MB
                                                    SUBTOTAL: ~3.3GB
```

### Public Endpoints (via Cloudflare Tunnel)
```
kira.zenithcred.com    → port 3847 (kira-dashboard, your personal UI)
test.zenithcred.com    → port 5173 (kira-test product)
stellavic.zenithcred.com → port 3870 (Tax AI) [if configured]
```

---

## The Problem

Everything runs on ONE VM. No separation between:
- **Your private data** (messages, memories, identity files)
- **Product user data** (kira-test multi-tenant DB)
- **Client systems** (Omiximo inventory, VAPI)
- **Security monitoring** (Wazuh SIEM)

If kira-test crashes, it can affect your personal Kira. If Omiximo eats memory, Whisper slows down. If a product user somehow breaks out of their sandbox, they're on the same machine as your OpenClaw config.

---

## Target Architecture

### Phase 1: Logical Separation (Now — No New Hardware)

Separate concerns with clear boundaries on the SAME VM:

```
┌─────────────────────────────────────────────────────────────────┐
│                         VM: 192.168.0.222                       │
│                                                                 │
│  ┌─── ZONE A: PERSONAL (Kira) ───────────────────────────────┐ │
│  │                                                             │ │
│  │  OpenClaw Gateway (18789)     ← The brain                  │ │
│  │  kira-dashboard (3847)        ← Your private UI            │ │
│  │  chat-sync (3848)             ← Telegram mirror            │ │
│  │  msg-proxy (3850)             ← NLP enrichment             │ │
│  │  graph-sync                   ← Knowledge graph daemon     │ │
│  │  openclaw-bridge              ← WebUI bridge               │ │
│  │  agent-log (3851)             ← Session viewer             │ │
│  │                                                             │ │
│  │  Data: ~/kira/                ← Workspace                  │ │
│  │        ~/kira/memory/         ← Memory files               │ │
│  │        ~/kira/memory/unified.db ← Knowledge graph          │ │
│  │        ~/.openclaw/           ← OpenClaw config + sessions │ │
│  │                                                             │ │
│  │  Access: YOU only. Telegram + kira.zenithcred.com          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─── ZONE B: PRODUCT (kira-test) ───────────────────────────┐ │
│  │                                                             │ │
│  │  Docker network: kira-test-net (isolated)                   │ │
│  │  ┌──────────┬──────────┬──────────┬────────┬──────────┐    │ │
│  │  │ app:5173 │ worker   │ postgres │ redis  │ minio    │    │ │
│  │  │ api:3008 │          │ :5432    │ :6379  │ :9002    │    │ │
│  │  └──────────┴──────────┴──────────┴────────┴──────────┘    │ │
│  │  + sandbox containers (per-user, ephemeral)                 │ │
│  │                                                             │ │
│  │  Data: /tmp/kira-test/ (source)                            │ │
│  │        Docker volumes (postgres, redis, minio)              │ │
│  │                                                             │ │
│  │  Access: Public. test.zenithcred.com                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─── ZONE C: CLIENT PRODUCTS ────────────────────────────────┐ │
│  │                                                             │ │
│  │  Docker network: client-net (isolated)                      │ │
│  │  ┌──────────────────┬────────────────┬──────────────────┐  │ │
│  │  │ Omiximo (1441,   │ VAPI (3001,    │ Stella Tax       │  │ │
│  │  │ 9000, 8003, 8085)│ 8000)          │ (3870)           │  │ │
│  │  └──────────────────┴────────────────┴──────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─── ZONE D: SHARED INFRA ──────────────────────────────────┐ │
│  │  Whisper GPU (3852) │ GPU Router (3853) │ Nginx (80)      │ │
│  │  Wazuh SIEM (9200)  │ Neo4j (7474)      │ Ollama (stopped)│ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Immediate Actions:
1. **Move kira-test source** from `/tmp/` to `/home/adminuser/kira-test/` (tmp gets wiped!)
2. **Isolate Docker networks** — kira-test and client products can't see each other
3. **Bind personal services to localhost** — msg-proxy, graph-sync shouldn't be on 0.0.0.0
4. **Fix chat-sync memory** — 1.3GB is insane for a sync daemon
5. **Document every port and process** — this file becomes the source of truth

### Phase 2: Hardened Separation (This Week)

```
PERSONAL (Zone A)                    PRODUCT (Zone B)
─────────────────                    ─────────────────
Runs as: adminuser                   Runs as: kira-product (new user)
Network: host                        Network: Docker isolated
Ports: localhost only                Ports: Docker published
  (except 3847 via tunnel)            (only 5173 via tunnel)
Data: ~/kira/ (700 perms)           Data: Docker volumes only
GPU: Whisper (shared via API)        GPU: Via gpu-router API only
Config: ~/.openclaw/                 Config: .env in container
```

**Key rule:** Product containers NEVER mount host directories. They talk to the host only via:
- GPU Router API (port 3853) for Whisper transcription
- OpenClaw Gateway (port 18789) if we route chat through me

### Phase 3: Multi-VM (When Revenue Justifies)

```
VM1: Personal (Kira)                 VM2: Product (SaaS)
┌────────────────────┐               ┌────────────────────┐
│ OpenClaw           │               │ kira-product       │
│ Dashboard          │               │ PostgreSQL         │
│ NLP Pipeline       │◄── API ──────►│ Redis              │
│ Knowledge Graph    │               │ Worker             │
│ Memory System      │               │ Sandboxes          │
│ Whisper (GPU)      │               │ (no GPU needed)    │
└────────────────────┘               └────────────────────┘
Tailscale mesh connects them
```

---

## The Relationship Model

### How Personal Kira Connects to Product

```
You (Otto)
  │
  ├── Telegram ──→ OpenClaw Gateway ──→ Kira (me, Opus 4.6)
  ├── kira.zenithcred.com ──→ kira-dashboard ──→ same Kira
  └── test.zenithcred.com ──→ kira-test ──→ ??? (routing decision)
```

**Option A: Product routes through me**
- test.zenithcred.com chat → OpenClaw → me
- Same brain, same memory, new surface
- Pro: unified experience. Con: couples product to personal infra

**Option B: Product is independent**
- test.zenithcred.com chat → OpenRouter → MiniMax/GPT/Claude
- Separate agent per user, powered by their API key
- Pro: scales to multi-tenant. Con: Otto gets a dumber agent there

**Option C: Hybrid (recommended)**
- YOUR account on test.zenithcred.com → routes to OpenClaw (me)
- OTHER users → route to OpenRouter with their keys
- Best of both: you get me, customers get their own agent
- The `route-to-openclaw` agent is already building this

---

## My State & Shape

### What I Am Right Now
```
Brain:      Opus 4.6 via Claude Max (OAuth)
Context:    200K tokens
Session:    dd3de969-b7ee-41f5-8621-68f53d29dfb7
Workspace:  ~/kira/
Memory:     16,858 entities, 33,825 relations, 60,232 facts
Uptime:     Persistent (gateway restarts don't kill me)
Channels:   Telegram (@coringa_dfato) + WebUI + CLI
Heartbeat:  Every ~30 min
Crons:      Daily graph extraction, weekly audit, Nova routines
Sub-agents: Can spawn unlimited via sessions_spawn
```

### What I Can See
- All files on this VM
- All Docker containers
- All network ports
- Your Telegram messages
- Notion (via API)
- Web (via search)
- GPU (via router)

### What I Can't See
- Your phone screen
- Your browser tabs (unless you share)
- Other people's messages to you (unless forwarded)
- Anything off this VM that isn't exposed via API

### Health Indicators I Should Track
- [ ] Gateway uptime + response time
- [ ] Memory usage per zone
- [ ] Disk usage trend (76% is getting tight)
- [ ] GPU VRAM allocation
- [ ] PM2 process health + restart counts
- [ ] Docker container status
- [ ] Chat-sync memory leak (1.3GB!)
- [ ] API response times
- [ ] Heartbeat success rate

---

## Decision Points for You

1. **Move kira-test out of /tmp/?** → YES/NO (I recommend YES, now)
2. **Option A/B/C for routing?** → I recommend C (hybrid)
3. **Create `kira-product` Linux user for isolation?** → YES/NO
4. **Kill Ollama completely?** (port 11434 still bound) → YES/NO
5. **Fix chat-sync 1.3GB leak?** → Priority?
6. **Disk at 76%** — clean up old Docker images? → YES/NO

---

## Actions Taken (Feb 20, 2026)

### ✅ Completed
1. **Moved kira-test from /tmp/ to ~/kira-test/** — Safe from reboot wipes
2. **Cleaned Docker** — Removed dangling images, langfuse, clickhouse, mediamarkt-automation, old kira images. **Freed 54GB (76% → 68%)**
3. **Cleaned Ollama** — Removed glm-4.7-flash, glm4-lmstudio, glm4-flash (kept qwen3:14b, granite3.3:2b, nomic-embed)
4. **Fixed chat-sync memory leak** — Restart dropped 1.3GB → 194MB. Added `--max-memory-restart 300M`
5. **Ollama stays** — Active with qwen3:14b + granite3.3:2b + nomic-embed. Used for NLP extraction + embeddings. Users get cloud-to-cloud, we use local GPU.

### 🔲 Remaining
- [ ] Bind agent-log (3851) and openclaw-bridge (3855) to localhost
- [ ] Create kira-product Linux user (Phase 2)
- [ ] Isolate Docker networks between kira-test and client products
- [ ] Update docker-compose.yml to point to ~/kira-test/ instead of /tmp/
- [ ] Investigate what port 3855 (openclaw-bridge) serves and if it needs public access

---

*This file lives at ~/kira/ARCHITECTURE.md — I'll keep it updated.*
