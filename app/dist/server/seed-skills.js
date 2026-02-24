import { db } from '../db';
import { skills, userSkills, users } from '../db/schema';
import { DEFAULT_SKILLS } from './agent/default-skills';
export async function seedSkills() {
    const existing = await db.select().from(skills).limit(1);
    if (existing.length > 0)
        return; // already seeded
    for (const s of DEFAULT_SKILLS) {
        await db.insert(skills).values(s);
    }
    // Auto-install all default skills for existing users
    const allSkillRows = await db.select().from(skills);
    const allUsers = await db.select({ id: users.id }).from(users);
    for (const user of allUsers) {
        for (const skill of allSkillRows) {
            await db.insert(userSkills).values({
                userId: user.id, skillId: skill.id, enabled: true,
            }).onConflictDoNothing();
        }
    }
    console.log(`[seed-skills] Seeded ${DEFAULT_SKILLS.length} default skills`);
}
//# sourceMappingURL=seed-skills.js.map