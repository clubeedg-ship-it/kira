<p align="center">
  <h1 align="center">🔥 Chimera</h1>
  <p align="center"><strong>Privacy-preserving distributed AI compute protocol</strong></p>
  <p align="center">
    <em>Your AI stays private. Your compute stays distributed. No one sees the full picture.</em>
  </p>
</p>

<p align="center">
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="./chimera-ARCHITECTURE.md">Technical Docs</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## What is Chimera?

Chimera is an open protocol for **private, distributed AI computation**. It splits AI workloads across blind, stateless worker nodes so that no single node ever sees the full context of what it's computing.

Think of it as **Tor for AI inference** — your request is broken into pieces, processed by independent nodes that can't see each other's work, and reassembled locally where only you hold the complete picture.

### Why it matters

- **AI surveillance is the default.** Every cloud AI provider sees your prompts, your data, your patterns. Chimera makes that structurally impossible.
- **Centralized AI is fragile.** One API outage, one policy change, one government order — and your AI infrastructure goes dark. Chimera has no central point of failure.
- **Compute should be a commodity.** Anyone with spare compute can run a Savant node, earn tokens, and strengthen the network. Usage *is* uptime.

### How it's different

| | Chimera | Nillion | Golem | Akash |
|---|---|---|---|---|
| **Privacy model** | ZK Membrane + blind compute | MPC-based | None (trust-based) | None (trust-based) |
| **Designed for** | AI inference & reasoning | General blind compute | General compute | Cloud compute |
| **Architecture** | Consultant → Queue → Savants | Nada programs | Task model | Container-based |
| **Node incentive** | Compute tokens | NIL token | GLM token | AKT token |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR MACHINE (Private)                │
│                                                         │
│  ┌─────────────┐    ┌───────────┐    ┌──────────────┐  │
│  │  Consultant  │───▶│ Job Queue │───▶│ ZK Membrane  │  │
│  │ (your brain) │    │  (async)  │    │ (proof gate) │  │
│  └─────────────┘    └───────────┘    └──────┬───────┘  │
│        ▲                                     │          │
│        │              Results                │          │
│        └─────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
                                               │
                          Job Tickets (blind)   │
                                               ▼
        ┌──────────────────────────────────────────────┐
        │            DISTRIBUTED NETWORK               │
        │                                              │
        │   ┌─────────┐  ┌─────────┐  ┌─────────┐    │
        │   │ Savant 1 │  │ Savant 2 │  │ Savant N │    │
        │   │ (blind)  │  │ (blind)  │  │ (blind)  │    │
        │   └─────────┘  └─────────┘  └─────────┘    │
        │                                              │
        │   Stateless • No context • Can't collude     │
        └──────────────────────────────────────────────┘
```

**Three components, one principle: the network never sees the whole picture.**

- **Consultant** — Runs locally. Holds your context, memory, and private data. Decomposes complex tasks into blind work units.
- **Job Queue** — Async, file-based queue that manages work distribution. Jobs are stripped of identifying context before leaving your machine.
- **Savants** — Distributed, stateless worker nodes. Each processes a fragment without knowing what the other fragments contain or who requested the work.

The **ZK Membrane** sits between your local environment and the network, providing cryptographic proof of access rights without revealing identity or intent.

> 📖 **[Full architecture documentation →](./chimera-ARCHITECTURE.md)**

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- SQLite3 (for memory graph)

### Install

```bash
git clone https://github.com/chimera-protocol/chimera.git
cd chimera
npm install
```

### Run tests

```bash
npm test
```

162 tests covering Consultant, Queue, Savant Manager, Memory Graph, Voice pipeline, and more.

### Start the Consultant (local)

```bash
# Initialize a new Chimera workspace
npx chimera init

# Start the Consultant with default config
npx chimera start
```

### Run a Savant node

```bash
# Join the network as a compute provider
npx chimera savant --join

# Or run with Docker
docker run -d chimera-protocol/savant
```

---

## Project Structure

```
chimera/
├── src/
│   ├── consultant/        # Local private brain
│   ├── queue/             # File-based async job queue
│   ├── savant-manager/    # Distributed worker orchestration
│   ├── savant-creator/    # Dynamic savant provisioning
│   ├── memory-graph/      # SQLite knowledge graph (local)
│   ├── pipeline/          # Task decomposition & assembly
│   ├── voice/             # Voice I/O (STT/TTS)
│   ├── observer/          # System monitoring
│   ├── analyzer/          # Pattern detection
│   ├── generator/         # Code/content generation
│   ├── meta-thinker/      # Quality-controlled model routing
│   ├── operator/          # Context engine & routing
│   ├── deployer/          # Deployment automation
│   ├── error-recovery/    # Self-healing mechanisms
│   └── cli/               # Command-line interface
├── tests/                 # 162+ tests (vitest)
├── vdr/                   # Virtual Data Room (local state)
│   ├── queue/             # pending/ running/ completed/ failed/
│   ├── activity/          # Activity logs
│   └── knowledge/         # Knowledge base
└── package.json
```

---

## Status

**Phase: Developer Preview** 🟡

| Component | Status |
|-----------|--------|
| Consultant (local brain) | ✅ Working |
| Job Queue (async) | ✅ Working |
| Savant Manager | ✅ Working |
| Memory Graph | ✅ Working |
| Voice Pipeline | ✅ Working |
| ZK Membrane | 🟡 In progress |
| Distributed Testnet | 🔴 Not yet |
| Token Economics | 🔴 Design phase |

---

## Roadmap

- [x] Core architecture (Consultant → Queue → Savants)
- [x] 162+ passing tests
- [x] Memory Graph with entity/relation/fact storage
- [x] Voice pipeline (STT + TTS)
- [ ] Public testnet with distributed Savant nodes
- [ ] ZK Membrane implementation
- [ ] Compute token system
- [ ] Docker-based Savant deployment
- [ ] Security audit
- [ ] SDK for third-party integrations

---

## Contributing

Chimera is open source and we welcome contributions.

### Getting started

1. Fork the repo
2. Create a feature branch: `git checkout -b my-feature`
3. Run tests: `npm test`
4. Submit a PR

### Areas we need help

- **Cryptography** — ZK proof implementation for the Membrane
- **Networking** — P2P transport layer for Savant communication
- **Security** — Threat modeling, audit, adversarial testing
- **Documentation** — Tutorials, examples, API docs
- **Node operators** — Run a Savant node on the testnet (coming soon)

### Code style

- ES modules (`import`/`export`)
- Vitest for testing
- Keep modules self-contained with clear boundaries

---

## Prior Art & Inspiration

Chimera builds on ideas from projects we respect:

- **[Nillion](https://nillion.com)** — Blind compute via MPC. Chimera uses a different approach (task decomposition + ZK) optimized for AI workloads.
- **[Golem](https://golem.network)** — Decentralized compute marketplace. Chimera adds privacy as a first-class primitive.
- **[Akash](https://akash.network)** — Decentralized cloud. Chimera focuses on AI-specific compute with privacy guarantees.
- **[Tor](https://torproject.org)** — Onion routing for anonymity. Chimera applies similar thinking to AI inference.

---

## License

MIT

---

<p align="center">
  <strong>The network can't surveil what it can't see.</strong>
</p>
