# Kira Memory System — 4-Layer Architecture

> Design document for Kira's cognitive memory system.
> Target: SQLite-backed, local-first, privacy-preserving.
> Author: Kira Design Team | Date: 2026-02-11

---

## Overview

Kira's memory is modeled after human cognitive architecture with four distinct layers, each serving a different purpose and operating on different timescales:

| Layer | Analogy | Contents | Lifespan |
|-------|---------|----------|----------|
| **Episodic** | "What happened" | Events, conversations, actions | Raw: 7d → Summaries: forever |
| **Semantic** | "What I know" | Facts, entities, relationships | Until contradicted or decayed |
| **Procedural** | "How to do things" | Procedures, preferences, patterns | Until superseded |
| **Working** | "What I'm thinking about now" | Active context, blackboard | Current session only |

### Data Flow

```
User Message
    │
    ▼
┌─────────────────┐
│  Working Memory  │◄──── retrieval from all layers
│  (blackboard)    │
└────────┬────────┘
         │ after interaction
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Episodic Memory │────►│ Semantic Memory  │────►│ Procedural Mem  │
│ (store event)   │     │ (extract facts)  │     │ (learn patterns)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Layer 1: Episodic Memory

### Purpose

Stores **what happened** — every interaction, event, tool call, and outcome. This is Kira's autobiographical memory. It answers: "What did we talk about last Tuesday?" or "When did I last deploy the app?"

### Data Model

```
episodes
├── id              TEXT PRIMARY KEY (ULID — sortable, unique)
├── timestamp       TEXT NOT NULL (ISO 8601, UTC)
├── session_id      TEXT NOT NULL (groups episodes within a session)
├── type            TEXT NOT NULL (conversation|action|event|observation|system)
├── actor           TEXT NOT NULL (user|agent|system|tool:<name>)
├── summary         TEXT NOT NULL (1-2 sentence human-readable summary)
├── details         TEXT (full content — JSON or raw text)
├── importance      INTEGER NOT NULL DEFAULT 5 (1-10 scale)
├── tags            TEXT (JSON array of string tags)
├── outcome         TEXT (success|failure|partial|pending|null)
├── parent_id       TEXT (FK → episodes.id, for threaded/nested events)
├── compression     TEXT NOT NULL DEFAULT 'raw' (raw|compressed|distilled)
├── token_count     INTEGER (approximate token count of details)
├── created_at      TEXT NOT NULL DEFAULT (datetime('now'))
├── expires_at      TEXT (NULL = never expires)
```

### Importance Scoring (1-10)

| Score | Meaning | Examples |
|-------|---------|----------|
| 1-2 | Noise | Greetings, acknowledgments, "ok" |
| 3-4 | Routine | Weather checks, simple lookups |
| 5-6 | Notable | Task completion, decisions made |
| 7-8 | Important | Corrections, preferences stated, project milestones |
| 9-10 | Critical | Emotional moments, major decisions, security events |

Importance is computed by a lightweight classifier at write time:

```python
def score_importance(episode: Episode) -> int:
    score = 5  # baseline
    
    # Boost factors
    if episode.type == 'conversation' and 'correction' in episode.tags:
        score += 2
    if episode.outcome == 'failure':
        score += 1
    if any(kw in episode.summary.lower() for kw in ['remember', 'important', 'never', 'always']):
        score += 2
    if episode.actor == 'user' and len(episode.details or '') > 500:
        score += 1  # user invested effort
    
    # Decay factors
    if episode.type == 'system':
        score -= 2
    if episode.summary.lower() in ['ok', 'thanks', 'got it']:
        score -= 3
    
    return max(1, min(10, score))
```

### Auto-Summarization Pipeline

Episodes go through three compression stages:

```
RAW (full content)
 │  after 24 hours or when token budget is tight
 ▼
COMPRESSED (key details preserved, verbatim quotes removed)
 │  after 7 days
 ▼
DISTILLED (1-2 sentence essence only)
```

**Raw → Compressed** (runs daily or on-demand):
- Strips filler, keeps facts, decisions, outcomes
- Preserves user quotes that express preferences or emotions
- Groups related episodes into a single compressed episode
- Token reduction target: 70-80%

**Compressed → Distilled** (runs weekly):
- Single sentence summary
- Only the outcome and key facts remain
- Token reduction target: 95%+

Example:

```
RAW (1200 tokens):
  User asked about deploying the app to Vercel. Discussed three options:
  Docker, serverless, edge. User said "I hate Docker, let's never use it."
  Decided on edge functions. Configured vercel.json. Deployed successfully.
  User confirmed it works. Discussed pricing — user is on hobby plan.

