import { Router } from 'express';
import { db } from '../../db';
import { memoryShortTerm } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
const router = Router();
// GET /api/v1/memory/short-term
router.get('/short-term', async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const search = req.query.search;
    try {
        const results = await db
            .select()
            .from(memoryShortTerm)
            .where(eq(memoryShortTerm.userId, userId))
            .orderBy(desc(memoryShortTerm.createdAt))
            .limit(100);
        const filtered = search
            ? results.filter((r) => r.content.toLowerCase().includes(search.toLowerCase()))
            : results;
        res.json({ data: filtered });
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
// POST /api/v1/memory/short-term
router.post('/short-term', async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { content } = req.body;
    if (!content)
        return res.status(400).json({ error: 'Content required' });
    try {
        const result = await db
            .insert(memoryShortTerm)
            .values({
            userId,
            content,
            type: 'note',
        })
            .returning();
        res.json({ data: result[0] });
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
// DELETE /api/v1/memory/short-term/:id
router.delete('/short-term/:id', async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        await db.delete(memoryShortTerm).where(eq(memoryShortTerm.id, req.params.id));
        res.json({ data: { success: true } });
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
export { router as memoryRouter };
//# sourceMappingURL=memory.js.map