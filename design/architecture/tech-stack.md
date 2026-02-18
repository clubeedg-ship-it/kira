# Kira — Technology Stack & Rationale

> **Version:** 0.1.0-draft
> **Date:** 2026-02-11
> **Parent:** [system-overview.md](./system-overview.md)

---

## Table of Contents

1. [Stack Overview](#1-stack-overview)
2. [Core Runtime](#2-core-runtime)
3. [Frontend](#3-frontend)
4. [Data Storage](#4-data-storage)
5. [Real-Time Communication](#5-real-time-communication)
6. [AI / LLM](#6-ai--llm)
7. [Chat Platform SDKs](#7-chat-platform-sdks)
8. [Infrastructure & Packaging](#8-infrastructure--packaging)
9. [Development Tools](#9-development-tools)
10. [Key Design Decisions](#10-key-design-decisions)
11. [Dependency Inventory](#11-dependency-inventory)
12. [Minimum System Requirements](#12-minimum-system-requirements)

---

## 1. Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│                      KIRA STACK                          │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │  FRONTEND           React 18 + Vite + TailwindCSS   ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │  API LAYER          Express/Fastify + SSE            ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │  CORE RUNTIME       Node.js 22+ (OpenClaw)          ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │  DATA               SQLite (better-sqlite3)          ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │  AI                 Anthropic Claude API              ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │  PACKAGING          Docker + docker-compose           ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 2. Core Runtime

### Node.js 22+ (LTS)

**Choice:** Node.js
**Alternatives considered:** Python, Go, Rust, Deno, Bun

**Rationale:**
| Factor | Node.js | Python | Go |
|--------|---------|--------|----|
| OpenClaw ecosystem | ✅ Native | ❌ Rewrite | ❌ Rewrite |
| Async I/O | ✅ Event loop | ⚠️ asyncio | ✅ Goroutines |
| NPM ecosystem | ✅ Massive | ✅ pip | ⚠️ Smaller |
| LLM SDK support | ✅ Anthropic SDK | ✅ Anthropic SDK | ⚠️ Community |
| Full-stack (front+back) | ✅ Same language | ❌ Different | ❌ Different |
| Startup time | ✅ Fast | ⚠️ Moderate | ✅ Fast |
| Memory footprint | ⚠️ Moderate | ⚠️ Moderate | ✅ Low |

**Alternatives considered in depth:**

| Factor | Node.js 22+ | Bun 1.x |
|--------|------------|---------|
| Compatibility | ✅ 100% npm ecosystem | ⚠️ 95%+ (some native addons break) |
| OpenClaw compat | ✅ Built for Node | ⚠️ Untested, may need patches |
| better-sqlite3 | ✅ Works | ⚠️ Has had issues with native builds |
| Startup speed | ~200ms | ~50ms (4x faster) |
| HTTP perf | Good | 2-3x faster |
| TypeScript | Via tsx/ts-node | ✅ Native |
| Stability | ✅ Battle-tested | ⚠️ Newer, occasional edge cases |
| Tauri sidecar | ✅ Easy to bundle | ⚠️ Larger, less proven |

**Decision:** Node.js 22+ for v1.0. Bun is faster but riskier — native addon compatibility (better-sqlite3, sharp) is not 100%, and OpenClaw is built for Node. We can migrate to Bun later when its ecosystem matures.

**Compromise:** Use Bun as the **development runner** (faster dev server, native TS) but build/ship with Node.js for production reliability. This is a common pattern.

Node.js handles I/O-bound workloads (chat, API calls, file serving) extremely well.

### Express vs Fastify

**Choice:** Fastify (recommended) or Express (acceptable)

**Rationale:**
- **Fastify:** ~3x faster than Express, built-in schema validation, better plugin system, TypeScript-friendly
- **Express:** More widespread, more middleware available, simpler mental model
- **Decision:** Fastify preferred for new code. Express acceptable if it's what OpenClaw already uses internally. The performance difference matters less at single-user scale but Fastify's structured approach is cleaner.

---

## 3. Frontend

### React 18+

**Choice:** React
**Alternatives considered:** Svelte, Vue, SolidJS, vanilla JS, HTMX

**Rationale:**

| Factor | React | Svelte | Vue | HTMX |
|--------|-------|--------|-----|------|
| Ecosystem size | ✅ Largest | ⚠️ Growing | ✅ Large | ⚠️ Niche |
| Component libraries | ✅ Thousands | ⚠️ Fewer | ✅ Many | ❌ N/A |
| AI agent familiarity | ✅ Best trained | ⚠️ Less data | ✅ Good | ⚠️ Less data |
| Widget sandboxing | ✅ Well-documented | ✅ Possible | ✅ Possible | ❌ Hard |
| PWA support | ✅ Mature | ✅ Good | ✅ Good | ⚠️ Manual |
| SSE integration | ✅ Easy | ✅ Easy | ✅ Easy | ✅ Native |
| Hiring/contributors | ✅ Easiest | ⚠️ Smaller pool | ✅ Good | ⚠️ Niche |

**Key reason: AI agent as primary developer.** Kira's dashboard will largely be built by AI coding agents. React has the largest training corpus of any frontend framework. Claude, GPT-4, and other models produce the most reliable React code. This is a pragmatic choice — the "developer" (AI agent) works best with React.

**Secondary reason: Widget ecosystem.** The Widget Engine needs to render arbitrary AI-generated components. React's component model, combined with its massive ecosystem of chart libraries, form builders, and UI kits, makes it the safest choice for dynamic component rendering.

### Vite

**Choice:** Vite (build tool)
**Alternatives considered:** webpack, Parcel, esbuild direct

**Rationale:** Vite is the modern standard. Instant HMR in dev, optimized Rollup builds in prod. Near-zero configuration for React. Webpack is legacy complexity we don't need. Parcel is simpler but less configurable. Esbuild alone lacks the plugin ecosystem.

### TailwindCSS

**Choice:** TailwindCSS
**Alternatives considered:** CSS Modules, styled-components, vanilla CSS, shadcn/ui

**Rationale:**
- Utility-first means AI agents produce correct styles more consistently (no naming decisions)
- Works with any component library
- Tiny production bundle (purged unused classes)
- `shadcn/ui` (built on Tailwind + Radix) provides accessible, themeable base components
- AI agents are extremely good at generating Tailwind classes

### Key Frontend Dependencies

| Package | Purpose | Why This One |
|---------|---------|--------------|
| `react` + `react-dom` | UI framework | See above |
| `vite` | Build tool | See above |
| `tailwindcss` | Styling | See above |
| `@radix-ui/*` | Accessible primitives | Unstyled, composable, ARIA-complete |
| `shadcn/ui` | Component library | Tailwind + Radix, copy-paste (not dependency) |
| `recharts` or `chart.js` | Charts for widgets | Lightweight, React-native |
| `react-markdown` | Render agent markdown | Standard for markdown-in-React |
| `react-router` | Client-side routing | De facto standard |
| `zustand` | State management | Minimal, no boilerplate, works with SSE |
| `eventsource` polyfill | SSE client | Browser EventSource + reconnection |

---

## 4. Data Storage

### SQLite (via better-sqlite3)

**Choice:** SQLite
**Alternatives considered:** PostgreSQL, MySQL, MongoDB, LevelDB, filesystem-only

**Rationale:**

| Factor | SQLite | PostgreSQL | MongoDB |
|--------|--------|------------|---------|
| Zero infrastructure | ✅ File-based | ❌ Separate server | ❌ Separate server |
| Installability | ✅ Bundled | ❌ Extra dependency | ❌ Extra dependency |
| Single-user perf | ✅ Excellent | ✅ Overkill | ⚠️ Overhead |
| Backup | ✅ Copy file | ⚠️ pg_dump | ⚠️ mongodump |
| Portability | ✅ Single file | ❌ Server state | ❌ Server state |
| Concurrent writes | ⚠️ WAL helps | ✅ Full MVCC | ✅ Full |
| Resource usage | ✅ ~10MB | ⚠️ ~100MB+ | ⚠️ ~200MB+ |
| Query capability | ✅ Full SQL | ✅ Full SQL | ⚠️ NoSQL |

**Key reason: Installability.** Kira must install with `docker-compose up` or a single script. Adding PostgreSQL means another container, another port, another thing to configure and break. SQLite is a library, not a server. It ships inside the application.

**Key reason: Resource footprint.** A 2GB VPS can't spare 100-200MB for a database server that serves one user. SQLite uses virtually no memory beyond what's being queried.

**Concurrent write limitation:** SQLite allows one writer at a time. With WAL mode, reads don't block writes. For single-user Kira, this is fine — the agent is the primary writer, and writes are infrequent (a few per second at peak). Dashboard reads are non-blocking.

**Library: `better-sqlite3`**
- Synchronous API (no callback complexity for simple queries)
- ~10x faster than `sqlite3` (async wrapper) for typical workloads
- Native addon (prebuilt binaries for common platforms)
- WAL mode support

### SQLite Databases

Kira uses **multiple SQLite databases** for separation of concerns:

| Database | Location | Purpose |
|----------|----------|---------|
| `memory/graph.db` | Workspace | Knowledge graph (entities, relations, facts) |
| `data/sessions.db` | Data dir | Session state, conversation metadata |
| `data/cron.db` | Data dir | Cron job definitions and run history |
| `data/widgets.db` | Data dir | Widget definitions and state |
| `data/health.db` | Data dir | Health check history and metrics |

**Why multiple databases:**
- Independent backup/restore
- No schema conflicts
- Can delete widget DB without affecting memory
- Different access patterns (graph.db is read-heavy, sessions.db is write-heavy)

### Filesystem as Database

Not everything needs SQLite. Markdown files ARE the database for:
- Daily memory logs (`memory/YYYY-MM-DD.md`)
- Long-term memory (`MEMORY.md`)
- Agent configuration (`AGENTS.md`, `SOUL.md`, etc.)
- Deliverables and documents

**Rationale:** The agent reads and writes markdown natively. Putting this in SQLite would mean the agent needs to query a database instead of just reading a file. Files are the natural interface for an LLM agent.

---

## 5. Real-Time Communication

### SSE (Server-Sent Events)

**Choice:** SSE for server→client real-time
**Alternatives considered:** WebSocket, Socket.IO, long-polling, gRPC streaming

**Rationale:**

| Factor | SSE | WebSocket | Socket.IO |
|--------|-----|-----------|-----------|
| Complexity | ✅ Simple | ⚠️ Moderate | ⚠️ High |
| Server→client | ✅ Native | ✅ Yes | ✅ Yes |
| Client→server | ❌ Use POST | ✅ Yes | ✅ Yes |
| Auto-reconnect | ✅ Built-in | ❌ Manual | ✅ Built-in |
| Proxy-friendly | ✅ HTTP | ⚠️ Upgrade needed | ⚠️ Upgrade needed |
| Browser support | ✅ Native | ✅ Native | ✅ Polyfill |
| Auth | ✅ Cookies/headers | ⚠️ Query params | ⚠️ Custom |
| Load balancing | ✅ Standard HTTP | ⚠️ Sticky sessions | ⚠️ Sticky sessions |

**Key reason: Simplicity.** Kira's real-time needs are **unidirectional** — the server pushes events (new messages, status changes, widget updates) to the dashboard. The dashboard sends actions back via regular HTTP POST. This is exactly what SSE is designed for.

**Why not WebSocket:**
- WebSocket adds bidirectional complexity we don't need
- WebSocket requires upgrade negotiation (proxy complications)
- WebSocket needs manual reconnection logic
- WebSocket needs sticky sessions for load balancing (multi-tenant future)
- SSE works over standard HTTP — any reverse proxy handles it

**Why not Socket.IO:**
- Socket.IO is 40KB+ of client-side JavaScript for features we don't use
- Falls back to polling (we don't need fallbacks — SSE has 98%+ browser support)
- Adds abstraction layer over something already simple

**The one case for WebSocket:** If widget interactions become high-frequency (e.g., real-time collaborative editing), we might add a WebSocket endpoint specifically for that. But start with SSE + POST.

### HTTP REST for Client→Server

Standard REST API for all client-initiated actions:
- `POST /api/messages` — send message
- `POST /api/widgets/:id/interact` — widget interaction
- `GET /api/files/:path` — file access

No need for bidirectional socket when HTTP POST works perfectly for these request-response patterns.

---

## 6. AI / LLM

### Anthropic Claude API

**Choice:** Anthropic Claude (primary), architecture supports swapping
**Models:**
| Use Case | Model | Rationale |
|----------|-------|-----------|
| Main agent | claude-opus-4-6 | Best reasoning, tool use, long context |
| Sub-agents | claude-opus-4-6 (configurable) | Same quality, can downgrade for cost |
| Memory curator | qwen3:14b (local) or claude | Cost optimization for background work |
| Cron jobs | Configurable per job | Some jobs need less intelligence |

**SDK:** `@anthropic-ai/sdk` (official Node.js SDK)

**Key design: Model-agnostic core.** The agent runtime should abstract the LLM API behind an interface:
```typescript
interface LLMProvider {
  chat(params: ChatParams): AsyncIterable<StreamEvent>
  countTokens(messages: Message[]): number
}
```

This allows:
- Swapping to other providers (OpenAI, local models via Ollama)
- Using different models for different tasks
- Cost optimization (cheaper model for background tasks)
- Fallback if primary provider is down

### Ollama Integration (Deep, LiteLLM-style)

Ollama is NOT a second-class citizen. It's a fully integrated local model runtime with its own management UI.

**Capabilities:**

1. **GPU Auto-Discovery**
   - On first run and Settings > Local Models, scan system for available GPUs
   - Detect: NVIDIA (nvidia-smi), AMD (rocm-smi), Apple Silicon (sysctl), Intel Arc
   - Show: GPU model, VRAM, driver version, compute capability
   - Recommend models based on available VRAM:
     - <4GB VRAM → qwen2.5:1.5b, phi-3-mini
     - 4-8GB → qwen2.5:7b, llama3.1:8b, nomic-embed
     - 8-16GB → qwen2.5:14b, codellama:13b
     - 16GB+ → qwen2.5:32b, llama3.1:70b (quantized)
     - Apple M-series → unified memory, can run larger models
   - Display: "Your Mac M2 Pro (16GB) can run models up to ~14B parameters"

2. **Ollama Lifecycle Management**
   - Auto-detect if Ollama is installed (`which ollama`)
   - If not installed: show one-click install button (download + install)
   - Start/stop Ollama as a managed subprocess
   - Monitor Ollama health (API ping, memory usage, GPU utilization)
   - Auto-start on Kira launch if local models are configured

3. **Model Catalog Browser**
   - Browse Ollama model library in Settings > Local Models > Browse
   - Categories: Chat, Code, Embedding, Vision, Small, Medium, Large
   - For each model: name, size, VRAM required, description, quantization options
   - Filter by: fits my GPU, task type, size
   - One-click pull: "Pull qwen2.5:14b" with progress bar
   - Show pulled models with size, last used, delete option

4. **Model Management UI**
   ```
   ┌─────────────────────────────────────────────────┐
   │ ⚙️ Local Models                                  │
   │                                                 │
   │ 🖥️ System: Apple M2 Pro · 16GB unified memory   │
   │ 💡 Recommended: models up to 14B parameters     │
   │                                                 │
   │ Installed Models:                               │
   │ ┌─────────────────────────────────────────────┐ │
   │ │ ✅ qwen2.5:14b      8.2GB   Chat/Code      │ │
   │ │    Last used: 2h ago · Assigned to: Memory  │ │
   │ │                                    [Delete] │ │
   │ ├─────────────────────────────────────────────┤ │
   │ │ ✅ nomic-embed-text  274MB   Embeddings     │ │
   │ │    Last used: 30m ago · Assigned to: Embed  │ │
   │ │                                    [Delete] │ │
   │ └─────────────────────────────────────────────┘ │
   │                                                 │
   │ [Browse Catalog]  [Pull by name: _________ ⏎]  │
   │                                                 │
   │ Ollama Status: ● Running · GPU: 42% · VRAM: 9/16GB │
   └─────────────────────────────────────────────────┘
   ```

5. **Automatic Assignment**
   - When user pulls a model, suggest task assignments:
     - "Assign qwen2.5:14b to memory summarization?" → saves API costs
     - "Use nomic-embed for all embeddings?" → zero cost embeddings
   - Smart defaults: if user has a capable GPU, auto-configure local models for background tasks
   - One-click "Maximize local" button: assign local models to every task they can handle

6. **Performance Monitoring**
   - Track tokens/sec per model
   - GPU utilization and temperature
   - Compare: local model latency vs API latency
   - Alert if GPU is thermal throttling

### Token Counting

**Library:** `@anthropic-ai/tokenizer` or tiktoken equivalent
**Purpose:** Track context window usage for memory management (the 75% threshold trigger)

---

## 7. Chat Platform SDKs

| Platform | Library | Notes |
|----------|---------|-------|
| **Telegram** | `node-telegram-bot-api` or `telegraf` | Polling + webhook support. `telegraf` preferred (more active, middleware model) |
| **Discord** | `discord.js` | De facto standard. Gateway WebSocket + REST API |
| **Signal** | `signal-cli` (subprocess) or `libsignal` | No official Node.js SDK. Run signal-cli as subprocess, communicate via JSON |
| **WhatsApp** | `@whiskeysockets/baileys` | Unofficial but widely used. Web protocol reverse-engineering. Fragile but functional |

**Abstraction layer:** All bridges implement the `ChatBridge` interface defined in [system-overview.md](./system-overview.md). Platform-specific details are encapsulated in the adapter.

---

## 8. Infrastructure & Packaging

### Docker + docker-compose

**Choice:** Docker
**Alternatives considered:** Snap, Flatpak, native packages, Nix

**Rationale:**
- Docker is the universal packaging standard for server applications
- `docker-compose up` is the simplest possible install command
- Handles Node.js version, native addon compilation, system dependencies
- Consistent across Linux, macOS (Docker Desktop), Windows (WSL2)
- Easy to add reverse proxy (Caddy) as additional service

### Caddy (reverse proxy)

**Choice:** Caddy
**Alternatives considered:** nginx, Traefik, HAProxy

**Rationale:**
- Automatic HTTPS (Let's Encrypt) with zero configuration
- Single binary, tiny footprint
- Simple Caddyfile syntax
- Built-in HTTP/2 and HTTP/3

**Caddyfile:**
```
kira.example.com {
  reverse_proxy /api/* localhost:3001
  reverse_proxy /events localhost:3001
  reverse_proxy localhost:3001
}
```

### Process Management

| Deployment | Process Manager | Why |
|------------|----------------|-----|
| Docker | Docker restart policy | `restart: unless-stopped` — handles crashes |
| VPS native | systemd | OS-native, logging, dependency management |
| Local dev | Direct node process | Simplest for development |

### Dockerfile Strategy

**Multi-stage build:**
```dockerfile
# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/dashboard
COPY dashboard/package*.json ./
RUN npm ci
COPY dashboard/ ./
RUN npm run build

# Stage 2: Production runtime
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
COPY --from=frontend-build /app/dashboard/dist ./dashboard/dist
CMD ["node", "src/index.js"]
```

---

## 9. Development Tools

| Tool | Purpose |
|------|---------|
| **TypeScript** | Type safety for all new code. Gradual adoption (`.ts` alongside `.js`) |
| **ESLint** | Code quality and consistency |
| **Prettier** | Code formatting (no debates) |
| **Vitest** | Unit/integration testing (Vite-native, fast) |
| **Playwright** | E2E testing for dashboard |
| **nodemon** | Dev server auto-restart |
| **tsx** | TypeScript execution without build step (dev only) |

---

## 10. Key Design Decisions

### 10.1 Why Not a Monorepo Tool (Turborepo, Nx)?

**Decision:** Simple npm workspaces or flat structure.

Kira has 2-3 packages at most (core, dashboard, shared types). Turborepo/Nx add configuration complexity that exceeds their benefit at this scale. If the project grows to 10+ packages, reconsider.

### 10.2 Why Not GraphQL?

**Decision:** REST + SSE.

GraphQL excels at complex, deeply nested data with many different client views. Kira's dashboard has ~10 API endpoints with simple request/response patterns. GraphQL's schema definition, resolver implementation, and client library overhead don't pay off here.

### 10.3 Why Not Redis for Pub/Sub?

**Decision:** In-process event emitter + SSE.

Redis pub/sub makes sense when multiple processes need to communicate. Kira's core runs in a single process (or two at most). Node.js `EventEmitter` handles in-process pub/sub with zero latency and no external dependency.

### 10.4 Desktop App — Tauri (macOS + Windows)

**Decision:** Tauri v2 for standalone desktop app.

| Factor | Tauri | Electron | PWA-only |
|--------|-------|----------|----------|
| Bundle size | ~5-10MB | ~200MB | 0 (browser) |
| RAM usage | ~30MB | ~150MB+ | Varies |
| Native feel | ✅ Native window, menubar, system tray | ✅ But heavy | ❌ Browser tab |
| macOS + Windows | ✅ Both | ✅ Both | ⚠️ Limited |
| Auto-update | ✅ Built-in updater | ✅ | ❌ |
| System tray | ✅ | ✅ | ❌ |
| File system access | ✅ Via Rust backend | ✅ | ❌ Restricted |
| Notifications | ✅ Native OS notifications | ✅ | ⚠️ Service worker |
| Startup on boot | ✅ | ✅ | ❌ |

**Why Tauri over Electron:**
- 20x smaller bundle (Rust backend + system WebView, no bundled Chromium)
- Lower memory footprint
- Native OS integration (menubar, tray, notifications)
- Tauri v2 supports sidecar processes (perfect for bundling the Node.js backend + Ollama)

**Architecture:**
```
┌─────────────────────────────────────────┐
│          Tauri Shell (Rust)              │
│  ┌───────────────┐ ┌─────────────────┐  │
│  │ System WebView │ │ Sidecar: Node.js│  │
│  │ (React frontend)│ │ (Kira backend)  │  │
│  └───────────────┘ └─────────────────┘  │
│  ┌─────────────────────────────────────┐│
│  │ System tray · Native notifications  ││
│  │ Auto-update · Startup on boot       ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

The Tauri Rust shell manages:
- Window lifecycle, system tray icon, menubar
- Sidecar process management (start/stop/restart Node.js backend)
- Auto-updater (check GitHub releases, download, apply)
- Native OS notifications
- GPU detection for Ollama (see Ollama integration)
- Deep links (kira:// protocol)

The Node.js backend runs as a sidecar:
- All existing backend code unchanged
- Communicates with frontend via localhost HTTP/SSE
- Manages Ollama subprocess if local models enabled

**Mobile:** Explicitly out of scope for v1.0. Desktop (macOS + Windows) first. Mobile via responsive web dashboard accessed through browser if needed.

### 10.5 Why Markdown Files Instead of All-SQLite?

**Decision:** Markdown for human/agent-readable content, SQLite for structured data.

The agent's primary interface is text. When it reads `MEMORY.md`, it gets context naturally. If memory were in SQLite, the agent would need to query, format, and interpret structured data — adding a translation layer. Markdown files are the agent's native format. SQLite is used for data that benefits from querying (knowledge graph, session metadata, cron schedules).

### 10.6 Why Single Container (Not Microservices)?

**Decision:** One container for core (Gateway + Agent + Bridges + Memory + Cron), optional second for Dashboard.

Microservices add network hops, serialization overhead, deployment complexity, and failure modes. For a single-user application, a single process that handles everything is simpler, faster, and more reliable. The code can still be modular (separate modules, clear interfaces) without being separate processes.

---

## 11. Dependency Inventory

### Core (Production)

| Package | Version | Purpose | Size Impact |
|---------|---------|---------|-------------|
| `@anthropic-ai/sdk` | ^0.30 | Claude API client | ~500KB |
| `better-sqlite3` | ^11 | SQLite driver | ~5MB (native) |
| `express` or `fastify` | ^4 / ^5 | HTTP server | ~200KB / ~300KB |
| `telegraf` | ^4 | Telegram bot framework | ~300KB |
| `node-cron` | ^3 | Cron expression parser | ~50KB |
| `eventsource` | ^2 | SSE server utilities | ~20KB |
| `dotenv` | ^16 | Environment variable loading | ~30KB |
| `zod` | ^3 | Runtime type validation | ~60KB |
| `pino` | ^9 | Structured logging | ~200KB |
| `chokidar` | ^4 | File system watching (VDR) | ~100KB |

### Dashboard (Production)

| Package | Version | Purpose | Size Impact |
|---------|---------|---------|-------------|
| `react` | ^18 | UI framework | ~130KB |
| `react-dom` | ^18 | DOM rendering | ~130KB |
| `react-router-dom` | ^6 | Client routing | ~50KB |
| `zustand` | ^5 | State management | ~10KB |
| `recharts` | ^2 | Chart rendering (widgets) | ~200KB |
| `react-markdown` | ^9 | Markdown rendering | ~50KB |
| `tailwindcss` | ^3 | CSS framework | 0KB runtime (build tool) |
| `@radix-ui/react-*` | various | Accessible UI primitives | ~100KB total |

### Development Only

| Package | Purpose |
|---------|---------|
| `typescript` | Type checking |
| `vite` | Build + dev server |
| `vitest` | Testing |
| `eslint` | Linting |
| `prettier` | Formatting |
| `tsx` | TS execution |
| `@types/*` | Type definitions |

### System Dependencies (Container)

| Dependency | Purpose |
|------------|---------|
| `node:22-alpine` | Base image (~50MB) |
| `python3` + `make` + `g++` | Native addon compilation (build only) |
| `sqlite3` CLI | Database inspection/backup (optional) |

---

## 12. Minimum System Requirements

### Single-User Local (Development)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 2 GB | 4 GB |
| Disk | 1 GB free | 5 GB free |
| OS | Linux, macOS 12+, Windows 10+ (WSL2) | Linux |
| Node.js | 20.x LTS | Latest LTS |
| Docker | 24+ (if using container) | Latest |
| Network | Internet (for LLM API) | Broadband |

### Single-User VPS (Production)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 GB | 4 GB |
| Disk | 10 GB SSD | 20 GB SSD |
| OS | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 |
| Network | 100 Mbps | 1 Gbps |
| Docker | 24+ | Latest |

### Resource Breakdown (Estimated)

```
Component              RAM (idle)   RAM (active)   CPU (idle)   CPU (active)
─────────────────────────────────────────────────────────────────────────────
Node.js (Gateway)      80 MB        150 MB         <1%          5-15%
  └─ Agent Runtime     (shared)     +50 MB/turn    <1%          varies
  └─ Sub-Agent         (shared)     +30 MB each    <1%          varies
SQLite (all DBs)       10 MB        30 MB          <1%          <1%
Dashboard Server       30 MB        50 MB          <1%          <2%
File watchers          5 MB         5 MB           <1%          <1%
─────────────────────────────────────────────────────────────────────────────
TOTAL                  ~125 MB      ~285 MB        <1%          5-20%
```

**Note:** The biggest resource consumer is the LLM API call, which is network-bound (waiting for Anthropic's response), not CPU/RAM-bound locally. The system spends >95% of its time idle, waiting for user input or API responses.

### Configuration Convention
- **User-facing config:** YAML (`kira.yml`) — human-readable, editable
- **Developer/build config:** TypeScript (`kira.config.ts`) — type-safe
- **Secrets/environment:** `.env` file — never committed
- **Runtime overrides:** CLI flags or environment variables

---

## Appendix: Technology Radar

### Adopt (Use Now)
- Node.js 22+
- SQLite (better-sqlite3)
- React 18
- Vite
- TailwindCSS
- Docker
- SSE
- Anthropic Claude API

### Trial (Evaluate for Specific Use)
- Fastify (vs Express)
- TypeScript (gradual migration)
- Zod (runtime validation)
- shadcn/ui (component library)

### Assess (Watch, Don't Use Yet)
- Bun (Node.js alternative — wait for stability)
- Svelte 5 (if React proves problematic for widgets)
- WebSocket (if SSE proves insufficient)
- Ollama/local LLMs (for cost optimization of background tasks)

### Hold (Don't Use)
- PostgreSQL (unnecessary complexity)
- Redis (unnecessary dependency)
- GraphQL (over-engineering for this scale)
- Electron (PWA is sufficient)
- Microservices architecture (premature)
- MongoDB (wrong data model)

---

*This document should be updated when technology choices change. All decisions include rationale so future developers (human or AI) understand the "why" and can make informed changes.*
