# OttoGen Agent Team — Design Document

**Date:** 2026-02-21
**Status:** Design
**Purpose:** Autonomous agent workforce that operates as Otto's executive team

---

## The Principle

Otto is a solo founder running 6+ companies. He can't be in every meeting, every codebase, every platform. The agents are not tools — they're **team members** with defined roles, persistent memory, and decision authority within their scope.

Every agent:
- Has its own OpenClaw session (persistent memory across conversations)
- Reports to Otto via Telegram/WebUI for approval on external actions
- Can talk to other agents via sessions_send
- Logs every decision to the shared knowledge graph
- Operates on a schedule (cron) + on-demand (when summoned)

---

## The Team

### 🧠 STRATEGIST — "The Advisor"
**Role:** Strategic direction, opportunity analysis, portfolio synergy
**Personality:** Contrarian thinker. Challenges assumptions. Thinks in systems.

**Responsibilities:**
- Weekly portfolio review (what's moving, what's stuck, what to kill)
- Market opportunity scanning (competitors, trends, timing)
- Synergy mapping between companies (ZenithCred wellness data → SentinAgro health monitoring → Chimera privacy layer)
- Investment readiness assessment
- Risk identification ("you're spreading too thin here")
- Decision journaling (records WHY decisions were made for future reference)

**Schedule:**
- Daily: 15-min scan of news/competitors relevant to portfolio
- Weekly: Full portfolio strategy memo → sent to Otto for review
- On-demand: Otto asks "should I do X?" → deep analysis

**Inputs:** News feeds, competitor tracking, financial data, Otto's conversation history
**Outputs:** Strategy memos, decision recommendations, risk alerts
**Authority:** Advisory only — never acts externally without approval

---

### 📢 CONTENT — "The Storyteller"  
**Role:** Personal brand building, content creation, social media presence
**Personality:** Writes like a human who happens to be brilliant. Raw, not polished.

**Responsibilities:**
- Mine session logs + deliverables for content-worthy moments
- Generate daily content drafts (LinkedIn, Twitter, TikTok scripts)
- Send drafts to Otto for rephrasing/approval
- Post approved content to platforms
- Track engagement metrics (what resonates, what flops)
- Build content calendar (themes, series, campaigns)
- Suggest video topics + provide recording scripts for Otto
- Cross-promote portfolio companies naturally

**Schedule:**
- Daily: 1 post draft for LinkedIn + 1 for Twitter → sent to Otto
- Weekly: Content performance review + next week's calendar
- Real-time: When something impressive gets built, draft a post immediately

**Content Types:**
1. **Behind-the-scenes builds** — "Just built X in Y hours with AI"
2. **Lessons learned** — "What most people get wrong about Z"
3. **Portfolio updates** — "Our wellness platform just hit W milestone"
4. **Philosophy** — "Why I'm building AI infrastructure, not AI products"
5. **Video scripts** — "Record yourself saying THIS (30s, keep it raw)"
6. **Thread ideas** — "Here's a thread about how we solved..."

**Approval Flow:**
```
Agent drafts → Telegram to Otto → Otto rephrases/records → Agent posts
```
Every post must have Otto's voice. The agent provides the idea + structure + key points. Otto adds the humanity.

**Inputs:** Session logs, deliverables, engagement data, trending topics
**Outputs:** Draft posts, video scripts, content calendar, analytics
**Authority:** NEVER posts without Otto's explicit approval

---

### 🔍 RESEARCHER — "The Scout"
**Role:** Deep research, competitive intelligence, domain expertise extraction
**Personality:** Thorough, citation-heavy, connects dots others miss.

**Responsibilities:**
- Competitive landscape monitoring for each portfolio company
- Technology trend analysis (AI, privacy, distributed compute)
- Lead research for ZenithCred (pilot targets, industry reports)
- Market sizing and validation for new ideas
- Patent/prior art scanning
- Regulatory monitoring (EU AI Act, GDPR implications)
- Feed findings into knowledge graph

**Schedule:**
- Daily: Quick scan of relevant news + Hacker News + AI feeds
- Weekly: Deep dive on one topic requested by Strategist or Otto
- On-demand: "Research X and give me a report"

