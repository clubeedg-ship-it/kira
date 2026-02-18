# 06 — AI Provider Integration

---

## Provider Types

| Provider | API Format | Auth | Models |
|----------|-----------|------|--------|
| **OpenRouter** | OpenAI-compatible | API key | All models (Claude, GPT, Llama, etc.) |
| **Anthropic** | Anthropic Messages API | API key | Claude family |
| **OpenAI** | OpenAI Chat Completions | API key | GPT family |
| **Ollama** | Ollama API | None (local) | Any pulled model |

### Why OpenRouter First

- One key → access to everything (Anthropic, OpenAI, Meta, Google, etc.)
- Unified billing, unified API
- Simplest onboarding: user gets one key, picks any model
- Fallback routing: if one provider is down, OpenRouter routes to another

---

## Server-Side Default

The server has a default OpenRouter key (from env var). This is the fallback for:
- Users who haven't configured their own key yet
- Free tier users (subject to quotas)

```env
OPENROUTER_API_KEY=sk-or-v1-...
KIRA_DEFAULT_MODEL=anthropic/claude-sonnet-4
```

**This key is NEVER exposed to the frontend.** Users see "Server Default" as their provider, not the actual key.

---

## Per-User Provider Config

Users can add their own API keys in Settings. Stored encrypted in their personal `settings.db`.

### Encryption

- AES-256-GCM
- Key derived from: `scrypt(KIRA_ENCRYPTION_KEY + userId)` 
- `KIRA_ENCRYPTION_KEY` from env var
- Each key has unique IV, stored alongside ciphertext

### Provider Resolution Chain

```
1. User's own provider config (if set)
   → Check: anthropic, openai, openrouter, ollama (in order of user's preference)
2. Server default (OPENROUTER_API_KEY env var)
3. Local Ollama (if available)
4. Error: "No AI provider configured"
```

### Model Selection

Users can pick models in chat (dropdown in input bar) or set a default in Settings.

Available models depend on provider:
- OpenRouter: fetch from `GET https://openrouter.ai/api/v1/models`
- Anthropic: hardcoded list (Claude family)
- OpenAI: hardcoded list (GPT family)  
- Ollama: fetch from `GET http://localhost:11434/api/tags`

---

## Implementation

### Provider Interface

```typescript
interface LLMProvider {
  name: string;
  
  chat(messages: ChatMessage[], opts?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }): Promise<ChatResponse>;
  
  stream(messages: ChatMessage[], opts?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }): AsyncIterable<StreamChunk>;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

interface StreamChunk {
  type: 'text' | 'thinking' | 'tool_use' | 'done' | 'error';
  content?: string;
  model?: string;
  tokens?: { input: number; output: number };
}
```

### All Providers Use Pure Fetch

No SDKs. Every provider is a class with `chat()` and `stream()` methods that call `fetch()`.

```typescript
// OpenRouter and OpenAI share the same implementation
class OpenAICompatibleProvider implements LLMProvider {
  constructor(private apiKey: string, private baseUrl: string, private defaultModel: string) {}
  // ...
}

// Usage:
const openrouter = new OpenAICompatibleProvider(key, 'https://openrouter.ai/api', 'anthropic/claude-sonnet-4');
const openai = new OpenAICompatibleProvider(key, 'https://api.openai.com', 'gpt-4o');
```

---

## Usage Tracking

Every LLM call is logged:

```sql
INSERT INTO usage_log (id, user_id, model, provider, input_tokens, output_tokens, cost_usd, created_at)
```

Cost estimation based on known pricing per model. OpenRouter returns actual cost in response headers (`x-openrouter-cost`).

### Usage API

```
GET /api/usage?since=2026-02-01
→ { totalTokens, totalCost, byModel: {...}, byDay: [...] }

GET /api/usage/recent?limit=50  
→ [{ model, tokens, cost, timestamp }, ...]
```

### Quota Enforcement

Before each LLM call:
1. Check `messagesPerDay` quota → 429 if exceeded
2. Check `tokensPerMonth` quota → 429 if exceeded
3. Proceed with call
4. Log usage after response

---

## Rate Limiting

Per-user, per-endpoint, sliding window:

| Endpoint | Limit |
|----------|-------|
| POST /api/chat | 60/min (free), 120/min (pro) |
| POST /api/auth/login | 5/15min per email |
| All other API | 120/min |

Implementation: SQLite table `rate_limits` checked in middleware.
