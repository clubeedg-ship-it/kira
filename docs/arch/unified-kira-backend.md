# Unified Kira Backend — Architecture & Execution Plan

**Date:** 2026-03-18
**Status:** Proposed
**Author:** Kira

---

## 1. Current State (Honest Audit)

### What Actually Exists

```
                         ┌─────────────────────────┐
                         │   OpenClaw Gateway       │
                         │   (port 18789)           │
                         │                          │
                         │  • Claude Opus 4.6       │
                         │  • Session management    │
                         │  • Tool execution        │
                         │  • Markdown memory        │
                         │  • memory_search (Gemini) │
                         │  • Sub-agent spawning    │
                         └────┬──────────┬──────────┘
                              │          │
                    ┌─────────┘          └──────────┐
                    ▼                               ▼
            ┌──────────────┐               ┌──────────────┐
            │   Telegram   │               │   WhatsApp   │
            │  (channel)   │               │  (channel)   │
            └──────────────┘               └──────────────┘

     ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
     │           DASHBOARD (Separate Brain)                     │
     │                                                          │
     │  ┌────────────────┐     ┌───────────────────┐           │
     │  │  Kira App      │     │ OpenClaw Bridge    │           │
     │  │  (kira-app)    │────▶│ (port 3855)        │──────┐   │
     │  │                │     │                    │      │   │
     │  │  Path A: Direct│     │ Spawns `openclaw   │      │   │
     │  │  OpenRouter ✗  │     │ agent -m` CLI      │      │   │
     │  │                │     └───────────────────┘      │   │
     │  │  Path B: Via   │                                 │   │
     │  │  Bridge ✓      │◀─ ─ ─ ─ ─SSE response─ ─ ─ ─ ─│   │
     │  │                │                                 │   │
     │  │  Mem0 memory   │     ┌───────────────────┐      │   │
     │  │  PostgreSQL    │     │ Gateway Bridge     │      │   │
     │  │  chat.db       │     │ (WS listener)      │      │   │
     │  │  NLP pipeline  │     │ Listens to gateway │      │   │
     │  │  Task extract  │     │ → SSE to browser   │      │   │
     │  └────────────────┘     │ → Mem0 on final    │      │   │
     │                         └───────────────────┘      │   │
     │           ▲                                         │   │
     │           │                                         │   │
     │     ┌─────┴──────┐                                  │   │
     │     │  Browser   │                                  │   │
     │     │  (Web UI)  │                                  │   │
     │     └────────────┘                                  │   │
     └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
                                                               │
                                               ┌───────────────┘
                                               ▼
                                    ┌─────────────────────┐
                                    │  OpenClaw Gateway    │
                                    │  (same gateway)      │
                                    └─────────────────────┘
```

### The Problem

1. **Two brains:** Dashboard has its own chat pipeline (Path A: direct OpenRouter) AND a gateway path (Path B: via bridge). Path A bypasses Kira entirely.
2. **Memory fragmented across 5 stores:**
   - Markdown files (`~/kira/memory/`) — used by main session
   - `unified.db` (SQLite) — 44K entities, scripts layer
   - `graph.db` (SQLite) — Chimera's knowledge graph
   - PostgreSQL (Drizzle ORM) — dashboard app
   - Mem0 vector store + `mem0-history.db` — 880 memories, best quality
3. **Gateway bridge is read-only:** Listens to gateway events, feeds Mem0. But doesn't send messages TO the gateway — that's the openclaw-bridge's job.
4. **CLI spawn per message:** openclaw-bridge spawns `openclaw agent -m` as a child process for each dashboard message. Works but slow, no streaming, no state.

### What's Actually Working (Good News)

- OpenClaw gateway IS the single brain for Telegram + WhatsApp
- openclaw-bridge ALREADY routes dashboard chat through the gateway
- Mem0 IS extracting quality memories (880 entries, actively used)
- gateway-bridge.ts IS listening to gateway events via WebSocket
- The architecture is 60% there — we're completing, not rebuilding

---

## 2. Target Architecture