COMPRESSED (250 tokens):
  Deployed app to Vercel using edge functions. User strongly dislikes Docker.
  On Vercel hobby plan. Deployment successful.

DISTILLED (40 tokens):
  App deployed to Vercel (edge functions). User dislikes Docker. Hobby plan.
```

### Retention Policy

| Compression | Kept For | Condition to Keep Longer |
|-------------|----------|--------------------------|
| Raw | 7 days | importance ≥ 8 → 30 days |
| Compressed | 90 days | importance ≥ 6 → forever |
| Distilled | Forever | — |

Expiration is set via `expires_at`. A nightly job:
1. Compresses raw episodes older than 24h
2. Distills compressed episodes older than 7d
3. Deletes episodes past `expires_at`
4. Extracted facts are migrated to Semantic Memory before deletion

### Session Grouping

Episodes are grouped by `session_id`. A session represents a continuous interaction window (e.g., one Telegram conversation thread, one CLI session). Sessions themselves are tracked:

```
sessions
├── id              TEXT PRIMARY KEY
├── started_at      TEXT NOT NULL
├── ended_at        TEXT
├── channel         TEXT (telegram|discord|cli|api)
├── summary         TEXT (auto-generated when session ends)
├── episode_count   INTEGER DEFAULT 0
├── user_id         TEXT (FK → entities.id)
```

### Example Data

```json
{
  "id": "01HQXK5M3N...",
  "timestamp": "2026-02-11T09:30:00Z",
  "session_id": "sess_abc123",
  "type": "conversation",
  "actor": "user",
  "summary": "User asked to deploy app to Vercel, expressed strong dislike of Docker",
  "details": "{\"role\":\"user\",\"content\":\"Can you deploy this to Vercel? And please never suggest Docker, I hate it.\"}",
  "importance": 7,
  "tags": "[\"deployment\",\"preference\",\"vercel\"]",
  "outcome": null,
  "parent_id": null,
  "compression": "raw",
  "token_count": 28,
  "expires_at": "2026-02-18T09:30:00Z"
}
```

### Example Queries

```sql
-- Recent important events
SELECT * FROM episodes
WHERE importance >= 7 AND timestamp > datetime('now', '-7 days')
ORDER BY timestamp DESC LIMIT 20;

-- What happened in a session
SELECT * FROM episodes
WHERE session_id = 'sess_abc123'
ORDER BY timestamp ASC;

-- Full-text search across summaries
SELECT * FROM episodes_fts
WHERE episodes_fts MATCH 'deploy vercel'
ORDER BY rank;

-- Events related to a topic (via tags)
SELECT * FROM episodes
WHERE json_each.value = 'deployment'
  AND json_each.key IN (SELECT key FROM json_each(tags));
```

---

## Layer 2: Semantic Memory

### Purpose

Stores **facts and knowledge** — what Kira knows about the world, the user, projects, people, and concepts. This is a knowledge graph: entities connected by typed relationships, with facts attached.

### Data Model

```
entities
├── id              TEXT PRIMARY KEY (ULID)
├── name            TEXT NOT NULL
├── type            TEXT NOT NULL (person|organization|project|concept|location|tool|other)
├── description     TEXT
├── aliases         TEXT (JSON array — alternate names)
├── metadata        TEXT (JSON — type-specific structured data)
├── first_seen      TEXT NOT NULL (when Kira first learned about this)
├── last_referenced TEXT NOT NULL (last time entity was relevant)
├── mention_count   INTEGER DEFAULT 1
├── importance      INTEGER DEFAULT 5 (1-10, derived from mention frequency + context)
├── embedding       BLOB (vector embedding for semantic search, 384-dim float32)
├── created_at      TEXT NOT NULL DEFAULT (datetime('now'))
├── updated_at      TEXT NOT NULL DEFAULT (datetime('now'))

UNIQUE(name, type)
```

```
relationships
├── id              TEXT PRIMARY KEY (ULID)
├── source_id       TEXT NOT NULL (FK → entities.id)
├── target_id       TEXT NOT NULL (FK → entities.id)
├── type            TEXT NOT NULL (works_at|knows|owns|uses|part_of|created|depends_on|...)
├── properties      TEXT (JSON — relationship-specific data)
├── confidence      REAL DEFAULT 1.0 (0.0-1.0)
├── source_episode  TEXT (FK → episodes.id — where we learned this)
├── created_at      TEXT NOT NULL
├── updated_at      TEXT NOT NULL

