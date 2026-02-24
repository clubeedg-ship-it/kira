import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { skills, userSkills } from '../../db/schema';
import { skillsDiscoveryRouter } from './skills-discovery';
export const skillsRouter = Router();
// Mount discovery routes
skillsRouter.use('/', skillsDiscoveryRouter);
// GET /api/v1/skills — all available skills (instructions excluded for perf)
skillsRouter.get('/', async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const allSkills = await db.select({
            id: skills.id, slug: skills.slug, name: skills.name,
            description: skills.description, longDescription: skills.longDescription,
            category: skills.category, subcategory: skills.subcategory,
            icon: skills.icon, author: skills.author, sourceUrl: skills.sourceUrl,
            version: skills.version, tags: skills.tags, downloads: skills.downloads,
            rating: skills.rating, isPremium: skills.isPremium, isSystem: skills.isSystem,
            isVerified: skills.isVerified, createdAt: skills.createdAt,
        }).from(skills);
        const userInstalled = await db.select().from(userSkills)
            .where(eq(userSkills.userId, userId));
        const installed = new Map(userInstalled.map(us => [us.skillId, us.enabled]));
        const result = allSkills.map(s => ({
            ...s,
            installed: installed.has(s.id),
            enabled: installed.get(s.id) ?? false,
        }));
        res.json({ data: result });
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
// POST /api/v1/skills/:skillId/install
skillsRouter.post('/:skillId/install', async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        await db.insert(userSkills).values({
            userId, skillId: req.params.skillId, enabled: true,
        }).onConflictDoUpdate({
            target: [userSkills.userId, userSkills.skillId],
            set: { enabled: true },
        });
        res.json({ data: { success: true } });
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
// POST /api/v1/skills/:skillId/uninstall
skillsRouter.post('/:skillId/uninstall', async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        await db.delete(userSkills)
            .where(and(eq(userSkills.userId, userId), eq(userSkills.skillId, req.params.skillId)));
        res.json({ data: { success: true } });
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
// POST /api/v1/skills/:skillId/toggle
skillsRouter.post('/:skillId/toggle', async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { enabled } = req.body;
    try {
        await db.update(userSkills)
            .set({ enabled })
            .where(and(eq(userSkills.userId, userId), eq(userSkills.skillId, req.params.skillId)));
        res.json({ data: { success: true } });
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
// GET /api/v1/skills/:skillId/instructions
skillsRouter.get('/:skillId/instructions', async (req, res) => {
    try {
        const skill = await db.select().from(skills).where(eq(skills.id, req.params.skillId)).limit(1);
        if (!skill.length)
            return res.status(404).json({ error: 'Skill not found' });
        res.json({ data: { instructions: skill[0].instructions } });
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
//# sourceMappingURL=skills.js.map