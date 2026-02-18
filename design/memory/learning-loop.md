# Kira Memory System — Learning Loop

> How Kira learns, adapts, and forgets over time.
> Date: 2026-02-11

---

## Overview

Kira's learning happens at three timescales:

| Timescale | Process | Frequency |
|-----------|---------|-----------|
| **Real-time** | Extract & store from each interaction | Every message |
| **Periodic** | Consolidation, summaries, decay | Daily / weekly |
| **On-demand** | Correction handling, contradiction resolution | When triggered |

```
User Interaction
    │
    ├──► Episode Storage (immediate)
    ├──► Entity/Fact Extraction (async, after response)
    ├──► Preference Detection (async)
    ├──► Procedure Learning (on correction)
    │
    ▼
Daily Consolidation
    ├──► Episode compression
    ├──► Daily summary generation
    ├──► Confidence decay
    ├──► Embedding refresh
    │
    ▼
Weekly Consolidation
    ├──► Episode distillation
    ├──► Weekly insights
    ├──► Relationship strength recalculation
    ├──► Procedure review (low-confidence pruning)
    └──► Forgetting pass
```

---

## 1. Real-Time Extraction (After Each Interaction)

### What Happens After Every User Message

```typescript
async function afterInteraction(
    userMessage: Message,
    agentResponse: Message,
    session: Session
): Promise<void> {
    // 1. Store episode (synchronous — blocks nothing)
    const episode = await storeEpisode({
        session_id: session.id,
        type: 'conversation',
        actor: 'user',
        summary: await quickSummarize(userMessage.content), // rule-based, fast
        details: JSON.stringify({ user: userMessage.content, agent: agentResponse.content }),
        importance: scoreImportance(userMessage, agentResponse),
        tags: extractTags(userMessage.content),
        outcome: detectOutcome(agentResponse)
    });
    
    // 2-5 run async (don't block the next response)
    setImmediate(async () => {
        // 2. Extract entities and facts
        await extractEntitiesAndFacts(episode);
        
        // 3. Detect preferences
        await detectPreferences(userMessage, agentResponse);
        
        // 4. Check for corrections
        await handleCorrections(userMessage, agentResponse, session);
        
        // 5. Update entity mention counts and last_referenced
        await updateEntityStats(episode);
    });
}
```

### Entity & Fact Extraction

Uses a lightweight LLM call (or the main model with a structured prompt):

```typescript
async function extractEntitiesAndFacts(episode: Episode): Promise<void> {
    const prompt = `Extract entities and facts from this conversation excerpt.
    
Return JSON:
{
  "entities": [{"name": "...", "type": "person|org|project|concept|location|tool", "description": "..."}],
  "facts": [{"subject": "...", "predicate": "...", "object": "...", "confidence": 0.0-1.0, "source_type": "stated|inferred|observed"}],
  "relationships": [{"source": "...", "target": "...", "type": "...", "confidence": 0.0-1.0}]
}

Only extract what is clearly present. Do not hallucinate.

Text: ${episode.details}`;

    const result = await llm(prompt, { model: 'fast', json: true });
    
    for (const entity of result.entities) {
        await upsertEntity(entity, episode.id);
    }
    for (const fact of result.facts) {
        await upsertFact(fact, episode.id);
    }
    for (const rel of result.relationships) {
        await upsertRelationship(rel, episode.id);
    }
}
```

### Upsert Logic (Deduplication)

```typescript
async function upsertEntity(entity: ExtractedEntity, episodeId: string): Promise<string> {
    const existing = db.get(
        'SELECT * FROM entities WHERE name = ? AND type = ?',
        [entity.name, entity.type]
    );
    
    if (existing) {
        // Update: merge descriptions, bump mention count
        db.run(`
            UPDATE entities SET
                description = COALESCE(?, description),
                mention_count = mention_count + 1,
                last_referenced = datetime('now'),
                updated_at = datetime('now')
            WHERE id = ?
        `, [entity.description, existing.id]);
        return existing.id;
    } else {
        const id = ulid();
        db.run(`
            INSERT INTO entities (id, name, type, description, first_seen, last_referenced)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [id, entity.name, entity.type, entity.description]);
        
        // Generate embedding async
        setImmediate(() => generateAndStoreEmbedding('entities', id, `${entity.name} ${entity.description}`));
        
        return id;
    }
}

