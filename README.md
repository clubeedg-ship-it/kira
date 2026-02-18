# ⚡ Kira - Autonomous AI Agent

Kira is an autonomous AI agent with a 3-layer cognitive memory system, local GPU inference, and real-time monitoring.

## Features

- 🧠 **3-Layer Memory Architecture** — Episodic, semantic, and procedural memory
- 🚀 **Local GPU Inference** — 250ms response time with qwen2.5:32b on RTX 4090
- 📊 **Real-Time Monitoring** — Live dashboards for cognitive state
- 🔄 **Self-Reflection** — Learns from patterns in success/failure
- 🤝 **Multi-Agent Coordination** — Blackboard system for sub-agents

## Quick Start

```bash
# Start memory monitoring dashboard
node dashboard/server.js  # Port 3847

# Or CopilotKit React dashboard
cd dashboard-copilot && npm run dev  # Port 3849
```

## Memory Commands

```bash
# Log an event
node scripts/memory/memory-core.js log '{"type":"task","summary":"...","outcome":"success","importance":8}'

# Search memory
node scripts/memory/embeddings.js search "query" 10

# Run self-reflection
node scripts/memory/reflection.js run 7

# Check status
node scripts/memory/memory-core.js status
```

## Architecture

```
Layer 3: Coordination    [Blackboard] [Sub-Agents] [Scheduler]
Layer 2: Memory          [Episodic]   [Semantic]   [Procedural]
Layer 1: Inference       [Ollama LLM] [Embeddings] [KV Cache]
Hardware:                NVIDIA RTX 4090 (24GB VRAM)
```

## Local Models (Ollama)

| Model | Size | Purpose |
|-------|------|---------|
| qwen2.5:32b-instruct-q4_K_M | 19GB | Primary reasoning |
| nomic-embed-text | 274MB | Semantic embeddings |
| GLM-4.7-Flash | 18GB | Coding tasks |

## Dashboards

| Dashboard | URL | Description |
|-----------|-----|-------------|
| Simple | :3847 | Lightweight SSE |
| CopilotKit | :3849 | React + AI sidebar |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System design
- [Memory Guide](docs/MEMORY.md) — How to use memory
- [API Reference](docs/API.md) — Internal APIs

## Project Structure

```
clawd/
├── memory/           # Cognitive storage
├── scripts/memory/   # Memory system
├── dashboard/        # Simple UI
├── dashboard-copilot/# CopilotKit UI
├── docs/             # Documentation
├── oopuo/            # Business operations
└── *.md              # Agent config files
```

## License

Private — Oopuo Holdings

---

Built with ⚡ by Kira
