import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { promptPatterns } from '../db/schema';

type PromptPattern = typeof promptPatterns.$inferSelect;

/**
 * Find a matching prompt pattern for this input.
 * Uses keyword overlap scoring against stored patterns.
 */
export async function findMatchingPattern(
  userId: string,
  input: string,
): Promise<PromptPattern | null> {
  try {
    // Get user's patterns ordered by score
    const patterns = await db
      .select()
      .from(promptPatterns)
      .where(eq(promptPatterns.userId, userId))
      .orderBy(desc(promptPatterns.score))
      .limit(50);

    if (patterns.length === 0) return null;

    const inputLower = input.toLowerCase();
    const inputWords = new Set(inputLower.split(/\s+/).filter((w) => w.length > 2));

    let bestMatch: PromptPattern | null = null;
    let bestScore = 0;

    for (const pattern of patterns) {
      // Check regex pattern if available
      if (pattern.inputPattern) {
        try {
          const regex = new RegExp(pattern.inputPattern, 'i');
          if (regex.test(input)) {
            // Regex match — strong signal
            const score = 0.8 * pattern.score;
            if (score > bestScore) {
              bestScore = score;
              bestMatch = pattern;
            }
            continue;
          }
        } catch {
          // Invalid regex, skip
        }
      }

      // Keyword overlap with intent matching
      if (pattern.intentType) {
        const patternWords = new Set(
          (pattern.inputPattern || pattern.intentType).toLowerCase().split(/\s+/).filter((w) => w.length > 2),
        );
        const overlap = [...inputWords].filter((w) => patternWords.has(w)).length;
        const similarity = patternWords.size > 0 ? overlap / patternWords.size : 0;
        const score = similarity * pattern.score;

        if (score > bestScore && score > 0.3) {
          bestScore = score;
          bestMatch = pattern;
        }
      }
    }

    return bestMatch;
  } catch {
    return null;
  }
}

/**
 * Update pattern score based on outcome using Bayesian-style scoring.
 */
export async function updatePatternScore(
  patternId: string,
  success: boolean,
): Promise<void> {
  try {
    if (success) {
      await db
        .update(promptPatterns)
        .set({
          successCount: sql`${promptPatterns.successCount} + 1`,
          score: sql`(${promptPatterns.successCount} + 1.0) / (${promptPatterns.successCount} + ${promptPatterns.failureCount} + 1.0)`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(promptPatterns.id, patternId));
    } else {
      await db
        .update(promptPatterns)
        .set({
          failureCount: sql`${promptPatterns.failureCount} + 1`,
          score: sql`(${promptPatterns.successCount} * 1.0) / (${promptPatterns.successCount} + ${promptPatterns.failureCount} + 1.0)`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(promptPatterns.id, patternId));
    }
  } catch {
    // Best-effort
  }
}

/**
 * Create a new pattern from a successful enhancement.
 */
export async function createPattern(
  userId: string,
  intentType: string,
  input: string,
  template: string,
): Promise<void> {
  try {
    // Extract keywords from input as the pattern
    const keywords = input
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 10)
      .join(' ');

    // Store with {{input}} placeholder for reuse
    const templateWithPlaceholder = template.includes('{{input}}')
      ? template
      : template.replace(input, '{{input}}');

    await db.insert(promptPatterns).values({
      userId,
      intentType,
      inputPattern: keywords,
      template: templateWithPlaceholder,
      successCount: 1,
      score: 0.6, // Start slightly above neutral
    });
  } catch {
    // Best-effort
  }
}
