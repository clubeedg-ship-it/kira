/**
 * Memory decay and daily cleanup.
 * - Short-term entries older than 7 days lose 0.1 confidence/day
 * - Entries below 0.1 confidence are deleted
 */

import { eq, and, sql, lt } from 'drizzle-orm';
import { db } from '../../db/index';
import { memoryShortTerm, facts } from '../../db/schema';

/**
 * Apply decay to short-term memory entries older than 7 days.
 * Importance drops by 0.1 per day past the 7-day mark.
 */
export async function applyDecay(): Promise<{ decayed: number; deleted: number }> {
  let decayed = 0;
  let deleted = 0;

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Decay: reduce importance by 0.1 for entries older than 7 days
    const decayResult = await db
      .update(memoryShortTerm)
      .set({ importance: sql`GREATEST(${memoryShortTerm.importance} - 0.1, 0)` })
      .where(
        and(
          lt(memoryShortTerm.createdAt, sevenDaysAgo),
          eq(memoryShortTerm.promoted, false),
        ),
      )
      .returning({ id: memoryShortTerm.id });
    decayed = decayResult.length;

    // Delete entries that have decayed below 0.1
    const deleteResult = await db
      .delete(memoryShortTerm)
      .where(
        and(
          lt(memoryShortTerm.importance, 0.1),
          eq(memoryShortTerm.promoted, false),
        ),
      )
      .returning({ id: memoryShortTerm.id });
    deleted = deleteResult.length;
  } catch (e) {
    console.error('[memory-decay] Error:', e);
  }

  return { decayed, deleted };
}

/**
 * Full daily cleanup: decay + promote + purge expired.
 * Call from cron or maintenance endpoint.
 */
export async function dailyCleanup(): Promise<{
  decayed: number;
  deleted: number;
  factsDecayed: number;
}> {
  const { decayed, deleted } = await applyDecay();

  // Also decay knowledge graph facts not updated in 30 days
  let factsDecayed = 0;
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const result = await db
      .update(facts)
      .set({ confidence: sql`GREATEST(${facts.confidence} - 0.05, 0)` })
      .where(lt(facts.updatedAt, thirtyDaysAgo))
      .returning({ id: facts.id });
    factsDecayed = result.length;
  } catch {}

  console.log(`[memory-cleanup] decayed=${decayed} deleted=${deleted} factsDecayed=${factsDecayed}`);
  return { decayed, deleted, factsDecayed };
}
