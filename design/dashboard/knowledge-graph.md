# Knowledge Graph — Visual Memory & Entity Explorer

> Your AI's brain, visualized. Every person, company, concept, and decision — mapped as an interactive graph that the agent continuously builds, connects, and queries.

---

## 1. Graph Visualization

### 1.1 Core Concepts

The knowledge graph is the persistent memory substrate for all agents. It stores **entities** (nodes) and **relationships** (edges) extracted from conversations, documents, and agent research.

```typescript
interface Entity {
  id: string;
  type: EntityType;
  name: string;
  aliases: string[];            // "Google", "Alphabet", "GOOG"
  properties: Record<string, any>;  // flexible key-value facts
  facts: Fact[];
  createdAt: DateTime;
  updatedAt: DateTime;
  lastInteraction: DateTime;    // last time user/agent referenced this
  source: string[];             // where this entity was learned from
}

type EntityType = 
  | 'person' 
  | 'company' 
  | 'project' 
  | 'concept' 
  | 'decision' 
  | 'event'
  | 'location' 
  | 'document' 
  | 'task' 
  | 'goal'
  | 'custom';

interface Fact {
  id: string;
  subject: string;              // entity ID
  predicate: string;            // "works_at", "founded_in", "revenue"
  value: string | number | boolean;
  confidence: number;           // 0-1
  source: string;               // conversation ID, doc ID, URL
  extractedAt: DateTime;
  verifiedAt?: DateTime;
  expiresAt?: DateTime;         // for time-sensitive facts
}

interface Relationship {
  id: string;
  from: string;                 // entity ID
  to: string;                   // entity ID
  type: RelationType;
  properties: Record<string, any>;
  strength: number;             // 0-1, how strong the connection
  confidence: number;           // 0-1
  source: string[];
  createdAt: DateTime;
}

type RelationType =
  | 'works_at' | 'founded' | 'invested_in' | 'advises'
  | 'owns' | 'part_of' | 'depends_on' | 'related_to'
  | 'decided' | 'met_with' | 'introduced_by'
  | 'competes_with' | 'partners_with'
  | 'mentioned_in' | 'assigned_to'
  | 'custom';
```

### 1.2 Graph Canvas

**Rendering engine:** Force-directed graph (D3.js or Cytoscape.js with WebGL for large graphs)

```
┌──────────────────────────────────────────────────────┐
│ 🔍 Search entities...          [Filters ▾] [+ Add]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│         ┌──────┐                                     │
│    ┌────│ Otto │────┐                                │
│    │    └──────┘    │                                │
│    │ founded   owns │ advises                        │
│    ▼         ▼      ▼                                │
│ ┌──────┐ ┌──────┐ ┌──────┐                          │
│ │Kira  │ │ Co X │ │ Co Y │                           │
│ │(proj)│ │(comp)│ │(comp)│                           │
│ └──────┘ └──┬───┘ └──────┘                          │
│             │ competes_with                          │
│             ▼                                        │
│          ┌──────┐                                    │
│          │ Co Z │                                    │
│          │(comp)│                                    │
│          └──────┘                                    │
│                                                      │
├──────────────────────────────────────────────────────┤
│ 42 entities • 67 relationships • Last updated: now   │
└──────────────────────────────────────────────────────┘
```

**Interactions:**
- **Pan & zoom**: scroll/pinch to zoom, drag background to pan
- **Click node**: select, show detail panel on right
- **Double-click node**: expand its connections (lazy-load neighbors)
- **Drag node**: reposition, other nodes adjust via physics
- **Right-click node**: context menu (edit, delete, merge, find paths to...)
- **Click edge**: show relationship details
- **Multi-select**: Shift+click or lasso drag
- **Hover**: tooltip with entity summary

**Visual encoding:**
- **Node size**: proportional to connection count (more connected = larger)
- **Node color**: by entity type (people = blue, companies = green, projects = purple, etc.)
- **Node icon**: type-specific icon inside the circle
- **Edge thickness**: relationship strength
- **Edge style**: solid (high confidence), dashed (low confidence)
- **Edge color**: by relationship type
- **Glow/pulse**: recently updated nodes pulse briefly
- **Dimming**: when a node is selected, non-connected nodes dim to 20% opacity

### 1.3 Filters

```
Filter Panel (collapsible sidebar):
├── Entity Types
│   ☑ People  ☑ Companies  ☑ Projects
│   ☐ Concepts  ☑ Decisions  ☐ Events
├── Relationship Types
│   ☑ works_at  ☑ invested_in  ☑ founded
│   ☐ related_to  ☑ competes_with
├── Time Range
│   [Last 7 days ▾]  or  [Custom: ___ to ___]
├── Confidence
│   [Min: 0.5 ━━━━━━━●━━ 1.0]
├── Connection Depth
│   [1 hop ▾] [2 hops] [3 hops]
└── Source
    ☑ Conversations  ☑ Documents  ☐ Web research
```

