---
name: agent-fleet
description: Orchestrate parallel Claude Code / Codex agents across git worktrees. Monitor progress, collect output, merge results. Use when dispatching multiple coding tasks in parallel.
metadata:
  { "openclaw": { "emoji": "🚢", "requires": { "anyBins": ["claude", "codex"] } } }
---

# Agent Fleet — Parallel Coding Agent Orchestration

Manage groups of Claude Code or Codex agents working on a shared codebase in parallel git worktrees.

## Architecture

```
Main repo (/tmp/kira-test)
├── worktree: /tmp/fleet-security     (branch: fix/security)
├── worktree: /tmp/fleet-backend      (branch: fix/backend)
├── worktree: /tmp/fleet-frontend     (branch: feat/frontend)
└── worktree: /tmp/fleet-design       (branch: feat/design)
```

Each agent gets its own worktree = own branch = no conflicts.

## Usage

### 1. Setup Fleet

```bash
# Create fleet state file
node ~/kira/skills/agent-fleet/fleet.js init <repo-path>

# Add agents to fleet
node ~/kira/skills/agent-fleet/fleet.js add \
  --name "security" \
  --branch "fix/security" \
  --prompt "prompts/FIX-001.md" \
  --workdir "/tmp/fleet-security"
```

### 2. Launch Fleet

```bash
# Launch all agents (creates worktrees + starts claude processes)
node ~/kira/skills/agent-fleet/fleet.js launch

# Or launch specific agent
node ~/kira/skills/agent-fleet/fleet.js launch --name security
```

### 3. Monitor Fleet

```bash
# Dashboard: shows all agents, commits, status, last activity
node ~/kira/skills/agent-fleet/fleet.js status

# Tail an agent's output (reads PTY log)
node ~/kira/skills/agent-fleet/fleet.js tail --name security

# Watch all agents (refreshes every 10s)
node ~/kira/skills/agent-fleet/fleet.js watch
```

### 4. Collect Results

```bash
# Push all branches
node ~/kira/skills/agent-fleet/fleet.js push

# Cleanup worktrees
node ~/kira/skills/agent-fleet/fleet.js cleanup
```

## Key Principle

Agents are organized by **deliverable group**, not by file type:

| Group | Scope | Example |
|-------|-------|---------|
| Security | All security fixes across all layers | FIX-001 through FIX-008 |
| Backend | API routes, engine, jobs | TASK-013, TASK-015 |
| Frontend | React pages, components, hooks | TASK-018, TASK-020 |
| Design | Design docs, specs, architecture | Research + specs |
| Product | Full-stack features (chat, onboarding) | TASK-016, TASK-019 |

## PTY Output Capture

The main problem with Claude Code in background: PTY output is buffered and invisible.

**Solution:** Use `script` command to capture PTY output to a log file:

```bash
script -q -c "claude --dangerously-skip-permissions -p 'YOUR PROMPT'" /tmp/fleet-security/agent.log
```

Then `tail -f /tmp/fleet-security/agent.log` shows real-time output.

The fleet.js tool does this automatically.

## Progress Detection

Since PTY output is unreliable, fleet.js uses multiple signals:
1. **Git commits** — most reliable. `git log --oneline main..HEAD`
2. **File changes** — `git status --short` shows work in progress
3. **Process state** — `ps -p PID -o stat=` (R=running, S=sleeping, Z=zombie)
4. **Log file** — if using `script` wrapper, tail the log
5. **Worktree mtime** — `find worktree -newer last-check -name '*.ts'`
