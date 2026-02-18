# Multi-Agent System Design

## Overview

Kira's agent system is a hierarchical, session-based architecture where a persistent **Main Agent** orchestrates ephemeral **Sub-Agents**, pre-configured **Specialist Agents**, and scheduled **Cron Agents**. All agents run as OpenClaw sessions with different lifecycle rules.

---

## 1. Agent Types

### 1.1 Main Agent

The user's primary interface. One per user, persistent across sessions.

```yaml
type: main
session_id: "agent:main:main"
model: anthropic/claude-opus-4-6      # best available
context_window: 200k
memory_access: full                    # SOUL.md, MEMORY.md, daily files, graph
tools: all                             # full tool access
lifecycle: persistent                  # survives restarts
can_spawn: [sub-agent, specialist, cron]
autonomy: per-user config              # see autonomy-levels.md
```

**Responsibilities:**
- Direct user conversation
- Task decomposition and delegation
- Memory curation (MEMORY.md, daily files)
- Heartbeat-driven proactive work
- Orchestrating multi-step workflows

### 1.2 Sub-Agents

Ephemeral workers spawned for specific tasks. No user interaction. Die after returning results.

```yaml
type: sub-agent
session_id: "agent:main:subagent:{uuid}"
model: anthropic/claude-sonnet-4-20250514  # cheaper default, configurable
context_window: 128k
memory_access: none                        # only injected context
tools: restricted                          # per spawn config
lifecycle: ephemeral                       # deleted after completion
can_spawn: none                            # no recursive spawning by default
max_turns: 50
timeout: 300s                              # 5 min default
```

**Injected context at spawn:**
```typescript
interface SubAgentContext {
  task: string;                    // what to do
  context: string;                 // relevant files, conversation snippets
  constraints: {
    tools: string[];               // allowed tool names
    max_turns: number;
    timeout_seconds: number;
    model: string;
    autonomy_level: 'green' | 'yellow' | 'red';
  };
  return_format?: string;          // expected output structure
  parent_session: string;          // for result delivery
  channel: string;                 // telegram, discord, etc.
}
```

**Example spawn scenarios:**
- Write a document (tools: read, write, edit, web_search)
- Research a topic (tools: web_search, web_fetch, read, write)
- Refactor code (tools: read, write, edit, exec)
- Analyze an image (tools: image, read, write)

### 1.3 Specialist Agents

Pre-configured sub-agents with domain-specific system prompts, tool sets, and model choices. Defined in config, invoked by name.

```yaml
# ~/kira/config/specialists.yaml
specialists:
  researcher:
    model: anthropic/claude-sonnet-4-20250514
    system_prompt_file: prompts/researcher.md
    tools: [web_search, web_fetch, read, write]
    timeout: 600s
    max_turns: 100
    description: "Deep web research with source tracking"

  code-reviewer:
    model: anthropic/claude-sonnet-4-20250514
    system_prompt_file: prompts/code-reviewer.md
    tools: [read, exec]
    timeout: 300s
    max_turns: 30
    description: "Code review with security and style analysis"

  writer:
    model: anthropic/claude-opus-4-6
    system_prompt_file: prompts/writer.md
    tools: [read, write, edit, web_search]
    timeout: 600s
    max_turns: 80
    description: "Long-form writing, editing, and content creation"

  widget:
    model: google/gemini-2.0-flash-001  # fast and cheap
    system_prompt_file: prompts/widget-agent.md
    tools: [read]
    timeout: 10s
    max_turns: 1
    description: "Structured JSON widget generation"
    # see widget-agent.md for full spec
```

### 1.4 Cron Agents

Isolated sessions triggered by schedule. No access to main session history. Results delivered via message or file.

```yaml
type: cron-agent
session_id: "agent:main:cron:{job_id}:{timestamp}"
model: per-job config
memory_access: read-only               # can read memory files, not main session
tools: per-job config
lifecycle: ephemeral
delivery: channel or file              # where results go
```

See `cron-system.md` for full specification.

---

## 2. Agent Lifecycle

### 2.1 Spawn

```
┌──────────┐     spawn()      ┌──────────────┐
│  Parent   │ ──────────────→  │  Sub-Agent    │
│  Agent    │                  │  Session      │
│           │  ← session_id ── │  (created)    │
└──────────┘                   └──────────────┘
```

