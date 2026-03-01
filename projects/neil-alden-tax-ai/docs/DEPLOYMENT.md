# MSTA Tax AI — Deployment Guide

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | — | Anthropic API key for Claude LLM |
| `NODE_ENV` | No | `development` | Set to `production` for prod |
| `CORS_ORIGINS` | No | `http://localhost:3870` | Comma-separated allowed origins |
| `PORT` | No | `3870` | HTTP server port |

## Quick Start

```bash
# Install dependencies
npm install

# Run directly
node src/server.js

# Run with PM2 (recommended for production)
pm2 start src/server.js --name msta-tax-ai
pm2 save
```

## Database

- **Engine**: SQLite via `better-sqlite3`
- **Location**: `data/msta.db` (auto-created on first run)
- **Tables**: `users`, `sessions`, `opinions`, `usage_logs`, `support_messages`, `support_reports`, `embeddings`
- **No migrations needed** — tables are created automatically in `src/auth.js`

## Module Structure

```
src/
├── server.js           # HTTP server, routing, static files, security headers
├── config.js           # Env vars, constants, Anthropic client init
├── auth.js             # SQLite DB setup, users, sessions, cookie/Bearer auth
├── security.js         # Rate limiting, brute-force protection, CSP, access logs
├── http-helpers.js     # parseBody, serveStatic, serveHtml, getClientIP
├── llm.js              # LLM streaming & non-streaming generation
├── questionnaire.js    # Multi-step form schema, prompt builder
├── search.js           # Vector similarity search over treaty embeddings
├── treaty-analyzer.js  # Treaty analysis pipeline (search + LLM)
├── audit-agent.js      # Post-generation opinion audit agent
├── pdf-export.js       # PDF generation from opinion data
├── embed-corpus.js     # One-time script to embed treaty PDFs
├── legal-status.js     # Legal citation status checking
├── lexml-client.js     # LexML (Brazilian legal DB) client
└── routes/
    ├── auth.js         # /api/auth/* (register, login, logout, me)
    ├── api.js          # /api/* (opinions CRUD, questionnaire, search, generate, stream, pdf)
    ├── support.js      # /api/support/* (chat messages, bug reports)
    └── admin.js        # /api/admin/* (dashboard, users, opinions, usage, reports, security)
```

**UI** (`ui/`): Vanilla HTML/CSS/JS — `index.html` (main app), `admin.html` (admin panel), `style.css`, `purify.min.js` (DOMPurify).

## Corpus Embedding (One-time)

```bash
# Place treaty PDFs in corpus/treaties/
node src/embed-corpus.js
```

This creates vector embeddings in the SQLite database for RAG search.

## Production with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start
ANTHROPIC_API_KEY=sk-ant-... NODE_ENV=production pm2 start src/server.js --name msta-tax-ai

# Monitor
pm2 logs msta-tax-ai
pm2 monit

# Auto-restart on reboot
pm2 startup
pm2 save
```

## MSTA Mac Studio M3 Ultra Deployment

For local/on-prem deployment on Mac Studio M3 Ultra:

### Option A: Anthropic API (Recommended)
```bash
export ANTHROPIC_API_KEY=sk-ant-...
export NODE_ENV=production
export CORS_ORIGINS=https://msta.adv.br
pm2 start src/server.js --name msta-tax-ai
```

### Option B: Local Model via Ollama
The system can be adapted to use a local LLM (e.g., Qwen3 or Llama) via Ollama:

1. Install Ollama: `brew install ollama`
2. Pull a model: `ollama pull qwen3:32b` (fits in M3 Ultra 192GB)
3. Modify `src/config.js` to point to local Ollama endpoint instead of Anthropic
4. Trade-off: Lower quality opinions but zero API cost and full data sovereignty

### macOS Specifics
- Use `launchd` or PM2 for auto-start on boot
- SQLite performs well on APFS — no special tuning needed
- For HTTPS: use Caddy or nginx as reverse proxy with Let's Encrypt

## Reverse Proxy (nginx example)

```nginx
server {
    listen 443 ssl;
    server_name msta.adv.br;

    ssl_certificate /etc/letsencrypt/live/msta.adv.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/msta.adv.br/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3870;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;  # Important for SSE streaming
    }
}
```