UNIQUE(source_id, target_id, type)
```

```
facts
├── id              TEXT PRIMARY KEY (ULID)
├── entity_id       TEXT NOT NULL (FK → entities.id)
├── subject         TEXT NOT NULL (what the fact is about — often same as entity name)
├── predicate       TEXT NOT NULL (the relationship/property)
├── object          TEXT NOT NULL (the value)
├── confidence      REAL DEFAULT 1.0 (0.0-1.0)
├── source_episode  TEXT (FK → episodes.id)
├── source_type     TEXT DEFAULT 'inferred' (stated|inferred|observed|corrected)
├── valid_from      TEXT (temporal facts — when this became true)
├── valid_until     TEXT (NULL = still true)
├── superseded_by   TEXT (FK → facts.id — if contradicted)
├── created_at      TEXT NOT NULL
├── updated_at      TEXT NOT NULL
```

### Relationship Types

| Type | Example |
|------|---------|
| `works_at` | Otto → works_at → CompanyX |
| `knows` | Otto → knows → Alice |
| `uses` | Otto → uses → Neovim |
| `prefers` | Otto → prefers → dark_mode |
| `owns` | Otto → owns → MacBook_Pro |
| `part_of` | Kira → part_of → Chimera_Project |
| `depends_on` | Kira → depends_on → SQLite |
| `created` | Otto → created → Kira |
| `located_in` | Otto → located_in → Brazil |

### Confidence Scoring

```
1.0  — User explicitly stated ("I live in São Paulo")
0.9  — User confirmed when asked
0.8  — Strongly implied by context
0.6  — Inferred from behavior patterns
0.4  — Weak inference, single data point
0.2  — Speculative, needs confirmation
```

Confidence decays over time for certain fact types:
- Location, job, relationship status: -0.05/month after 6 months without reconfirmation
- Preferences: -0.02/month (slower — tastes are stable)
- Technical facts: no decay (Python 3 doesn't stop being Python 3)

### Knowledge Graph Traversal

To answer "What tools does Otto use for his projects?":

```sql
-- Direct: Otto → uses → ?
SELECT e2.name, r.type, r.confidence
FROM entities e1
JOIN relationships r ON r.source_id = e1.id
JOIN entities e2 ON r.target_id = e2.id
WHERE e1.name = 'Otto' AND r.type = 'uses';

-- 2-hop: Otto → works_on → Project → uses → ?
SELECT e3.name, r2.type
FROM entities e1
JOIN relationships r1 ON r1.source_id = e1.id
JOIN entities e2 ON r1.target_id = e2.id
JOIN relationships r2 ON r2.source_id = e2.id
JOIN entities e3 ON r2.target_id = e3.id
WHERE e1.name = 'Otto' AND r1.type = 'works_on' AND r2.type = 'uses';
```

### Example Data

```json
// Entity
{
  "id": "01HQXK...",
  "name": "Otto",
  "type": "person",
  "description": "Kira's creator and primary user",
  "aliases": "[\"coringa_dfato\",\"@coringa_dfato\"]",
  "metadata": "{\"telegram_id\":\"7985502241\",\"timezone\":\"America/Sao_Paulo\"}",
  "importance": 10
}

// Fact
{
  "entity_id": "01HQXK...",
  "subject": "Otto",
  "predicate": "dislikes",
  "object": "Docker",
  "confidence": 0.95,
  "source_type": "stated",
  "source_episode": "01HQXK5M3N..."
}
```

---

## Layer 3: Procedural Memory

### Purpose

Stores **how to do things** — learned procedures, user preferences for execution, tool usage patterns, and success/failure rates. This is what makes Kira get better over time at doing tasks the way the user wants.

### Data Model

```
procedures
├── id              TEXT PRIMARY KEY (ULID)
├── name            TEXT NOT NULL (human-readable procedure name)
├── trigger         TEXT NOT NULL (when to use this — pattern or description)
├── steps           TEXT NOT NULL (JSON array of steps)
├── context         TEXT (when this procedure applies — conditions)
├── source_episode  TEXT (FK → episodes.id — where we learned this)
├── success_count   INTEGER DEFAULT 0
├── failure_count   INTEGER DEFAULT 0
├── last_used       TEXT
├── last_outcome    TEXT (success|failure|partial)
├── confidence      REAL DEFAULT 0.5 (increases with success, decreases with failure)
├── superseded_by   TEXT (FK → procedures.id)
├── created_at      TEXT NOT NULL
├── updated_at      TEXT NOT NULL
```

```
preferences
├── id              TEXT PRIMARY KEY (ULID)
├── category        TEXT NOT NULL (communication|formatting|workflow|tools|scheduling|other)
├── key             TEXT NOT NULL (specific preference identifier)
├── value           TEXT NOT NULL (the preference value — can be JSON)
├── strength        REAL DEFAULT 0.5 (0.0-1.0, how strongly held)
├── evidence_count  INTEGER DEFAULT 1 (times this preference was observed)
├── source_type     TEXT DEFAULT 'inferred' (stated|inferred|corrected)
├── source_episodes TEXT (JSON array of episode IDs that support this)
├── created_at      TEXT NOT NULL
├── updated_at      TEXT NOT NULL

