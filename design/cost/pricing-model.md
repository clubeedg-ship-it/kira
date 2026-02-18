# Pricing Model

## Cost Analysis Per User

### API Token Costs (Primary Cost Driver)

Based on typical daily usage patterns:

| Activity | Model | Tokens/Day | Cost/Day |
|----------|-------|-----------|----------|
| Main conversation (20 exchanges) | Claude Opus | ~100K in + 30K out | ~$0.90 |
| Sub-agent tasks (5/day) | Claude Sonnet | ~50K in + 20K out | ~$0.12 |
| Widget generation (10/day) | Haiku / local | ~20K in + 10K out | ~$0.02 |
| Memory summarization | Local (Qwen) | ~30K | $0.00 |
| Embeddings | Local (nomic) | ~10K | $0.00 |
| **Daily total** | | | **~$1.04** |
| **Monthly total** | | | **~$31** |

Light user (~5 exchanges/day): **~$8/month**
Heavy user (~50 exchanges/day): **~$75/month**

### Compute & Storage (Negligible for Self-Hosted)

| Resource | Cost | Notes |
|----------|------|-------|
| Compute | $0 | Runs on user's machine |
| Storage | $0 | Local SQLite, ~100MB/year |
| Local models | $0 | User's hardware |
| Bandwidth | ~$0 | API calls only, minimal data |

---

## Pricing Tiers

### Free (BYOK — Bring Your Own Key)

Kira is **free and open source**. Users provide their own API keys.

- ✅ All core features
- ✅ All channels (Telegram, Discord, etc.)
- ✅ All widgets and dashboard
- ✅ Sub-agents and automation
- ✅ Local model support
- ✅ Community support (GitHub, Discord)
- ❌ No managed API keys
- ❌ No cloud hosting
- ❌ No premium integrations

**User pays:** Their own API costs (~$8–75/month depending on usage)

### Kira Pro ($12/month)

For users who don't want to manage API keys or self-host.

- ✅ Everything in Free
- ✅ **Managed API keys** — no setup, just chat
- ✅ **$10/month token allowance** included (~10K messages)
- ✅ Priority model access (no rate limits)
- ✅ Cloud backup & sync
- ✅ Premium integrations (Google Calendar, Notion, etc.)
- ✅ Email support
- ⚠️ Overage: $0.001 per additional 1K tokens

### Kira Team ($25/user/month) — Future

For small teams sharing a Kira instance.

- ✅ Everything in Pro
- ✅ Multi-user support
- ✅ Shared knowledge base
- ✅ Role-based access
- ✅ Admin dashboard
- ✅ SSO integration
- ✅ Priority support

---

## Feature Matrix

| Feature | Free (BYOK) | Pro | Team |
|---------|:-----------:|:---:|:----:|
| Core AI assistant | ✅ | ✅ | ✅ |
| All channels | ✅ | ✅ | ✅ |
| Dashboard & widgets | ✅ | ✅ | ✅ |
| Sub-agents | ✅ | ✅ | ✅ |
| Local models | ✅ | ✅ | ✅ |
| Managed API keys | ❌ | ✅ | ✅ |
| Included tokens | ❌ | $10/mo | $15/user/mo |
| Cloud backup | ❌ | ✅ | ✅ |
| Premium integrations | ❌ | ✅ | ✅ |
| Multi-user | ❌ | ❌ | ✅ |
| SSO | ❌ | ❌ | ✅ |
| Support | Community | Email | Priority |

---

## Cost Optimization Strategies

### 1. Smart Model Routing

Use cheaper models for tasks that don't need the best. See [model-routing.md](./model-routing.md).

**Savings:** 50–70% vs using Opus for everything.

### 2. Response Caching

Cache identical or near-identical queries:
- Exact match cache for repeated questions (weather, time, etc.)
- Semantic cache for similar questions (embedding similarity >0.95)
- Widget data cache (refresh intervals, not on every view)

**Savings:** 10–20% of API calls.

### 3. Prompt Compression

- Trim conversation history aggressively (summarize old messages)
- Use system prompt caching (Anthropic's prompt caching)
- Minimize tool definitions sent (only include relevant tools)

**Savings:** 30–40% on input tokens.

### 4. Batch Operations

- Group sub-agent tasks when possible
- Batch embedding generation
- Batch notification checks (calendar + email + weather in one call)

### 5. Local Model Offloading

Route low-stakes tasks to local models:
- Memory summarization → Qwen 14B
- Embeddings → nomic-embed
- Classification/routing → small local model
- Widget data formatting → template engine (no LLM needed)

**Savings:** 15–25% of total API costs.
