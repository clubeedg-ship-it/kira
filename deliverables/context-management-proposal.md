# Context Management Audit & Solutions Proposal

**Date:** 2026-03-03  
**Author:** Kira (subagent audit)  
**Status:** Draft for review

---

## 1. Current State Assessment

### What Exists

We have a **three-layer memory system** spread across two codebases:

| Layer | Location | Purpose | Status |
|-------|----------|---------|--------|
| **Chimera Memory Manager** | `~/chimera/scripts/` | Context monitor → curator → retriever → sync pipeline | ⚠️ Partially working, references old `.clawdbot` paths |
| **Kira NLP Graph Layer** | `~/kira/scripts/memory/` | Entity/fact extraction, embeddings, graph sync, message proxy | ✅ Most complete, but bloated |
| **Context Summary** | `~/kira/scripts/context-summary.js` | Raw transcript dump for compaction recovery | ✅ Works, but crude |

**Total codebase:** 5,332 lines across 17 JS files in `~/kira/scripts/memory/` alone, plus 5 scripts in `~/chimera/scripts/`.

### What Works

- **NLP Graph Layer (nlp-graph-layer.js, 1365 lines):** Sophisticated — FTS5, BM25, RRF hybrid retrieval, embedding search, entity extraction via Ollama, voice post-processing, confidence decay. This is genuinely good infrastructure.
- **Graph Sync Daemon:** Extracts entities/facts from session logs automatically.
- **Message Proxy (port 3850):** Enriches context file with graph results.
- **Context Monitor:** Estimates token usage from session JSONL files, triggers curation at 50% threshold.
- **Embeddings:** 57,743 vectors via nomic-embed-text in unified.db.

### What's Broken or Problematic

1. **Massive DB bloat:** `unified.db` is **370MB** (+ 47MB WAL) with:
   - **44,080 entities** — dominated by 8,900 "concept" type (mostly noise)
   - **208,441 facts** — top predicates are generic garbage: `is` (8,655), `has` (6,673), `provides` (4,750), `contains` (4,032)
   - These generic facts provide almost zero retrieval value
   
2. **Stale retrieved context:** `~/kira/memory/retrieved-context.md` is only **520 bytes** and last updated **Feb 24**. `~/chimera/memory/retrieved-context.md` last updated **Feb 10**. The context injection pipeline is effectively dead.

3. **Two competing graph DBs:**
   - `~/chimera/memory/graph.db` (544KB, 635 entities, 1053 facts) — old, small
   - `~/kira/memory/unified.db` (370MB, 44K entities, 208K facts) — new, massive, noisy
   - Scripts reference different DBs inconsistently

4. **Path rot:** Chimera scripts reference `.clawdbot` paths; system now uses `.openclaw`. Memory daemon checkpoint points to `.clawdbot` sessions.

5. **Memory daemon stale:** Last run Feb 24, checkpoint references old session files.

6. **No active curation running:** The curator-agent.js exists but isn't triggered because the memory-manager pipeline has path issues.

### Estimated Token Waste Per Session

| Source | Est. Tokens | Notes |
|--------|-------------|-------|
| AGENTS.md (loaded every session) | ~4,000 | Includes memory instructions that could be trimmed |
| HEARTBEAT.md | ~1,500 | Loaded every heartbeat |
| MEMORY.md | ~2,000-5,000 | Loaded in main sessions |
| Daily memory files (today + yesterday) | ~2,000-4,000 | Variable |
| retrieved-context.md | ~150 | Tiny — should be larger and more useful |
| SOUL.md, USER.md | ~1,000-2,000 | Necessary but could compress |
| **System/workspace context injection** | **~10,000-15,000** | **The real cost — injected every turn** |
| Tool outputs (file reads, exec results) | ~5,000-50,000 | Highly variable, biggest spike source |

**Key insight:** The problem isn't the memory system consuming too many tokens. It's that:
1. The memory system **isn't working** (stale context, broken pipelines), so context can't be recovered after compaction
2. **Workspace context files** are loaded every session regardless of relevance
3. **Tool outputs** (especially file reads and command outputs) are the real context killers
4. **Rate limiting on Claude Max** means we burn through turns, not tokens — each turn that wastes context on stale/irrelevant data is a rate-limit hit