UNIQUE(category, key)
```

### Procedure Structure

A procedure is a learned sequence of steps:

```json
{
  "name": "Deploy to Vercel",
  "trigger": "user asks to deploy, mentions Vercel or production",
  "context": "project uses React with Vite",
  "steps": [
    {"action": "check", "detail": "Verify vercel.json exists"},
    {"action": "run", "detail": "Run tests first: npm test"},
    {"action": "run", "detail": "vercel --prod"},
    {"action": "verify", "detail": "Check deployment URL is responding"},
    {"action": "notify", "detail": "Send deployment URL to user"}
  ],
  "success_count": 4,
  "failure_count": 1,
  "confidence": 0.8
}
```

### Confidence Update Formula

```python
def update_confidence(proc: Procedure, outcome: str) -> float:
    if outcome == 'success':
        # Asymptotic approach to 1.0
        return proc.confidence + (1.0 - proc.confidence) * 0.15
    elif outcome == 'failure':
        # Faster decay on failure
        return proc.confidence * 0.7
    else:  # partial
        return proc.confidence  # no change
```

### Preference Categories

| Category | Examples |
|----------|----------|
| `communication` | tone: casual, verbosity: concise, language: en |
| `formatting` | code_style: no_comments, markdown: tables_preferred |
| `workflow` | git: always_commit_before_deploy, testing: run_before_push |
| `tools` | editor: neovim, shell: zsh, package_manager: pnpm |
| `scheduling` | work_hours: 09-18 BRT, quiet_hours: 23-08 |

### Learning from Corrections

When the user corrects Kira, this triggers procedural learning:

1. **Detect correction**: User says "No, do it like X" or "I prefer Y" or re-does what Kira just did differently
2. **Extract the lesson**: What was wrong, what's right
3. **Store/update**: Create or update a preference or procedure
4. **Boost strength**: Each correction increases `strength` or `evidence_count`

```json
// User said: "Don't put comments in the code, I like it clean"
{
  "category": "formatting",
  "key": "code_comments",
  "value": "none",
  "strength": 0.9,
  "evidence_count": 1,
  "source_type": "stated"
}
```

### Example Queries

```sql
-- Get all communication preferences
SELECT key, value, strength FROM preferences
WHERE category = 'communication'
ORDER BY strength DESC;

-- Find procedure for a task
SELECT * FROM procedures
WHERE trigger LIKE '%deploy%'
AND confidence > 0.5
ORDER BY confidence DESC, last_used DESC
LIMIT 1;

-- Most failed procedures (need review)
SELECT name, failure_count, success_count, confidence
FROM procedures
WHERE failure_count > 0
ORDER BY failure_count DESC;
```

---

## Layer 4: Working Memory

### Purpose

Working memory is the **active blackboard** for the current session. It's not persisted to disk (except as a cache for recovery). It holds the assembled context that gets injected into each LLM call.

### Structure

Working memory is a runtime data structure, not a database table:

```typescript
interface WorkingMemory {
  // Identity & config
  systemPrompt: string;
  userProfile: UserProfile;          // from semantic memory
  activePreferences: Preference[];    // from procedural memory

  // Current session
  sessionId: string;
  conversationHistory: Message[];     // recent messages (token-managed)
  activeEntities: Entity[];           // entities mentioned in this session
  activeGoals: Goal[];                // what we're trying to accomplish

  // Retrieved context
  relevantEpisodes: Episode[];        // retrieved from episodic memory
  relevantFacts: Fact[];              // retrieved from semantic memory
  relevantProcedures: Procedure[];    // retrieved from procedural memory

  // Budget
  tokenBudget: TokenBudget;
  lastInjectionTimestamp: string;
}