```
                    ┌──────────────────────────────────────┐
                    │         OpenClaw Gateway              │
                    │         (Single Source of Truth)       │
                    │                                       │
                    │   ┌─────────────┐  ┌──────────────┐  │
                    │   │ Claude Opus │  │ Session Mgmt │  │
                    │   └─────────────┘  └──────────────┘  │
                    │                                       │
                    │   ┌─────────────┐  ┌──────────────┐  │
                    │   │ Tools/Skills│  │ Sub-agents   │  │
                    │   └─────────────┘  └──────────────┘  │
                    │                                       │
                    │   ┌──────────────────────────────┐   │
                    │   │ Mem0 Memory Layer             │   │
                    │   │ (extraction + retrieval)      │   │
                    │   │ Single source of memory truth │   │
                    │   └──────────────────────────────┘   │
                    │                                       │
                    └───┬────────┬────────┬────────┬───────┘
                        │        │        │        │
                   WebSocket   Channel  Channel  Channel
                     + SSE
                        │        │        │        │
                    ┌───┴──┐ ┌──┴───┐ ┌──┴───┐ ┌──┴───┐
                    │Web UI│ │ TG   │ │ WA   │ │Future│
                    │(thin)│ │      │ │      │ │      │
                    └──────┘ └──────┘ └──────┘ └──────┘

                    Web UI = pure renderer. Zero logic.
                    Sends user input → receives streamed response.
                    Reads state via API (memory, agents, tasks).
```

### Key Principles

1. **One brain.** All messages route through OpenClaw gateway. Period.
2. **One memory.** Mem0 as the single memory layer, hooked into the gateway pipeline.
3. **Thin clients.** Telegram, Web UI, WhatsApp — all just renderers. No logic.
4. **State is observable.** Gateway exposes everything: memory, sub-agents, tasks, session history.
5. **WebSocket for real-time.** No more CLI-spawn-per-message. Persistent connection, streamed responses.

---

## 3. Execution Plan

### Phase 1: Kill Dashboard's Brain (Day 1-2)
**Goal:** Dashboard sends ALL chat through OpenClaw. No direct LLM calls.

```
BEFORE:  Browser → Kira App → OpenRouter (direct)  ← KILL THIS
AFTER:   Browser → Kira App → Bridge → OpenClaw Gateway → Claude
```

**Tasks:**
- [ ] Remove Path A (direct OpenRouter) from `routes/chat.ts`
- [ ] Ensure Path B (openclaw-bridge) is the ONLY chat path
- [ ] Remove dashboard's own system prompt / context building for chat
- [ ] Keep dashboard's non-chat features intact (task UI, memory browser, file upload)
- [ ] Test: send message from Web UI → verify it arrives in same OpenClaw session as Telegram

**Files to modify:**
- `~/kira/app/src/server/routes/chat.ts` — gut the direct OpenRouter path
- `~/kira/app/openclaw-bridge.mjs` — already works, may need minor fixes

**Risk:** Low. Bridge already works. We're just removing the fallback.

---

### Phase 2: WebSocket Streaming (Day 2-3)
**Goal:** Replace CLI-spawn bridge with persistent WebSocket for real-time streaming.

```
BEFORE:  Dashboard → HTTP POST → bridge spawns `openclaw agent -m` → waits → returns
AFTER:   Dashboard → WebSocket → bridge → gateway WS → streamed tokens back
```

**Tasks:**
- [ ] Upgrade `openclaw-bridge.mjs` to use WebSocket protocol instead of CLI spawn
- [ ] Implement proper streaming: gateway WS events → SSE to browser (token by token)
- [ ] Handle session persistence (dashboard messages = same session as Telegram DM)
- [ ] Add connection health monitoring + auto-reconnect
- [ ] Test: verify real-time token streaming in Web UI

**Why this matters:** CLI spawn adds 2-5s latency per message, can't stream tokens, creates a new process each time. WebSocket is persistent, instant, streams live.

**Reference:** `gateway-bridge.ts` already has the WS protocol implementation. Merge its connection logic into `openclaw-bridge.mjs`.

---

### Phase 3: Mem0 at Gateway Level (Day 3-4)
**Goal:** Every conversation turn (from ANY surface) gets Mem0 extraction. Memory is unified.

```
ANY SURFACE → Gateway → Claude response → Post-process hook → Mem0 extraction
                                                             → Memory available to ALL surfaces
```

**Architecture Decision: Hook Location**

Option A: **Inside OpenClaw (plugin/skill)**
- Cleanest. Memory extraction as a gateway plugin.
- Requires: OpenClaw plugin API or custom skill that auto-runs post-response.
- Risk: OpenClaw may not support post-response hooks natively.

Option B: **Gateway Bridge as sidecar** (recommended)
- `gateway-bridge.ts` already listens to ALL gateway events via WebSocket
- Already calls `addToMemory()` on final messages
- Just needs: make it the SINGLE memory writer, kill all other memory paths
- Already proven, already running, minimal new code

Option C: **Cron-based extraction from session logs**
- Parse OpenClaw session logs periodically, extract to Mem0
- Simplest but adds latency (memories not available until next cron run)

