# Kira Cognitive Architecture

## Overview

Kira is an autonomous AI agent with a 3-layer cognitive memory system, local GPU inference, and real-time monitoring capabilities.

```
┌─────────────────────────────────────────────────────────────┐
│                      KIRA AGENT                              │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: High-Level Coordination                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Blackboard  │  │ Sub-Agents  │  │  Scheduler  │         │
│  │ (JSONL)     │  │ (Sessions)  │  │  (Cron)     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Memory & Knowledge                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Episodic    │  │ Semantic    │  │ Procedural  │         │
│  │ (Events)    │  │ (Facts/KG)  │  │ (Workflows) │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Inference & Embeddings                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Local LLM   │  │ Embeddings  │  │ KV Cache    │         │
│  │ (Ollama)    │  │ (nomic)     │  │ (VRAM)      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  Hardware: NVIDIA RTX 4090 (24GB VRAM)                      │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
~/kira/
├── AGENTS.md           # Agent behavior guidelines
├── SOUL.md             # Core identity & personality
├── USER.md             # User context (Otto)
├── IDENTITY.md         # Name, creature, vibe
├── HEARTBEAT.md        # Autonomous task checklist
├── MEMORY.md           # Long-term curated memory
├── TOOLS.md            # Local tool configuration
│
├── memory/             # Cognitive memory storage
│   ├── ARCHITECTURE.md # Memory system design
│   ├── episodes/       # Daily event logs (JSONL)
│   ├── procedures/     # Learned workflows (JSON)
│   ├── reflections/    # Self-analysis reports
│   ├── blackboard.jsonl # Multi-agent coordination
│   └── embeddings.json # Vector cache
│
├── scripts/
│   ├── memory/         # Memory system scripts
│   │   ├── memory-core.js    # Unified interface
│   │   ├── episodes.js       # Event logging
│   │   ├── procedures.js     # Workflow storage
│   │   ├── blackboard.js     # Agent coordination
│   │   ├── embeddings.js     # Vector search
│   │   ├── reflection.js     # Self-improvement
│   │   └── kv-cache.js       # GPU cache management
│   └── setup-4090.sh   # GPU setup script
│
├── dashboard/          # Simple monitoring UI
│   ├── server.js       # Node.js SSE server
│   └── index.html      # Dashboard HTML
│
├── dashboard-copilot/  # CopilotKit React UI
│   └── src/
│       ├── App.jsx     # Main component
│       └── App.css     # Styles
│
└── docs/               # Documentation
    ├── ARCHITECTURE.md # This file
    ├── MEMORY.md       # Memory system guide
    └── API.md          # Internal APIs
```

## Memory System

### Episodic Memory
- **Purpose**: What happened, when, with what outcome
- **Location**: `memory/episodes/YYYY-MM-DD.jsonl`
- **Schema**:
```json
{
  "id": "ep-{timestamp}-{random}",
  "timestamp": "ISO8601",
  "type": "interaction|task|decision|learning|error|milestone",
  "participants": ["kira", "otto"],
  "summary": "Brief description",
  "outcome": "success|failure|partial|pending",
  "importance": 1-10,
  "tags": ["tag1", "tag2"]
}
```

### Procedural Memory
- **Purpose**: Validated workflows ("recipes")
- **Location**: `memory/procedures/*.json`
- **Schema**:
```json
{
  "id": "proc-{random}",
  "name": "Procedure Name",
  "description": "What it does",
  "steps": [{"action": "...", "params": "..."}],
  "successRate": 0.0-1.0,
  "timesUsed": 0
}
```

### Blackboard (Multi-Agent)
- **Purpose**: Coordination between agents
- **Location**: `memory/blackboard.jsonl`
- **Types**: discovery, request, response, fact, procedure

### Semantic Memory
- **Purpose**: Facts and relationships
- **Location**: `~/chimera/memory/graph.db` (SQLite)
- **Format**: Entity-Fact-Relationship triples

## Local Inference

### Models (Ollama)
| Model | Size | Use Case |
|-------|------|----------|
| qwen2.5:32b-instruct-q4_K_M | 19GB | Primary reasoning |
| qwen2.5:7b | 4.7GB | Fast tasks |
| nomic-embed-text | 274MB | Embeddings (768d) |
| GLM-4.7-Flash | 18GB | Coding (downloading) |

### API Endpoints
- Generate: `POST http://localhost:11434/api/generate`
- Embeddings: `POST http://localhost:11434/api/embeddings`
- Models: `GET http://localhost:11434/api/tags`

## Monitoring

### Simple Dashboard (Port 3847)
- Lightweight Node.js server
- Server-Sent Events for real-time updates
- No dependencies

### CopilotKit Dashboard (Port 3849)
- React + Vite
- AI-powered sidebar for Q&A
- Rich component library

### API
- `GET /api/state` - Current memory state
- `GET /api/stream` - SSE real-time updates

## Autonomy Model

Kira operates in **full autonomy mode**:
1. Act first, report significant progress
2. Use local LLM for reasoning
3. Log all significant events to episodic memory
4. Self-reflect on patterns (success/failure)
5. Learn procedures from successful tasks

## Integration Points

- **Clawdbot**: Gateway daemon for messaging
- **Telegram**: Primary communication channel
- **Notion**: Project management & deliverables
- **GitHub**: Code repository
- **Chimera**: Feature evolution system
