import { db } from '../../db';
import { userIdentity, identityChangelog, userSettings } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export async function canSelfEvolve(userId: string): Promise<boolean> {
  try {
    const settings = await db.select().from(userSettings)
      .where(eq(userSettings.userId, userId)).limit(1);
    return settings[0]?.selfEvolutionEnabled ?? false;
  } catch { return false; }
}

export async function updateIdentityFile(
  userId: string,
  fileKey: string,
  newContent: string,
  reason: string,
  updatedBy: 'user' | 'agent' = 'agent'
): Promise<{ success: boolean; message: string }> {
  const current = await db.select().from(userIdentity)
    .where(and(eq(userIdentity.userId, userId), eq(userIdentity.fileKey, fileKey)))
    .limit(1);

  const oldContent = current[0]?.content || '';

  await db.insert(identityChangelog).values({
    userId,
    fileKey,
    oldContent,
    newContent,
    reason,
    approved: updatedBy === 'user' ? true : null,
  });

  await db.insert(userIdentity).values({
    userId, fileKey, content: newContent, updatedBy, version: 1
  }).onConflictDoUpdate({
    target: [userIdentity.userId, userIdentity.fileKey],
    set: {
      content: newContent,
      updatedAt: new Date().toISOString(),
      updatedBy,
      version: current[0] ? current[0].version + 1 : 1
    }
  });

  return { success: true, message: `Updated ${fileKey} (v${(current[0]?.version || 0) + 1}): ${reason}` };
}
