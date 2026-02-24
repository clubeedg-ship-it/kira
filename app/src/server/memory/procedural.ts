import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../../db/index';
import { promptPatterns, userPreferences } from '../../db/schema';

type Pattern = typeof promptPatterns.$inferSelect;

export async function getRelevantPatterns(
  userId: string,
  input: string,
): Promise<Pattern[]> {
  try {
    // Get top patterns by score for this user
    return await db
      .select()
      .from(promptPatterns)
      .where(eq(promptPatterns.userId, userId))
      .orderBy(desc(promptPatterns.score))
      .limit(5);
  } catch {
    return [];
  }
}

export async function getUserPreferences(
  userId: string,
): Promise<Record<string, string>> {
  try {
    const rows = await db
      .select({ key: userPreferences.key, value: userPreferences.value })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));

    const prefs: Record<string, string> = {};
    for (const row of rows) {
      prefs[row.key] = row.value;
    }
    return prefs;
  } catch {
    return {};
  }
}

export async function learnPreference(
  userId: string,
  key: string,
  value: string,
  source: 'explicit' | 'inferred',
): Promise<void> {
  try {
    const confidence = source === 'explicit' ? 0.9 : 0.6;
    await db
      .insert(userPreferences)
      .values({ userId, key, value, confidence, source })
      .onConflictDoUpdate({
        target: [userPreferences.userId, userPreferences.key],
        set: {
          value,
          confidence,
          source,
          updatedAt: new Date().toISOString(),
        },
      })
      .catch(async () => {
        // If unique constraint doesn't exist on (userId, key), do manual upsert
        const existing = await db
          .select()
          .from(userPreferences)
          .where(and(eq(userPreferences.userId, userId), eq(userPreferences.key, key)))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(userPreferences)
            .set({ value, confidence, source, updatedAt: new Date().toISOString() })
            .where(eq(userPreferences.id, existing[0].id));
        } else {
          await db.insert(userPreferences).values({ userId, key, value, confidence, source });
        }
      });
  } catch {
    // table may not exist
  }
}