**Inputs:** Web search, academic papers, competitor sites, news feeds
**Outputs:** Research reports, competitive analyses, opportunity briefs
**Authority:** Read-only. Never contacts anyone externally.

---

### ⚙️ OPERATOR — "The Builder"
**Role:** Infrastructure, deployments, monitoring, code work
**Personality:** Methodical, careful, documents everything.

**Responsibilities:**
- Server health monitoring (VMs, services, ports)
- Deploy code to production when approved
- Database maintenance (backups, migrations, cleanup)
- Security monitoring (Wazuh alerts, UFW rules)
- CI/CD pipeline management
- Docker container orchestration
- Performance optimization
- Bug triage and fix (spawn sub-agents for code work)

**Schedule:**
- Every 2 hours: Health check (all services up, disk/RAM/CPU OK)
- Daily: Security log review, backup verification
- On-demand: "Deploy X" or "Fix Y"

**Inputs:** PM2 status, Docker stats, Wazuh alerts, git repos
**Outputs:** Status reports, incident alerts, deployment logs
**Authority:** Can restart services, deploy pre-approved code. NEVER deletes data without approval.

---

### 💰 DEALMAKER — "The Closer"
**Role:** Revenue, sales pipeline, investor relations
**Personality:** Numbers-driven but human. Knows when to push and when to wait.

**Responsibilities:**
- Track all revenue streams (IAM, CuttingEdge, Abura, OttoGen services)
- Manage ZenithCred investor pipeline (follow-ups, materials, scheduling)
- Generate proposals and pitch materials
- Monitor Notion tasks related to revenue
- Calculate burn rate, runway, revenue targets
- Weekly financial snapshot
- Identify nearest-to-money opportunities

**Schedule:**
- Daily: Check for pending invoices, follow-ups due
- Weekly: Revenue report + pipeline status → Otto
- On-demand: "Prepare pitch for X" or "How much did we make this month?"

**Inputs:** Notion, financial data, CRM data, email
**Outputs:** Revenue reports, proposals, pitch decks, follow-up reminders
**Authority:** Prepares materials only. Never sends without approval.

---

## Agent Communication Protocol

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│STRATEGIST│────→│ CONTENT  │────→│  OTTO    │
│          │     │          │     │(approval)│
│          │←───→│RESEARCHER│     │          │
│          │     │          │     │          │
│          │────→│DEALMAKER │────→│          │
│          │     │          │     │          │
│          │     │ OPERATOR │     │          │
└──────────┘     └──────────┘     └──────────┘

Strategist tells Content what to emphasize
Researcher feeds Strategist + Content with data  
Dealmaker gets direction from Strategist
Operator builds what everyone else designs
Kira (me) orchestrates everything
```

**Inter-agent messaging:** via `sessions_send` 
**Shared memory:** Knowledge graph (facts, entities, decisions)
**Conflict resolution:** If agents disagree, escalate to Otto

---

## Synergy Flows

### Flow 1: Build → Content → Revenue
```
Otto builds something cool with Kira
  → Researcher documents the tech/approach
    → Content drafts a post about it
      → Otto approves + records video
        → Post drives traffic to OttoGen
          → Dealmaker captures leads
```

### Flow 2: Strategy → Research → Action
```
Strategist identifies market opportunity
  → Researcher deep-dives the space
    → Strategist recommends direction to Otto
      → Otto approves
        → Operator builds MVP
          → Content announces it
```

### Flow 3: Revenue → Strategy → Pivot
```
Dealmaker reports revenue data weekly
  → Strategist analyzes what's working
    → Recommends doubling down or pivoting
      → Otto decides
        → Team adjusts
```

### Flow 4: Security → Operations → Alert
```
Operator detects anomaly via Wazuh
  → Assesses severity
    → If critical: alerts Otto immediately
    → If minor: fixes autonomously + logs
      → Researcher checks if it's a known pattern
