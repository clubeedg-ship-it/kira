# CHIMERA MVP - Master Plan

*Kira stays architect. Subagents build. Don't lose the forest.*

---

## The Goal

**Working demo of split-brain architecture** that can be shown to investors.

```
[Otto] ←→ [Consultant] ←→ [Job Queue] ←→ [Savants]
          (local brain)                   (cloud workers)
```

---

## Phase 1: Foundation (Week 1)

### 1.1 Memory Graph
**What:** SQLite + embeddings for entity/relation/fact storage
**Why:** Consultant needs memory to be useful
**Subagent task:** Implement `specs/005-memory-graph.md`
**Deliverable:** Working `~/chimera/src/memory-graph/` with tests

### 1.2 Meta-Thinker
**What:** Wrapper that keeps small models on track
**Why:** Small/cheap models drift without oversight
**Subagent task:** Design + implement meta-thinker pattern
**Deliverable:** Working oversight loop for cloud model calls

### 1.3 Consultant Core
**What:** Main agent that holds context, talks to user
**Why:** This is the "face" of the system
**Subagent task:** Wire memory + meta-thinker + cloud model
**Deliverable:** Consultant that remembers and stays focused

---

## Phase 2: Interface (Week 2)

### 2.1 Voice Interface
**What:** STT (speech-to-text) + TTS (text-to-speech)
**Why:** Natural dialogue, async while thinking
**Options:** Whisper (local), Deepgram (cloud), Edge TTS (free)
**Deliverable:** Talk to Consultant via voice

### 2.2 Job Queue
**What:** Consultant → Savant task handoff
**Why:** Async execution, track progress
**Design:** Simple file-based or Redis, tracks job state
**Deliverable:** Working queue with status visibility

---

## Phase 3: Savants (Week 3)

### 3.1 Savant Manager
**What:** Spawn/manage Claude Code instances
**Why:** Distributed execution, self-evolving
**Build on:** Clawdbot's sessions_spawn, activity feed
**Deliverable:** Consultant can spawn and monitor Savants

### 3.2 Cloud Model Savants
**What:** Wrappers for GLM-4, Kimi K2, DeepSeek, etc.
**Why:** Cheap execution for MVP
**Deliverable:** Savants that call cloud APIs

### 3.3 Self-Evolution Hook
**What:** Savants can propose improvements
**Why:** The "self-evolving" property
**Build on:** Existing Observer/Analyzer/Proposer
**Deliverable:** Savants log activity, system learns

---

## Phase 4: Integration (Week 4)

### 4.1 End-to-End Demo
**What:** Full flow working
**Test:** Otto talks → Consultant plans → Savant executes → Result returns

### 4.2 Demo Polish
**What:** Make it presentable
**Include:** Activity feed, visible job queue, memory graph visualization

### 4.3 Investment Pitch Materials
**What:** Deck, video demo, one-pager
**Deliverable:** Ready to show investors

---

## Subagent Assignments

| Subagent | Responsibility | Model |
|----------|---------------|-------|
| **architect** (me/Kira) | Plan, review, coordinate | opus |
| **memory-builder** | Memory Graph implementation | sonnet |
| **consultant-builder** | Consultant + Meta-Thinker | sonnet |
| **interface-builder** | Voice + Job Queue | sonnet |
| **savant-builder** | Savant management + cloud wrappers | sonnet |

---

## Rules for Kira (Main Session)

1. **Stay high-level** - Don't write implementation code here
2. **Spawn subagents** - They do the building
3. **Review outputs** - Check what subagents produce
4. **Update plan** - Adjust as we learn
5. **Talk to Otto** - Keep partnership active, get feedback

---

## Success Criteria

- [ ] Consultant remembers previous conversations
- [ ] Consultant stays on track (meta-thinker works)
- [ ] Voice dialogue feels natural
- [ ] Jobs flow to Savants and return results
- [ ] Activity is visible (feeds, logs)
- [ ] Demo runs for 10 minutes without breaking
- [ ] Otto says "this is what I meant"

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Context window overflow | Use subagents, keep main clean |
| Losing big picture | This document, regular reviews |
| Scope creep | MVP only, features later |
| Cost overrun | Free tiers first, track usage |
| Integration hell | Test interfaces early |

---

## Current Status

- [x] Vision documented (CHIMERA-PROTOCOL.md)
- [x] Research complete (chimera-research.md)
- [x] Specs exist (memory graph, VDR, savants)
- [ ] Phase 1 started
- [ ] Subagents spawned

---

## Next Action

**Spawn first subagent: memory-builder**
Task: Implement Memory Graph per spec 005

---

*Plan owned by Kira. Updated as we progress. Otto has veto power.*