### 1.4 Search

- **Instant search**: type to filter visible nodes, matching nodes highlight
- **Path finding**: "Show connection between X and Y" → highlights shortest path(s)
- **Natural language**: "Show me all investors I've talked to" → agent filters graph
- **Semantic search**: "Companies similar to X" → agent finds by property similarity

### 1.5 Layout Modes

- **Force-directed** (default): organic, shows clusters naturally
- **Hierarchical**: tree layout, good for org charts or dependency chains
- **Radial**: selected node at center, connections radiate outward in rings by hop distance
- **Timeline**: nodes arranged on horizontal time axis by `lastInteraction`
- **Clustered**: auto-group by entity type or project, clusters in bounding boxes

---

## 2. Entity Detail View

When a node is selected, a detail panel slides in from the right (or becomes full page on click-through):

```
┌──────────────────────────────────┐
│ 👤 Sarah Chen              [Edit]│
│ Type: Person                     │
│ Last interaction: 2 days ago     │
├──────────────────────────────────┤
│ FACTS                            │
│ ─────                            │
│ Role: Partner at Sequoia    (0.95)│
│ Focus: AI/ML investments    (0.90)│
│ Location: San Francisco     (0.85)│
│ Met at: TechCrunch Disrupt  (0.80)│
│ Portfolio: [Co A], [Co B]   (0.75)│
│ Email: s.chen@seq...        (1.0) │
│                                  │
│ RELATIONSHIPS (8)                │
│ ─────────────                    │
│ works_at → Sequoia Capital       │
│ invested_in → CompanyX           │
│ introduced_by → John Doe         │
│ met_with → Otto (3 times)        │
│ interested_in → Kira (project)   │
│                                  │
│ TIMELINE                         │
│ ─────────                        │
│ Feb 8  Email: Follow-up on deck  │
│ Jan 22 Meeting: Intro call (45m) │
│ Jan 15 Mentioned in doc: "Investor│
│         Pipeline.md"             │
│ Jan 10 Entity created (from chat)│
│                                  │
│ LINKED ITEMS                     │
│ ────────────                     │
│ 📋 Task: "Send updated deck to   │
│    Sarah" (P1, doing)            │
│ 📄 Doc: "Sequoia Pitch Notes.md" │
│ 🎯 Goal: "30 investor pipeline"  │
│                                  │
│ AGENT NOTES                      │
│ ────────────                     │
│ "Sarah seemed very interested in │
│  the AI-native angle. She asked  │
│  about moat and data flywheel.   │
│  Suggested following up after    │
│  the product demo is ready."     │
│  — Kira, Jan 22                  │
└──────────────────────────────────┘
```

### 2.1 Fact Management

- Each fact shows confidence score (colored: green >0.8, yellow 0.5-0.8, red <0.5)
- Click fact to see source (links to conversation or document)
- Edit facts inline: correct, update, or delete
- Agent auto-updates facts when new information is learned
- Conflict detection: "Previous: 'Role: Associate'. New: 'Role: Partner'. Update?" 
- Temporal facts: "Revenue: $5M (as of Q3 2025)" — agent knows to re-check

### 2.2 Relationship Detail

Click any relationship edge or list item:
- Shows: type, direction, strength, confidence, source
- "First connected" and "last referenced" timestamps
- History of interactions through this relationship
- Edit: change type, add notes, adjust confidence

---

## 3. Discovery Mode

### 3.1 Agent-Powered Insights

A dedicated "Discover" tab or floating panel where the agent proactively surfaces insights:

```
┌──────────────────────────────────────┐
│ 🔮 DISCOVERIES                       │
├──────────────────────────────────────┤
│                                      │
│ 💡 Hidden Connection                 │
│ "Sarah Chen (Sequoia) and Mike Lee   │
│  (a]16z) both invested in DataCo.    │
│  They might know each other — useful │
│  for warm intros."                   │
│ [Explore] [Dismiss] [Create Task]    │
│                                      │
│ ⏰ Attention Needed                  │
│ "You haven't interacted with 5       │
│  investors from your pipeline in     │
│  over 3 weeks: [list]. Want me to    │
│  draft follow-up emails?"            │
│ [Yes, draft] [Remind later] [Skip]   │
│                                      │
│ 🔍 Pattern Detected                  │
│ "3 companies in your pipeline (A, B, │
│  C) all have: <50 employees, Series  │
│  A stage, AI focus. This might be    │
│  your ideal customer profile."       │
│ [Save as filter] [Explore] [Dismiss] │
│                                      │
│ 📊 Graph Health                      │
│ "12 entities have low confidence     │
│  facts. 3 entities have no recent    │
│  interactions. Want me to verify?"   │
│ [Review list] [Auto-verify]          │
└──────────────────────────────────────┘
```

### 3.2 Discovery Algorithms

