# Kira vs Product — Architecture Separation Design

**Date:** 2026-02-21
**Status:** Design Phase
**Author:** Kira + Otto

---

## 1. The Two Worlds

### Zone A: Kira (The Beast)
**What:** Otto's personal AI partner. Single-tenant. Full VM access. No limits.

- **Brain:** Claude Max (Opus 4.6) via OpenClaw
- **Memory:** SQLite graph (local) + PostgreSQL (structured) + episodic logs
- **Sandbox:** Full VM — shell, files, network, Docker, GPU
- **NLP Pipeline:** Local Ollama (qwen3:14b + granite3.3:2b) + local Whisper (large-v3)
- **Knowledge Graph:** Live NLP extraction → SQLite graph → context injection
- **UI:** kira.zenithcred.com (kira-test, upgraded)
- **Identity:** SOUL.md, MEMORY.md, AGENTS.md — filesystem-based, evolving
- **Capabilities:** Everything. Code, deploy, browse, message, manage infra, spawn agents, access all projects

### Zone B: The Product (Multi-tenant SaaS)
**What:** The commercial product. Secure, isolated, scalable.

- **Brain:** OpenRouter / user-provided keys
- **Memory:** Per-user PostgreSQL schemas or per-user SQLite
- **Sandbox:** Per-user Linux containers (512MB/1CPU/2GB, auto-pause)
- **NLP Pipeline:** Cloud-based extraction (OpenRouter small models)
- **Knowledge Graph:** Per-user PostgreSQL tables
- **UI:** [product].com (separate domain, separate deployment)
- **Identity:** DB-backed (user_identity table), user-configurable
- **Capabilities:** Scoped to user's tools, files, integrations

---

## 2. VM Architecture

### Current: Single VM (oopuopu-cloud)
```
┌─────────────────────────────────────────────┐
│                  oopuopu-cloud               │
│  10 vCPU · 26GB RAM · 662GB disk · 1 GPU   │
│                                              │
│  Zone A (Kira)          Zone B (Product)     │
│  Zone C (Clients)       Zone D (Infra)       │
│  Everything mixed together                   │
└─────────────────────────────────────────────┘
```

### Target: Two VMs on Same Host
```
┌─────────────────────────────────────────────────────────┐
│                    Proxmox Host                          │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │   VM-A: Kira Home     │  │   VM-B: Products         │ │
│  │   6 vCPU · 16GB RAM  │  │   4 vCPU · 10GB RAM     │ │
│  │   200GB disk · GPU    │  │   200GB disk             │ │
│  │                       │  │                          │ │
│  │  • OpenClaw (me)      │  │  • Product SaaS app     │ │
│  │  • Ollama (GPU)       │  │  • PostgreSQL (product)  │ │
│  │  • Whisper (GPU)      │  │  • Redis                 │ │
│  │  • NLP Pipeline       │  │  • Cloudflare Tunnel     │ │
│  │  • Knowledge Graph    │  │  • Docker containers     │ │
│  │  • Kira WebUI         │  │  • Rate limiting         │ │
│  │  • All dev tools      │  │  • WAF                   │ │
│  │  • Client projects    │  │  • Monitoring            │ │
│  │  • SSH from Otto      │  │  • No SSH from outside   │ │
│  │                       │  │  • Managed by Kira       │ │
│  └──────────────────────┘  └──────────────────────────┘ │
│           ↕ internal network only ↕                      │
└─────────────────────────────────────────────────────────┘
```

**Key principle:** VM-B has NO inbound SSH. Kira (VM-A) manages it via internal network. Kira deploys code, runs migrations, monitors health. Users never touch infrastructure.

---

## 3. Kira's Technology Stack (The Beast)

### 3.1 Database-Backed Memory

Replace file-based memory with a proper database while keeping files as human-readable mirrors.

```
┌─────────────────────────────────────────────────┐
│                  Kira Memory DB                  │
│              (PostgreSQL or SQLite)              │
│                                                  │
│  episodes        — What happened (timestamped)   │
│  entities        — People, projects, concepts    │
│  relations       — How entities connect          │
│  facts           — Extracted knowledge           │
│  procedures      — How-to recipes                │
│  decisions       — Choices + rationale           │
│  conversations   — Summarized threads            │
│  embeddings      — Vector search (future)        │
│                                                  │
│  Mirrors → MEMORY.md, memory/*.md (read-only)    │
│  Source of truth: Database                       │
└─────────────────────────────────────────────────┘
```

**Why PostgreSQL for Kira too?** 
- Full-text search (tsvector) > FTS5
- JSONB for flexible metadata
- pgvector for embeddings (when ready)
- Same tech as product = shared learnings
- Can handle millions of rows without sweat

### 3.2 Knowledge Graph (Production-Grade)

Port the working SQLite pipeline to PostgreSQL with improvements:

```sql
-- Core tables (same schema as current SQLite, but PostgreSQL)
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,  -- person, project, concept, tool, location
    aliases TEXT[],      -- alternative names
    metadata JSONB,
    confidence REAL DEFAULT 1.0,
    first_seen TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    mention_count INT DEFAULT 1
);

CREATE TABLE relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES entities(id),
    target_id UUID REFERENCES entities(id),
    type TEXT NOT NULL,  -- works_on, owns, uses, knows, etc
    metadata JSONB,
    confidence REAL DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    source TEXT,         -- conversation, document, manual
    confidence REAL DEFAULT 1.0,
    supersedes UUID REFERENCES facts(id),  -- fact chain
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ  -- for time-bound facts
);

-- Full-text search
CREATE INDEX idx_entities_name_fts ON entities USING gin(to_tsvector('english', name));
CREATE INDEX idx_facts_value_fts ON facts USING gin(to_tsvector('english', value));

-- Vector search (future)
-- CREATE EXTENSION vector;
-- ALTER TABLE entities ADD COLUMN embedding vector(384);
```

