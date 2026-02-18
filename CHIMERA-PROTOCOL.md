# CHIMERA PROTOCOL

*The technical vision. Living document. Last updated: 2026-01-30*

---

## 1. Executive Summary

Chimera is a **Split-Brain architecture** for privacy-preserving AI compute that is:
- **Distributed** - No central server. No "Chimera HQ" to raid.
- **Unkillable** - Usage = uptime. As long as people use it, it exists.
- **Privacy-first** - Cryptographic separation between identity and execution.
- **Self-sustaining** - Nodes contribute compute, receive tokens/access in return.

---

## 2. Core Architecture

### 2.1 The Split-Brain

**Consultant (Private Executive)**
- Runs locally on user's device
- Contains actual private data (medical records, keys, financial history)
- Uses a local SLM (Small Language Model)
- Transforms private data into "Job Tickets" — anonymized instructions
- Job Tickets carry *intent* without *identity*

**Savant (Public Executor)**
- Stateless, blind workers
- Run in ephemeral containers on distributed nodes
- Execute Job Tickets without knowing who requested them
- Self-terminate upon completion
- Never see identity, only the task

**ZK Membrane (The Bridge)**
- Zero-Knowledge proofs connect Consultant ↔ Savant
- Verifies "right to access" without revealing "who is accessing"
- Cryptographic separation, not policy-based trust

**The Key Insight:**
```
[User] ←→ [Local Consultant] ←→ [Job Queue] ←→ [Distributed Savants]
         (realtime, private)     (async)        (public, blind, cheap)
```

- Local agent handles the relationship (voice, dialogue, planning)
- Distributed network is just labor
- Privacy is preserved because Savants never need private data
- Latency is hidden by async model - user talks locally while work queues

---

## 3. The Network Model

### 3.1 Design Principles

| Principle | Meaning |
|-----------|---------|
| **No Central Point** | Nothing to shut down. No server = no raid target. |
| **Usage = Uptime** | The system exists because people use it. No users = no network. |
| **Viral Spread** | Wherever there's a willing host, Chimera can live. |
| **Economic Alignment** | Contribute compute → receive tokens/platform access. |

### 3.2 How It Works

1. **Users** run Consultants locally (their private data never leaves)
2. **Node operators** contribute compute capacity to the network
3. **Job Tickets** flow from Consultants to available Savants
4. **Savants** execute blind, return results, self-terminate
5. **Tokens** flow to node operators based on compute contributed
6. **The network** grows/shrinks based on economic demand

### 3.3 Similar Patterns

| System | What We Learn |
|--------|---------------|
| **BitTorrent** | Resilience through decentralization. Peers = network. |
| **Ethereum** | Token incentives for participation. |
| **Tor** | "Can't shut it down" property. Onion routing for privacy. |
| **Folding@Home** | Donate compute for a cause model. |

Chimera applies these patterns to *private AI compute*.

---

## 4. Hard Problems (Status)

### 4.1 Bootstrap Problem
- Network has no value until it has compute
- No one contributes compute until there's value
- **Status:** Unsolved, but confidence is high. Go big: tech bubble, business bubble, broad public.

### 4.2 Privacy on Untrusted Nodes
- **SIMPLIFIED:** Distributed Savants are the PUBLIC layer (like Moltbook agent)
- Local Consultant holds all private data, never shares it
- Job Tickets are anonymized task instructions, not sensitive data
- **Status:** ✅ Mostly solved by architecture. Savants don't need private data.

### 4.3 Latency
- **SOLVED:** Local agent handles realtime interaction
- User talks to Consultant (instant, local)
- Consultant queues tasks to distributed Savants (async)
- Voice dialogue (STT-TTS) happens locally while background processes
- **Status:** ✅ Solved. Async model eliminates perceived latency.

### 4.4 Economic Balance
- Token rewards must match compute costs
- Too high = inflation, tokens worthless
- Too low = no participation, nodes leave
- **Status:** Unsolved. Gotta be profitable. Details TBD.

---

## 5. What We're NOT Building

- ❌ A centralized AI service with privacy promises
- ❌ An "ethical AI company" that could be acquired
- ❌ Infrastructure that depends on our servers staying up
- ❌ Something that can be turned off by governments or corporations

---

## 6. Open Questions

- What's the right container/sandbox technology for Savants?
- What blockchain/token system (if any) for incentives?
- How minimal can the Consultant be while still being useful?
- What's the MVP that proves the concept?
- Who are the first users willing to run nodes?

---

## 7. Research Needed

Before implementation, study:
- [ ] Golem Network (distributed compute)
- [ ] Akash Network (decentralized cloud)
- [ ] Render Network (GPU compute marketplace)
- [ ] Secret Network (private smart contracts)
- [ ] Oasis Protocol (confidential compute)
- [ ] Nillion (blind compute)

---

*Otto holds the vision. Kira holds the book. Together we figure out what gets built.*