**Connection suggestions:**
- Shortest-path analysis between entities that share properties but aren't directly connected
- Community detection: identify clusters, suggest merges or bridges
- Temporal analysis: entities that are often referenced together but not linked

**Gap detection:**
- Entities with `lastInteraction` older than threshold → "You haven't checked on..."
- Goals with linked entities that have stale data → "Your goal references X, but X data is 2 months old"
- Relationship asymmetry: "You have 30 investors tracked but only 5 have meeting notes"

**Pattern recognition:**
- Entity clustering by properties → "These N entities share these traits"
- Temporal patterns → "You tend to engage with investors on Tuesdays"
- Success patterns → "Deals that closed had 3+ touchpoints with the decision-maker"

### 3.3 Agent Queries (Natural Language)

Users can ask the graph directly:
- "Who do I know at Google?"
- "Show all companies that raised Series B in the last year"
- "What's the connection between Project X and Person Y?"
- "Which investors have I met more than twice?"
- "Find people who could introduce me to [company]"

Agent translates to graph queries, visualizes results on the canvas.

---

## 4. Graph Building

### 4.1 Automatic Extraction

The agent continuously builds the graph from:
- **Conversations**: Named entities, relationships mentioned, decisions made
- **Documents**: People, companies, dates, amounts extracted via NER + LLM
- **Emails** (when connected): Contacts, topics, commitments
- **Calendar** (when connected): Meeting attendees, recurring relationships
- **Web research**: When agent researches an entity, findings go into the graph

### 4.2 Manual Additions

- **Quick add**: `+` button → type entity name, select type, add facts
- **From anywhere**: Select text in any view → "Add to graph" → creates entity or adds fact
- **Import**: CSV/JSON import for bulk entity creation (e.g., investor list)
- **Merge**: Select two nodes → "Merge" → combines facts, deduplicates

### 4.3 Graph Maintenance

- **Duplicate detection**: Agent flags potential duplicates ("John Smith" and "J. Smith"?)
- **Stale fact cleanup**: Agent periodically reviews low-confidence or old facts
- **Confidence decay**: Facts not re-confirmed gradually lose confidence
- **Archival**: Entities with no interactions in 6+ months auto-archive (recoverable)

---

## 5. Technical Architecture

### 5.1 Storage

> **v1.0: SQLite. Migration path to PostgreSQL documented in cost/scalability.md**

```
Primary: SQLite with recursive CTEs for graph traversal queries
Search: SQLite FTS5 for full-text entity search; embeddings stored as BLOB
Cache: In-process LRU cache (no external dependencies)
```

Schema:
```sql
CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  properties TEXT NOT NULL DEFAULT '{}',  -- JSON string
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_interaction TEXT
);

CREATE TABLE facts (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES entities(id),
  predicate TEXT NOT NULL,
  value TEXT,
  confidence REAL,
  source TEXT,
  extracted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE relationships (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL REFERENCES entities(id),
  to_id TEXT NOT NULL REFERENCES entities(id),
  type TEXT NOT NULL,
  properties TEXT NOT NULL DEFAULT '{}',  -- JSON string
  strength REAL,
  confidence REAL
);

CREATE TABLE entity_embeddings (
  entity_id TEXT PRIMARY KEY REFERENCES entities(id),
  embedding BLOB NOT NULL  -- float32 array serialized
);

-- FTS5 virtual table for fast entity search
CREATE VIRTUAL TABLE entities_fts USING fts5(name, content='entities', content_rowid='rowid');
```

Graph traversal uses recursive CTEs instead of a graph extension:
```sql
-- Example: find all entities within 2 hops of a given entity
WITH RECURSIVE graph_walk(id, depth) AS (
  SELECT :start_id, 0
  UNION
  SELECT CASE WHEN r.from_id = gw.id THEN r.to_id ELSE r.from_id END, gw.depth + 1
  FROM graph_walk gw
  JOIN relationships r ON r.from_id = gw.id OR r.to_id = gw.id
  WHERE gw.depth < 2
)
SELECT DISTINCT e.* FROM graph_walk gw JOIN entities e ON e.id = gw.id;
```

### 5.2 Rendering

- **Small graphs (<500 nodes)**: D3.js force-directed, SVG
- **Large graphs (500-5000)**: Cytoscape.js with WebGL renderer
- **Huge graphs (5000+)**: Server-side layout computation, client renders viewport only
- **LOD (Level of Detail)**: Zoomed out shows clusters; zoomed in shows individual nodes

### 5.3 API

```
GET  /api/graph/entities?type=person&limit=50
GET  /api/graph/entities/:id
GET  /api/graph/entities/:id/neighbors?depth=2
GET  /api/graph/search?q=sequoia&semantic=true
GET  /api/graph/paths?from=X&to=Y
POST /api/graph/entities
POST /api/graph/query  (natural language → structured query)
SSE  /api/graph/events (entity/relationship changes)
```
