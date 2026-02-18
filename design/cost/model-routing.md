# Model Routing

## Provider Modes

Kira supports three provider modes, and routing adapts to each:

### Mode 1: Subscription (Claude Max / ChatGPT Plus)
- **Main agent:** Uses subscription (Opus/GPT-4o) — effectively unlimited
- **Sub-agents:** Also use subscription if within rate limits, otherwise fall back to OpenRouter/API key
- **Cost:** Fixed monthly ($20-$100), no per-token concern
- **Routing strategy:** Use the best model for everything; only fall back to cheaper models if rate-limited

### Mode 2: API Keys (BYOK)
- **Main agent:** Use configured model, watch token spend
- **Sub-agents:** Use cheaper models by default
- **Cost:** Per-token, budget-sensitive
- **Routing strategy:** Smart routing based on task complexity and budget

### Mode 3: Hybrid (Subscription + API Keys + Local)
- **Main agent:** Subscription (best quality, no cost)
- **Sub-agents:** OpenRouter API key (cheaper models, parallel execution)
- **Memory/embeddings:** Local models (zero cost)
- **Cost:** Optimized — subscription for quality, API for scale, local for background
- **This is the recommended setup**

## Per-Agent Model Configuration (UI)

Users can configure model assignments from Settings > Models:

```
┌─────────────────────────────────────────────────┐
│ ⚙️ Model Configuration                          │
│                                                 │
│ Provider Connections:                           │
│ ✅ Claude Max (subscription)    [Manage]        │
│ ✅ OpenRouter (API key)         [Manage]        │
│ ✅ Ollama (local)               [Manage]        │
│ ○  OpenAI (not connected)       [Connect]       │
│                                                 │
│ ─────────────────────────────────────────────── │
│                                                 │
│ Agent/Task          Model              Override │
│ ─────────────────────────────────────────────── │
│ 💬 Main chat        Claude Opus (Max)  [edit]   │
│ 🤖 Sub: research    Claude Sonnet (OR) [edit]   │
│ 🤖 Sub: coding      Claude Sonnet (OR) [edit]   │
│ 🎨 Widget gen       Haiku (OR)         [edit]   │
│ 🧠 Memory summary   Qwen 14B (local)   [edit]   │
│ 📐 Embeddings       nomic-embed (local) [edit]   │
│ 🔀 Classification   Qwen 7B (local)    [edit]   │
│                                                 │
│ [Reset to defaults]                             │
│                                                 │
│ 💰 Today's spend: $0.42 / $5.00 budget         │
│ ████████░░░░░░░░░░░░ 8.4%                      │
└─────────────────────────────────────────────────┘
```

Each row is independently configurable:
- Click [edit] → dropdown of available models from connected providers
- Subscription models marked as "included" (no per-token cost)
- API models show estimated cost per 1K tokens
- Local models marked as "free"
- User can set "Use best available" (auto-route) or pin specific models
- Changes take effect immediately, no restart needed

When spawning a sub-agent, users can also override per-spawn:
- "Run this with Opus" (one-time override)
- Agent can suggest: "This is complex research, want me to use Opus instead of Sonnet?"

---

## Routing Strategy

### Task-to-Model Mapping

| Task | Primary Model | Fallback | Rationale |
|------|--------------|----------|-----------|
| Main conversation | Claude Opus | Claude Sonnet | Best quality for direct interaction |
| Sub-agent: research | Claude Sonnet | Haiku | Good enough for search/summarize, 10x cheaper |
| Sub-agent: coding | Claude Sonnet | — | Needs reasoning ability |
| Widget generation | Haiku | Local (Qwen) | Structured output, speed matters |
| Memory summarization | Local (Qwen 14B) | Haiku | No API cost, runs in background |
| Embedding generation | Local (nomic-embed) | OpenAI ada-002 | No API cost, good quality |
| Classification/routing | Local (Qwen 7B) | Haiku | Simple task, speed matters |
| Tool argument extraction | Haiku | Sonnet | Structured, fast |
| Conversation title generation | Haiku | Local | Simple summarization |

### Cost Comparison

| Model | Input $/1M tokens | Output $/1M tokens | Relative Cost |
|-------|-------------------|---------------------|---------------|
| Claude Opus | $15.00 | $75.00 | 1x (baseline) |
| Claude Sonnet | $3.00 | $15.00 | 5x cheaper |
| Claude Haiku | $0.25 | $1.25 | 60x cheaper |
| Local (Qwen) | $0.00 | $0.00 | Free |
| Local (nomic-embed) | $0.00 | $0.00 | Free |

---

## Routing Rules Engine

### Configuration