---

## 2. Root Causes

### RC1: No Active Memory Pipeline
The memory system exists but isn't running. Path changes (.clawdbot → .openclaw) broke the daemon. Nobody restarted it. So every session starts fresh with minimal context recovery.

### RC2: Indiscriminate Entity/Fact Extraction
The NLP extraction via Ollama produces massive quantities of low-quality triples. "ZenithCred IS corporate wellness platform" stored 50 different ways. Generic predicates (is/has/provides) dominate and provide no retrieval signal.

### RC3: No Context Budget Management
When the agent reads AGENTS.md + HEARTBEAT.md + MEMORY.md + daily files + SOUL.md + USER.md, that's 10-15K tokens before any conversation happens. There's no mechanism to say "for this task, I only need X context."

### RC4: Tool Output Explosion  
A single `exec` or `Read` call can inject 10-50K tokens. There's no summarization of tool outputs before they enter the context window. This is the #1 cause of hitting rate limits in practice.

### RC5: No Compaction Recovery
When OpenClaw compacts the session, all conversation context is lost. The context-summary.js exists but must be manually triggered. The curator pipeline is broken. So post-compaction, the agent is essentially amnesiac.

### RC6: Duplicate Infrastructure
Two graph databases, two sets of scripts, overlapping functionality between chimera and kira memory systems. Maintenance burden is doubled, and neither works reliably.

---

## 3. Solution Comparison

### ContextPlus
**What it is:** MCP server for codebase navigation — AST parsing, spectral clustering, semantic search over code symbols. **Not applicable** to our conversation memory problem. It's for code exploration, not agent memory management.

**Adoptable ideas:**
- Token-aware output formatting (context budget concept)
- Skeleton-first approach (get structure before full content)
- Embedding tracker for incremental updates

### Industry Solutions

| Solution | Approach | Strengths | Weaknesses | Fit for Us |
|----------|----------|-----------|------------|------------|
| **Mem0** | Hybrid memory (short/long/semantic), auto-extract from conversations | Production-ready, good extraction | Cloud-focused, requires API keys, adds latency | ⭐⭐⭐ Ideas adoptable |
| **MemGPT/Letta** | Virtual context management — LLM manages its own memory page-in/page-out | Elegant self-managing memory, persistence | Complex, designed for its own framework, heavy | ⭐⭐ Interesting model |
| **Zep** | Conversation memory with auto-summarization + knowledge graph | Built for chat, temporal awareness | Requires server deployment, Go-based | ⭐⭐⭐ Very relevant |
| **LangChain Memory** | Multiple memory types (buffer, summary, entity, knowledge graph) | Well-documented patterns | Python-centric, framework lock-in | ⭐⭐ Patterns only |
| **LlamaIndex** | RAG-focused — index → retrieve → synthesize | Best-in-class retrieval | Overkill for conversation memory | ⭐⭐ Retrieval patterns |
| **Our System** | SQLite graph + NLP extraction + embeddings + session monitoring | Already built, local models, no cloud dependency | Broken pipelines, noisy data, no active curation | ⭐⭐⭐⭐ Fix don't replace |

### Key Insight from Research

The best systems (Mem0, Zep) share common patterns:
1. **Tiered memory:** Working (current session) → Short-term (recent sessions) → Long-term (curated facts)
2. **Aggressive summarization:** Don't store raw conversations, store extracted knowledge
3. **Relevance-filtered retrieval:** Only inject context that matches the current query/task
4. **Token budgeting:** Hard caps on how much memory context gets injected

We already have most of the building blocks. The problem is plumbing, not architecture.

---

## 4. Recommended Architecture

### Design Principles
- **Fix, don't replace** — we have 5K+ lines of working NLP/graph code
- **Local-first** — use Ollama (qwen3:14b) for all preprocessing
- **Budget-aware** — every context injection has a token cap
- **Auto-healing** — pipelines should restart themselves

