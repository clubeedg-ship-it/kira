/**
 * Store NLP extraction results into the database.
 */
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { entities, relationships, facts } from '../db/schema';
/**
 * Upsert extracted entities, relations, and facts for a user.
 * Designed to be called fire-and-forget after chat messages.
 */
export async function storeExtractions(userId, result) {
    if (!result.entities.length && !result.facts.length && !result.relations.length) {
        return;
    }
    // 1. Upsert entities, collect name→id mapping
    const entityIdMap = new Map();
    for (const entity of result.entities) {
        const nameKey = entity.name.toLowerCase();
        // Check existing
        const [existing] = await db
            .select({ id: entities.id })
            .from(entities)
            .where(and(eq(entities.userId, userId), sql `lower(${entities.name}) = ${nameKey}`))
            .limit(1);
        if (existing) {
            entityIdMap.set(nameKey, existing.id);
            // Update if higher confidence type info
            await db
                .update(entities)
                .set({
                type: entity.type !== 'unknown' ? entity.type : undefined,
                updatedAt: new Date().toISOString(),
            })
                .where(eq(entities.id, existing.id));
        }
        else {
            const [inserted] = await db
                .insert(entities)
                .values({
                userId,
                type: entity.type,
                name: entity.name,
                properties: { confidence: entity.confidence, source: 'nlp-extract' },
            })
                .returning({ id: entities.id });
            if (inserted) {
                entityIdMap.set(nameKey, inserted.id);
            }
        }
    }
    // Helper to resolve entity id (create if needed)
    const resolveEntityId = async (name) => {
        const key = name.toLowerCase();
        if (entityIdMap.has(key))
            return entityIdMap.get(key);
        const [existing] = await db
            .select({ id: entities.id })
            .from(entities)
            .where(and(eq(entities.userId, userId), sql `lower(${entities.name}) = ${key}`))
            .limit(1);
        if (existing) {
            entityIdMap.set(key, existing.id);
            return existing.id;
        }
        const [inserted] = await db
            .insert(entities)
            .values({
            userId,
            type: 'unknown',
            name,
            properties: { confidence: 0.5, source: 'nlp-extract-auto' },
        })
            .returning({ id: entities.id });
        if (inserted) {
            entityIdMap.set(key, inserted.id);
            return inserted.id;
        }
        return null;
    };
    // 2. Insert relations (skip duplicates)
    for (const rel of result.relations) {
        try {
            const sourceId = await resolveEntityId(rel.source);
            const targetId = await resolveEntityId(rel.target);
            if (!sourceId || !targetId)
                continue;
            // Check for existing identical relation
            const [existing] = await db
                .select({ id: relationships.id })
                .from(relationships)
                .where(and(eq(relationships.userId, userId), eq(relationships.sourceEntityId, sourceId), eq(relationships.targetEntityId, targetId), eq(relationships.type, rel.type)))
                .limit(1);
            if (!existing) {
                await db.insert(relationships).values({
                    userId,
                    sourceEntityId: sourceId,
                    targetEntityId: targetId,
                    type: rel.type,
                    confidence: rel.confidence,
                    properties: { source: 'nlp-extract' },
                });
            }
        }
        catch (err) {
            console.error('Failed to store relation:', err);
        }
    }
    // 3. Upsert facts
    for (const fact of result.facts) {
        try {
            const entityId = await resolveEntityId(fact.subject);
            if (!entityId)
                continue;
            // Check existing fact
            const [existing] = await db
                .select({ id: facts.id, confidence: facts.confidence })
                .from(facts)
                .where(and(eq(facts.userId, userId), eq(facts.entityId, entityId), eq(facts.key, fact.key)))
                .limit(1);
            if (existing) {
                // Update only if new confidence is higher
                if (fact.confidence > (existing.confidence ?? 0)) {
                    await db
                        .update(facts)
                        .set({
                        value: fact.value,
                        confidence: fact.confidence,
                        updatedAt: new Date().toISOString(),
                    })
                        .where(eq(facts.id, existing.id));
                }
            }
            else {
                await db.insert(facts).values({
                    userId,
                    entityId,
                    key: fact.key,
                    value: fact.value,
                    source: 'nlp-extract',
                    confidence: fact.confidence,
                });
            }
        }
        catch (err) {
            console.error('Failed to store fact:', err);
        }
    }
}
//# sourceMappingURL=nlp-store.js.map