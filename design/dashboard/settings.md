# Settings UI Design

**Version:** 1.0  
**Date:** February 11, 2026  
**Status:** Design

---

## Layout

Left sidebar with section navigation. Right pane shows the active section. Full-width on mobile (sidebar becomes top tabs).

```
┌─────────┬──────────────────────────────────────┐
│ ⚙️ Settings                                     │
├─────────┼──────────────────────────────────────┤
│         │                                      │
│ General │  [Active section content]            │
│ Connect │                                      │
│ Models  │                                      │
│ Channel │                                      │
│ Autonomy│                                      │
│ Memory  │                                      │
│ Appear. │                                      │
│ Gamific.│                                      │
│ About   │                                      │
│         │                                      │
└─────────┴──────────────────────────────────────┘
```

All sections auto-save on change with a subtle toast confirmation. Dangerous actions (reset, delete) require confirmation modal.

---

## 1. General

**Layout:** Vertical form, avatar preview on the right.

| Component | Type | Description |
|-----------|------|-------------|
| Agent Name | Text input | Default "Kira". Max 32 chars |
| Personality | Textarea | Freeform personality description |
| Avatar | Image upload + preview | Circle crop, 256×256. Drag-drop or click |
| Emoji | Emoji picker | Single emoji used as agent icon in chat |

**Data source:** `GET /api/settings` → `data.general`  
**Save:** `PATCH /api/settings` with `{ general: {...} }`

---

## 2. Connections

**Layout:** Card grid (2 columns). Each provider is a card with status indicator.

### Provider Cards

| Provider | Fields | Status States |
|----------|--------|---------------|
| **Anthropic** | API key (masked input) OR OAuth (Claude Max) | 🟢 Connected / 🔴 Not configured / 🟡 Rate limited |
| **OpenRouter** | API key (masked) | 🟢 / 🔴 |
| **OpenAI** | API key (masked) OR OAuth (ChatGPT Plus) | 🟢 / 🔴 |
| **Ollama** | URL input (default `localhost:11434`), auto-detect button | 🟢 Running / 🔴 Not found / 🟡 Connecting |

**Card layout:**
```
┌──────────────────────────────┐
│ 🟢 Anthropic                 │
│ Type: Claude Max (subscription)│
│ Plan: Max ($100/mo)          │
│ Rate: 842/1000 msgs today    │
│                              │
│ [Disconnect]  [Test]         │
└──────────────────────────────┘
```

**Interactions:**
- "Test" button sends a health-check request to the provider
- API keys shown masked (`sk-ant-•••••••abc`), click to reveal temporarily
- OAuth providers open a popup for the OAuth flow
- Ollama auto-detect scans localhost and common Docker ports

**Data source:** `GET /api/settings` → `data.connections`

---

## 3. Models

**Layout:** Three sections stacked vertically.

### 3.1 Per-Task Model Assignment

Table with role → model dropdown.

```
┌─────────────────────────────────────────────────┐
│ Agent/Task            Model              Source  │
│─────────────────────────────────────────────────│
│ 💬 Main chat          [Claude Opus ▾]    Max    │
│ 🤖 Sub: research      [Claude Sonnet ▾]  OR     │
│ 🤖 Sub: coding        [Claude Sonnet ▾]  OR     │
│ 🎨 Widget generation   [Gemini Flash ▾]   OR     │
│ 🧠 Memory summarize   [Qwen 14B ▾]       Local  │
│ 📐 Embeddings         [nomic-embed ▾]    Local  │
│ 🔀 Classification     [Qwen 7B ▾]        Local  │
└─────────────────────────────────────────────────┘
```

Each dropdown shows models from connected providers, grouped by provider. "Source" column auto-updates.

### 3.2 Local Model Catalog

Browse and manage Ollama models.

```
┌─────────────────────────────────────────────────┐
│ Local Models                        [Pull New ▾]│
│─────────────────────────────────────────────────│
│ ✅ qwen3:14b       8.5 GB    Loaded  [Unload]  │
│ ✅ nomic-embed     274 MB    Idle    [Load]     │
│ ○  llama3:8b       4.7 GB    —       [Pull]     │
│                                                 │
│ Pull: [model name         ] [Download]          │
│ ████████████░░░░░░░ 65% — 2.8 GB / 4.3 GB      │
└─────────────────────────────────────────────────┘
```

Pull progress shown inline with progress bar (SSE from `POST /api/settings/ollama/pull`).

### 3.3 GPU Info

```
┌─────────────────────────────────────────────────┐
│ 🖥️ GPU: NVIDIA RTX 4090                         │
│ VRAM: 10 GB / 24 GB used                       │
│ ████████████░░░░░░░░░░░░ 42%                    │
│ Loaded: qwen3:14b (10 GB)                       │
└─────────────────────────────────────────────────┘
```

**Data source:** `GET /api/settings/models`

---

## 4. Channels

**Layout:** Card list, one per channel.

