import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';

import { db } from '../../db/index';
import { extractedSuggestions } from '../../db/schema';

export const suggestionsRouter = Router();

// GET /api/v1/suggestions — list pending suggestions for user
suggestionsRouter.get('/', async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(extractedSuggestions)
      .where(
        and(
          eq(extractedSuggestions.userId, req.userId),
          eq(extractedSuggestions.status, 'pending'),
        ),
      )
      .orderBy(desc(extractedSuggestions.createdAt))
      .limit(50);

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/suggestions/:id/accept
suggestionsRouter.post('/:id/accept', async (req, res) => {
  try {
    const [updated] = await db
      .update(extractedSuggestions)
      .set({ status: 'accepted' })
      .where(
        and(
          eq(extractedSuggestions.id, req.params.id),
          eq(extractedSuggestions.userId, req.userId),
        ),
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/suggestions/:id/dismiss
suggestionsRouter.post('/:id/dismiss', async (req, res) => {
  try {
    const [updated] = await db
      .update(extractedSuggestions)
      .set({ status: 'dismissed' })
      .where(
        and(
          eq(extractedSuggestions.id, req.params.id),
          eq(extractedSuggestions.userId, req.userId),
        ),
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
