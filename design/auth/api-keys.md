# API Key Management

> **Goal:** Securely store, validate, track, and rotate provider API keys. Keys are never exposed in logs, responses, or errors.

---

## Supported Providers

### API Key Providers

| Provider | Key Format | Validation Endpoint |
|----------|-----------|-------------------|
| Anthropic | `sk-ant-api03-...` | `POST /v1/messages` |
| OpenRouter | `sk-or-v1-...` | `POST /api/v1/chat/completions` |
| OpenAI | `sk-...` | `GET /v1/models` |
| Ollama (local) | None (URL only) | `GET /api/tags` |

### Subscription-Based Providers (OAuth)

Like OpenClaw, Kira supports connecting to **paid subscriptions** via OAuth — no API key needed. This is critical because many users have Claude Max ($100/mo) or ChatGPT Plus ($20/mo) and want to use their existing subscription rather than pay per-token.

| Provider | Auth Method | What It Unlocks |
|----------|-----------|-----------------|
| Anthropic (Claude Max) | OAuth via `claude.ai` | All Claude models, included in subscription, no per-token cost |
| OpenAI (ChatGPT Plus/Pro) | OAuth via `chat.openai.com` | GPT-4o, o1, o3, included in subscription |

**OAuth Flow:**
1. User clicks "Connect Claude Max" or "Connect ChatGPT Plus" in Settings
2. Browser opens provider's OAuth consent screen
3. User approves → redirect back to Kira with auth token
4. Token stored encrypted (same AES-256-GCM as API keys)
5. Kira uses token for API calls — no per-token billing
6. Token refresh handled automatically (silent re-auth)
7. If subscription expires → graceful fallback to API key or local models

**Why this matters:**
- Claude Max = unlimited* Opus usage for $100/mo (vs ~$15/M tokens via API)
- ChatGPT Plus = GPT-4o for $20/mo
- Users get 10-100x more value from subscriptions than API keys for heavy usage
- Kira should support BOTH: subscription for power users, API keys for developers, local models for privacy

**Subscription detection:**
- On first run, setup wizard asks: "Do you have a Claude Max or ChatGPT Plus subscription?"
- If yes → OAuth flow (fastest onboarding, no key management)
- If no → API key entry
- Can add both: subscription as primary, API key as fallback

---

## Secure Storage

### Encryption

- **Algorithm:** AES-256-GCM
- **Key derivation:** Per-user encryption key derived from master key + user_id via HKDF
- **Master key:** Environment variable, never stored in database or files
- **At rest:** All API keys encrypted before writing to database
- **In memory:** Decrypted only when making API calls, zeroed after use
- **In transit:** TLS 1.3 only

### Storage Schema

> **v1.0: SQLite. Migration path to PostgreSQL documented in cost/scalability.md**

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,              -- UUID v4 as text
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,           -- 'anthropic', 'openrouter', 'openai', 'ollama'
  encrypted_key BLOB NOT NULL,      -- AES-256-GCM encrypted
  iv BLOB NOT NULL,                 -- initialization vector
  key_prefix TEXT NOT NULL,         -- first 8 chars for display (e.g., "sk-ant-a...")
  is_valid INTEGER DEFAULT 1,       -- 0 = false, 1 = true
  last_validated_at TEXT,           -- ISO 8601
  last_used_at TEXT,                -- ISO 8601
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(user_id, provider)
);
```

### What's Never Stored/Logged
- Full API key in plaintext (anywhere)
- API key in application logs
- API key in error messages or stack traces
- API key in API responses
- API key in browser localStorage (only session reference)

---

## Key Validation

### On Entry (Setup / Settings)

1. User pastes key
2. Client-side format check (regex pattern per provider)
3. Server-side validation:
   - Encrypt key immediately in memory
   - Make minimal API call to provider
   - Check response: valid credentials, active account, sufficient permissions
4. Return result to user (never echo the key back)

### Validation Responses

| Result | User Sees | Action |
|--------|-----------|--------|
| Valid | ✅ "Connected! Model: Claude Sonnet 4" | Store encrypted key |
| Invalid format | ❌ "That doesn't look right. Anthropic keys start with `sk-ant-`" | Don't store |
| Invalid credentials | ❌ "This key was rejected. It may be expired or revoked." | Don't store |
| Insufficient funds | ⚠️ "Key works but account has no credits. Add credits to use." | Store, flag |
| Rate limited | ✅ "Key works (currently rate-limited, that's normal)" | Store |
| Network error | ⚠️ "Couldn't reach [provider]. Key saved — we'll validate when connection returns." | Store, flag for re-validation |

### Periodic Re-Validation

- Every 24 hours: background validation of all stored keys
- On failure: mark `is_valid = false`, notify user on next interaction
- 3 consecutive failures: alert user proactively

---

## Usage Tracking

### Per-Key Metrics

```sql
CREATE TABLE key_usage (
  id TEXT PRIMARY KEY,              -- UUID v4 as text
  key_id TEXT REFERENCES api_keys(id),
  user_id TEXT REFERENCES users(id),
  timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd REAL,                    -- estimated cost
  latency_ms INTEGER,
  success INTEGER DEFAULT 1         -- 0 = false, 1 = true
);

