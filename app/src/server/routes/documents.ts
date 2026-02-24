import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { Router } from 'express';

import { db } from '../../db/index';
import { documents } from '../../db/schema';
import {
  asyncHandler,
  getQueryString,
  getTrimmedString,
  isUuid,
  notFound,
  success,
  validationError,
} from './utils';

export const documentsRouter = Router();

// GET /api/v1/documents
documentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const search = getQueryString(req.query.search);
    const folder = getQueryString(req.query.folder);

    const conditions = [eq(documents.userId, userId)];
    if (folder) conditions.push(eq(documents.folder, folder));
    if (search) {
      conditions.push(
        or(
          ilike(documents.title, `%${search}%`),
          ilike(documents.content, `%${search}%`),
        )!,
      );
    }

    const rows = await db
      .select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.updatedAt));

    success(res, rows);
  }),
);

// POST /api/v1/documents
documentsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const title = getTrimmedString(req.body.title);
    if (!title) return validationError(res, 'title is required');

    const content = typeof req.body.content === 'string' ? req.body.content : '';
    const folder = getTrimmedString(req.body.folder);
    const tags = Array.isArray(req.body.tags) ? req.body.tags : null;
    const mimeType = getTrimmedString(req.body.mimeType) || 'text/markdown';
    const summary = getTrimmedString(req.body.summary);

    const [doc] = await db
      .insert(documents)
      .values({ userId, title, content, folder, tags, mimeType, summary })
      .returning();

    success(res, doc, 201);
  }),
);

// GET /api/v1/documents/:id
documentsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    if (!isUuid(id)) return validationError(res, 'Invalid document id');

    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, req.userId!)))
      .limit(1);

    if (!doc) return notFound(res, 'Document not found');
    success(res, doc);
  }),
);

// PUT /api/v1/documents/:id
documentsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    if (!isUuid(id)) return validationError(res, 'Invalid document id');

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (req.body.title !== undefined) updates.title = getTrimmedString(req.body.title);
    if (req.body.content !== undefined) updates.content = req.body.content;
    if (req.body.folder !== undefined) updates.folder = getTrimmedString(req.body.folder);
    if (req.body.tags !== undefined) updates.tags = Array.isArray(req.body.tags) ? req.body.tags : null;
    if (req.body.mimeType !== undefined) updates.mimeType = getTrimmedString(req.body.mimeType);
    if (req.body.summary !== undefined) updates.summary = getTrimmedString(req.body.summary);

    const [doc] = await db
      .update(documents)
      .set(updates)
      .where(and(eq(documents.id, id), eq(documents.userId, req.userId!)))
      .returning();

    if (!doc) return notFound(res, 'Document not found');
    success(res, doc);
  }),
);

// DELETE /api/v1/documents/:id
documentsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    if (!isUuid(id)) return validationError(res, 'Invalid document id');

    const [doc] = await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, req.userId!)))
      .returning();

    if (!doc) return notFound(res, 'Document not found');
    success(res, { deleted: true });
  }),
);
