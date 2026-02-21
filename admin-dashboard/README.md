# Kira Admin Dashboard

Command center for monitoring all of Kira's operations.

## Setup

```bash
npm install
cp .env.example .env  # edit ADMIN_TOKEN
pm2 start ecosystem.config.js
```

## Access

- URL: http://localhost:3880
- Auth: token from .env

## Tabs

- **Overview** — stat cards, agent fleet, recent outputs
- **Agents** — all agents with status, manual trigger
- **Outputs** — agent outputs with filters
- **Documents** — VDR file browser
- **Services** — PM2, Docker, system health (auto-refresh 30s)
- **Sessions** — OpenClaw agent sessions
