# Docker Packaging

## Dockerfile

Multi-stage build for minimal image size.

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
RUN npm ci --workspace=packages/*

COPY . .
RUN npm run build --workspace=packages/*

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:22-alpine AS production
WORKDIR /app

# Security: non-root user
RUN addgroup -S kira && adduser -S kira -G kira

# System deps (SQLite native module)
RUN apk add --no-cache sqlite

# Copy built app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/*/dist ./packages/
COPY --from=builder /app/package.json ./

# Data directory
RUN mkdir -p /data && chown kira:kira /data
VOLUME /data

ENV NODE_ENV=production
ENV KIRA_DATA_DIR=/data
ENV PORT=3001

USER kira
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

ENTRYPOINT ["node", "packages/cli/dist/index.js", "start"]
```

**Target image size:** ~150MB (Alpine + Node + app)

---

## docker-compose.yml

```yaml
version: "3.8"

services:
  kira:
    image: ghcr.io/kira-ai/kira:latest
    container_name: kira
    restart: unless-stopped
    ports:
      - "3001:3001"       # Dashboard
    volumes:
      - kira-data:/data   # Persistent: DB, memory, config, files
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN:-}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - TZ=${TZ:-UTC}
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "2.0"
        reservations:
          memory: 256M
          cpus: "0.5"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  kira-data:
    driver: local
```

---

## Volumes

### `/data` Directory Structure

```
/data/
├── config/
│   └── kira.config.json      # User configuration
├── db/
│   ├── kira.db               # Main database
│   ├── kira.db-wal           # WAL file
│   └── metrics.db            # Metrics database
├── memory/
│   ├── MEMORY.md             # Long-term memory
│   └── daily/                # Daily memory files
├── logs/
│   └── kira.2026-02-11.log
├── backups/
│   └── kira.db.2026-02-10    # Daily DB backups
└── files/
    └── user-uploads/          # User-uploaded files
```

### Backup Strategy

```bash
# Backup entire Kira data
docker run --rm -v kira-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/kira-backup-$(date +%Y%m%d).tar.gz /data

# Restore
docker run --rm -v kira-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/kira-backup-20260211.tar.gz -C /
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | Yes* | — | OpenRouter API key (*or set via UI) |
| `TELEGRAM_BOT_TOKEN` | No | — | Telegram bot token |
| `DISCORD_BOT_TOKEN` | No | — | Discord bot token |
| `PORT` | No | `3001` | Dashboard port |
| `LOG_LEVEL` | No | `info` | Log verbosity |
| `TZ` | No | `UTC` | Timezone |
| `KIRA_DATA_DIR` | No | `/data` | Data directory path |
| `KIRA_SECRET` | No | auto-generated | Session encryption key |

Use `.env` file with docker-compose:
```bash
cp .env.example .env
# Edit .env with your keys
docker compose up -d
```

---

## Resource Limits

### Recommended Minimums

| Deployment | RAM | CPU | Disk |
|-----------|-----|-----|------|
| Minimal (1 channel, no sub-agents) | 256MB | 0.5 core | 1GB |
| Standard (multi-channel, sub-agents) | 512MB | 1 core | 5GB |
| Power user (heavy usage, local models) | 2GB | 2 cores | 20GB |

### Container Limits

The compose file sets:
- **Memory limit**: 1GB (OOM-killed above this)
- **Memory reservation**: 256MB (guaranteed)
- **CPU limit**: 2 cores
- **CPU reservation**: 0.5 cores

Adjust based on usage:
```yaml
deploy:
  resources:
    limits:
      memory: 2G    # For heavy usage
```