**Who can spawn:**
| Spawner | Can Spawn | Requires Approval |
|---------|-----------|-------------------|
| Main Agent | sub-agent, specialist, cron | No |
| Sub-Agent | Nothing (default) | N/A |
| Sub-Agent (elevated) | sub-agent only | Parent must grant `can_spawn: true` |
| Cron Agent | sub-agent only | Pre-configured in job definition |
| User (direct) | Any | N/A (they're the authority) |

**Spawn parameters:**
```typescript
interface SpawnRequest {
  type: 'sub-agent' | 'specialist';
  specialist_name?: string;            // if type is specialist
  task: string;
  context?: string;                    // injected context
  files?: string[];                    // file paths to include
  model?: string;                      // override default
  tools?: string[];                    // tool allowlist
  max_turns?: number;                  // default 50
  timeout_seconds?: number;            // default 300
  can_spawn?: boolean;                 // allow recursive spawning
  return_to?: 'parent' | 'channel';   // where results go
  label?: string;                      // human-readable name
  priority?: 'low' | 'normal' | 'high';
}
```

**Resource limits at spawn:**
```typescript
const SPAWN_LIMITS = {
  max_concurrent_agents: 5,            // per user
  max_total_agents: 20,                // system-wide
  max_depth: 2,                        // agent → sub-agent → sub-sub-agent (max)
  max_turns_per_agent: 200,
  max_timeout_seconds: 3600,           // 1 hour absolute max
  token_budget_per_agent: 500_000,     // ~$2 for sonnet
};
```

### 2.2 Execute

Once spawned, agents run autonomously within their constraints.

**Execution flow:**
1. Session created with system prompt + injected context
2. Task message sent as first user turn
3. Agent works using available tools
4. Each turn checked against limits (turns, tokens, timeout)
5. Agent produces final response or hits a limit

**Tool access control:**
```typescript
// Tools are filtered at the session level
const toolPolicy = {
  // Sub-agents never get these unless explicitly granted
  dangerous: ['message', 'nodes'],
  
  // Always available to any agent
  safe: ['read', 'write', 'edit', 'exec', 'web_search', 'web_fetch'],
  
  // Specialist-specific
  restricted: {
    widget: ['read'],                  // widget agent only reads schemas
    'code-reviewer': ['read', 'exec'], // no writes
  }
};
```

**Timeout handling:**
```
t=0        Agent starts
t=timeout  Soft kill: inject "TIMEOUT: wrap up now" message, 1 more turn
t=timeout+30s  Hard kill: session terminated, partial results extracted
```

### 2.3 Return

```
┌──────────────┐   final message    ┌──────────┐
│  Sub-Agent   │ ─────────────────→ │  Parent   │
│  (complete)  │                    │  Agent    │
└──────────────┘                    └──────────┘
```

**Result delivery:**
```typescript
interface AgentResult {
  session_id: string;
  label: string;
  status: 'completed' | 'timeout' | 'error' | 'cancelled';
  result: string;                      // final message content
  files_created: string[];             // paths of files written
  files_modified: string[];
  token_usage: {
    input: number;
    output: number;
    total_cost_usd: number;
  };
  duration_seconds: number;
  error?: string;
}
```

**Return modes:**
- **Synchronous (default):** Parent waits, result injected into parent's conversation
- **Background:** Parent continues working, result delivered as notification when ready
- **Channel delivery:** Result sent directly to user via message tool (for cron agents)

### 2.4 Cleanup

After an agent completes:

1. **Extract artifacts:** Files written are cataloged
2. **Memory extraction:** If the sub-agent discovered important facts:
   ```typescript
   // Parent reviews sub-agent output and decides what to persist
   // Sub-agents can write to memory/ files directly if given write access
   // Parent curates into MEMORY.md during heartbeats
   ```
3. **Session deletion:** Ephemeral sessions are deleted after result delivery
4. **Cost logging:** Token usage recorded to `memory/agent-costs.json`

```typescript
// memory/agent-costs.json
{
  "2026-02-11": {
    "agents_spawned": 4,
    "total_input_tokens": 125000,
    "total_output_tokens": 45000,
    "total_cost_usd": 1.23,
    "by_type": {
      "sub-agent": { "count": 2, "cost": 0.45 },
      "specialist:researcher": { "count": 1, "cost": 0.60 },
      "specialist:widget": { "count": 1, "cost": 0.02 }
    }
  }
}
```

---

## 3. Communication

### 3.1 Parent → Child

Context is injected at spawn time via the system prompt and first message.

```markdown
# Subagent Context

You are a **subagent** spawned by the main agent for a specific task.

## Your Role
- You were created to handle: {task_description}
- Complete this task. That's your entire purpose.

## Injected Context
{context_block}

## Files Available
{file_list}

## Rules
1. Stay focused — do your assigned task, nothing else
2. Complete the task — your final message is your deliverable
3. Don't initiate user conversations
4. Be ephemeral — you may be terminated after completion

## Output Format
{return_format or "Return your results as your final message."}
```

### 3.2 Child → Parent

The child's **final message** is the result. For long-running tasks, intermediate status can be communicated via files:

```bash
# Sub-agent writes progress to a known path
echo "Step 3/5: Analyzing dependencies..." > /tmp/agent_{session_id}_status.txt
```

Parent can poll this file during background execution.

### 3.3 Agent → Agent (Peer Communication)

For advanced workflows where agents need to coordinate:

```typescript
// Via OpenClaw sessions_send
await sessions_send({
  target_session: "agent:main:subagent:{other_uuid}",
  message: "Here are the API specs you need: ..."
});
```

**Use cases:**
- Pipeline: Agent A produces data → Agent B consumes it
- Fan-out: Main spawns 3 researchers, they write to shared files
- Coordination: One agent blocks until another writes a signal file

**Current limitation:** Direct agent-to-agent messaging is not yet implemented. Use shared files as the communication medium.

### 3.4 Agent → User

```typescript
// Sub-agents should NOT message users directly (except cron agents)
// Results flow: sub-agent → parent → user

// Cron agents deliver via message tool:
await message({
  action: 'send',
  target: user_chat_id,
  message: "☀️ Good morning! Here's your daily briefing..."
});
```

---

## 4. Resource Management

### 4.1 Concurrent Agent Limits

```typescript
const RESOURCE_CONFIG = {
  // Per-user limits
  user: {
    max_concurrent_sub_agents: 5,
    max_concurrent_cron_agents: 3,
    max_daily_agent_spawns: 100,
    max_daily_cost_usd: 10.00,
  },
  
  // System-wide limits
  system: {
    max_total_agents: 50,
    max_queue_depth: 100,
    queue_timeout_seconds: 300,        // max wait in queue
  }
};
```

### 4.2 Token Budgets

```typescript
const TOKEN_BUDGETS = {
  main: {
    model: 'anthropic/claude-opus-4-6',
    max_context: 200_000,
    // No per-turn limit, but context management applies
  },
  'sub-agent': {
    model: 'anthropic/claude-sonnet-4-20250514',
    max_tokens_total: 500_000,          // lifetime of the agent
    max_output_per_turn: 16_000,
  },
  specialist: {
    // Inherits from specialist config
    // Widget uses flash model (~$0.001 per call)
    // Researcher may use opus for quality
  },
  cron: {
    model: 'anthropic/claude-sonnet-4-20250514',  // default
    max_tokens_total: 200_000,
  }
};
```

### 4.3 Model Selection Strategy

| Agent Type | Default Model | When to Upgrade | When to Downgrade |
|-----------|---------------|-----------------|-------------------|
| Main | opus | Never (user-facing quality matters) | — |
| Sub-Agent | sonnet | Complex reasoning, long documents | Simple file ops → haiku |
| Widget | flash | Never needed | — |
| Cron | sonnet | Analysis-heavy jobs → opus | Status checks → haiku |
| Researcher | sonnet | Deep analysis → opus | Quick lookups → haiku |

### 4.4 Queue Management

When at capacity:

```
┌─────────┐     ┌─────────┐     ┌──────────┐
│ Spawn   │ ──→ │ Queue   │ ──→ │ Execute  │
│ Request │     │ (FIFO)  │     │          │
└─────────┘     └─────────┘     └──────────┘
                     │
                     ├── Priority ordering (high > normal > low)
                     ├── Timeout after 300s in queue
                     └── Parent notified of queue position
```

**Priority rules:**
- `high`: User-initiated, interactive tasks (cuts the queue)
- `normal`: Standard sub-agent work
- `low`: Background research, maintenance, cron overflow

---

## 5. Example Flows

### 5.1 User Asks for Research + Document

```
User: "Research the latest advances in battery technology and write me a summary"

Main Agent:
  1. Spawns specialist:researcher with task "Research battery tech advances 2025-2026"
     - Tools: web_search, web_fetch, read, write
     - Output: writes findings to ~/kira/tmp/battery-research.md
     
  2. Waits for researcher to complete (background)
  
  3. On completion, spawns specialist:writer with:
     - Task: "Write a polished summary from research notes"
     - Context: contents of ~/kira/tmp/battery-research.md
     - Output: writes to ~/kira/output/battery-summary.md
     
  4. Delivers final document to user
```

### 5.2 Parallel Sub-Agent Fan-Out

```
User: "Compare pricing of AWS, GCP, and Azure for our workload"

Main Agent:
  1. Spawns 3 sub-agents simultaneously:
     - sub-agent-1: "Research AWS pricing for {workload_spec}"
     - sub-agent-2: "Research GCP pricing for {workload_spec}"  
     - sub-agent-3: "Research Azure pricing for {workload_spec}"
     
  2. Each writes results to ~/kira/tmp/pricing-{provider}.md
  
  3. Main agent synthesizes all three into comparison
  4. Delivers to user
```

### 5.3 Widget Generation

```
User: "Show me a chart of my git commits this week"

Main Agent:
  1. Runs `git log --since="1 week ago" --format=...` to get data
  2. Spawns specialist:widget with:
     - Task: "Generate bar chart widget for git commit data"
     - Context: { type: "bar_chart", data: [...] }
     - Timeout: 10s
     
  3. Widget agent returns JSON:
     { "widget": "bar_chart", "data": {...}, "options": {...} }
     
  4. Main agent renders via canvas
```
