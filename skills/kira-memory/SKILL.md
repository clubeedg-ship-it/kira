---
name: kira-memory
description: Query Kira's 3-layer memory system (episodes, knowledge graph, facts, procedures, VDR docs). Use when the user asks about people, companies, events, decisions, or anything Kira has stored.
metadata:
  {
    "openclaw": { "emoji": "🧠", "requires": { "anyBins": ["node", "sqlite3"] } },
  }
---

# Kira Memory Skill

Query Kira's 3-layer memory system: episodic events, knowledge graph (entities, relations, facts), and procedures.

Use this skill when the user asks about people, companies, events, decisions, or anything Kira has observed and stored. This is Kira's long-term memory.

## Commands

### Memory overview
Show counts across all memory layers.
```bash
node /home/adminuser/kira/src/index.js memory status
```

### System status
Full system overview including episodes, entities, jobs, agents, and VDR docs.
```bash
node /home/adminuser/kira/src/index.js status
```

### Search knowledge graph
Search for entities (people, companies, projects) by querying the knowledge graph. The CLI provides entity names, types, and associated facts.
```bash
node /home/adminuser/kira/src/index.js status
```

### VDR documents
List virtual data room documents (pitch decks, financials, legal docs).
```bash
node /home/adminuser/kira/src/index.js vdr
```

### VDR statistics
Get document counts by category and QA status.
```bash
node /home/adminuser/kira/src/index.js vdr stats
```

## Database Queries

For deeper searches, query the SQLite database directly. The database is at `~/.kira/kira.db`.

### Search episodes by text (FTS5)
```bash
sqlite3 ~/.kira/kira.db "SELECT timestamp, type, summary, importance FROM episodes WHERE id IN (SELECT rowid FROM episodes_fts WHERE episodes_fts MATCH '<search_term>') ORDER BY importance DESC LIMIT 10;"
```

### Search entities by name
```bash
sqlite3 ~/.kira/kira.db "SELECT name, type, properties FROM entities WHERE name LIKE '%<search_term>%' LIMIT 10;"
```

### Get facts about an entity
```bash
sqlite3 ~/.kira/kira.db "SELECT e.name, f.predicate, f.object, f.confidence FROM facts f JOIN entities e ON f.entity_id = e.id WHERE e.name LIKE '%<entity_name>%';"
```

### Get relations between entities
```bash
sqlite3 ~/.kira/kira.db "SELECT s.name as source, r.type as relation, t.name as target FROM relations r JOIN entities s ON r.source_id = s.id JOIN entities t ON r.target_id = t.id WHERE s.name LIKE '%<search_term>%' OR t.name LIKE '%<search_term>%';"
```

### List procedures
```bash
sqlite3 ~/.kira/kira.db "SELECT name, description, status FROM procedures ORDER BY updated_at DESC;"
```

### Search recent high-importance episodes
```bash
sqlite3 ~/.kira/kira.db "SELECT timestamp, type, summary, outcome, importance FROM episodes WHERE importance >= 7 ORDER BY timestamp DESC LIMIT 10;"
```

## Tips

- Use FTS5 episode search for event recall ("What happened with X?")
- Use entity search for people and company info ("What do we know about ZenithCred?")
- Use relations + facts for connections ("How is Otto connected to IAM?")
- Combine multiple queries to build comprehensive context
- Importance ranges: 1-4 (low), 5-7 (medium), 8-10 (critical)