### Target Architecture

```
┌─────────────────────────────────────────────────┐
│                  OpenClaw Session                │
│                                                  │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ System   │  │ Workspace │  │ Conversation  │ │
│  │ Context  │  │ Context   │  │              │ │
│  │ (fixed)  │  │ (dynamic) │  │              │ │
│  └──────────┘  └─────┬─────┘  └──────────────┘ │
│                      │                           │
└──────────────────────┼───────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Context Router  │ ← NEW: decides what gets injected
              │  (token budget)  │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ Working  │  │ Session  │  │ Long-term│
   │ Memory   │  │ Summaries│  │ Graph    │
   │ (current)│  │ (recent) │  │ (facts)  │
   └──────────┘  └──────────┘  └──────────┘
         │             │             │
         └─────────────┼─────────────┘
                       │
              ┌────────▼────────┐
              │  Memory Daemon   │ ← FIX: single unified daemon
              │  (PM2 managed)   │
              │  - Extract facts  │
              │  - Summarize sessions │
              │  - Decay old data │
              │  - Clean noise    │
              └─────────────────┘
```

### Key Changes

#### 4.1 Context Router (NEW)
A lightweight script that generates `retrieved-context.md` with a **token budget**:

```javascript
// Pseudocode
const BUDGET = 2000; // tokens max for retrieved context
const query = getCurrentTaskFromSession();
const facts = hybridRetrieve(query, { limit: 20 }); // existing NLP layer
const summaries = getRecentSummaries(3); // last 3 session summaries
const context = formatWithinBudget(facts, summaries, BUDGET);
writeRetrievedContext(context);
```

This replaces the current "dump everything" approach.

#### 4.2 Unified Memory Daemon (FIX)
Consolidate chimera + kira memory scripts into ONE daemon:
- Fix `.clawdbot` → `.openclaw` path references
- Run via PM2 with auto-restart
- Single DB: `~/kira/memory/unified.db` (clean it first)
- Cron: extract every 5 min, summarize every 30 min, decay daily

#### 4.3 Graph Cleanup (CRITICAL)
The 370MB unified.db needs aggressive cleanup:
- Delete all facts with generic predicates (`is`, `has`, `provides`, `contains`, `includes`, `offers`, `represents`) — that's **~30K+ useless facts**
- Merge duplicate entities (the dedup in graph-improvements.js exists, run it)
- Delete entities with type "concept" that have no meaningful relations
- Target: <10K entities, <20K high-quality facts, <50MB DB

#### 4.4 Smarter AGENTS.md Loading
Instead of loading the entire AGENTS.md every session, split it:
- `AGENTS.md` — core rules only (~1K tokens)
- `AGENTS-MEMORY.md` — memory system details (load only when memory work needed)
- `AGENTS-HEARTBEAT.md` — heartbeat instructions (load only on heartbeat)

#### 4.5 Tool Output Compression
After any tool call that returns >2000 tokens, auto-summarize using local model before injecting into context. This is the single biggest win for rate limiting.

**Implementation:** OpenClaw plugin or post-processing hook that pipes large tool outputs through `ollama generate` with a "summarize this output, keep key data" prompt.

---

## 5. Implementation Plan

### Phase 1: Emergency Fixes (TODAY, ~2-4 hours)

| Task | Effort | Impact |
|------|--------|--------|
| Fix path references (.clawdbot → .openclaw) in all memory scripts | 30min | 🔴 Critical — unblocks everything |
| Run graph cleanup (delete generic facts, dedup entities) | 30min | 🔴 370MB → <50MB, faster queries |
| Restart memory daemon via PM2 | 15min | 🔴 Re-enables auto extraction |
| Trim AGENTS.md — move memory/heartbeat docs to separate files | 30min | 🟡 Saves ~2K tokens/session |
| Generate fresh retrieved-context.md | 15min | 🟡 Immediate context quality boost |

### Phase 2: Context Router (This week, ~4-6 hours)

