import { and, asc, eq, sql } from 'drizzle-orm';
import { Router } from 'express';

import { db } from '../../db/index';
import { chatPanels, conversations } from '../../db/schema';
import {
  asyncHandler,
  asRecord,
  getTrimmedString,
  isUuid,
  notFound,
  success,
  validationError,
} from './utils';

const panelsRouter = Router();

/* GET /api/v1/panels — list user's open panels */
panelsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(chatPanels)
      .where(and(eq(chatPanels.userId, req.userId), eq(chatPanels.isActive, true)))
      .orderBy(asc(chatPanels.position));

    success(res, rows);
  }),
);

/* POST /api/v1/panels — create panel (optionally creates conversation) */
panelsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const title = getTrimmedString(body.title) || 'New Chat';
    const agentId = getTrimmedString(body.agentId);

    // Create a conversation for this panel
    const [conv] = await db
      .insert(conversations)
      .values({
        userId: req.userId,
        title,
      })
      .returning();

    // Get max position
    const maxPos = await db
      .select({ max: sql<number>`coalesce(max(${chatPanels.position}), -1)` })
      .from(chatPanels)
      .where(and(eq(chatPanels.userId, req.userId), eq(chatPanels.isActive, true)));

    const [panel] = await db
      .insert(chatPanels)
      .values({
        userId: req.userId,
        agentId: agentId && isUuid(agentId) ? agentId : null,
        conversationId: conv.id,
        title,
        position: (maxPos[0]?.max ?? -1) + 1,
      })
      .returning();

    success(res, { ...panel, conversation: conv }, 201);
  }),
);

/* DELETE /api/v1/panels/:id — close panel */
panelsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (!isUuid(id)) { validationError(res, 'invalid panel id'); return; }

    const [updated] = await db
      .update(chatPanels)
      .set({ isActive: false })
      .where(and(eq(chatPanels.id, id), eq(chatPanels.userId, req.userId)))
      .returning();

    if (!updated) { notFound(res, 'panel not found'); return; }
    success(res, updated);
  }),
);

/* POST /api/v1/panels/:id/branch — memory branch point (placeholder) */
panelsRouter.post(
  '/:id/branch',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (!isUuid(id)) { validationError(res, 'invalid panel id'); return; }

    // For now, just acknowledge — full memory branching is a future enhancement
    success(res, { panelId: id, branchedAt: new Date().toISOString() });
  }),
);

export { panelsRouter };
