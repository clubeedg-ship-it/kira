import { and, asc, eq, type SQL } from 'drizzle-orm';
import { Router } from 'express';

import { db } from '../../db/index';
import { areas, timeBlocks } from '../../db/schema';
import {
  asRecord,
  asyncHandler,
  getBoolean,
  getInteger,
  getQueryString,
  getTrimmedString,
  hasOwn,
  isDateOnly,
  isUuid,
  notFound,
  success,
  validationError,
} from './utils';

const timeBlocksRouter = Router();

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

async function areaBelongsToUser(userId: string, areaId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(and(eq(areas.id, areaId), eq(areas.userId, userId)))
    .limit(1);

  return Boolean(row);
}

timeBlocksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const conditions: SQL<unknown>[] = [eq(timeBlocks.userId, req.userId)];

    const dayOfWeekRaw = getQueryString(req.query.day_of_week);
    if (dayOfWeekRaw) {
      const dayOfWeek = getInteger(dayOfWeekRaw);
      if (dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6) {
        validationError(res, 'day_of_week must be an integer between 0 and 6');
        return;
      }

      conditions.push(eq(timeBlocks.dayOfWeek, dayOfWeek));
    }

    const areaId = getQueryString(req.query.area_id);
    if (areaId) {
      if (!isUuid(areaId)) {
        validationError(res, 'area_id must be a valid UUID');
        return;
      }

      conditions.push(eq(timeBlocks.areaId, areaId));
    }

    const rows = await db
      .select()
      .from(timeBlocks)
      .where(and(...conditions))
      .orderBy(asc(timeBlocks.dayOfWeek), asc(timeBlocks.startTime), asc(timeBlocks.createdAt));

    success(res, rows);
  }),
);

timeBlocksRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const title = getTrimmedString(body.title);

    if (!title) {
      validationError(res, 'title is required');
      return;
    }

    const insertValues: Record<string, unknown> = {
      userId: req.userId,
      title,
    };

    if (hasOwn(body, 'areaId') || hasOwn(body, 'area_id')) {
      if (body.areaId === null || body.area_id === null) {
        insertValues.areaId = null;
      } else {
        const areaId = getTrimmedString(body.areaId ?? body.area_id);
        if (!areaId || !isUuid(areaId)) {
          validationError(res, 'area_id must be a valid UUID or null');
          return;
        }

        if (!(await areaBelongsToUser(req.userId, areaId))) {
          notFound(res, 'Area not found');
          return;
        }

        insertValues.areaId = areaId;
      }
    }

    if (hasOwn(body, 'blockType') || hasOwn(body, 'block_type')) {
      const blockType = getTrimmedString(body.blockType ?? body.block_type);
      if (!blockType) {
        validationError(res, 'block_type must be a non-empty string');
        return;
      }
      insertValues.blockType = blockType;
    }

    if (hasOwn(body, 'dayOfWeek') || hasOwn(body, 'day_of_week')) {
      if (body.dayOfWeek === null || body.day_of_week === null) {
        insertValues.dayOfWeek = null;
      } else {
        const dayOfWeek = getInteger(body.dayOfWeek ?? body.day_of_week);
        if (dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6) {
          validationError(res, 'day_of_week must be an integer between 0 and 6');
          return;
        }
        insertValues.dayOfWeek = dayOfWeek;
      }
    }

    if (hasOwn(body, 'startTime') || hasOwn(body, 'start_time')) {
      if (body.startTime === null || body.start_time === null) {
        insertValues.startTime = null;
      } else {
        const startTime = getTrimmedString(body.startTime ?? body.start_time);
        if (!startTime || !TIME_REGEX.test(startTime)) {
          validationError(res, 'start_time must be in HH:MM or HH:MM:SS format');
          return;
        }
        insertValues.startTime = startTime;
      }
    }

    if (hasOwn(body, 'endTime') || hasOwn(body, 'end_time')) {
      if (body.endTime === null || body.end_time === null) {
        insertValues.endTime = null;
      } else {
        const endTime = getTrimmedString(body.endTime ?? body.end_time);
        if (!endTime || !TIME_REGEX.test(endTime)) {
          validationError(res, 'end_time must be in HH:MM or HH:MM:SS format');
          return;
        }
        insertValues.endTime = endTime;
      }
    }

    if (hasOwn(body, 'isRecurring') || hasOwn(body, 'is_recurring')) {
      const isRecurring = getBoolean(body.isRecurring ?? body.is_recurring);
      if (isRecurring === null) {
        validationError(res, 'is_recurring must be a boolean');
        return;
      }
      insertValues.isRecurring = isRecurring;
    }

    if (hasOwn(body, 'specificDate') || hasOwn(body, 'specific_date')) {
      if (body.specificDate === null || body.specific_date === null) {
        insertValues.specificDate = null;
      } else {
        const specificDate = getTrimmedString(body.specificDate ?? body.specific_date);
        if (!specificDate || !isDateOnly(specificDate)) {
          validationError(res, 'specific_date must be in YYYY-MM-DD format or null');
          return;
        }
        insertValues.specificDate = specificDate;
      }
    }

    const [created] = await db.insert(timeBlocks).values(insertValues as any).returning();

    success(res, created, 201);
  }),
);

timeBlocksRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id as string)) {
      validationError(res, 'id must be a valid UUID');
      return;
    }

    const body = asRecord(req.body);
    const updateValues: Record<string, unknown> = {};

    if (hasOwn(body, 'title')) {
      const title = getTrimmedString(body.title);
      if (!title) {
        validationError(res, 'title must be a non-empty string');
        return;
      }
      updateValues.title = title;
    }

    if (hasOwn(body, 'areaId') || hasOwn(body, 'area_id')) {
      if (body.areaId === null || body.area_id === null) {
        updateValues.areaId = null;
      } else {
        const areaId = getTrimmedString(body.areaId ?? body.area_id);
        if (!areaId || !isUuid(areaId)) {
          validationError(res, 'area_id must be a valid UUID or null');
          return;
        }

        if (!(await areaBelongsToUser(req.userId, areaId))) {
          notFound(res, 'Area not found');
          return;
        }

        updateValues.areaId = areaId;
      }
    }

    if (hasOwn(body, 'blockType') || hasOwn(body, 'block_type')) {
      const blockType = getTrimmedString(body.blockType ?? body.block_type);
      if (!blockType) {
        validationError(res, 'block_type must be a non-empty string');
        return;
      }
      updateValues.blockType = blockType;
    }

    if (hasOwn(body, 'dayOfWeek') || hasOwn(body, 'day_of_week')) {
      if (body.dayOfWeek === null || body.day_of_week === null) {
        updateValues.dayOfWeek = null;
      } else {
        const dayOfWeek = getInteger(body.dayOfWeek ?? body.day_of_week);
        if (dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6) {
          validationError(res, 'day_of_week must be an integer between 0 and 6');
          return;
        }
        updateValues.dayOfWeek = dayOfWeek;
      }
    }

    if (hasOwn(body, 'startTime') || hasOwn(body, 'start_time')) {
      if (body.startTime === null || body.start_time === null) {
        updateValues.startTime = null;
      } else {
        const startTime = getTrimmedString(body.startTime ?? body.start_time);
        if (!startTime || !TIME_REGEX.test(startTime)) {
          validationError(res, 'start_time must be in HH:MM or HH:MM:SS format');
          return;
        }
        updateValues.startTime = startTime;
      }
    }

    if (hasOwn(body, 'endTime') || hasOwn(body, 'end_time')) {
      if (body.endTime === null || body.end_time === null) {
        updateValues.endTime = null;
      } else {
        const endTime = getTrimmedString(body.endTime ?? body.end_time);
        if (!endTime || !TIME_REGEX.test(endTime)) {
          validationError(res, 'end_time must be in HH:MM or HH:MM:SS format');
          return;
        }
        updateValues.endTime = endTime;
      }
    }

    if (hasOwn(body, 'isRecurring') || hasOwn(body, 'is_recurring')) {
      const isRecurring = getBoolean(body.isRecurring ?? body.is_recurring);
      if (isRecurring === null) {
        validationError(res, 'is_recurring must be a boolean');
        return;
      }
      updateValues.isRecurring = isRecurring;
    }

    if (hasOwn(body, 'specificDate') || hasOwn(body, 'specific_date')) {
      if (body.specificDate === null || body.specific_date === null) {
        updateValues.specificDate = null;
      } else {
        const specificDate = getTrimmedString(body.specificDate ?? body.specific_date);
        if (!specificDate || !isDateOnly(specificDate)) {
          validationError(res, 'specific_date must be in YYYY-MM-DD format or null');
          return;
        }
        updateValues.specificDate = specificDate;
      }
    }

    if (Object.keys(updateValues).length === 0) {
      validationError(res, 'No valid fields to update');
      return;
    }

    const [updated] = await db
      .update(timeBlocks)
      .set(updateValues as any)
      .where(and(eq(timeBlocks.id, req.params.id as string), eq(timeBlocks.userId, req.userId)))
      .returning();

    if (!updated) {
      notFound(res, 'Time block not found');
      return;
    }

    success(res, updated);
  }),
);

timeBlocksRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id as string)) {
      validationError(res, 'id must be a valid UUID');
      return;
    }

    const [deleted] = await db
      .delete(timeBlocks)
      .where(and(eq(timeBlocks.id, req.params.id as string), eq(timeBlocks.userId, req.userId)))
      .returning();

    if (!deleted) {
      notFound(res, 'Time block not found');
      return;
    }

    success(res, deleted);
  }),
);

export { timeBlocksRouter };