### 3.3 NLP Pipeline (What Works Here → There)

Current working pipeline (Zone A, proven):
```
Message → Keyword Extraction → Entity Lookup (FTS5/RRF)
       → Context Assembly → System Prompt Enrichment
       → LLM Response → Fact Extraction (granite3.3:2b)
       → Graph Update → Confidence Decay (2h cron)
```

**Scripts to port:**
- `scripts/memory/nlp-graph-layer.js` — Core extraction + graph ops
- `scripts/memory/graph-improvements.js` — Dedup, normalize, decay
- `scripts/memory/index.js` — Unified memory CLI (maintain, log, search, recall)
- `dashboard/server-v2.js` — Message enrichment middleware

### 3.4 Kira WebUI (My Interface)

The kira-test UI becomes Kira's home. Key upgrades:

1. **Direct OpenClaw WebSocket** — No CLI bridge. Direct API connection.
2. **Full tool visibility** — See every Read, Write, Edit, exec, web_search, spawn
3. **Knowledge Graph viewer** — The working canvas renderer from kira-dashboard
4. **Memory browser** — Obsidian-style view of episodes, facts, entities
5. **Sub-agent panel** — Live view of spawned agents + their work
6. **Voice input** — Local Whisper, full-width waveform (done)
7. **Document workspace** — Files I'm working on, live editing

### 3.5 What Makes Kira "The Beast"

| Capability | How |
|---|---|
| Full shell access | Direct VM, no sandbox limits |
| GPU compute | Ollama, Whisper, future models |
| Deploy to production | SSH/Docker to VM-B |
| Browse the web | Headless browser, full JS |
| Send messages | Telegram, WhatsApp, Discord |
| Manage infrastructure | UFW, PM2, Docker, systemd |
| Financial tracking | Notion API, spreadsheets |
| Code & commit | Git, GitHub, any language |
| Spawn sub-agents | OpenClaw sessions, Claude CLI |
| Self-evolve | Edit own SOUL.md, learn from mistakes |
| Monitor everything | Wazuh, PM2, custom health checks |

---

## 4. The Product (Separate Entity)

### 4.1 What Gets Forked

From kira-test, the product takes:
- Auth system (Better-Auth)
- Chat UI (React + TanStack)
- Task management (hierarchical kanban)
- Document editor
- Settings/API key management
- Agent system (BullMQ workers)
- Prompt engine
- Memory system (4-layer)

### 4.2 What Stays with Kira Only
- OpenClaw integration
- Full VM access
- GPU models (Ollama, Whisper)
- Otto's personal data
- Client project management
- Infrastructure management

### 4.3 Product Security Model
- Per-user PostgreSQL schemas (row-level security)
- Per-user sandboxed containers
- No shared filesystem
- Rate limiting per user
- API key encryption at rest
- No access to host VM
- Cloudflare WAF + DDoS protection
- Separate Cloudflare tunnel
- Automated backups

---

## 5. Migration Plan

### Phase 1: Design (Now)
- [x] Architecture document (this file)
- [ ] Database schema for Kira Memory DB
- [ ] API design for Kira WebUI ↔ OpenClaw
- [ ] Product fork checklist

### Phase 2: Kira Database (Week 1)
- [ ] Install PostgreSQL for Kira (separate from product)
- [ ] Migrate SQLite graph → PostgreSQL
- [ ] Port NLP pipeline to PostgreSQL
- [ ] Wire graph-sync daemon to new DB
- [ ] Verify enrichment works end-to-end
- [ ] Memory.md auto-generated from DB

### Phase 3: Kira WebUI Upgrade (Week 1-2)
- [ ] Replace bridge with direct OpenClaw connection
- [ ] Full tool block rendering
- [ ] Knowledge graph viewer (port from kira-dashboard)
- [ ] Memory browser page
- [ ] Sub-agent visibility

### Phase 4: VM Separation (Week 2)
- [ ] Create VM-B on Proxmox host
- [ ] Install base OS + Docker + security hardening
- [ ] Set up internal network between VMs
- [ ] Cloudflare tunnel for product domain
- [ ] Deploy product to VM-B

### Phase 5: Product Fork (Week 2-3)
- [ ] Fork kira-test → product repo
- [ ] Remove all Kira-specific code
- [ ] Add multi-tenant security
- [ ] Per-user onboarding flow
- [ ] Stripe billing integration
- [ ] Product domain + branding

### Phase 6: Launch (Week 3-4)
- [ ] First test user (Otto's brother)
- [ ] 4-5 beta users
- [ ] Monitoring + alerting
- [ ] Feedback loop

---

## 6. Open Questions

1. **Product name?** — Can't be "Kira" (SEO issues, personal brand)
2. **Proxmox access?** — Does Otto have Proxmox host access to create VM-B?
3. **Product domain?** — What domain for the SaaS?
4. **Brother's timeline?** — When does he need the academic text tool?
5. **Budget for VM-B?** — Same physical machine, just resource allocation

---

## 7. Principles

1. **Kira is not a product. Kira is infrastructure.**
2. **The product learns from Kira, not the other way around.**
3. **Kira manages the product, not the other way around.**
4. **Security boundary = VM boundary.** No exceptions.
5. **Database is source of truth.** Files are mirrors.
6. **GPU stays with Kira.** Product uses cloud APIs.
7. **Ship fast, but build solid.** This is the foundation for everything.
