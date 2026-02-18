# Chimera Architecture

> Technical documentation for the Chimera privacy-preserving distributed AI compute protocol.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Design Principles](#design-principles)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [Security Model](#security-model)
6. [Protocol Specifications](#protocol-specifications)
7. [Network Topology](#network-topology)
8. [Token Economics](#token-economics)

---

## System Overview

Chimera is a three-tier architecture for private AI computation:

```
┌──────────────────────────────────────────────────────────────┐
│                      LOCAL TIER (Private)                     │
│                                                              │
│  ┌────────────┐   ┌────────────┐   ┌──────────────────────┐ │
│  │ Consultant  │──▶│  Pipeline   │──▶│    Memory Graph      │ │
│  │             │   │            │   │ (SQLite, local-only)  │ │
│  │ • Context   │   │ • Decompose│   │ • Entities            │ │
│  │ • Reasoning │   │ • Assemble │   │ • Relations           │ │
│  │ • Privacy   │   │ • Route    │   │ • Facts               │ │
│  └────────────┘   └─────┬──────┘   └──────────────────────┘ │
│                          │                                    │
│                    ┌─────▼──────┐                             │
│                    │  Job Queue  │                             │
│                    │  (file-based)│                            │
│                    └─────┬──────┘                             │
└──────────────────────────┼───────────────────────────────────┘
                           │
                     ┌─────▼──────┐
                     │ZK Membrane │
                     │            │
                     │ • Strip ID │
                     │ • ZK proof │
                     │ • Encrypt  │
                     └─────┬──────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                    NETWORK TIER (Blind)                       │
│                          │                                    │
│          ┌───────────────┼───────────────┐                   │
│          ▼               ▼               ▼                   │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│   │  Savant A   │  │  Savant B   │  │  Savant C   │           │
│   │             │  │             │  │             │           │
│   │ Stateless   │  │ Stateless   │  │ Stateless   │           │
│   │ No context  │  │ No context  │  │ No context  │           │
│   │ Blind       │  │ Blind       │  │ Blind       │           │
│   └────────────┘  └────────────┘  └────────────┘           │
│                                                              │
│   Each Savant processes a fragment. No Savant sees the       │
│   full task, the requester's identity, or other fragments.   │
└──────────────────────────────────────────────────────────────┘
```

**Core invariant:** Private data never leaves the Local Tier. The Network Tier only ever receives decomposed, context-free work fragments.

---

## Design Principles

### 1. Privacy by Architecture
Privacy isn't a feature bolted on after the fact — it's a structural property of how computation is decomposed. No configuration change, no malicious node, no network compromise can reveal the full picture because no single point in the network *has* the full picture.

### 2. No Central Point of Failure
There is no central server, no coordinator node, no registry that must be online. The Consultant runs locally. Savants are independent. The Job Queue is file-based and local. The network is an emergent property of nodes finding each other.

### 3. Usage = Uptime
Every node that uses the network also contributes to it. Running a Consultant means your machine is available to serve as a Savant for others. The network grows with adoption, not with investment.

### 4. Stateless Workers
Savants retain nothing between jobs. No session state, no request history, no accumulated context. This is a security property, not a limitation — it makes data exfiltration structurally impossible.

---

## Component Architecture

### Consultant

**Role:** Local, private executive brain. The only component that holds complete context.

**Module:** `src/consultant/`

```javascript
class Consultant {
  constructor(config) {
    this.mainModel      // Primary LLM for reasoning
    this.overseerModel  // Meta-thinker for quality control
    this.conversation   // Conversation state manager
    this.metaThinker    // Quality-controlled model routing
  }
}
```

**Responsibilities:**
- Maintains full conversation context and user memory
- Decomposes complex requests into independent work units (Job Tickets)
- Strips private context before creating tickets
- Reassembles results from Savants into coherent responses
- Manages the local Memory Graph

**Privacy guarantee:** The Consultant never sends raw user data to the network. All outbound communication goes through the Pipeline, which enforces context stripping.

### Pipeline

**Role:** Task decomposition and result assembly.

**Module:** `src/pipeline/`

**Operations:**
1. **Decompose** — Break a complex task into independent fragments
2. **Strip** — Remove identifying context, user references, session data
3. **Route** — Assign fragments to appropriate Savant types
4. **Assemble** — Merge Savant results into a coherent response
5. **Validate** — Check assembled results for consistency

### Job Queue

**Role:** Async, persistent, file-based work queue.

**Module:** `src/queue/`

```
vdr/queue/
├── pending/      # Jobs waiting for assignment
├── running/      # Jobs assigned to Savants
├── completed/    # Successfully finished jobs
└── failed/       # Failed jobs (with retry metadata)
```

**Design decisions:**
- **File-based, not in-memory:** Jobs survive crashes and restarts. Every job is a JSON file on disk.
- **Inspectable:** You can `ls` and `cat` the queue. No opaque databases.
- **Priority-aware:** Jobs carry priority levels that affect scheduling.
- **Event-driven:** Queue emits events for job lifecycle transitions.

**Job Ticket schema:**
```json
{
  "id": "uuid",
  "type": "compute|analyze|generate|transform",
  "priority": "low|normal|high|critical",
  "payload": {
    "task": "context-free work description",
    "constraints": {},
    "model_hint": "optional preferred model class"
  },
  "metadata": {
    "created": "ISO timestamp",
    "ttl": 300000,
    "retries": 0,
    "maxRetries": 3
  },
  "proof": "ZK access proof (when Membrane is active)"
}
```

**Note:** The `payload` field contains *only* the decomposed work fragment. No user ID, no session reference, no source context.

### Savant Manager

**Role:** Orchestrates distributed worker nodes.

**Module:** `src/savant-manager/`

**Sub-components:**
- **Pool** (`pool.js`) — Manages active Savant instances with concurrency limits
- **Monitor** (`monitor.js`) — Health checks, stuck job detection, performance tracking
- **Spawn** (`spawn.js`) — Process lifecycle for local Savants (Claude Code instances)
- **Cloud Savants** (`cloud-savants.js`) — Integration with cloud model providers
- **Evolution** (`evolution.js`) — Adaptive Savant configuration based on performance

**Concurrency model:**
- Default max concurrent Savants: 5 (configurable)
- Stuck threshold: 30 minutes
- Health check interval: 60 seconds
- Queue overflow handled by task queuing with priority ordering

### Memory Graph

**Role:** Local-only knowledge persistence.

**Module:** `src/memory-graph/`

**Storage:** SQLite (via `better-sqlite3`)

**Schema:**
- **Entities** — Named objects (people, concepts, projects)
- **Relations** — Typed connections between entities
- **Facts** — Timestamped assertions about entities
- **Retrieval** — Contextual query engine for relevant memory

**Privacy guarantee:** The Memory Graph never leaves the local machine. It is not referenced in Job Tickets and is not accessible to Savants.

### Meta-Thinker

**Role:** Quality control layer for model interactions.

**Module:** `src/meta-thinker/`

The Meta-Thinker wraps model calls with an oversight layer:
1. Evaluates whether a response meets quality thresholds
2. Routes to different model tiers based on task complexity
3. Retries with adjusted parameters on quality failures
4. Tracks model performance for adaptive routing

### Voice Pipeline

**Role:** Speech I/O for voice-first interactions.

**Module:** `src/voice/`

- **STT** — Speech-to-text (Whisper-based)
- **TTS** — Text-to-speech (Edge TTS, Chatterbox)
- **WebSocket Server** — Real-time voice streaming
- **Router** — Voice command routing

### Observer & Analyzer

**Role:** Self-monitoring and pattern detection.

**Modules:** `src/observer/`, `src/analyzer/`

- Observer watches system health, resource usage, and job throughput
- Analyzer detects patterns in usage, failures, and performance
- Together they feed the Evolution hook to improve Savant configuration over time

### Error Recovery

**Role:** Self-healing mechanisms.

**Module:** `src/error-recovery/`

- Automatic retry with exponential backoff
- Job reassignment on Savant failure
- Graceful degradation when network capacity is limited
- Dead letter queue for permanently failed jobs

---

## Data Flow

### Request Lifecycle

```
User Input
    │
    ▼
┌─────────────┐
│ Consultant   │  1. Receive input, update conversation context
│              │  2. Query Memory Graph for relevant context
│              │  3. Determine if task needs network compute
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Pipeline    │  4. Decompose task into independent fragments
│              │  5. Strip identifying context from each fragment
│              │  6. Create Job Tickets
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Job Queue   │  7. Persist tickets to pending/
│              │  8. Priority ordering
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ ZK Membrane  │  9. Generate access proof (no identity)
│              │  10. Encrypt payload
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Savants    │  11. Receive fragment (blind)
│  (network)   │  12. Process without context
│              │  13. Return result
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Pipeline    │  14. Collect all fragment results
│  (assemble)  │  15. Validate consistency
│              │  16. Merge into coherent response
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Consultant   │  17. Integrate with conversation context
│              │  18. Update Memory Graph
│              │  19. Deliver to user
└─────────────┘
```

### What each tier can see

| Data | Consultant | Pipeline | Job Queue | ZK Membrane | Savant |
|------|:---:|:---:|:---:|:---:|:---:|
| User identity | ✅ | ✅ | ❌ | ❌ | ❌ |
| Full conversation | ✅ | ✅ | ❌ | ❌ | ❌ |
| Memory graph | ✅ | ❌ | ❌ | ❌ | ❌ |
| Task decomposition | ❌ | ✅ | ❌ | ❌ | ❌ |
| Individual fragment | ❌ | ✅ | ✅ | ✅ | ✅ |
| Other fragments | ❌ | ✅ | ❌ | ❌ | ❌ |
| Requester proof | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## Security Model

### Threat Model

**What we protect against:**
1. **Curious Savant** — A Savant node trying to learn about the requester or full task
2. **Network Observer** — An adversary monitoring network traffic between nodes
3. **Colluding Savants** — Multiple Savant nodes cooperating to reconstruct the full task
4. **Compromised Queue** — An attacker gaining access to the job queue

**What we do NOT protect against (yet):**
1. **Compromised Consultant** — If your local machine is compromised, all bets are off
2. **Side-channel attacks** — Timing analysis, power analysis on Savant nodes
3. **Model extraction** — Savants using hosted models that may log inputs

### Security Properties

#### 1. Fragment Isolation
Each Savant receives exactly one fragment of a decomposed task. Fragments are designed to be semantically independent — processing one reveals nothing about the others.

#### 2. Stateless Execution
Savants maintain zero state between jobs. After processing a fragment, all data related to that job is discarded. There is no job history, no request log, no accumulated knowledge.

#### 3. Identity Separation (ZK Membrane)
The ZK Membrane provides cryptographic proof that a requester has the right to submit jobs *without revealing who they are*. This uses zero-knowledge proofs to separate authorization from identification.

**Membrane properties:**
- **Completeness** — Valid access rights always produce valid proofs
- **Soundness** — Invalid access rights cannot produce valid proofs
- **Zero-knowledge** — The proof reveals nothing beyond the validity of access

#### 4. No Aggregation Point
There is no central server that aggregates requests, results, or metadata. The Consultant (local) is the only place where the full picture exists, and it never leaves the user's machine.

### Cryptographic Primitives

| Primitive | Purpose | Status |
|-----------|---------|--------|
| ZK-SNARKs | Access proof without identity | 🟡 Design |
| AES-256-GCM | Fragment encryption in transit | 🟡 Design |
| Ed25519 | Node identity and signing | 🟡 Design |
| Argon2 | Local key derivation | 🟡 Design |

---

## Protocol Specifications

### Job Ticket Protocol

#### Submission
```
Consultant → Pipeline: DECOMPOSE(task)
Pipeline → Queue: ENQUEUE(fragment[0..N])
Queue → Membrane: PROVE_ACCESS(fragment)
Membrane → Network: BROADCAST(proven_fragment)
```

#### Execution
```
Savant: CLAIM(fragment_id)
Savant: PROCESS(fragment)
Savant: SUBMIT(result, proof_of_work)
```

#### Assembly
```
Queue: COLLECT(results[0..N])
Pipeline: VALIDATE(results)
Pipeline: ASSEMBLE(results) → response
Consultant: DELIVER(response)
```

### Node Discovery

Savant nodes discover each other through a gossip protocol:

1. **Bootstrap** — New nodes connect to known seed nodes
2. **Announce** — Nodes broadcast their capabilities (compute type, capacity, uptime)
3. **Gossip** — Node lists propagate through the network
4. **Prune** — Unresponsive nodes are dropped after timeout

### Savant Capability Advertisement

```json
{
  "node_id": "ed25519_public_key",
  "capabilities": {
    "compute_types": ["inference", "analysis", "generation"],
    "model_classes": ["small", "medium", "large"],
    "max_concurrent": 5,
    "avg_latency_ms": 200
  },
  "uptime": 0.997,
  "stake": 1000,
  "version": "0.1.0"
}
```

---

## Network Topology

### Viral Growth Model

Chimera grows organically because every user is also a provider:

```
User installs Chimera
    → Runs Consultant (consumes compute)
    → Also runs Savant (provides compute)
    → Network capacity grows with each user
    → More capacity → better service → more users
```

This creates a **positive feedback loop** where usage directly increases network capacity. No separate "provider onboarding" is needed.

### Node Roles

| Role | Description | Runs locally? |
|------|-------------|:---:|
| **Consultant** | Private brain, task decomposition | ✅ |
| **Savant** | Blind compute worker | ✅ (also remote) |
| **Relay** | Traffic routing for NAT traversal | Optional |
| **Seed** | Bootstrap node discovery | Community-run |

---

## Token Economics

> ⚠️ **Design phase** — not yet implemented.

### Compute Credits

- **Earning:** Savant nodes earn tokens proportional to compute provided (CPU time × quality score)
- **Spending:** Requesters spend tokens to submit Job Tickets
- **Staking:** Nodes stake tokens as collateral for reliability
- **Slashing:** Unresponsive or malicious nodes lose staked tokens

### Quality Score

Savant quality is measured by:
- Response latency
- Result correctness (validated by Pipeline)
- Uptime percentage
- Job completion rate

Higher quality scores earn higher token rewards per compute unit.

---

## Development

### Testing

```bash
npm test                    # Run all 162+ tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

### CLI Tools

```bash
npx chimera observe         # Monitor system state
npx chimera analyze         # Run pattern analysis
npx chimera generate        # Generate components
```

### Key Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CHIMERA_VDR` | `~/chimera/vdr` | Virtual Data Room path |
| `maxConcurrent` | `5` | Max concurrent Savants |
| `stuckThreshold` | `30min` | Job stuck timeout |
| `pollInterval` | `1000ms` | Queue poll interval |

---

## File Reference

| Path | Purpose |
|------|---------|
| `src/consultant/` | Local brain — context, reasoning, privacy boundary |
| `src/pipeline/` | Task decomposition and result assembly |
| `src/queue/` | File-based async job queue |
| `src/savant-manager/` | Distributed worker orchestration |
| `src/savant-creator/` | Dynamic Savant provisioning and interview |
| `src/memory-graph/` | SQLite knowledge graph (entities, relations, facts) |
| `src/meta-thinker/` | Quality-controlled model routing |
| `src/voice/` | Voice I/O pipeline (STT/TTS/WebSocket) |
| `src/observer/` | System health monitoring |
| `src/analyzer/` | Pattern detection |
| `src/generator/` | Code and content generation |
| `src/operator/` | Context engine and request routing |
| `src/deployer/` | Deployment automation |
| `src/error-recovery/` | Self-healing and retry logic |
| `src/cli/` | Command-line interface |
| `vdr/queue/` | Persistent job queue (pending/running/completed/failed) |
| `vdr/activity/` | Activity logs |
| `vdr/knowledge/` | Knowledge base index |

---

*Last updated: February 2026*
