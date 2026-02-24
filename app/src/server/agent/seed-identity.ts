import { db } from '../../db';
import { userIdentity, users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { DEFAULT_SOUL, DEFAULT_INSTRUCTIONS, DEFAULT_PROFILE, DEFAULT_TOOLS, DEFAULT_MEMORY } from './default-templates';

const DEFAULTS: Record<string, string> = {
  soul: DEFAULT_SOUL,
  profile: DEFAULT_PROFILE,
  instructions: DEFAULT_INSTRUCTIONS,
  tools: DEFAULT_TOOLS,
  memory: DEFAULT_MEMORY,
};

export async function seedIdentity(userId: string) {
  const keys = ['soul', 'profile', 'instructions', 'tools', 'memory'] as const;
  for (const key of keys) {
    await db.insert(userIdentity).values({
      userId,
      fileKey: key,
      content: DEFAULTS[key],
      updatedBy: 'system',
    }).onConflictDoNothing();
  }
}

/** Seed identity files for all existing users that don't have them yet */
export async function seedAllUsers() {
  const allUsers = await db.select({ id: users.id }).from(users);
  for (const user of allUsers) {
    await seedIdentity(user.id);
  }
  console.log(`[seed-identity] Seeded identity files for ${allUsers.length} users`);
}
