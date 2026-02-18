# oopuo / Chimera — Naming & Corporate Structure Workshop

**Created:** 2026-02-02
**Author:** Kira ⚡
**Status:** Workshop Document for Otto Review

---

## Executive Summary

After reviewing the codebase and documentation, here's the current state clarified:

| Name | What It Actually Is | Status |
|------|---------------------|--------|
| **Chimera** | Privacy-preserving AI protocol (IP) | Active development, 315 tests |
| **oopuo** | Terminal-aesthetic project management software | Abandoned/dormant |
| **moltbot-core** | Multi-agent spawning infrastructure | Active, in use |
| **OTTOGEN** | Personal brand / holding company | Active branding |

**Key Finding:** There's a naming collision. "oopuo" currently refers to a *software product*, but Otto wants it as an *operations company* name.

---

## 1. Technical Architecture Context

### What Is the "Protocol" (Chimera)?

Chimera is a **Split-Brain architecture** for privacy-preserving AI compute:

```
┌─────────────────────────────────────────────────────────────┐
│  CONSULTANT (Local, Private)                                │
│  • Runs on user's device                                    │
│  • Holds actual private data                                │
│  • Transforms data into "Job Tickets" (anonymized tasks)    │
│  • Uses small/cheap local models                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ ZK Membrane (Zero-Knowledge Bridge)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  SAVANTS (Distributed, Blind)                               │
│  • Stateless ephemeral workers                              │
│  • Execute Job Tickets without knowing who sent them        │
│  • Self-terminate on completion                             │
│  • Never see identity, only the task                        │
└─────────────────────────────────────────────────────────────┘
```

**Core Properties:**
- **Distributed** — No central server. No "Chimera HQ" to raid.
- **Unkillable** — Usage = uptime. As long as people use it, it exists.
- **Privacy-first** — Cryptographic separation between identity and execution.
- **Self-sustaining** — Nodes contribute compute, receive tokens/access in return.

**Inspired By:** BitTorrent (resilience), Ethereum (token incentives), Tor (unkillable), Folding@Home (donate compute)

### What Does Chimera Actually DO?

1. **Blind Compute** — Run AI workloads on untrusted nodes without exposing data
2. **Job Orchestration** — Consultant plans, Savants execute
3. **Privacy Preservation** — ZK proofs verify "right to access" without revealing "who is accessing"
4. **Self-Evolution** — Savants observe operations and propose improvements

### Products/Services Within Chimera Ecosystem

| Component | Purpose | Status |
|-----------|---------|--------|
| Memory Graph | SQLite + embeddings for entity/relation storage | ✅ 35 tests |
| Observer | Session log analysis | ✅ 13 tests |
| Analyzer | Pattern detection | ✅ 10 tests |
| Generator | Code generation | ✅ Tests |
| Curator | Knowledge extraction | ✅ Tests |
| Savant Manager | Multi-agent orchestration | ✅ Tests |
| Voice Pipeline | TTS for natural dialogue | ✅ Tests |
| Pipeline | End-to-end request processing | ✅ 14 tests |

**Total: 315 passing tests** — This is substantial infrastructure.

### What Is moltbot-core?

**Moltbot** = "Multi-agent Clawdbot instance"

It's the infrastructure for spawning specialized Clawdbot agents, each with:
- Its own Telegram bot
- Its own workspace
- Its own SOUL/personality
- Its own systemd service

```
Otto (Telegram)
├── @kira_bot (orchestrator)
├── @chimera_marketing_bot (moltbot: marketing focus)
├── @interior_vdr_bot (moltbot: interior design)
└── @project_x_bot (moltbot: any project)
```

**"Moltbot-core"** is the provisioning/management toolkit, not a product itself. It's internal tooling.

---

## 2. Protocol Naming Analysis

### Is "Chimera" Technically Accurate?

**Mythological Chimera:** A creature composed of parts from different animals (lion head, goat body, serpent tail). It represents something that's a hybrid of seemingly incompatible parts.

