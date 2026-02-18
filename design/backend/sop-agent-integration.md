# Agent Orchestration with SOP Engine

> **Status:** 🔴 SCAFFOLD | **Phase:** 2
> **Updates:** `design/agents/multi-agent-system.md`

---

## Key Integration Points

- Agents registered in `agents` table, assigned to areas
- `executor_type = 'agent'` tasks → orchestrator assigns to specialist
- Agent work log feeds back into SOP (status updates, deliverable refs)
- Input queue items created by agents, resolved by humans
- Orchestrator uses dependency DAG for task assignment order

## TODO
- Map existing sub-agent spawning to agents table
- Define assignment algorithm (which agent gets which task)
- Define handoff protocol (agent → human, human → agent)
- Error recovery (agent fails mid-task)
- Cost budgets per agent per day
