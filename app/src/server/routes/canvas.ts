import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';

import { db } from '../../db/index';
import { canvasStates } from '../../db/schema';
import { asyncHandler, success, notFound, validationError } from './utils';

const canvasRouter = Router();

// List active canvases for user
canvasRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(canvasStates)
      .where(and(eq(canvasStates.userId, req.userId), eq(canvasStates.status, 'active')))
      .orderBy(desc(canvasStates.createdAt));
    success(res, rows);
  }),
);

// Get canvas by ID
canvasRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const [row] = await db
      .select()
      .from(canvasStates)
      .where(and(eq(canvasStates.id, id), eq(canvasStates.userId, req.userId)));
    if (!row) return notFound(res, 'Canvas not found');
    success(res, row);
  }),
);

// Create canvas
canvasRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { type, title, content, conversationId } = req.body;
    if (!type || !content) return validationError(res, 'type and content required');

    const [row] = await db
      .insert(canvasStates)
      .values({
        userId: req.userId,
        conversationId: conversationId || null,
        type,
        title: title || 'Canvas',
        content,
        status: 'active',
      })
      .returning();
    success(res, row, 201);
  }),
);

// Update canvas
canvasRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const { type, title, content, status } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (type) updates.type = type;
    if (title) updates.title = title;
    if (content) updates.content = content;
    if (status) updates.status = status;

    const [row] = await db
      .update(canvasStates)
      .set(updates)
      .where(and(eq(canvasStates.id, id), eq(canvasStates.userId, req.userId)))
      .returning();
    if (!row) return notFound(res, 'Canvas not found');
    success(res, row);
  }),
);

// Submit form response
canvasRouter.post(
  '/:id/respond',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const { response } = req.body;
    if (!response) return validationError(res, 'response required');

    const [row] = await db
      .update(canvasStates)
      .set({
        response,
        status: 'completed',
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(canvasStates.id, id), eq(canvasStates.userId, req.userId)))
      .returning();
    if (!row) return notFound(res, 'Canvas not found');
    success(res, row);
  }),
);

// Dismiss canvas
canvasRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const [row] = await db
      .update(canvasStates)
      .set({ status: 'dismissed', updatedAt: new Date().toISOString() })
      .where(and(eq(canvasStates.id, id), eq(canvasStates.userId, req.userId)))
      .returning();
    if (!row) return notFound(res, 'Canvas not found');
    success(res, row);
  }),
);

export { canvasRouter };