| Task | Effort | Impact |
|------|--------|--------|
| Build context-router.js with token budgeting | 2h | 🔴 Core improvement |
| Integrate with message-proxy to auto-update on query | 1h | 🟡 Dynamic context |
| Add session summarization (triggered by context-monitor) | 2h | 🟡 Compaction recovery |

### Phase 3: Consolidation (Next week, ~8 hours)

| Task | Effort | Impact |
|------|--------|--------|
| Merge chimera + kira memory scripts into single pipeline | 4h | 🟡 Maintenance reduction |
| Improve fact extraction prompts (fewer generic triples) | 2h | 🟡 Data quality |
| Add quality scoring to entity extraction (reject low-confidence) | 2h | 🟡 Prevent future bloat |

### Phase 4: Advanced (When bandwidth allows)

| Task | Effort | Impact |
|------|--------|--------|
| Tool output compression via local model | 4h | 🔴 Biggest rate-limit saver |
| Implement MemGPT-style page-in/page-out for large projects | 8h | 🟡 Elegance |
| Add temporal awareness to retrieval (weight recent facts) | 2h | 🟡 Relevance |
| Embedding-based context file selection (only load relevant files) | 4h | 🟡 Smart loading |

---

## 6. Quick Wins (Do TODAY)

### QW1: Fix Paths (15 min)
```bash
# Find and fix all .clawdbot references
grep -rl '.clawdbot' ~/kira/scripts/memory/ ~/chimera/scripts/
# Replace with .openclaw
sed -i 's/\.clawdbot/\.openclaw/g' ~/kira/scripts/memory/memory-daemon.js
sed -i 's/\.clawdbot/\.openclaw/g' ~/kira/scripts/context-summary.js
sed -i 's/\.clawdbot/\.openclaw/g' ~/chimera/scripts/context-monitor.js
sed -i 's/\.clawdbot/\.openclaw/g' ~/chimera/scripts/curator-agent.js
sed -i 's/\.clawdbot/\.openclaw/g' ~/chimera/scripts/memory-retriever.js
```

### QW2: Clean the Graph (15 min)
```bash
sqlite3 ~/kira/memory/unified.db "
  DELETE FROM facts WHERE predicate IN ('is','has','provides','contains','includes','offers','represents','indicates','receives');
  DELETE FROM entities WHERE type = 'concept' AND id NOT IN (SELECT subject_id FROM facts) AND id NOT IN (SELECT DISTINCT subject_id FROM relations);
  VACUUM;
"
```
This should delete ~35K+ garbage facts and thousands of orphan entities.

### QW3: Restart Daemon (5 min)
```bash
pm2 delete graph-sync msg-proxy memory-daemon 2>/dev/null
pm2 start ~/kira/scripts/memory/graph-sync-daemon.js --name graph-sync
pm2 start ~/kira/scripts/memory/message-proxy.js --name msg-proxy
pm2 save
```

### QW4: Trim AGENTS.md (15 min)
Move the "Memory System", "NLP Graph Layer", and "Heartbeats" sections to separate files. Keep AGENTS.md under 2K tokens.

### QW5: Generate Fresh Context (5 min)
```bash
node ~/kira/scripts/memory/nlp-graph-layer.js enrich "current projects and priorities"
```

### QW6: Reduce HEARTBEAT.md (10 min)
The current HEARTBEAT.md is ~1500 tokens. Trim to essential checklist only (~500 tokens). Move background work queue to a separate file.

---

## Summary

**The core problem isn't missing technology — it's broken plumbing and data quality.**

We have a sophisticated NLP graph layer with FTS5, embeddings, hybrid retrieval, and confidence decay. But:
- The pipelines aren't running (path rot)
- The data is 90% noise (generic facts)
- There's no token budgeting for context injection
- Tool outputs blow up the context window

**Fix order:** Clean data → Fix paths → Restart daemons → Add budget router → Consolidate scripts.

Estimated total effort: ~20-30 hours across all phases. Phase 1 (today) takes 2-4 hours and delivers 80% of the improvement.
