import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';

import { db } from '../../db/index';
import { vision } from '../../db/schema';
import {
  asRecord,
  asyncHandler,
  getTrimmedString,
  hasOwn,
  success,
  validationError,
} from './utils';

const visionRouter = Router();

visionRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const [row] = await db
      .select()
      .from(vision)
      .where(eq(vision.userId, req.userId))
      .orderBy(desc(vision.updatedAt))
      .limit(1);

    success(res, row ?? null);
  }),
);

visionRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const statement = getTrimmedString(body.statement);

    if (!statement) {
      validationError(res, 'statement is required');
      return;
    }

    const upsertValues: Record<string, unknown> = {
      statement,
    };

    if (hasOwn(body, 'horizon')) {
      const horizon = getTrimmedString(body.horizon);
      if (!horizon) {
        validationError(res, 'horizon must be a non-empty string');
        return;
      }
      upsertValues.horizon = horizon;
    }

    if (hasOwn(body, 'notes')) {
      if (body.notes === null) {
        upsertValues.notes = null;
      } else {
        const notes = getTrimmedString(body.notes);
        if (!notes) {
          validationError(res, 'notes must be a non-empty string or null');
          return;
        }
        upsertValues.notes = notes;
      }
    }

    if (hasOwn(body, 'status')) {
      const status = getTrimmedString(body.status);
      if (!status) {
        validationError(res, 'status must be a non-empty string');
        return;
      }
      upsertValues.status = status;
    }

    const [existing] = await db
      .select({ id: vision.id })
      .from(vision)
      .where(eq(vision.userId, req.userId))
      .orderBy(desc(vision.updatedAt))
      .limit(1);

    if (!existing) {
      const [created] = await db
        .insert(vision)
        .values({ userId: req.userId, ...upsertValues } as any)
        .returning();

      success(res, created, 201);
      return;
    }

    const updateValues: Record<string, unknown> = {
      ...upsertValues,
      updatedAt: sql`now()`,
    };

    const [updated] = await db
      .update(vision)
      .set(updateValues as any)
      .where(and(eq(vision.id, existing.id), eq(vision.userId, req.userId)))
      .returning();

    success(res, updated);
  }),
);

export { visionRouter };
