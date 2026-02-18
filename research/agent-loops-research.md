# Agent Loops Research: ReAct, Ralph-Wiggum & Agentic Patterns

*Compiled: 2026-01-24*

---

## TL;DR

Agent loops are structured patterns where AI systems **interleave reasoning and acting** in cycles. The core idea: don't just think OR act — do both, verify results, and iterate.

---

## 1. The Core Pattern: Observe → Think → Act → Verify → Loop

All effective agent loops share this structure:

```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌──────────┐    ┌──────────┐    ┌────────┐ │
│  │ OBSERVE  │───▶│  THINK   │───▶│  ACT   │ │
│  └──────────┘    └──────────┘    └────────┘ │
│       ▲                              │      │
│       │         ┌──────────┐         │      │
│       └─────────│  VERIFY  │◀────────┘      │
│                 └──────────┘                │
│                                             │
└─────────────────────────────────────────────┘
```

### The Steps:

1. **OBSERVE** — Gather information from environment (search, read, sense)
2. **THINK** — Reason about what you observed, plan next action
3. **ACT** — Execute a specific action (tool call, API request, command)
4. **VERIFY** — Check if action succeeded, observe new state
5. **LOOP** — If goal not met, return to step 1 with new information

---

## 2. ReAct Framework (Yao et al., 2022)

The foundational academic work on agent loops.

### Key Insight
> "Reasoning traces help the model induce, track, and update action plans as well as handle exceptions, while actions allow it to interface with external sources to gather additional information."

### The ReAct Format

```
Thought: I need to find out X to answer this question
Action: search[X]
Observation: [Results from search]
Thought: The search shows Y, but I still need Z
Action: search[Z]  
Observation: [Results from search]
Thought: Now I have enough information to answer
Action: finish[final answer]
```

### Why It Works

| Problem with Pure Reasoning | Problem with Pure Acting | ReAct Solution |
|----------------------------|-------------------------|----------------|
| Hallucination (makes up facts) | No planning, random actions | Grounds reasoning in real data |
| Error propagation | Can't recover from mistakes | Can update plans based on observations |
| No external knowledge | No explanation of choices | Interpretable decision traces |

### Results
- **HotpotQA**: ReAct outperformed Chain-of-Thought by grounding in Wikipedia
- **ALFWorld**: 34% absolute improvement over imitation learning
- **WebShop**: 10% improvement over RL baselines

---

## 3. The Ralph-Wiggum Loop (Practical Implementation)

A simplified, practical version for autonomous agents:

### Core Principles

1. **Never assume success** — Every action must be verified
2. **Observe before acting** — Read state before changing it
3. **Verify after acting** — Confirm the change happened
4. **Iterate on failure** — Try different approaches if verification fails

### Example Implementation

```markdown
## Task: Create a file with content "hello"

**Iteration 1:**
- Thought: I need to create test.txt with "hello"
- Action: echo "hello" > test.txt
- Verify: cat test.txt
- Observation: "hello" ✓
- Result: SUCCESS

## Task: Install package X

**Iteration 1:**
- Thought: I should install package X
- Action: npm install X
- Verify: npm list X
- Observation: "X@1.0.0" ✓
- Result: SUCCESS

## Task: Start service Y

**Iteration 1:**
- Thought: Start the service
- Action: systemctl start Y
- Verify: systemctl status Y
- Observation: "inactive (dead)" ✗
- Result: FAILED, need to iterate

**Iteration 2:**
- Thought: Check why it failed
- Action: journalctl -u Y -n 20
- Observation: "Missing config file /etc/Y/config.yml"
- Thought: Need to create config first
- Action: create config file
- Verify: ls /etc/Y/config.yml
- Observation: file exists ✓
- Action: systemctl start Y
- Verify: systemctl status Y
- Observation: "active (running)" ✓
- Result: SUCCESS
```

---

## 4. Advanced Patterns

### Reflexion (Shinn & Labash, 2023)

Adds **self-reflection** and **memory** to the loop:

```
┌─────────────────────────────────────────────┐
│  Standard ReAct Loop                        │
│  Thought → Action → Observation → ...       │
└─────────────────┬───────────────────────────┘
                  │
                  ▼ (on failure)
┌─────────────────────────────────────────────┐
│  REFLECT                                     │
│  "What went wrong? What should I do         │
│   differently next time?"                   │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  MEMORY                                      │
│  Store reflection for future attempts       │
└─────────────────────────────────────────────┘
```

### Hierarchical Agent Systems

For complex tasks, decompose into sub-agents:

```
┌─────────────────────────────────────────────┐
│  PLANNER AGENT                              │
│  Breaks task into subgoals                  │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│ Worker 1  │ │ Worker 2  │ │ Worker 3  │
│ (ReAct)   │ │ (ReAct)   │ │ (ReAct)   │
└───────────┘ └───────────┘ └───────────┘
```

---

## 5. Efficiency Tips

### Do ✓

- **Batch observations** — Gather multiple pieces of info before acting
- **Use caching** — Don't re-fetch data you already have
- **Fail fast** — If verification shows failure, iterate immediately
- **Set iteration limits** — Prevent infinite loops (typically 3-5 max)
- **Log everything** — Traces help debugging and learning

### Don't ✗

- **Don't skip verification** — "It probably worked" is not verification
- **Don't over-think** — Sometimes act first, think after observing result
- **Don't ignore errors** — Every error is information for the next iteration
- **Don't forget context** — Carry forward what you learned in previous iterations

---

## 6. When to Use Agent Loops

| Use Case | Good Fit? | Why |
|----------|-----------|-----|
| File operations | ✓ Yes | Easy to verify (ls, cat) |
| API calls | ✓ Yes | Check response codes |
| System administration | ✓ Yes | Service status, logs |
| Complex reasoning only | ✗ No | No external verification needed |
| Simple Q&A | ✗ No | Overkill, just answer |
| Multi-step tasks with uncertainty | ✓✓ Yes | Perfect use case |

---

## 7. Common Failure Modes

1. **Hallucinated verification** — Claiming success without actually checking
2. **Stuck loops** — Same action repeated without progress
3. **Observation overload** — Too much data, can't extract signal
4. **Action-observation mismatch** — Verifying the wrong thing
5. **Premature termination** — Stopping before goal is actually achieved

### Detection Heuristics (from Reflexion)

- **Inefficient planning**: Trajectory taking too long without success
- **Hallucination loop**: Same action → same observation repeatedly
- **Solution**: Trigger reflection, reset, try different approach

---

## 8. Implementation Checklist

```markdown
□ Define clear success criteria before starting
□ Implement observation step (gather state)
□ Implement action step (change state)  
□ Implement verification step (confirm change)
□ Add iteration counter with max limit
□ Log each step for debugging
□ Handle common failure modes
□ Add reflection on repeated failures
□ Test with intentionally failing scenarios
```

---

## Sources

1. **ReAct Paper**: Yao et al., 2022 — [arXiv:2210.03629](https://arxiv.org/abs/2210.03629)
2. **Reflexion**: Shinn & Labash, 2023 — [arXiv:2303.11366](https://arxiv.org/abs/2303.11366)
3. **LLM Agents Overview**: Lilian Weng — [lilianweng.github.io](https://lilianweng.github.io/posts/2023-06-23-agent/)
4. **Prompt Engineering Guide**: [promptingguide.ai/techniques/react](https://www.promptingguide.ai/techniques/react)

---

*This research compiled for Otto by Claude/Clawdbot*