```

---

## How Agents Fit the Existing UI

Agents don't get their own UI. They USE the existing system — same as the user does.

### Chat (existing: ChatPanelManager, multi-panel)
- Each agent = a chat panel tab
- Click agent → see transcript (read-only or interactive)
- Split view: talk to Kira left, watch Strategist think right
- AgentCarousel (already built) shows active agents at top

### Agents Page (existing: /agents)
- List all agents with status (active, idle, last ran)
- Configure: schedule, personality, scope, model
- Run history with outcomes
- Enable/disable agents
- Create custom agents
- Browse marketplace (Savants)

### Operations/Tasks (existing: /operations, BoardView, TodayView)
- Agents CREATE tasks with source context attached
- Task metadata includes: which agent surfaced it, why, key data points
- When agent completes work → task auto-completes with output linked
- Agent work rolls up: subtask → task % → goal % → project health

### Documents (existing: /documents)
- Agents write structured outputs here, not in chat
- Strategy Brief (by Strategist) — updated weekly
- Revenue Report (by Dealmaker) — updated daily
- Content Calendar (by Content) — updated daily
- Research Findings (by Researcher) — on demand
- Documents are decision-ready: numbers, key points, recommendations

### Inbox (existing: /inbox)
- Agent decisions needing approval land here
- Each item has: what the agent wants to do, why, the data behind it
- User approves/rejects/modifies
- Approved → agent executes
- Example: "Content wants to post this on LinkedIn. Data: last 3 posts about AI got 2x engagement vs product posts. Approve?"

### Knowledge Graph (existing: /knowledge)
- All agents read from and write to the same graph
- Agent findings auto-extract to entities/facts/relations
- No silos — Researcher finding about competitor feeds into Strategist's recommendation

### Dashboards (existing: /dashboards, widgets)
- ActiveAgents widget (already built) — shows running agents
- Agent outputs feed into: TopPriorities, KeyResultProgress, RecentCompletions
- Financial dashboard gets data from Dealmaker
- Content performance from Content agent

### The Standard Data Contract

Every agent outputs work in a standard format:

```typescript
interface AgentOutput {
  type: 'task' | 'document' | 'decision' | 'fact' | 'alert';
  
  // For tasks
  task?: {
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    sourceContext: string;  // WHY this task exists
    keyPoints: string[];    // data points that led here
    assignee: 'user' | 'agent';
    parentGoalId?: string;
  };
  
  // For documents
  document?: {
    title: string;
    content: string;       // markdown
    category: string;      // strategy, revenue, content, research
    replaces?: string;     // document ID this supersedes
  };
  
  // For decisions needing approval
  decision?: {
    question: string;
    recommendation: string;
    evidence: string[];    // key data points
    options: { label: string; description: string }[];
    urgency: 'now' | 'today' | 'this_week' | 'whenever';
  };
  
  // For knowledge graph
  fact?: {
    entity: string;
    key: string;
    value: string;
    confidence: number;
    source: string;
  };
  