-- Aggregated daily view
CREATE TABLE key_usage_daily (
  key_id TEXT REFERENCES api_keys(id),
  user_id TEXT REFERENCES users(id),
  date TEXT NOT NULL,               -- YYYY-MM-DD
  total_input_tokens INTEGER,
  total_output_tokens INTEGER,
  total_cost_usd REAL,
  total_requests INTEGER,
  failed_requests INTEGER,
  PRIMARY KEY (key_id, date)
);
```

### Cost Estimation

Pricing table (updated periodically):

```json
{
  "anthropic": {
    "claude-sonnet-4-20250514": { "input": 3.0, "output": 15.0 },
    "claude-opus-4-20250514": { "input": 15.0, "output": 75.0 },
    "claude-haiku-3-20250307": { "input": 0.25, "output": 1.25 }
  },
  "openrouter": {
    "varies": "fetched from OpenRouter API"
  }
}
```
*Prices per 1M tokens in USD*

### User Dashboard

```
┌─────────────────────────────────────────┐
│ API Usage — This Month                  │
│                                         │
│ Anthropic (sk-ant-a...)                 │
│ ████████████░░░░░░░░ 62% of budget     │
│ 1.2M input tokens · 340K output tokens  │
│ Estimated cost: $4.82                   │
│                                         │
│ OpenRouter (sk-or-v...)                 │
│ ███░░░░░░░░░░░░░░░░░ 15% of budget    │
│ 890K input tokens · 210K output tokens  │
│ Estimated cost: $0.43                   │
│                                         │
│ [Set budget alert: $__/month]           │
└─────────────────────────────────────────┘
```

### Budget Alerts

- User sets monthly budget per provider
- At 50%, 80%, 100%: notification via active channel
- At 100%: optionally pause agent (configurable: pause / warn / ignore)

---

## Key Rotation

### Process

1. User goes to Settings > API Keys > [Provider] > "Update Key"
2. Pastes new key
3. System validates new key
4. On success: atomically replaces encrypted key in database
5. Old key is overwritten (not kept)
6. Active agent sessions pick up new key on next API call (no restart needed)

### Zero-Downtime Rotation

```
1. New key validated ✓
2. Write new encrypted key to DB
3. Set flag: key_version incremented
4. Agent checks key_version before each API call
5. If version changed: reload key from DB
6. Old key never used again
```

### Emergency Revocation

If user suspects key compromise:
1. Settings > API Keys > "Revoke All" (red button)
2. All stored keys deleted immediately
3. Agent paused
4. User prompted to add new keys
5. Audit log entry created

---

## Multi-Provider Routing

### Configuration

Users can configure which provider handles which task:

```json
{
  "routing": {
    "main_conversation": "anthropic:claude-sonnet-4-20250514",
    "sub_agents": "openrouter:qwen/qwen3-14b",
    "embeddings": "openai:text-embedding-3-small",
    "local_fallback": "ollama:llama3.2"
  }
}
```

### Fallback Chain

If primary provider fails:
1. Retry once (network glitch)
2. Try secondary provider (if configured)
3. Try local model (if Ollama configured)
4. Queue message and notify user: "I'm having trouble reaching my AI brain. I'll retry shortly."

### Ollama (Local)

- No API key required — just a URL (default: `http://localhost:11434`)
- Validation: `GET /api/tags` to list available models
- Use cases: offline operation, privacy-sensitive tasks, development
- Limitation: generally lower quality than cloud models
