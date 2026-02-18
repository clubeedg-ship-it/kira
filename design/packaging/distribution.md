# Distribution

## Installation Methods

### 1. npx create-kira (Recommended)

The fastest way for developers. Zero pre-install.

**Prerequisites:** Node.js 20+, npm

**Install:**
```bash
npx create-kira my-kira
cd my-kira
kira start
```

**What `create-kira` does:**
1. Scaffolds project directory with default config
2. Installs `@kira/core`, `@kira/dashboard`, `@kira/cli` as dependencies
3. Creates `kira.config.ts` with sensible defaults
4. Initializes SQLite databases
5. Prompts for API key (or skip for local-only mode)
6. Opens browser to `http://localhost:3001` for setup wizard

**First run:**
- Setup wizard: configure name, API keys, channels (Telegram, Discord, etc.)
- Creates initial memory files
- Starts all services

**Update:**
```bash
cd my-kira
npx kira update          # Updates all @kira/* packages
# or
npm update               # Standard npm update
```

**Pros:** Familiar to JS devs, customizable, easy to extend
**Cons:** Requires Node.js, command-line comfort

---

### 2. Docker Container

One command, everything included. No Node.js needed.

**Prerequisites:** Docker (or Podman)

**Install:**
```bash
docker run -d \
  --name kira \
  -p 3001:3001 \
  -v kira-data:/data \
  -e OPENROUTER_API_KEY=sk-... \
  ghcr.io/kira-ai/kira:latest
```

**First run:**
- Open `http://localhost:3001` for setup wizard
- All data persisted in `kira-data` volume

**Update:**
```bash
docker pull ghcr.io/kira-ai/kira:latest
docker restart kira
```

**With docker-compose** (see [docker.md](./docker.md)):
```bash
curl -O https://raw.githubusercontent.com/kira-ai/kira/main/docker-compose.yml
docker compose up -d
```

**Pros:** Works anywhere Docker runs, isolated, reproducible
**Cons:** Docker knowledge helpful, slightly more resource usage

---

### 3. Pre-built Desktop App (Tauri)

Native app for non-technical users. Download, install, done.

**Prerequisites:** None

**Platforms:** macOS (Intel + Apple Silicon), Windows 10+, Linux (AppImage)

**Install:**
- macOS: Download `.dmg` from releases, drag to Applications
- Windows: Download `.msi` installer, run
- Linux: Download `.AppImage`, `chmod +x`, run

**What's inside:**
- Embedded Node.js runtime (via Tauri sidecar)
- All Kira services bundled
- SQLite databases in app data directory
- System tray icon with status

**First run:**
- App opens setup wizard
- Runs as background service (system tray)
- Dashboard accessible via app window or browser

**Update:**
- Built-in auto-updater (Tauri's updater plugin)
- Checks for updates on startup and daily
- One-click update from system tray

**Pros:** No technical knowledge needed, native feel, auto-updates
**Cons:** Larger download (~100MB), platform-specific builds

---

### 4. Cloud-Hosted (Future — Post v1.0)

Managed SaaS. No installation at all.

**Prerequisites:** Web browser

**Install:**
```
1. Go to https://kira.ai
2. Sign up
3. Done
```

**Features:**
- Fully managed infrastructure
- Automatic updates
- Built-in API keys (Kira Pro plan)
- Multi-device sync
- Backup and restore

**Pricing:** See [pricing-model.md](../cost/pricing-model.md)

**Pros:** Zero maintenance, always up to date
**Cons:** Monthly cost, data on our servers, less customizable

---

## Comparison Matrix

| Feature | npx | Docker | Desktop | Cloud |
|---------|-----|--------|---------|-------|
| Technical skill needed | Medium | Low-Medium | None | None |
| Customizable | ✅ Full | ✅ Via config | ⚠️ Limited | ⚠️ Limited |
| Offline capable | ✅ | ✅ | ✅ | ❌ |
| Auto-updates | Manual | Manual | ✅ | ✅ |
| Data location | Local | Local (volume) | Local | Cloud |
| Resource overhead | Low | Medium | Low | None (server) |
| v1.0 target | ✅ | ✅ | ✅ | ❌ Post-launch |