**Recommended: Option B** — gateway-bridge.ts as the memory sidecar.

**Tasks:**
- [ ] Verify gateway-bridge.ts captures ALL conversations (Telegram + Web UI + WhatsApp)
- [ ] Ensure Mem0 extraction runs on every final message from any surface
- [ ] Add Mem0 `searchMemory()` as context injection into OpenClaw (via MEMORY.md auto-update or custom tool)
- [ ] Migrate critical facts from markdown → Mem0 (one-time script)
- [ ] Kill old memory paths: memory-daemon.js, heuristic NLP extraction, LIKE-based graph queries
- [ ] Keep markdown daily logs (human-readable backup) but Mem0 is source of truth

**Memory Flow (after):**
```
Any message → Gateway → Response → gateway-bridge.ts (WS listener)
                                         │
                                         ▼
                                   Mem0 addToMemory()
                                   (Kimi K2.5 extraction)
                                   (nomic-embed-text vectors)
                                         │
                                         ▼
                                   mem0-history.db
                                   (single source of truth)
                                         │
                        ┌────────────────┤
                        ▼                ▼
                 Gateway context   Dashboard memory
                 (injected via     browser (API)
                  retrieved-       
                  context.md or    
                  custom tool)     
```

---

### Phase 4: State API (Day 4-5)
**Goal:** Web UI can display everything — memory, sub-agents, tasks, session history.

**Tasks:**
- [ ] Expose Mem0 search via API: `GET /api/memory/search?q=...`
- [ ] Expose sub-agent state: `GET /api/agents` (from OpenClaw sessions)
- [ ] Expose session history: `GET /api/sessions/:id/history`
- [ ] Web UI renders these as dashboard panels (already partially built)
- [ ] Remove dashboard's own PostgreSQL-based memory/task queries where replaced

---

## 4. What Gets Killed

| Component | Action | Reason |
|-----------|--------|--------|
| Direct OpenRouter chat in dashboard | DELETE | Bypass brain |
| `nlp-extract.ts` (heuristic NLP) | ARCHIVE | Replaced by Mem0 |
| `nlp-store.ts` | ARCHIVE | Replaced by Mem0 |
| `graph-query.ts` (LIKE search) | ARCHIVE | Replaced by Mem0 semantic search |
| `short-term.ts` | ARCHIVE | Replaced by Mem0 |
| `working.ts` (volatile in-memory) | ARCHIVE | Replaced by Mem0 |
| `extractor.ts` (duplicate) | ARCHIVE | Replaced by Mem0 |
| `decay.ts` (linear decay) | ARCHIVE | Mem0 handles |
| CLI spawn per message | REPLACE | WebSocket streaming |
| Multiple SQLite/Postgres DBs | CONSOLIDATE | Mem0 is source of truth |

### What Stays

| Component | Reason |
|-----------|--------|
| OpenClaw Gateway | The brain |
| Mem0 service | Best memory system we have |
| gateway-bridge.ts | Memory sidecar (listener + Mem0 writer) |
| openclaw-bridge.mjs | Chat relay (upgraded to WebSocket) |
| Markdown daily logs | Human-readable backup, git-tracked |
| Dashboard UI (React) | Thin client — keeps task UI, memory browser |
| `context-builder.ts` | Simplified — queries Mem0 only |
| `chat-postprocess.ts` | Simplified — Mem0 + task extraction only |

---

## 5. Migration Safety

1. **No data loss.** Mem0 already has 880 high-quality memories. Markdown files stay as backup.
2. **Gradual cutover.** Phase 1 can be tested independently. Each phase has a rollback.
3. **Feature parity check.** Before killing Path A, verify bridge handles: streaming, file uploads, conversation history.
4. **One-time migration script.** Extract key facts from MEMORY.md → Mem0 to bootstrap unified memory.

---

## 6. Success Criteria

- [ ] Send a message from Web UI → see it in Telegram history (same session)
- [ ] Send a message from Telegram → see memory extracted in Mem0
- [ ] Web UI shows real-time token streaming (not wait-then-dump)
- [ ] `memory_search` in this session can find Mem0-stored facts
- [ ] Sub-agent state visible in Web UI
- [ ] Zero direct LLM calls from dashboard app

---

## 7. Effort Estimate

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: Kill Path A | 3-4 hours | Low |
| Phase 2: WebSocket streaming | 4-6 hours | Medium |
| Phase 3: Mem0 at gateway | 3-4 hours | Low-Medium |
| Phase 4: State API | 2-3 hours | Low |
| **Total** | **12-17 hours** | |

Can be done in 2-3 focused coding sessions with sub-agents.
