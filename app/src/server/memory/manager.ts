import { eq, and, sql, lt } from 'drizzle-orm';
import { db } from '../../db/index';
import { facts, memoryStaging } from '../../db/schema';
import { decayAndPromote } from './short-term';

export async function runMaintenance(userId: string): Promise<{
  shortTermDecayed: number;
  shortTermPromoted: number;
  factsDecayed: number;
  stagingReviewed: number;
}> {
  // 1. Short-term decay and promotion
  let shortTermDecayed = 0;
  let shortTermPromoted = 0;
  try {
    const result = await decayAndPromote(userId);
    shortTermDecayed = result.expired;
    shortTermPromoted = result.promoted;
  } catch {
    // table may not exist
  }

  // 2. Decay knowledge graph confidence for stale facts
  let factsDecayed = 0;
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const result = await db
      .update(facts)
      .set({ confidence: sql`${facts.confidence} * 0.9` })
      .where(
        and(
          eq(facts.userId, userId),
          lt(facts.updatedAt, thirtyDaysAgo),
        ),
      )
      .returning({ id: facts.id });
    factsDecayed = result.length;
  } catch {
    // table may not exist
  }

  // 3. Auto-approve high-confidence staging entries
  let stagingReviewed = 0;
  try {
    const now = new Date().toISOString();
    const result = await db
      .update(memoryStaging)
      .set({ status: 'approved', reviewedAt: now })
      .where(
        and(
          eq(memoryStaging.userId, userId),
          eq(memoryStaging.status, 'pending'),
          sql`(${memoryStaging.data}->>'confidence')::float > 0.8`,
        ),
      )
      .returning({ id: memoryStaging.id });
    stagingReviewed = result.length;
  } catch {
    // table may not exist
  }

  return { shortTermDecayed, shortTermPromoted, factsDecayed, stagingReviewed };
}