| Channel | Config Fields | Status |
|---------|--------------|--------|
| **Telegram** | Bot token, webhook URL (auto-configured) | 🟢 Active / Messages today: 42 |
| **Discord** | Bot token, guild ID, channel IDs | 🟢 / 🔴 |
| **Signal** | Phone number, signal-cli path | 🟢 / 🔴 |
| **WhatsApp** | QR code pairing (via whatsapp-web.js) | 🟢 / 🔴 / 🟡 Scan QR |

**Card layout:**
```
┌──────────────────────────────┐
│ 🟢 Telegram                  │
│ Bot: @kira_assistant_bot     │
│ Messages today: 42           │
│ Last active: 2 min ago       │
│                              │
│ [Configure]  [Disable]       │
└──────────────────────────────┘
```

**Interactions:**
- Configure opens inline expansion with fields
- WhatsApp shows QR code for initial pairing
- Each channel has enable/disable toggle
- "Test" sends a ping message to the channel

**Data source:** `GET /api/settings` → `data.channels`

---

## 5. Autonomy

**Layout:** Three-tier permission board (GREEN / YELLOW / RED).

```
┌─────────────────────────────────────────────────┐
│ 🟢 GREEN — Always allowed (no confirmation)     │
│ ┌─────────────────────────────────────────────┐ │
│ │ ☑ Read files  ☑ Web search  ☑ Memory ops   │ │
│ │ ☑ Git status  ☑ Calendar read  ☑ Weather   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 🟡 YELLOW — Ask before executing                │
│ ┌─────────────────────────────────────────────┐ │
│ │ ☑ Shell commands  ☑ Send messages           │ │
│ │ ☑ Git push  ☑ File writes  ☑ API calls     │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 🔴 RED — Blocked (never auto-execute)           │
│ ┌─────────────────────────────────────────────┐ │
│ │ ☑ Delete files  ☑ Send emails               │ │
│ │ ☑ Financial transactions  ☑ System admin    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Drag actions between tiers to reconfigure.      │
└─────────────────────────────────────────────────┘
```

**Interactions:**
- Drag-and-drop actions between tiers
- Custom action input to add new permission categories
- Preset buttons: "Cautious" (most things yellow), "Autonomous" (most green), "Locked" (most red)

**Data source:** `GET /api/settings` → `data.autonomy`

---

## 6. Memory

**Layout:** Stats cards at top, controls below.

### Stats
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Entities │ │ Facts    │ │ DB Size  │ │ Retention│
│   142    │ │   891    │ │  12 MB   │ │  90 days │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Controls

| Component | Type | Description |
|-----------|------|-------------|
| Retention period | Number input + unit (days) | How long to keep daily memory files |
| Auto-backup | Toggle | Auto-backup graph.db daily |
| Backup now | Button | Manual backup → downloads .db file |
| Restore | File upload | Upload a graph.db to restore |
| Clear memory | Danger button | Wipe all facts/entities (confirmation required) |
| Knowledge graph | Mini visualization | Interactive force-directed graph preview (click to open full view) |

**Data source:** `GET /api/settings` → `data.memory`, `GET /api/metrics` → `data.memory`

---

## 7. Appearance

**Layout:** Preview pane on right, controls on left.

| Component | Type | Description |
|-----------|------|-------------|
| Theme | Toggle: Light / Dark / System | Immediate preview |
| Accent color | Color picker | Primary accent color |
| Font size | Slider (12–20px) | Chat text size |
| Code font | Dropdown | Monospace font for code blocks |
| Notification sound | Toggle + sound picker | Enable/disable, choose sound |
| Desktop notifications | Toggle | Browser notification permission |
| Compact mode | Toggle | Reduce spacing in chat |

**Data source:** `GET /api/settings` → `data.appearance`

---

## 8. Gamification

**Layout:** Simple toggle list with descriptions.

| Component | Type | Description |
|-----------|------|-------------|
| Show XP | Toggle | Display XP bar and level in sidebar |
| Streaks | Toggle | Track daily interaction streaks |
| Achievement popups | Toggle | Show toast when achievement unlocked |
| Achievement sound | Toggle | Play sound with achievement |
| Leaderboard | Toggle | Show weekly productivity leaderboard |
| XP multiplier display | Toggle | Show active multipliers |

**Preview:** Shows a mock achievement toast and XP bar so user knows what they're toggling.

**Data source:** `GET /api/settings` → `data.gamification`

---

## 9. About

**Layout:** Info cards, read-only.

```
┌─────────────────────────────────────────────────┐
│ ⚡ Kira v0.1.0                                   │
│                                                 │
│ OpenClaw:  1.2.0                                │
│ Node.js:   v25.6.0                              │
│ OS:        Linux 6.8.0-94-generic (x64)         │
│ Ollama:    0.6.2                                │
│ GPU:       NVIDIA RTX 4090 (24GB)               │
│                                                 │
│ [Check for Updates]  [View Changelog]           │
│                                                 │
│ License: MIT                                    │
│ GitHub: github.com/ottomated/kira               │
└─────────────────────────────────────────────────┘
```

**Interactions:**
- "Check for Updates" → calls `GET /api/system/info` and compares with GitHub releases
- "View Changelog" → opens modal with CHANGELOG.md rendered as markdown

**Data source:** `GET /api/system/info`
