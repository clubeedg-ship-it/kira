# 02 — System Architecture

---

## Overview

```
                    ┌──────────────────┐
                    │   Cloudflare CDN  │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        kira.ai        app.kira.ai    api.kira.ai
     (marketing)       (dashboard)      (backend)
     Static site       React SPA       Node.js API
     CF Pages          CF Pages/       Docker
                       served by API   
```

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Runtime** | Node.js 22+ | LTS, native TypeScript via --experimental-strip-types |
| **Framework** | None (raw http module) | No overhead, full control, we don't need Express |
| **Database** | SQLite (WAL mode) | Single-file, zero-config, scales to millions of rows |
| **Auth DB** | Shared SQLite | Users, sessions, tokens — one DB for all |
| **User Data** | Per-user SQLite | Memory, tasks, goals, chat — isolated per user |
| **File Storage** | Local filesystem | `/data/users/{id}/files/` — Docker volume |
| **Frontend** | React 18 + Vite | Fast builds, standard ecosystem |
| **Styling** | Tailwind CSS | Utility-first, consistent with design system |
| **Desktop** | Tauri v2 (future) | Native wrapper, small bundle |
| **LLM** | Pure fetch | No SDKs. OpenRouter, Anthropic, OpenAI, Ollama — all via HTTP |

## Directory Structure

```
kira/
├── packages/
│   ├── marketing/          # Static marketing site
│   │   ├── src/
│   │   ├── public/
│   │   └── vite.config.ts
│   ├── dashboard/          # Platform SPA
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── lib/        # API client, auth helpers
│   │   │   └── App.tsx
│   │   └── vite.config.ts
│   ├── api/                # Backend server
│   │   ├── src/
│   │   │   ├── server.ts       # HTTP server, routing
│   │   │   ├── middleware/     # auth, rate-limit, error-handler
│   │   │   ├── routes/         # modular route handlers
│   │   │   ├── services/       # business logic
│   │   │   └── lib/            # shared utilities
│   │   └── tests/
│   └── core/               # Shared types, memory engine, providers
│       ├── src/
│       │   ├── memory/
│       │   ├── ai/
│       │   ├── auth/
│       │   ├── tasks/
│       │   ├── goals/
│       │   └── types.ts
│       └── tests/
├── docker-compose.yml
├── Dockerfile
└── package.json            # Workspace root
```

## Request Flow

```
Client → Cloudflare → API Server
                         ↓
                    Auth Middleware
                    (JWT validation, user_id extraction)
                         ↓
                    Rate Limiter
                    (per-user, per-endpoint)
                         ↓
                    Route Handler
                    (always receives user_id)
                         ↓
                    Service Layer
                    (business logic, DB access)
                         ↓
                    User-scoped DB
                    (/data/users/{id}/*.db)
```

## Config

All configuration via environment variables:

```env
# Server
KIRA_PORT=3001
KIRA_DATA_DIR=/data
KIRA_DOMAIN=app.kira.ai
KIRA_JWT_SECRET=<random-64-char>

# Default LLM (server-wide fallback)
OPENROUTER_API_KEY=sk-or-...
KIRA_DEFAULT_MODEL=anthropic/claude-sonnet-4

# Email (for verification)
SMTP_HOST=smtp.example.com
SMTP_USER=noreply@kira.ai
SMTP_PASS=<password>

# OAuth (future)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Rate limits
KIRA_RATE_LIMIT_CHAT=60       # requests per minute per user
KIRA_RATE_LIMIT_API=120       # requests per minute per user
```

**Never in source code:**
- API keys
- JWT secrets
- Passwords
- Domain names
- Provider credentials

## Deployment

### Production (Docker)

```yaml
# docker-compose.yml
services:
  kira:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - kira-data:/data
    env_file: .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3001/api/health').then(r=>r.ok?process.exit(0):process.exit(1))"]
      interval: 30s
      timeout: 3s

volumes:
  kira-data:
```

### Dev

```bash
# Terminal 1: API
cd packages/api && npm run dev

# Terminal 2: Dashboard  
cd packages/dashboard && npm run dev

# Terminal 3: Marketing (if working on it)
cd packages/marketing && npm run dev
```

Vite proxies `/api/*` to localhost:3001 in dev mode.
