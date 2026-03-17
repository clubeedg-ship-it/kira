# Production Deployment Guide

## Architecture

```
                  ┌─────────────┐
  Browser ──────> │   Nginx     │ :443
                  │  (TLS/SSL)  │
                  └──────┬──────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
       /api/* │   /* static  │   /ghost/*
              │          │          │
         ┌────▼───┐ ┌───▼────┐ ┌──▼─────┐
         │ Express│ │ Vite   │ │ Ghost  │
         │  :4000 │ │ build  │ │ :2368  │
         └────────┘ └────────┘ └────────┘
              │
         ┌────▼───┐
         │Postgres│
         │ :5432  │
         └────────┘
```

## Prerequisites

- Node.js 20+ (LTS)
- PostgreSQL 16+
- Docker + Docker Compose (recommended)
- Domain with DNS pointing to server
- SSL certificate (Let's Encrypt recommended)

## Environment Variables

Copy `.env.example` and fill in production values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ENCRYPTION_MASTER_KEY` | Yes | Min 32 characters. Generate: `openssl rand -base64 48` |
| `PORT` | No | API server port (default: 4000) |
| `NODE_ENV` | Yes | Set to `production` |

**ENCRYPTION_MASTER_KEY:** This key encrypts all secrets (SFTP passwords, API keys, etc). Back it up securely. Losing it means losing access to all encrypted secrets. Rotating requires re-encrypting all secrets.

## Deployment Steps

### 1. Database

```bash
# Using Docker Compose (included)
docker compose up -d db

# Or connect to existing PostgreSQL
export DATABASE_URL="postgresql://user:pass@host:5432/client_ops?schema=public"
```

### 2. Run Migrations

```bash
npx prisma migrate deploy
```

### 3. Build

```bash
# Backend (TypeScript check)
npm run build

# Frontend
npm run build:client
```

### 4. Seed (first deploy only)

```bash
npm run seed
```

### 5. Start

```bash
# Production
NODE_ENV=production node dist/server/index.js

# Or with PM2
pm2 start dist/server/index.js --name client-ops-api
```

### 6. Serve Frontend

Option A — Express serves static files (add to server):
```typescript
app.use(express.static('dist/client'));
app.get('*', (req, res) => res.sendFile('index.html', { root: 'dist/client' }));
```

Option B — Nginx (recommended for production):
```nginx
server {
    listen 443 ssl http2;
    server_name ops.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/ops.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ops.yourdomain.com/privkey.pem;

    root /var/www/client-ops/dist/client;

    location /orgs {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:4000;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Docker Compose (Full Stack)

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: client_ops
      POSTGRES_USER: client_ops
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U client_ops"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build: .
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://client_ops:${DB_PASSWORD}@db:5432/client_ops
      ENCRYPTION_MASTER_KEY: ${ENCRYPTION_MASTER_KEY}
      NODE_ENV: production
      PORT: 4000
    ports:
      - "4000:4000"

volumes:
  pgdata:
```

## Security Checklist

- [ ] `ENCRYPTION_MASTER_KEY` is stored in a secrets manager, not in repo
- [ ] Database password is unique and strong (min 32 chars)
- [ ] API is not exposed directly — sits behind reverse proxy with TLS
- [ ] `X-User-Id` header authentication replaced with proper auth (JWT/session)
- [ ] Rate limiting configured on Nginx or Express
- [ ] CORS configured for production domain only
- [ ] PostgreSQL only accepts connections from API server
- [ ] Backups scheduled for database (pg_dump or WAL archiving)
- [ ] `ENCRYPTION_MASTER_KEY` backed up separately from database backup
- [ ] File upload paths validated and sandboxed (if added later)

## Authentication Migration

The current `X-User-Id` header is a development placeholder. For production:

1. Integrate your identity provider (Auth0, Clerk, Supabase Auth, custom JWT)
2. Replace the auth middleware in `src/server/middleware/auth.ts`
3. Map the identity provider's user ID to the platform's user records
4. Remove the `X-User-Id` header acceptance

The middleware interface is already isolated — only one file to change.

## Monitoring

### Health Check
```bash
curl http://localhost:4000/health
# Returns: { "status": "ok" }
```

### PM2
```bash
pm2 monit
pm2 logs client-ops-api
```

### Database
```bash
# Connection count
psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='client_ops';"

# Table sizes
psql -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;"
```

## Backup Strategy

### Database
```bash
# Daily backup
pg_dump -Fc client_ops > backup_$(date +%Y%m%d).dump

# Restore
pg_restore -d client_ops backup_20260313.dump
```

### Encryption Key
Store `ENCRYPTION_MASTER_KEY` in:
- Hardware security module (enterprise)
- Cloud secrets manager (AWS Secrets Manager, GCP Secret Manager)
- Encrypted password manager (minimum)

Never store in the same location as database backups.

## Scaling Notes

- **Horizontal API scaling:** Stateless — run multiple instances behind load balancer
- **Database:** Single Postgres is good to ~100K orgs. Beyond that: read replicas, connection pooling (PgBouncer)
- **File storage:** When adding file uploads, use S3-compatible storage, not local disk
- **Caching:** Add Redis for session cache and rate limiting when needed