interface TokenBudget {
  total: number;            // model's context window (e.g., 128K)
  systemPrompt: number;     // fixed cost
  userProfile: number;      // ~200-500 tokens
  preferences: number;      // ~100-300 tokens
  conversation: number;     // sliding window
  retrievedContext: number;  // dynamic allocation
  responseReserve: number;  // tokens reserved for output (4K-8K)
}
```

### Token Budget Allocation

For a 128K context window:

| Slot | Tokens | % | Notes |
|------|--------|---|-------|
| System prompt | 2,000 | 1.5% | Identity, rules, tools |
| User profile | 500 | 0.4% | Key facts about user |
| Preferences | 300 | 0.2% | Active formatting/communication prefs |
| Conversation history | 80,000 | 62.5% | Sliding window of recent messages |
| Retrieved context | 30,000 | 23.4% | Episodic + semantic + procedural |
| Response reserve | 8,000 | 6.3% | For model output |
| Buffer | 7,200 | 5.6% | Safety margin |

### Injection Strategy

Context is injected at these points:

1. **Session start**: User profile, top preferences, relevant recent episodes
2. **Every message**: Re-rank retrieved context based on current topic
3. **Topic change detected**: Flush irrelevant retrieved context, fetch new
4. **Token budget 75%**: Trigger compaction — summarize oldest conversation turns
5. **Explicit recall**: User says "remember when..." — targeted retrieval

### What Gets Injected

```markdown
## Context (auto-injected, not visible to user)

### About the User
- Name: Otto | TZ: America/Sao_Paulo | Channel: Telegram
- Prefers concise responses, no code comments
- Dislikes Docker, prefers edge deployments

### Recent Relevant Context
- [2h ago] Deployed app to Vercel successfully (edge functions)
- [yesterday] Discussed memory system design for Kira
- [3d ago] Set up SQLite with FTS5 for search

### Active Procedures
- Deployment: always run tests first, use Vercel edge, verify after deploy

### Current Session Entities
- Kira (project, this AI), Vercel (tool), Memory System (concept)
```

### Blackboard Pattern

Working memory uses a blackboard architecture where different "knowledge sources" (the other three memory layers) post information, and a controller decides what's relevant:

```
┌──────────────────────────────────────────┐
│              BLACKBOARD                   │
│                                           │
│  [user_profile]  [active_prefs]          │
│  [recent_episodes]  [relevant_facts]      │
│  [current_goal]  [active_procedures]      │
│  [conversation_summary]                   │
│                                           │
│  Controller: ranks by relevance,          │
│  manages token budget, decides eviction   │
└──────────────────────────────────────────┘
     ▲           ▲           ▲
     │           │           │
  Episodic    Semantic   Procedural
  Memory      Memory     Memory
```

### Eviction Policy

When working memory exceeds token budget:

1. **First**: Remove lowest-relevance retrieved context
2. **Second**: Summarize oldest conversation turns (keep last 10 turns verbatim)
3. **Third**: Reduce user profile to essentials only
4. **Never evict**: System prompt, last 3 conversation turns, active goal

---

## Cross-Layer Interactions

### Episode → Semantic Extraction

After storing an episode, an extraction pipeline pulls facts:

```
Episode: "User said they moved to Berlin last month"
    → Entity: Otto (update location)
    → Fact: Otto → located_in → Berlin (confidence: 1.0, source: stated)
    → Fact: Otto → located_in → São Paulo (valid_until: now, superseded)
```

### Episode → Procedural Learning

After a correction or explicit teaching:

```
Episode: "User corrected: 'Always use pnpm, not npm'"
    → Preference: tools.package_manager = "pnpm" (strength: 0.9)
    → Update all procedures that reference npm → pnpm
```

### Semantic → Working Memory

When a topic is mentioned, related entities and facts are pulled:

```
User mentions "Vercel"
    → Retrieve entity: Vercel (tool, deployment platform)
    → Retrieve facts: Otto uses Vercel, prefers edge functions, hobby plan
    → Retrieve relationships: Kira → deployed_on → Vercel
    → Inject into working memory
```

### Procedural → Working Memory

When a task is detected, matching procedures are loaded:

```
User says "deploy the app"
    → Match procedure: "Deploy to Vercel" (confidence: 0.8)
    → Inject steps into working memory
    → Agent follows the procedure
```

---

## Privacy & Security

- All memory is **local-first** — stored on the user's device/server
- No memory is sent to external services except as part of LLM context
- Embeddings are computed locally (e.g., via `all-MiniLM-L6-v2`)
- User can export, inspect, and delete any memory at any time
- `MEMORY.md` and `USER.md` are never injected in group/shared contexts
- Facts marked `sensitive: true` require explicit user consent to inject

---

## Implementation Priority

1. **Phase 1**: Episodic memory with SQLite (replace file-based system)
2. **Phase 2**: Semantic memory — entity/fact extraction, knowledge graph
3. **Phase 3**: Working memory — token budget management, smart injection
4. **Phase 4**: Procedural memory — preference learning, procedure extraction
5. **Phase 5**: Vector embeddings — semantic search across all layers