```typescript
// kira.config.ts
export default {
  models: {
    routing: {
      // Task type → model configuration
      conversation: {
        model: 'anthropic/claude-opus-4-20250514',
        fallback: 'anthropic/claude-sonnet-4-20250514',
        maxTokens: 4096,
      },
      subagent_research: {
        model: 'anthropic/claude-sonnet-4-20250514',
        fallback: 'anthropic/claude-3-5-haiku-20241022',
        maxTokens: 2048,
      },
      widget: {
        model: 'anthropic/claude-3-5-haiku-20241022',
        fallback: 'local/qwen3:14b',
        maxTokens: 1024,
      },
      memory: {
        model: 'local/qwen3:14b',
        fallback: 'anthropic/claude-3-5-haiku-20241022',
        maxTokens: 2048,
      },
      embedding: {
        model: 'local/nomic-embed-text',
        fallback: 'openai/text-embedding-3-small',
      },
    },
    
    // User can override any task
    overrides: {
      // "I want Opus for everything" — user's choice
      // conversation: { model: 'anthropic/claude-opus-4-20250514' },
    },
    
    // Budget controls
    budget: {
      dailyLimit: 5.00,        // USD — stop API calls when exceeded
      warningAt: 3.00,          // Notify user
      downgradeAt: 4.00,        // Switch to cheaper models
    },
  },
};
```

### Router Implementation

```typescript
interface ModelRequest {
  task: TaskType;
  complexity?: 'low' | 'medium' | 'high';
  urgency?: 'background' | 'interactive';
  budgetRemaining?: number;
}

interface ModelSelection {
  model: string;
  maxTokens: number;
  reason: string;
}

function selectModel(request: ModelRequest): ModelSelection {
  const config = getRoutingConfig(request.task);
  
  // Budget-based downgrade
  if (request.budgetRemaining !== undefined && request.budgetRemaining < 1.0) {
    return {
      model: config.fallback || config.model,
      maxTokens: Math.min(config.maxTokens, 1024),
      reason: 'budget_low',
    };
  }
  
  // Complexity-based upgrade/downgrade
  if (request.complexity === 'low' && config.fallback) {
    return { model: config.fallback, maxTokens: config.maxTokens, reason: 'low_complexity' };
  }
  
  return { model: config.model, maxTokens: config.maxTokens, reason: 'default' };
}
```

---

## Fallback Chain

When a model is unavailable (down, rate limited, error):

```
Primary Model → Fallback Model → Emergency Model → Error

Example for conversation:
Claude Opus → Claude Sonnet → Local Qwen → "I'm having trouble connecting to AI services"
```

### Circuit Breaker

```typescript
class ModelCircuitBreaker {
  private failures: Map<string, { count: number; lastFailure: number }> = new Map();
  
  private readonly THRESHOLD = 3;         // failures before opening
  private readonly RESET_AFTER = 60_000;  // ms before trying again
  
  isAvailable(model: string): boolean {
    const state = this.failures.get(model);
    if (!state) return true;
    if (state.count < this.THRESHOLD) return true;
    if (Date.now() - state.lastFailure > this.RESET_AFTER) {
      this.failures.delete(model); // Half-open: try again
      return true;
    }
    return false; // Circuit open: skip this model
  }
  
  recordFailure(model: string): void { /* ... */ }
  recordSuccess(model: string): void { this.failures.delete(model); }
}
```

---

## Real-Time Cost Tracking

### Per-Request Cost Calculation

```typescript
// Pricing table (updated periodically from OpenRouter API)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'anthropic/claude-opus-4-20250514': { input: 15.0, output: 75.0 },
  'anthropic/claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'anthropic/claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0; // Local model
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}
```

### Dashboard Display

The cost tracker shows in the dashboard sidebar:

```
💰 Today: $1.24 / $5.00 budget
   ├── Conversation: $0.89 (72%)
   ├── Sub-agents: $0.28 (23%)
   ├── Widgets: $0.05 (4%)
   └── Other: $0.02 (1%)

📊 This month: $18.50
   vs last month: $22.10 (↓16%)
```

### In-Chat Cost Indicators

Optionally show per-message cost (user toggle):

> **You:** What's the weather forecast for this week?
> **Kira:** Here's the forecast... _(~$0.03 · 1.2K tokens · Opus)_

### Budget Alerts

```typescript
async function checkBudget(dailyCost: number, config: BudgetConfig): Promise<void> {
  if (dailyCost >= config.dailyLimit) {
    await notify('🛑 Daily budget reached ($' + dailyCost.toFixed(2) + '). Pausing API calls.');
    setModelOverride('all', 'local'); // Switch everything to local
  } else if (dailyCost >= config.downgradeAt) {
    await notify('⚠️ Approaching budget. Switching to cheaper models.');
    setModelOverride('conversation', 'sonnet');
    setModelOverride('subagent', 'haiku');
  } else if (dailyCost >= config.warningAt) {
    await notify('💡 Daily spend: $' + dailyCost.toFixed(2) + ' of $' + config.dailyLimit.toFixed(2));
  }
}
```