**Technical Chimera (this protocol):**
- Local Consultant + Distributed Savants (hybrid architecture)
- Privacy + Public compute (seemingly incompatible goals)
- Small local models + Large distributed models (hybrid intelligence)

**Verdict: ✅ YES** — "Chimera" is conceptually accurate. The protocol IS a chimera: a hybrid entity that shouldn't exist but does.

### Alternative Protocol Names (3-5 with rationale)

| Name | Rationale | Pros | Cons |
|------|-----------|------|------|
| **Chimera** | Hybrid nature, mythological power | Memorable, accurate, distinctive | May confuse with ML "chimera" (merged models) |
| **Blindspot** | Savants execute in a "blind spot" where they can't see identity | Evocative of privacy, easy to explain | Negative connotation (weakness) |
| **Shroud** | Data is shrouded/veiled from executors | Privacy-first connotation, mysterious | Too abstract, hard to market |
| **Membrane** | Reference to the ZK Membrane that bridges private/public | Technical accuracy, biological metaphor | Too technical, forgettable |
| **Specter** | Invisible/untraceable like a ghost | Cool factor, privacy implication | Overused in tech, spooky |
| **Veil** | Data hidden behind a cryptographic veil | Simple, clear, privacy-focused | Generic, many competitors |

### Recommendation: Keep "Chimera"

