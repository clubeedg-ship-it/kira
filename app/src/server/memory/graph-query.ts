import { eq, and, like, sql } from 'drizzle-orm';
import { db } from '../../db/index';
import { entities, facts, relationships } from '../../db/schema';

type Entity = typeof entities.$inferSelect;
type Fact = typeof facts.$inferSelect;
type Relationship = typeof relationships.$inferSelect;

export async function searchEntities(
  userId: string,
  query: string,
  limit?: number,
): Promise<Entity[]> {
  try {
    return await db
      .select()
      .from(entities)
      .where(and(eq(entities.userId, userId), like(entities.name, `%${query}%`)))
      .limit(limit ?? 10);
  } catch {
    return [];
  }
}

export async function getEntityFacts(
  userId: string,
  entityName: string,
): Promise<Fact[]> {
  try {
    const matched = await db
      .select()
      .from(entities)
      .where(and(eq(entities.userId, userId), like(entities.name, `%${entityName}%`)))
      .limit(1);

    if (matched.length === 0) return [];

    return await db
      .select()
      .from(facts)
      .where(and(eq(facts.userId, userId), eq(facts.entityId, matched[0].id)));
  } catch {
    return [];
  }
}

export async function getRelatedEntities(
  userId: string,
  entityName: string,
): Promise<Relationship[]> {
  try {
    const matched = await db
      .select()
      .from(entities)
      .where(and(eq(entities.userId, userId), like(entities.name, `%${entityName}%`)))
      .limit(1);

    if (matched.length === 0) return [];

    return await db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.userId, userId),
          sql`(${relationships.sourceEntityId} = ${matched[0].id} OR ${relationships.targetEntityId} = ${matched[0].id})`,
        ),
      );
  } catch {
    return [];
  }
}

export async function queryContextForText(
  userId: string,
  text: string,
): Promise<{ entities: Entity[]; facts: Fact[]; relations: Relationship[] }> {
  const result: { entities: Entity[]; facts: Fact[]; relations: Relationship[] } = {
    entities: [],
    facts: [],
    relations: [],
  };

  try {
    // Extract keywords: split on whitespace, filter short/common words
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but', 'not', 'with', 'this', 'that', 'it', 'i', 'my', 'me', 'we', 'you', 'he', 'she', 'do', 'does', 'did', 'have', 'has', 'had', 'be', 'been', 'being', 'will', 'would', 'could', 'should', 'can', 'may', 'might']);
    const keywords = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    const uniqueKeywords = [...new Set(keywords)].slice(0, 5);
    const seenEntityIds = new Set<string>();

    for (const keyword of uniqueKeywords) {
      const matched = await searchEntities(userId, keyword, 3);
      for (const ent of matched) {
        if (!seenEntityIds.has(ent.id)) {
          seenEntityIds.add(ent.id);
          result.entities.push(ent);

          const entFacts = await db
            .select()
            .from(facts)
            .where(and(eq(facts.userId, userId), eq(facts.entityId, ent.id)));
          result.facts.push(...entFacts);

          const rels = await db
            .select()
            .from(relationships)
            .where(
              and(
                eq(relationships.userId, userId),
                sql`(${relationships.sourceEntityId} = ${ent.id} OR ${relationships.targetEntityId} = ${ent.id})`,
              ),
            );
          result.relations.push(...rels);
        }
      }
    }
  } catch {
    // tables may not exist
  }

  return result;
}