async function upsertFact(fact: ExtractedFact, episodeId: string): Promise<void> {
    // Check for existing identical or contradicting facts
    const existing = db.get(`
        SELECT * FROM facts 
        WHERE subject = ? AND predicate = ? AND valid_until IS NULL
        ORDER BY confidence DESC LIMIT 1
    `, [fact.subject, fact.predicate]);
    
    if (existing) {
        if (existing.object === fact.object) {
            // Same fact — boost confidence
            const newConf = Math.min(1.0, existing.confidence + 0.05);
            db.run('UPDATE facts SET confidence = ?, updated_at = datetime("now") WHERE id = ?',
                [newConf, existing.id]);
            return;
        } else {
            // Contradiction — handle it
            await resolveContradiction(existing, fact, episodeId);
            return;
        }
    }
    
    // New fact
    const entityId = await findOrCreateEntity(fact.subject);
    db.run(`
        INSERT INTO facts (id, entity_id, subject, predicate, object, confidence, source_episode, source_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [ulid(), entityId, fact.subject, fact.predicate, fact.object, fact.confidence, episodeId, fact.source_type]);
}
```

### Preference Detection

```typescript
async function detectPreferences(userMsg: Message, agentResp: Message): Promise<void> {
    // Rule-based detection (fast, no LLM needed)
    const patterns = [
        { regex: /don'?t (use|include|add|put)\s+(.+)/i, category: 'formatting', negative: true },
        { regex: /always\s+(.+)/i, category: 'workflow', strength: 0.8 },
        { regex: /i prefer\s+(.+)/i, category: 'communication', strength: 0.9 },
        { regex: /i (hate|dislike|can't stand)\s+(.+)/i, category: 'tools', strength: 0.9, negative: true },
        { regex: /i (love|like|prefer)\s+(.+)/i, category: 'tools', strength: 0.8 },
    ];
    
    for (const pattern of patterns) {
        const match = userMsg.content.match(pattern.regex);
        if (match) {
            const value = pattern.negative ? `avoid: ${match[2] || match[1]}` : match[1];
            await upsertPreference({
                category: pattern.category,
                key: inferKey(value),
                value: value,
                strength: pattern.strength || 0.7,
                source_type: 'stated'
            });
        }
    }
    
    // Implicit preference: if user reformats agent output, detect the pattern
    // (handled in correction detection below)
}
```

---

## 2. Correction Handling

Corrections are the strongest learning signal. When the user corrects Kira, it means the current behavior is wrong and must change.

### Detecting Corrections

```typescript
async function handleCorrections(
    userMsg: Message, agentResp: Message, session: Session
): Promise<void> {
    const correctionSignals = [
        /no,?\s+(actually|instead|rather)/i,
        /that'?s (wrong|incorrect|not right)/i,
        /i (said|meant|wanted)/i,
        /don'?t do (that|it like that)/i,
        /please (change|fix|redo|undo)/i,
        /not like that/i,
    ];
    
    const isCorrection = correctionSignals.some(r => r.test(userMsg.content));
    
    if (!isCorrection) return;
    
    // Get the previous exchange to understand what was wrong
    const previousAgent = session.getLastAgentMessage();
    
    // Use LLM to extract the lesson
    const lesson = await llm(`
The user corrected the AI. Extract what was wrong and what the user wants instead.

AI said: ${previousAgent?.content?.slice(0, 500)}
User correction: ${userMsg.content}

Return JSON:
{
  "what_was_wrong": "...",
  "what_user_wants": "...",
  "preference_category": "communication|formatting|workflow|tools|other",
  "preference_key": "...",
  "preference_value": "...",
  "is_procedure": boolean,
  "procedure_name": "..." // if is_procedure
}`, { model: 'fast', json: true });
    
    // Store as preference
    if (lesson.preference_key) {
        await upsertPreference({
            category: lesson.preference_category,
            key: lesson.preference_key,
            value: lesson.preference_value,
            strength: 0.9, // corrections are high confidence
            source_type: 'corrected'
        });
    }
    
    // Store as procedure if applicable
    if (lesson.is_procedure) {
        await learnProcedure(lesson, userMsg, session);
    }
    
    // Store the correction episode with high importance
    await storeEpisode({
        type: 'event',
        actor: 'user',
        summary: `Correction: ${lesson.what_was_wrong} → ${lesson.what_user_wants}`,
        importance: 8,
        tags: ['correction', lesson.preference_category],
        outcome: 'success'
    });
}
```

### Preference Strength Updates

```typescript
async function upsertPreference(pref: Partial<Preference>): Promise<void> {
    const existing = db.get(
        'SELECT * FROM preferences WHERE category = ? AND key = ?',
        [pref.category, pref.key]
    );
    
    if (existing) {
        // Reinforce: increase strength and evidence count
        const newStrength = Math.min(1.0, existing.strength + (1.0 - existing.strength) * 0.2);
        const episodes = JSON.parse(existing.source_episodes || '[]');
        // (add new episode if available)
        
        db.run(`
            UPDATE preferences SET
                value = ?,
                strength = ?,
                evidence_count = evidence_count + 1,
                source_type = CASE WHEN ? = 'corrected' THEN 'corrected' ELSE source_type END,
                updated_at = datetime('now')
            WHERE id = ?
        `, [pref.value, newStrength, pref.source_type, existing.id]);
    } else {
        db.run(`
            INSERT INTO preferences (id, category, key, value, strength, source_type)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [ulid(), pref.category, pref.key, pref.value, pref.strength || 0.5, pref.source_type || 'inferred']);
    }
}
```

---

## 3. Procedure Extraction

When the user teaches Kira how to do something, it's formalized into a procedure.

### When Procedures Are Created

1. **Explicit teaching**: "When I say deploy, do X then Y then Z"
2. **Correction with steps**: "No, first run tests, then deploy"
3. **Repeated pattern**: Kira observes the same sequence 3+ times
4. **Tool chain learning**: User always runs commands in a specific order

### Extraction

```typescript
async function learnProcedure(
    lesson: CorrectionLesson,
    userMsg: Message,
    session: Session
): Promise<void> {
    // Check if we already have a procedure for this
    const existing = db.get(`
        SELECT * FROM procedures 
        WHERE name LIKE ? OR trigger LIKE ?
        ORDER BY confidence DESC LIMIT 1
    `, [`%${lesson.procedure_name}%`, `%${lesson.procedure_name}%`]);
    
    if (existing) {
        // Update existing procedure
        const steps = JSON.parse(existing.steps);
        // LLM merges old steps with new correction
        const merged = await llm(`
Merge these procedure steps with the user's correction:
Current steps: ${JSON.stringify(steps)}
User says: ${userMsg.content}
Return updated JSON array of steps.`, { json: true });
        
        db.run(`
            UPDATE procedures SET
                steps = ?, failure_count = failure_count + 1,
                confidence = confidence * 0.7,
                updated_at = datetime('now')
            WHERE id = ?
        `, [JSON.stringify(merged), existing.id]);
    } else {
        // Create new procedure
        const steps = await llm(`
Extract a step-by-step procedure from this instruction:
"${userMsg.content}"
Return JSON array: [{"action": "...", "detail": "..."}]`, { json: true });
        
        db.run(`
            INSERT INTO procedures (id, name, trigger, steps, confidence)
            VALUES (?, ?, ?, ?, 0.6)
        `, [ulid(), lesson.procedure_name, lesson.what_user_wants, JSON.stringify(steps)]);
    }
}
```

### Pattern Detection (Automatic Procedure Discovery)

```typescript
// Runs daily: looks for repeated action sequences
async function discoverProcedures(): Promise<void> {
    // Find repeated tool-call sequences
    const recentActions = db.all(`
        SELECT session_id, summary, details, timestamp
        FROM episodes
        WHERE type = 'action' AND timestamp > datetime('now', '-14 days')
        ORDER BY session_id, timestamp
    `);
    
    // Group by session, extract action sequences
    const sequences = groupBy(recentActions, 'session_id')
        .map(group => group.map(ep => extractActionSignature(ep)));
    
    // Find common subsequences (length >= 3, occurring >= 3 times)
    const common = findCommonSubsequences(sequences, { minLength: 3, minOccurrences: 3 });
    
    for (const seq of common) {
        const existingProc = await matchExistingProcedure(seq);
        if (!existingProc) {
            // Create auto-discovered procedure
            const name = await llm(`Name this procedure: ${JSON.stringify(seq)}. One short phrase.`);
            await db.run(`
                INSERT INTO procedures (id, name, trigger, steps, confidence, source_episode)
                VALUES (?, ?, 'auto-discovered pattern', ?, 0.4, NULL)
            `, [ulid(), name, JSON.stringify(seq)]);
        }
    }
}
```

---

## 4. Periodic Consolidation

### Daily Consolidation (runs at ~03:00 user-local-time)

```typescript
async function dailyConsolidation(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Compress raw episodes older than 24h
    await compactEpisodes();
    
    // 2. Generate daily summary
    const todayEpisodes = db.all(`
        SELECT summary, importance, type, outcome
        FROM episodes
        WHERE date(timestamp) = date('now', '-1 day')
          AND importance >= 4
        ORDER BY importance DESC, timestamp ASC
    `);
    
    if (todayEpisodes.length > 0) {
        const summary = await llm(`
Summarize this day's interactions into 3-5 bullet points.
Focus on: decisions made, things learned, tasks completed, problems encountered.

Events:
${todayEpisodes.map(e => `- [${e.type}] ${e.summary} (importance: ${e.importance})`).join('\n')}

Return plain text, bullet points only.`);
        
        // Store as a distilled episode
        await storeEpisode({
            type: 'system',
            actor: 'system',
            summary: `Daily summary for ${today}: ${summary.split('\n')[0]}`,
            details: summary,
            importance: 6,
            tags: ['daily-summary', today],
            compression: 'distilled'
        });
    }
    
    // 3. Decay confidence on old unconfirmed facts
    db.run(`
        UPDATE facts SET
            confidence = MAX(0.1, confidence - 0.01),
            updated_at = datetime('now')
        WHERE valid_until IS NULL
          AND source_type = 'inferred'
          AND updated_at < datetime('now', '-30 days')
          AND confidence > 0.1
    `);
    
    // 4. Refresh embeddings for entities updated today
    const updatedEntities = db.all(`
        SELECT id, name, description FROM entities
        WHERE date(updated_at) = date('now')
    `);
    for (const entity of updatedEntities) {
        await generateAndStoreEmbedding('entities', entity.id, `${entity.name} ${entity.description}`);
    }
    
    // 5. Update entity importance scores (based on mention frequency)
    db.run(`
        UPDATE entities SET
            importance = MIN(10, MAX(1, 
                CAST(LOG(mention_count + 1) * 3 AS INTEGER)
                + CASE WHEN julianday('now') - julianday(last_referenced) < 7 THEN 2 ELSE 0 END
            )),
            updated_at = datetime('now')
    `);
}
```

### Weekly Consolidation (runs Sunday ~03:00)

```typescript
async function weeklyConsolidation(): Promise<void> {
    // 1. Distill compressed episodes older than 7d
    // (handled by compactEpisodes, but run explicitly)
    
    // 2. Generate weekly insight
    const dailySummaries = db.all(`
        SELECT summary, details, timestamp
        FROM episodes
        WHERE json_extract(tags, '$[0]') = 'daily-summary'
          AND timestamp > datetime('now', '-7 days')
        ORDER BY timestamp ASC
    `);
    
    if (dailySummaries.length > 0) {
        const insight = await llm(`
Based on this week's daily summaries, generate:
1. Key themes (what was the week about?)
2. Progress made (what moved forward?)
3. Patterns noticed (recurring topics, behaviors?)
4. Open threads (what's unfinished?)

Daily summaries:
${dailySummaries.map(d => d.details).join('\n---\n')}

Be concise. 5-8 bullet points total.`);
        
        await storeEpisode({
            type: 'system',
            actor: 'system',
            summary: `Weekly insight: ${insight.split('\n')[0]}`,
            details: insight,
            importance: 7,
            tags: ['weekly-insight'],
            compression: 'distilled'
        });
    }
    
    // 3. Recalculate relationship strengths
    // Relationships that haven't been referenced lose confidence
    db.run(`
        UPDATE relationships SET
            confidence = MAX(0.1, confidence - 0.02),
            updated_at = datetime('now')
        WHERE updated_at < datetime('now', '-30 days')
          AND confidence > 0.1
    `);
    
    // 4. Prune low-confidence procedures
    db.run(`
        DELETE FROM procedures
        WHERE confidence < 0.2
          AND last_used < datetime('now', '-30 days')
          AND failure_count > success_count
    `);
    
    // 5. Prune weak inferred preferences
    db.run(`
        DELETE FROM preferences
        WHERE strength < 0.2
          AND source_type = 'inferred'
          AND evidence_count < 2
          AND updated_at < datetime('now', '-14 days')
    `);
}
```

---

## 5. Forgetting

### What Gets Pruned and When

| Data Type | Condition | Action |
|-----------|-----------|--------|
| Raw episodes | > 7 days old, importance < 8 | Compressed then deleted |
| Compressed episodes | > 90 days, importance < 6 | Distilled |
| Distilled episodes | importance < 3 | Deleted after 1 year |
| Facts (inferred) | confidence < 0.1 | Deleted |
| Facts (stated) | Never auto-deleted | — |
| Relationships | confidence < 0.1 | Deleted |
| Procedures | confidence < 0.2, more failures than successes, unused 30d | Deleted |
| Preferences (inferred) | strength < 0.2, evidence_count < 2, stale 14d | Deleted |
| Preferences (stated/corrected) | Never auto-deleted | — |
| Entities | mention_count = 1, not referenced in 90d, no active facts | Deleted |
| Embeddings | orphaned (source deleted) | Deleted |

### Forgetting Pass

```typescript
async function forgettingPass(): Promise<ForgettingReport> {
    const report: ForgettingReport = { deleted: {}, reason: {} };
    
    // 1. Expired episodes
    const r1 = db.run('DELETE FROM episodes WHERE expires_at < datetime("now")');
    report.deleted.episodes = r1.changes;
    
    // 2. Dead-confidence facts
    const r2 = db.run(`
        DELETE FROM facts 
        WHERE confidence < 0.1 
          AND source_type != 'stated'
          AND source_type != 'corrected'
    `);
    report.deleted.facts = r2.changes;
    
    // 3. Orphaned entities (no facts, no relationships, not recently mentioned)
    const r3 = db.run(`
        DELETE FROM entities WHERE id IN (
            SELECT e.id FROM entities e
            LEFT JOIN facts f ON f.entity_id = e.id AND f.valid_until IS NULL
            LEFT JOIN relationships r ON r.source_id = e.id OR r.target_id = e.id
            WHERE f.id IS NULL AND r.id IS NULL
              AND e.mention_count <= 1
              AND e.last_referenced < datetime('now', '-90 days')
              AND e.importance < 5
        )
    `);
    report.deleted.entities = r3.changes;
    
    // 4. Orphaned embeddings
    const r4 = db.run(`
        DELETE FROM embeddings WHERE id IN (
            SELECT emb.id FROM embeddings emb
            LEFT JOIN entities e ON emb.source_table = 'entities' AND emb.source_id = e.id
            LEFT JOIN episodes ep ON emb.source_table = 'episodes' AND emb.source_id = ep.id
            LEFT JOIN facts f ON emb.source_table = 'facts' AND emb.source_id = f.id
            WHERE e.id IS NULL AND ep.id IS NULL AND f.id IS NULL
        )
    `);
    report.deleted.embeddings = r4.changes;
    
    // 5. VACUUM if significant deletions
    const totalDeleted = Object.values(report.deleted).reduce((a, b) => a + b, 0);
    if (totalDeleted > 100) {
        db.exec('VACUUM');
    }
    
    return report;
}
```

---

## 6. Contradiction Resolution

When a new fact contradicts an existing fact, Kira must decide which to keep.

### Detection

A contradiction is: same subject + same predicate + different object, and the existing fact has `valid_until IS NULL`.

### Resolution Strategy

```typescript
async function resolveContradiction(
    existingFact: Fact,
    newFact: ExtractedFact,
    episodeId: string
): Promise<void> {
    // Priority rules (higher wins):
    // 1. Stated > Corrected > Observed > Inferred
    // 2. More recent > older (for temporal facts like location, job)
    // 3. Higher confidence > lower
    
    const sourceRank = { 'corrected': 4, 'stated': 3, 'observed': 2, 'inferred': 1 };
    const existingRank = sourceRank[existingFact.source_type] || 0;
    const newRank = sourceRank[newFact.source_type] || 0;
    
    let keepNew = false;
    let reason = '';
    
    if (newRank > existingRank) {
        keepNew = true;
        reason = `New fact source (${newFact.source_type}) outranks existing (${existingFact.source_type})`;
    } else if (newRank === existingRank) {
        // Same source type — newer wins for temporal facts
        const temporalPredicates = ['located_in', 'works_at', 'lives_in', 'uses', 'status'];
        if (temporalPredicates.includes(existingFact.predicate)) {
            keepNew = true;
            reason = `Temporal fact updated (${existingFact.predicate})`;
        } else if (newFact.confidence > existingFact.confidence) {
            keepNew = true;
            reason = `Higher confidence (${newFact.confidence} vs ${existingFact.confidence})`;
        } else {
            // Ambiguous — lower confidence on both, flag for review
            db.run('UPDATE facts SET confidence = confidence * 0.8 WHERE id = ?', [existingFact.id]);
            reason = 'Ambiguous contradiction — lowered confidence on existing';
        }
    }
    // If newRank < existingRank, keep existing (don't override stated with inferred)
    
    if (keepNew) {
        // Supersede the old fact
        const newId = ulid();
        const entityId = existingFact.entity_id;
        
        db.run('UPDATE facts SET valid_until = datetime("now"), superseded_by = ? WHERE id = ?',
            [newId, existingFact.id]);
        
        db.run(`
            INSERT INTO facts (id, entity_id, subject, predicate, object, confidence, source_episode, source_type, valid_from)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [newId, entityId, newFact.subject, newFact.predicate, newFact.object,
            newFact.confidence, episodeId, newFact.source_type]);
        
        // Log the contradiction resolution
        await storeEpisode({
            type: 'system',
            actor: 'system',
            summary: `Fact updated: ${newFact.subject} ${newFact.predicate} changed from "${existingFact.object}" to "${newFact.object}". Reason: ${reason}`,
            importance: 6,
            tags: ['contradiction-resolution', newFact.subject]
        });
    }
}
```

### Contradiction Examples

```
Existing: Otto → located_in → São Paulo (stated, confidence: 1.0)
New:      Otto → located_in → Berlin (stated, confidence: 1.0)
Result:   São Paulo superseded. Berlin is current. (Temporal fact, newer wins)

Existing: Otto → prefers → vim (inferred, confidence: 0.6)
New:      Otto → prefers → neovim (stated, confidence: 0.9)
Result:   vim superseded. neovim is current. (stated > inferred)

Existing: Otto → works_at → CompanyA (stated, confidence: 1.0)
New:      Otto → works_at → CompanyB (inferred, confidence: 0.4)
Result:   Keep CompanyA. (stated > inferred, don't override)
```

### Viewing Contradiction History

```sql
-- See all superseded facts for an entity
SELECT f1.predicate, f1.object AS old_value, f2.object AS new_value,
       f1.valid_until AS changed_at, f1.source_type AS old_source, f2.source_type AS new_source
FROM facts f1
JOIN facts f2 ON f1.superseded_by = f2.id
WHERE f1.entity_id = :entity_id
ORDER BY f1.valid_until DESC;
```

---

## 7. Complete Example: A Day in Kira's Memory

### 09:00 — Session starts

```
Working memory loaded:
- User profile (from semantic memory)
- Top 10 preferences (from procedural memory)
- Yesterday's summary (from episodic memory)
```

### 09:05 — User: "Deploy the app to production"

```
Episode stored: {type: conversation, importance: 6, tags: [deployment]}
Entity extraction: none new
Procedure matched: "Deploy to Vercel" (confidence: 0.8)
→ Agent follows procedure
```

### 09:10 — Deployment succeeds

```
Episode stored: {type: action, outcome: success, importance: 5}
Procedure updated: success_count++, confidence: 0.83
```

### 09:15 — User: "Actually, from now on always run the linter before deploying too"

```
Correction detected! 
Episode stored: {type: event, importance: 8, tags: [correction, workflow]}
Procedure updated: added "run linter" step before deploy
Preference stored: workflow.pre_deploy_linter = true (strength: 0.9, stated)
```

### 09:30 — User: "I moved to Berlin last month"

```
Episode stored: {type: conversation, importance: 7, tags: [personal]}
Entity extraction: Berlin (location, new entity created)
Fact extraction: Otto → located_in → Berlin (stated, confidence: 1.0)
Contradiction detected: Otto → located_in → São Paulo
Resolution: temporal fact, newer stated fact wins. São Paulo superseded.
Relationship: Otto → located_in → Berlin (new)
```

### 03:00 next day — Daily consolidation

```
- 15 raw episodes compressed to 4 compressed episodes
- Daily summary generated: "Deployed app, added linter to deploy process, Otto moved to Berlin"
- Confidence decay: 3 old inferred facts decayed by 0.01
- Embeddings refreshed for 2 updated entities
```

### Sunday 03:00 — Weekly consolidation

```
- Weekly insight: "Focused on deployment automation. Personal life change (relocation)."
- 2 low-confidence procedures pruned
- 5 orphaned entities deleted
- VACUUM reclaimed 2MB
```

---

## 8. Monitoring & Observability

### Memory Health Dashboard Data

```sql
-- Memory layer sizes
SELECT 
    (SELECT COUNT(*) FROM episodes) AS episode_count,
    (SELECT COUNT(*) FROM episodes WHERE compression = 'raw') AS raw_episodes,
    (SELECT COUNT(*) FROM entities) AS entity_count,
    (SELECT COUNT(*) FROM facts WHERE valid_until IS NULL) AS active_facts,
    (SELECT COUNT(*) FROM relationships) AS relationship_count,
    (SELECT COUNT(*) FROM procedures) AS procedure_count,
    (SELECT COUNT(*) FROM preferences) AS preference_count,
    (SELECT COUNT(*) FROM embeddings) AS embedding_count;

-- Learning rate (corrections per week)
SELECT COUNT(*) AS corrections_this_week
FROM episodes
WHERE json_extract(tags, '$') LIKE '%correction%'
  AND timestamp > datetime('now', '-7 days');

-- Fact confidence distribution
SELECT 
    CASE 
        WHEN confidence >= 0.8 THEN 'high'
        WHEN confidence >= 0.5 THEN 'medium'
        ELSE 'low'
    END AS confidence_band,
    COUNT(*) AS count
FROM facts
WHERE valid_until IS NULL
GROUP BY confidence_band;
```

### Alerts

- Episode table > 100K rows → trigger aggressive compaction
- Embedding cache > 500MB → prune low-importance embeddings
- Daily extraction failures > 10% → check LLM connectivity
- Contradiction rate > 5/day → possible data quality issue