**Reasons:**
1. Already 315 tests referencing it — renaming has technical debt
2. Conceptually accurate — this IS a chimera architecture
3. Memorable and distinctive
4. Good domain availability potential (chimera.protocol, chimera.network)
5. Aligns with "unkillable" mythology (you can't kill a chimera easily)

**Trademark consideration:** Search for "Chimera" in AI/crypto space. If clear, proceed. If not, consider "Chimera Protocol" as the full name.

---

## 3. Operations Company Naming

### Current Confusion

"oopuo" currently refers to **terminal-aesthetic project management software** (`~/oopuo/`), not an operations company.

### What Does "oopuo" Mean?

Based on the codebase, "oopuo" appears to be a stylized/leetspeak variation or abstract name. No documented meaning found.

**Visual analysis:** `oopuo` is a palindrome-like structure. Could be:
- Abstract tech name (like "Asana", "Notion")
- Phonetic play ("oo-poo-oh"?)
- Initialism that's been forgotten

### Does "oopuo" Work as Operations Company?

| Factor | Assessment |
|--------|------------|
| **Pronounceability** | ⚠️ Unclear — "oo-poo-oh"? "oh-poo-oh"? |
| **Memorability** | ⚠️ Low — no semantic hook |
| **OTTOGEN alignment** | ❌ No connection to personal brand |
| **Professionalism** | ⚠️ Sounds like a startup name from 2010 |
| **Domain availability** | ✅ Likely available |

### Alternative Operations Company Names

| Name | Rationale | OTTOGEN Fit |
|------|-----------|-------------|
| **OttoWorks** | Direct connection to founder | ✅ High |
| **OttoLabs** | "Labs" implies R&D, experimentation | ✅ High |
| **OTTO Industries** | Serious, industrial feel | ✅ Medium |
| **GenLabs** | From OTTOGEN, implies next-gen | ✅ High |
| **Vertex Labs** | Vertex = point where lines meet (systems thinking) | ⚡ Medium |
| **Foundry** | Where things are forged/built | ⚡ Medium |

### Recommendation: **OttoLabs** or **OttoWorks**

**Reasons:**
1. Direct connection to OTTOGEN personal brand
2. Professional and serious
3. Clear pronunciation
4. "Labs" implies the R&D/experimentation nature of the portfolio
5. Easy to explain: "OttoLabs is the operations company that builds/maintains the Chimera protocol"

**Alternative:** If Otto wants distance between personal brand and ops company, use **Foundry** or **Vertex Labs**.

---

## 4. Production Software (/oopuo directory)

### Current State

The `/oopuo` directory contains a **terminal-aesthetic project management dashboard**:
- Next.js frontend + FastAPI backend
- Neo4j task graph, Pomodoro timer, Notes
- Terminal aesthetic (Catppuccin colors, ASCII art)
- ~45k lines of design spec but appears incomplete/unused

### Decision: DROP or RENAME?

**Factors:**
| Factor | Assessment |
|--------|------------|
| **Is it being used?** | ❌ No recent activity, plan says "use Notion + Telegram instead" |
| **Does it solve a real problem?** | ⚠️ Notion + Telegram already solve most of it |
| **Is it unique?** | ⚠️ Terminal aesthetic is cool but not a moat |
| **Opportunity cost** | ✅ High — time better spent on Chimera |

### Recommendation: **DROP IT**

**Reasoning:**
1. The stated plan is "Use Notion + Telegram instead" — follow that
2. Chimera has 315 tests and clear vision; /oopuo has specs but no momentum
3. "oopuo-OS" is a nice-to-have, not a need-to-have
4. Mental bandwidth is finite

**Action Items:**
1. Archive the `/oopuo` directory (don't delete — might revisit)
2. Free up the "oopuo" name for the operations company IF you want to keep it
3. Document decision in MEMORY.md

**If kept later:** Rename to something like **Console** or **Dash** or **Terminal** — generic productivity tool names.

---

## 5. moltbot-core Assessment

### What Is It?

Infrastructure for spawning and managing multiple Clawdbot instances ("moltbots").

### Is the Name Appropriate?

**"Moltbot"** = Multi-agent Clawdbot? Molt + bot (shedding/evolving)?

The name is **fine for internal tooling**. It doesn't need to be customer-facing.

### Recommendation: **KEEP AS-IS**

This is infrastructure, not a product. The name is descriptive enough for internal use.

---

## 6. Corporate Structure Diagram

### Current Understanding

```
┌─────────────────────────────────────────────────────────────┐
│  OTTO VAN [LASTNAME] (Personal)                             │
│                                                             │
│  OTTOGEN Personal Brand                                     │
│  ├── ottogen.io (website)                                   │
│  ├── Content & thought leadership                           │
│  └── Portfolio visibility                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌───────────────────┐     ┌───────────────────────────────────┐
│ PROTOCOL ENTITY   │     │ OPERATIONS ENTITY                 │
│ (IP Holding)      │     │ (OttoLabs / oopuo)                │
│                   │     │                                   │
│ • Chimera IP      │     │ • Contracts with clients          │
│ • Admin/control   │     │ • Employment                      │
│ • Single-owner    │     │ • Private equity potential        │
│                   │     │ • Long-term Chimera maintenance   │
│   └── Property Co │     │   contract                        │
│       (assets)    │     │                                   │
└───────────────────┘     └───────────────────────────────────┘
```

### Proposed Clean Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    OTTO (Individual)                         │
│                                                             │
│  Personal brand: OTTOGEN                                    │
│  Website: ottogen.io                                        │
└─────────────────┬───────────────────────────────────────────┘
                  │ 100% ownership
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              OTTO HOLDING BV (or similar)                   │
│                                                             │
│  Purpose: Tax-efficient holding, asset protection           │
│  Holds: All equity in portfolio companies                   │
└───────────┬─────────────────────────────┬───────────────────┘
            │                             │
    ┌───────┴───────┐             ┌───────┴───────┐
    ▼               ▼             ▼               ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│ Chimera  │  │ OttoLabs │  │ZenithCred│  │ Other        │
│ Protocol │  │ (Ops)    │  │          │  │ Portfolio    │
│ BV       │  │          │  │          │  │ Companies    │
│          │  │ Service  │  │          │  │              │
│ IP owner │  │ contract │  │          │  │ Sentinagro   │
│          │◀─┤ with     │  │          │  │ IAM          │
│          │  │ Chimera  │  │          │  │ CuttingEdge  │
└──────────┘  └──────────┘  └──────────┘  └──────────────┘
```

### Entity Purposes

| Entity | Purpose | Notes |
|--------|---------|-------|
| **Otto Holding BV** | Tax-efficient holding, centralized control | Dutch structure |
| **Chimera Protocol BV** | Owns Chimera IP, receives licensing revenue | Could be foundation later |
| **OttoLabs BV** | Operations: clients, employees, maintenance contracts | Main operating company |
| **Portfolio companies** | Individual ventures in different sectors | Separate liability |

### Why This Structure?

1. **IP Protection** — Chimera IP is isolated from operational risk
2. **Service Model** — OttoLabs has a service contract with Chimera Protocol (revenue flows cleanly)
3. **Exit Flexibility** — Can sell OttoLabs without selling protocol, or vice versa
4. **Investor-Friendly** — Clear separation that VCs/angels understand
5. **DePIN Ready** — Protocol entity could become a foundation with token governance later

---

## 7. Terminology Glossary

### Internal Use (Technical)

| Term | Definition |
|------|------------|
| **Chimera** | The Split-Brain privacy-preserving AI protocol |
| **Consultant** | Local agent that holds private data, creates Job Tickets |
| **Savant** | Stateless blind worker that executes Job Tickets |
| **ZK Membrane** | Zero-knowledge bridge between Consultant and Savants |
| **Job Ticket** | Anonymized task instruction (intent without identity) |
| **Moltbot** | Specialized Clawdbot instance for a specific project |
| **moltbot-core** | Provisioning/management toolkit for moltbots |
| **VDR** | Virtual Data Room (file-based knowledge store) |

### External / Marketing

| Term | Definition | Use When |
|------|------------|----------|
| **Chimera Protocol** | Full product name | Press, investors |
| **Privacy-preserving AI infrastructure** | Category description | Explaining to non-technical |
| **Blind compute** | Key capability | Technical audiences |
| **Split-Brain architecture** | Technical architecture | Developer marketing |
| **OttoLabs** | Operations company | Client contracts, hiring |
| **OTTOGEN** | Personal brand | Content, speaking, public presence |

---

## 8. Final Recommendations

### ✅ KEEP

| Item | Reason |
|------|--------|
| **Chimera** (protocol name) | Accurate, memorable, substantial codebase |
| **moltbot-core** (internal) | Working infrastructure, internal use only |
| **OTTOGEN** (personal brand) | Established, documented strategy |

### 🔄 RENAME

| Current | Proposed | Reason |
|---------|----------|--------|
| "oopuo" (ops company) | **OttoLabs** | Brand alignment, professionalism |

### 🗑️ DROP

| Item | Reason |
|------|--------|
| **/oopuo directory** (software) | Stated plan: use Notion + Telegram. Archive, don't delete. |
| "oopuo" (as software name) | Freed up by dropping the software |

### 📋 ACTION ITEMS

1. **Decide on ops company name:** OttoLabs vs. keeping oopuo
2. **Archive /oopuo directory:** `mv ~/oopuo ~/archive/oopuo-os-2026`
3. **Register domains:** ottolabs.io (or chosen name), chimera.protocol
4. **Update MEMORY.md:** Document these decisions
5. **Legal:** Consult on Dutch BV structure for holding + operating companies
6. **Trademark search:** "Chimera" in AI/blockchain space

---

## 9. Open Questions for Otto

1. **oopuo meaning:** Do you know what "oopuo" was supposed to stand for?
2. **Ops company preference:** OttoLabs, OttoWorks, or keep oopuo?
3. **Protocol entity timing:** Set up Chimera Protocol BV now or wait for traction?
4. **/oopuo software:** Confirm archive decision? Any features to salvage?
5. **moltbot naming:** Is "moltbot" a play on "molt" (shedding/evolving) or just "multi-agent"?

---

*This workshop document prepared by Kira for Otto's review. Decisions should be made before investor conversations.*
