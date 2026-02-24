import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';

import { db } from '../../db/index';
import { reviews } from '../../db/schema';
import {
  asRecord,
  asyncHandler,
  getQueryString,
  getTrimmedString,
  hasOwn,
  isIsoDateTime,
  isUuid,
  notFound,
  success,
  validationError,
} from './utils';

const reviewsRouter = Router();

reviewsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const conditions: SQL<unknown>[] = [eq(reviews.userId, req.userId)];

    const reviewType = getQueryString(req.query.review_type);
    if (reviewType) {
      conditions.push(eq(reviews.reviewType, reviewType));
    }

    const status = getQueryString(req.query.status);
    if (status) {
      conditions.push(eq(reviews.status, status));
    }

    const rows = await db
      .select()
      .from(reviews)
      .where(and(...conditions))
      .orderBy(desc(reviews.scheduled), desc(reviews.createdAt));

    success(res, rows);
  }),
);

reviewsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);

    const reviewType = getTrimmedString(body.reviewType ?? body.review_type);
    const scheduled = getTrimmedString(body.scheduled);

    if (!reviewType) {
      validationError(res, 'review_type is required');
      return;
    }

    if (!scheduled || !isIsoDateTime(scheduled)) {
      validationError(res, 'scheduled is required and must be a valid ISO datetime');
      return;
    }

    const insertValues: Record<string, unknown> = {
      userId: req.userId,
      reviewType,
      scheduled: new Date(scheduled).toISOString(),
    };

    if (hasOwn(body, 'status')) {
      const status = getTrimmedString(body.status);
      if (!status) {
        validationError(res, 'status must be a non-empty string');
        return;
      }
      insertValues.status = status;
    }

    if (hasOwn(body, 'insights')) {
      if (body.insights === null) {
        insertValues.insights = null;
      } else {
        const insights = getTrimmedString(body.insights);
        if (!insights) {
          validationError(res, 'insights must be a non-empty string or null');
          return;
        }
        insertValues.insights = insights;
      }
    }

    if (hasOwn(body, 'decisions')) {
      if (body.decisions === null || Array.isArray(body.decisions) || typeof body.decisions === 'object') {
        insertValues.decisions = body.decisions;
      } else {
        validationError(res, 'decisions must be a JSON array/object/null');
        return;
      }
    }

    if (hasOwn(body, 'completedAt') || hasOwn(body, 'completed_at')) {
      if (body.completedAt === null || body.completed_at === null) {
        insertValues.completedAt = null;
      } else {
        const completedAt = getTrimmedString(body.completedAt ?? body.completed_at);
        if (!completedAt || !isIsoDateTime(completedAt)) {
          validationError(res, 'completed_at must be a valid ISO datetime or null');
          return;
        }
        insertValues.completedAt = new Date(completedAt).toISOString();
      }
    }

    const [created] = await db.insert(reviews).values(insertValues as any).returning();

    success(res, created, 201);
  }),
);

reviewsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id as string)) {
      validationError(res, 'id must be a valid UUID');
      return;
    }

    const body = asRecord(req.body);
    const updateValues: Record<string, unknown> = {};

    if (hasOwn(body, 'reviewType') || hasOwn(body, 'review_type')) {
      const reviewType = getTrimmedString(body.reviewType ?? body.review_type);
      if (!reviewType) {
        validationError(res, 'review_type must be a non-empty string');
        return;
      }
      updateValues.reviewType = reviewType;
    }

    if (hasOwn(body, 'scheduled')) {
      const scheduled = getTrimmedString(body.scheduled);
      if (!scheduled || !isIsoDateTime(scheduled)) {
        validationError(res, 'scheduled must be a valid ISO datetime');
        return;
      }
      updateValues.scheduled = new Date(scheduled).toISOString();
    }

    if (hasOwn(body, 'status')) {
      const status = getTrimmedString(body.status);
      if (!status) {
        validationError(res, 'status must be a non-empty string');
        return;
      }
      updateValues.status = status;
    }

    if (hasOwn(body, 'insights')) {
      if (body.insights === null) {
        updateValues.insights = null;
      } else {
        const insights = getTrimmedString(body.insights);
        if (!insights) {
          validationError(res, 'insights must be a non-empty string or null');
          return;
        }
        updateValues.insights = insights;
      }
    }

    if (hasOwn(body, 'decisions')) {
      if (body.decisions === null || Array.isArray(body.decisions) || typeof body.decisions === 'object') {
        updateValues.decisions = body.decisions;
      } else {
        validationError(res, 'decisions must be a JSON array/object/null');
        return;
      }
    }

    if (hasOwn(body, 'completedAt') || hasOwn(body, 'completed_at')) {
      if (body.completedAt === null || body.completed_at === null) {
        updateValues.completedAt = null;
      } else {
        const completedAt = getTrimmedString(body.completedAt ?? body.completed_at);
        if (!completedAt || !isIsoDateTime(completedAt)) {
          validationError(res, 'completed_at must be a valid ISO datetime or null');
          return;
        }
        updateValues.completedAt = new Date(completedAt).toISOString();
      }
    }

    if (Object.keys(updateValues).length === 0) {
      validationError(res, 'No valid fields to update');
      return;
    }

    const [updated] = await db
      .update(reviews)
      .set(updateValues as any)
      .where(and(eq(reviews.id, req.params.id as string), eq(reviews.userId, req.userId)))
      .returning();

    if (!updated) {
      notFound(res, 'Review not found');
      return;
    }

    success(res, updated);
  }),
);

reviewsRouter.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const reviewType =
      getTrimmedString(body.reviewType ?? body.review_type) ||
      getQueryString(req.query.review_type) ||
      getQueryString(req.query.type) ||
      'daily';

    const targetDate =
      getTrimmedString(body.date) ||
      getQueryString(req.query.date) ||
      new Date().toISOString().slice(0, 10);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(and(eq(reviews.userId, req.userId), eq(reviews.reviewType, reviewType)));

    const recentReviews = await db
      .select({
        id: reviews.id,
        status: reviews.status,
        scheduled: reviews.scheduled,
        completedAt: reviews.completedAt,
        insights: reviews.insights,
      })
      .from(reviews)
      .where(and(eq(reviews.userId, req.userId), eq(reviews.reviewType, reviewType)))
      .orderBy(desc(reviews.scheduled), desc(reviews.createdAt))
      .limit(5);

    success(res, {
      reviewType,
      date: targetDate,
      existingCount: Number(countRow?.count ?? 0),
      recentReviews,
      suggestedPrompt: `Generate a ${reviewType} review for ${targetDate}.`,
    });
  }),
);

export { reviewsRouter };