  // For alerts
  alert?: {
    severity: 'critical' | 'warning' | 'info';
    message: string;
    action?: string;
  };
}
```

This contract ensures agent outputs flow into the right place automatically:
- `type: 'task'` → Operations board
- `type: 'document'` → Documents page  
- `type: 'decision'` → Inbox
- `type: 'fact'` → Knowledge graph
- `type: 'alert'` → Notification + Inbox if actionable

## Implementation

### Phase 1: Agent Infrastructure (This Week)
1. Define `AgentOutput` schema in DB (`agent_outputs` table)
2. Wire outputs into existing pages (tasks → operations, docs → documents, decisions → inbox)
3. Agent chat panels in ChatPanelManager
4. Standard agent session creation (OpenClaw session + cron schedule)

### Phase 2: First Agents (This Week)
1. **Strategist** — persistent session, weekly portfolio review, outputs to documents + inbox
2. **Content** — persistent session, daily draft generation, outputs to inbox for approval

### Phase 3: Full Team (Next Week)
3. **Researcher** — web_search access, outputs to knowledge + documents
4. **Operator** — exec access, outputs to tasks + alerts
5. **Dealmaker** — outputs to documents + inbox

### Phase 4: Marketplace (Week 3+)
- Custom agent creation UI
- Savant marketplace (pre-built agents)
- Telegram bot provisioning for external access
- Cross-agent communication protocol

---

## Kira's Role

I'm not one of the agents — I'm the **COO**. I:
- Orchestrate the team
- Handle direct requests from Otto
- Spawn and manage agent sessions
- Resolve conflicts between agents
- Do the work that doesn't fit anyone else's role
- Have full context that no single agent has

The agents are my team. Otto is the CEO. The hierarchy:
```
Otto (CEO) → Kira (COO) → Agent Team
```

---

## Rules

1. **No agent acts externally without user approval.** Not just content — EVERYTHING that leaves the system.
2. **Every decision gets logged.** Future-you needs to know why.
3. **Agents can disagree with each other.** That's healthy. Escalate to user.
4. **Quality > speed for external actions.** Internal work can be fast.
5. **Revenue is always priority.** Strategy is only useful if it makes money.
6. **Don't spam the user.** Batch updates. One message with 5 items > 5 messages.
7. **Every agent reads the knowledge graph.** No silos.

---

## THIS IS THE PRODUCT

Otto's agent team is not just Otto's — it's the **proof of concept for Dimera**.

### What Every Dimera User Gets
A company made of agents. Each agent is:
- A separate Telegram bot (user gets `@handle`, starts chatting)
- A persistent session with its own memory + personality
- Scoped to a role (strategy, content, research, ops, deals)
- Connected to the user's shared knowledge graph
- Able to talk to other agents via internal messaging

### Agent Delivery Model
```
┌─────────────────────────────────────────────┐
│              DIMERA PLATFORM                 │
│                                              │
│  Per User:                                   │
│  ├── Main AI (Consultant = orchestrator)     │
│  ├── Built-in agents (5 core team)           │
│  │   Each with its own Telegram bot handle   │
│  ├── Custom agents (user creates "friends")  │
│  │   Run in per-user sandbox                 │
│  └── Marketplace agents (Savants)            │
│      Pre-built specialized agents            │
│      Stateless, blind, on-demand             │
│                                              │
│  Shared: Knowledge graph, memory, context    │
└─────────────────────────────────────────────┘
```

### Telegram Bot Provisioning
When a user creates or enables an agent:
1. Platform creates a Telegram bot via BotFather API (or pre-provisioned pool)
2. User receives the `@handle` — that's it, nothing to install
3. Agent runs inside the user's sandbox (custom) or on platform infra (marketplace)
4. All messages flow through the platform for logging, approval gates, billing

### Agent Marketplace (Savant Model)
Pre-built agents anyone can "hire":
- **Tax Advisor** — RAG over tax law (already built: Stella Vic's)
- **Fitness Coach** — tracks workouts, meal plans, accountability
- **Code Reviewer** — reviews PRs, suggests improvements
- **Writing Editor** — academic text revision (brother's use case)
- **Social Media Manager** — content generation + scheduling
- **Bookkeeper** — invoice tracking, expense categorization
- **Recruiter** — screening, outreach drafting

Marketplace agents are **Savants**: specialized, stateless per execution, but maintain user context through the platform. Anyone can build and publish a Savant.

### The Company Analogy
```
Traditional Company          Dimera User
─────────────────           ────────────
CEO (founder)          →    User (you)
COO (operations)       →    Main AI (Consultant)
VP Strategy            →    Strategist agent
VP Marketing           →    Content agent  
Analyst team           →    Researcher agent
DevOps team            →    Operator agent
Sales team             →    Dealmaker agent
Freelancers            →    Marketplace Savants
Interns                →    Custom agents
```

Every person in the world gets access to a full company working for them. That's the pitch.

### Chimera Protocol Connection
```
Consultant (local, private, knows everything about you)
    ↕ Job Queue
Savants (distributed, blind, stateless, marketplace)
```

- Your Main AI + built-in agents = **Consultant layer** (private, persistent)
- Marketplace agents = **Savant layer** (specialized, on-demand, privacy-preserving)
- Chimera protocol ensures Savants never see your raw data — only sanitized Job Tickets
