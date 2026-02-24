import { eq, and, desc, sql, like, gt } from 'drizzle-orm';
import { db } from '../../db/index';
import { memoryShortTerm, entities, facts } from '../../db/schema';
export async function remember(userId, type, content, conversationId, importance) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.insert(memoryShortTerm).values({
        userId,
        type,
        content,
        sourceConversationId: conversationId,
        importance: importance ?? 0.5,
        expiresAt,
    });
}
export async function recall(userId, query, limit) {
    const now = new Date().toISOString();
    const maxResults = limit ?? 20;
    let rows;
    if (query) {
        rows = await db
            .select()
            .from(memoryShortTerm)
            .where(and(eq(memoryShortTerm.userId, userId), sql `(${memoryShortTerm.expiresAt} IS NULL OR ${memoryShortTerm.expiresAt} > ${now})`, like(memoryShortTerm.content, `%${query}%`)))
            .orderBy(desc(memoryShortTerm.importance))
            .limit(maxResults);
    }
    else {
        rows = await db
            .select()
            .from(memoryShortTerm)
            .where(and(eq(memoryShortTerm.userId, userId), sql `(${memoryShortTerm.expiresAt} IS NULL OR ${memoryShortTerm.expiresAt} > ${now})`))
            .orderBy(desc(memoryShortTerm.importance))
            .limit(maxResults);
    }
    return rows.map((r) => ({
        id: r.id,
        type: r.type,
        content: r.content,
        importance: r.importance,
        createdAt: r.createdAt,
    }));
}
export async function decayAndPromote(userId) {
    const now = new Date().toISOString();
    let expired = 0;
    let promoted = 0;
    try {
        // Find expired, high-importance, un-promoted entries → promote to knowledge graph
        const toPromote = await db
            .select()
            .from(memoryShortTerm)
            .where(and(eq(memoryShortTerm.userId, userId), sql `${memoryShortTerm.expiresAt} <= ${now}`, gt(memoryShortTerm.importance, 0.7), eq(memoryShortTerm.promoted, false)));
        for (const entry of toPromote) {
            try {
                // Create entity in knowledge graph
                const [entity] = await db
                    .insert(entities)
                    .values({
                    userId,
                    type: 'memory',
                    name: entry.content.slice(0, 200),
                })
                    .returning({ id: entities.id });
                // Create fact
                await db.insert(facts).values({
                    userId,
                    entityId: entity.id,
                    key: entry.type,
                    value: entry.content,
                    source: 'memory-promotion',
                    confidence: entry.importance,
                });
                // Mark as promoted
                await db
                    .update(memoryShortTerm)
                    .set({ promoted: true })
                    .where(eq(memoryShortTerm.id, entry.id));
                promoted++;
            }
            catch {
                // entity/facts tables may not exist
            }
        }
        // Count all expired (not promoted)
        const expiredRows = await db
            .select({ id: memoryShortTerm.id })
            .from(memoryShortTerm)
            .where(and(eq(memoryShortTerm.userId, userId), sql `${memoryShortTerm.expiresAt} <= ${now}`, eq(memoryShortTerm.promoted, false)));
        expired = expiredRows.length;
    }
    catch {
        // table may not exist
    }
    return { expired, promoted };
}
//# sourceMappingURL=short-term.js.map