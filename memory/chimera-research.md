# Chimera Research: Prior Art

*Research conducted: 2026-01-30*

---

## Summary

Studied existing distributed compute / privacy-preserving networks to learn what works, what doesn't, and what Chimera can learn from them.

---

## 1. Golem Network

**What it is:** Decentralized compute marketplace. Providers share unused resources, Requestors pay GLM tokens.

**Architecture:**
- **Yagna** - Core service running on all nodes
- **Provider** - Shares compute, earns GLM
- **Requestor** - Submits tasks, pays GLM
- **Exe-units** - Execute tasks in VMs (GVMI images)
- **Market** - Matches Offers (providers) with Demands (requestors)

**Payment:** GLM token, primarily on Polygon (L2) for low fees

**What works:**
- Simple provider/requestor split
- Market-based pricing
- VM isolation for execution

**What doesn't:**
- No privacy - providers see what they're computing
- Requires Linux x86-64 with nested virtualization
- Limited adoption despite years of development

**Chimera relevance:** ⭐⭐⭐
- Good model for the Savant side
- Need to add privacy layer on top

---

## 2. Akash Network

**What it is:** Decentralized cloud, focused on AI/GPU workloads. "Supercloud."

**Architecture:**
- Kubernetes-based deployment
- Providers run datacenter hardware
- Users deploy containers via SDL (Stack Definition Language)
- AKT token for payments

**What works:**
- Real GPU compute at lower cost than AWS
- Kubernetes familiarity for developers
- Growing ecosystem for AI workloads

**What doesn't:**
- Still centralized trust model (you trust the provider)
- No privacy - providers see your workloads
- Focused on cloud replacement, not privacy

**Chimera relevance:** ⭐⭐
- Shows demand for decentralized AI compute
- No privacy model - not our path

---

## 3. Nillion

**What it is:** "Humanity's first blind computer" - secure computation without revealing data.

**Architecture:**
- **Nil Message Compute (NMC)** - Their core tech
- Decentralizes trust for high-value data
- Compute on encrypted data

**What works:**
- True blind compute - nodes never see plaintext
- Information-theoretic security (not just computational)
- Built for AI/ML use cases

**What doesn't:**
- Still early stage
- Documentation sparse
- Unclear economic model

**Chimera relevance:** ⭐⭐⭐⭐⭐
- This is the closest to what we want
- Need to understand NMC deeply
- Could potentially build on or learn from their approach

---

## 4. Oasis Protocol

**What it is:** Privacy-preserving blockchain with confidential compute.

**Architecture:**
- **Consensus Layer** - Minimal PoS blockchain
- **Runtime Layer** - Independent state machines for each app
- Runtimes only submit proofs to consensus, not full state
- Uses TEEs (Trusted Execution Environments) for privacy

**What works:**
- Clean separation of concerns
- Proofs instead of full state = scalable
- TEE-based confidential computing

**What doesn't:**
- TEEs require specific hardware (Intel SGX)
- TEE security has been broken before
- Complex infrastructure

**Chimera relevance:** ⭐⭐⭐
- Consensus/Runtime split is elegant
- TEE approach has hardware dependencies
- Could learn from their architecture patterns

---

## 5. Secret Network

**What it is:** Privacy-preserving smart contracts on Cosmos.

**Architecture:**
- "Secret Contracts" - encrypted input, state, output
- Uses TEEs (Intel SGX)
- Private + public data in same contract
- Cosmos SDK based

**What works:**
- Programmable privacy (not just transfers)
- Real privacy for smart contracts
- Active ecosystem

**What doesn't:**
- TEE hardware requirements
- SGX vulnerabilities have been found
- Privacy is network-wide, not selective

**Chimera relevance:** ⭐⭐⭐
- Proves programmable privacy is possible
- TEE dependency is concerning
- Input/state/output encryption model is relevant

---

## Key Learnings for Chimera

### What Works
1. **Provider/Requestor split** - Clear roles (Golem, Akash)
2. **Token incentives** - Align economic interests
3. **Market-based pricing** - Let supply/demand find equilibrium
4. **Proof-based consensus** - Don't store full state (Oasis)

### What Doesn't Work
1. **TEE dependency** - Hardware lock-in, security concerns
2. **No privacy** - Golem/Akash providers see everything
3. **Complex onboarding** - Most require deep technical knowledge

### Open Questions
1. How does Nillion's NMC actually work? (Need deeper research)
2. Can we achieve blind compute without TEEs?
3. What's the right privacy tech: ZK proofs? MPC? FHE? Hybrid?

---

## Recommended Deep Dives

1. **Nillion NMC whitepaper** - Closest to our vision
2. **Multi-Party Computation (MPC)** - Foundation for blind compute
3. **Fully Homomorphic Encryption (FHE)** - Compute on encrypted data
4. **ZK-SNARKs/STARKs** - Proof systems for the membrane

---

## Next Steps

- [ ] Find and read Nillion's technical papers
- [ ] Study MPC fundamentals
- [ ] Map privacy tech options to Chimera requirements
- [ ] Define: What level of privacy do we actually need?

---

*Research continues. This document will be updated.*
