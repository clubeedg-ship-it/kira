# 17 — Deployment

## Production Stack
- Docker container running Node.js API + serving dashboard static files
- Cloudflare Tunnel for HTTPS (no exposed ports)
- SQLite data on Docker volume
- .env file for all config

## Docker
```dockerfile
FROM node:22-slim AS builder
WORKDIR /app
COPY . .
RUN npm install
WORKDIR /app/packages/dashboard
RUN npx vite build
WORKDIR /app

FROM node:22-slim
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app .
RUN npm rebuild better-sqlite3
VOLUME /data
ENV KIRA_PORT=3001 KIRA_DATA_DIR=/data NODE_ENV=production
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"
CMD ["node", "--experimental-strip-types", "packages/api/src/server.ts"]
```

## Domain Setup
- Marketing: kira.ai (or subdomain) → Cloudflare Pages
- Platform: app.kira.ai → Cloudflare Tunnel → Docker :3001
- API: served from same Docker container as platform (api.kira.ai optional, can be same origin)

## Backup
- Cron job: daily `tar` of /data volume
- Offsite: rsync to backup server or S3

## Monitoring
- Docker healthcheck
- Uptime monitoring (UptimeRobot or similar)
- Error logging to stdout (Docker captures)
