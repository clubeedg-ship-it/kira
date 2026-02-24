import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';

import { db } from '../../db/index';
import { areas, keyResults, objectives } from '../../db/schema';
import { onKeyResultUpdate, onParentArchived } from '../engine/cascade';
import { validateTransition } from '../engine/state-machine';
import {
  asRecord,
  asyncHandler,
  getInteger,
  getNumber,
  getQueryString,
  getTrimmedString,
  hasOwn,
  isDateOnly,
  isUuid,
  notFound,
  success,
  validationError,
} from './utils';

const objectivesRouter = Router();
const keyResultsRouter = Router();

async function areaBelongsToUser(userId: string, areaId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(and(eq(areas.id, areaId), eq(areas.userId, userId)))
    .limit(1);

  return Boolean(row);
}

async function objectiveBelongsToUser(userId: string, objectiveId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: objectives.id })
    .from(objectives)
    .where(and(eq(objectives.id, objectiveId), eq(objectives.userId, userId)))
    .limit(1);

  return Boolean(row);
}

objectivesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const conditions: SQL<unknown>[] = [eq(objectives.userId, req.userId)];

    const areaId = getQueryString(req.query.area_id);
    if (areaId) {
      if (!isUuid(areaId)) {
        validationError(res, 'area_id must be a valid UUID');
        return;
      }
      conditions.push(eq(objectives.areaId, areaId));
    }

    const quarter = getQueryString(req.query.quarter);
    if (quarter) {
      conditions.push(eq(objectives.quarter, quarter));
    }

    const status = getQueryString(req.query.status);
    if (status) {
      conditions.push(eq(objectives.status, status));
    }

    const rows = await db
      .select()
      .from(objectives)
      .where(and(...conditions))
      .orderBy(desc(objectives.createdAt));

    success(res, rows);
  }),
);

objectivesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id as string)) {
      validationError(res, 'id must be a valid UUID');
      return;
    }

    const [objective] = await db
      .select()
      .from(objectives)
      .where(and(eq(objectives.id, req.params.id as string), eq(objectives.userId, req.userId)))
      .limit(1);

    if (!objective) {
      notFound(res, 'Objective not found');
      return;
    }

    const relatedKeyResults = await db
      .select()
      .from(keyResults)
      .where(and(eq(keyResults.objectiveId, objective.id), eq(keyResults.userId, req.userId)))
      .orderBy(asc(keyResults.sortOrder), asc(keyResults.createdAt));

    success(res, {
      ...objective,
      keyResults: relatedKeyResults,
    });
  }),
);

objectivesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);

    const areaId = getTrimmedString(body.areaId ?? body.area_id);
    const title = getTrimmedString(body.title);
    const quarter = getTrimmedString(body.quarter);

    if (!areaId || !isUuid(areaId)) {
      validationError(res, 'area_id is required and must be a valid UUID');
      return;
    }

    if (!title) {
      validationError(res, 'title is required');
      return;
    }

    if (!quarter) {
      validationError(res, 'quarter is required');
      return;
    }

    if (!(await areaBelongsToUser(req.userId, areaId))) {
      notFound(res, 'Area not found');
      return;
    }

    const insertValues: Record<string, unknown> = {
      userId: req.userId,
      areaId,
      title,
      quarter,
    };

    if (hasOwn(body, 'description')) {
      if (body.description === null) {
        insertValues.description = null;
      } else {
        const description = getTrimmedString(body.description);
        if (!description) {
          validationError(res, 'description must be a non-empty string or null');
          return;
        }
        insertValues.description = description;
      }
    }

    if (hasOwn(body, 'status')) {
      const status = getTrimmedString(body.status);
      if (!status) {
        validationError(res, 'status must be a non-empty string');
        return;
      }
      insertValues.status = status;
    }

    if (hasOwn(body, 'progress')) {
      const progress = getInteger(body.progress);
      if (progress === null) {
        validationError(res, 'progress must be an integer');
        return;
      }
      insertValues.progress = progress;
    }

    if (hasOwn(body, 'startDate') || hasOwn(body, 'start_date')) {
      const startDate = getTrimmedString(body.startDate ?? body.start_date);
      if (!startDate || !isDateOnly(startDate)) {
        validationError(res, 'start_date must be in YYYY-MM-DD format');
        return;
      }
      insertValues.startDate = startDate;
    }

    if (hasOwn(body, 'endDate') || hasOwn(body, 'end_date')) {
      const endDate = getTrimmedString(body.endDate ?? body.end_date);
      if (!endDate || !isDateOnly(endDate)) {
        validationError(res, 'end_date must be in YYYY-MM-DD format');
        return;
      }
      insertValues.endDate = endDate;
    }

    const [created] = await db.insert(objectives).values(insertValues as any).returning();

    success(res, created, 201);
  }),
);

objectivesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id as string)) {
      validationError(res, 'id must be a valid UUID');
      return;
    }

    const body = asRecord(req.body);
    const updateValues: Record<string, unknown> = {
      updatedAt: sql`now()`,
    };
    let previousStatus: string | null = null;
    let nextStatus: string | null = null;

    if (hasOwn(body, 'areaId') || hasOwn(body, 'area_id')) {
      const areaId = getTrimmedString(body.areaId ?? body.area_id);
      if (!areaId || !isUuid(areaId)) {
        validationError(res, 'area_id must be a valid UUID');
        return;
      }

      if (!(await areaBelongsToUser(req.userId, areaId))) {
        notFound(res, 'Area not found');
        return;
      }

      updateValues.areaId = areaId;
    }

    if (hasOwn(body, 'title')) {
      const title = getTrimmedString(body.title);
      if (!title) {
        validationError(res, 'title must be a non-empty string');
        return;
      }
      updateValues.title = title;
    }

    if (hasOwn(body, 'description')) {
      if (body.description === null) {
        updateValues.description = null;
      } else {
        const description = getTrimmedString(body.description);
        if (!description) {
          validationError(res, 'description must be a non-empty string or null');
          return;
        }
        updateValues.description = description;
      }
    }

    if (hasOwn(body, 'quarter')) {
      const quarter = getTrimmedString(body.quarter);
      if (!quarter) {
        validationError(res, 'quarter must be a non-empty string');
        return;
      }
      updateValues.quarter = quarter;
    }

    if (hasOwn(body, 'status')) {
      const status = getTrimmedString(body.status);
      if (!status) {
        validationError(res, 'status must be a non-empty string');
        return;
      }

      const [existingObjective] = await db
        .select({ status: objectives.status })
        .from(objectives)
        .where(and(eq(objectives.id, req.params.id as string), eq(objectives.userId, req.userId)))
        .limit(1);

      if (!existingObjective) {
        notFound(res, 'Objective not found');
        return;
      }

      const transition = validateTransition('objective', existingObjective.status, status);
      if (!transition.valid) {
        validationError(res, transition.error ?? 'Invalid objective status transition');
        return;
      }

      previousStatus = existingObjective.status;
      nextStatus = status;
      updateValues.status = status;
    }

    if (hasOwn(body, 'progress')) {
      const progress = getInteger(body.progress);
      if (progress === null) {
        validationError(res, 'progress must be an integer');
        return;
      }
      updateValues.progress = progress;
    }

    if (hasOwn(body, 'startDate') || hasOwn(body, 'start_date')) {
      if (body.startDate === null || body.start_date === null) {
        updateValues.startDate = null;
      } else {
        const startDate = getTrimmedString(body.startDate ?? body.start_date);
        if (!startDate || !isDateOnly(startDate)) {
          validationError(res, 'start_date must be in YYYY-MM-DD format');
          return;
        }
        updateValues.startDate = startDate;
      }
    }

    if (hasOwn(body, 'endDate') || hasOwn(body, 'end_date')) {
      if (body.endDate === null || body.end_date === null) {
        updateValues.endDate = null;
      } else {
        const endDate = getTrimmedString(body.endDate ?? body.end_date);
        if (!endDate || !isDateOnly(endDate)) {
          validationError(res, 'end_date must be in YYYY-MM-DD format');
          return;
        }
        updateValues.endDate = endDate;
      }
    }

    if (Object.keys(updateValues).length === 1) {
      validationError(res, 'No valid fields to update');
      return;
    }

    const [updated] = await db
      .update(objectives)
      .set(updateValues as any)
      .where(and(eq(objectives.id, req.params.id as string), eq(objectives.userId, req.userId)))
      .returning();

    if (!updated) {
      notFound(res, 'Objective not found');
      return;
    }

    if (previousStatus !== null && nextStatus !== null && previousStatus !== nextStatus) {
      if (updated.status === 'archived') {
        await onParentArchived(req.userId, 'objective', updated.id);
      }
    }

    success(res, updated);
  }),
);

objectivesRouter.post(
  '/:id/key-results',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id as string)) {
      validationError(res, 'id must be a valid UUID');
      return;
    }

    if (!(await objectiveBelongsToUser(req.userId, req.params.id as string))) {
      notFound(res, 'Objective not found');
      return;
    }

    const body = asRecord(req.body);
    const title = getTrimmedString(body.title);
    const targetValue = getNumber(body.targetValue ?? body.target_value);

    if (!title) {
      validationError(res, 'title is required');
      return;
    }

    if (targetValue === null) {
      validationError(res, 'target_value is required and must be a number');
      return;
    }

    const insertValues: Record<string, unknown> = {
      userId: req.userId,
      objectiveId: req.params.id as string,
      title,
      targetValue,
    };

    if (hasOwn(body, 'metricType') || hasOwn(body, 'metric_type')) {
      const metricType = getTrimmedString(body.metricType ?? body.metric_type);
      if (!metricType) {
        validationError(res, 'metric_type must be a non-empty string');
        return;
      }
      insertValues.metricType = metricType;
    }

    if (hasOwn(body, 'currentValue') || hasOwn(body, 'current_value')) {
      const currentValue = getNumber(body.currentValue ?? body.current_value);
      if (currentValue === null) {
        validationError(res, 'current_value must be a number');
        return;
      }
      insertValues.currentValue = currentValue;
    }

    if (hasOwn(body, 'unit')) {
      if (body.unit === null) {
        insertValues.unit = null;
      } else {
        const unit = getTrimmedString(body.unit);
        if (!unit) {
          validationError(res, 'unit must be a non-empty string or null');
          return;
        }
        insertValues.unit = unit;
      }
    }

    if (hasOwn(body, 'status')) {
      const status = getTrimmedString(body.status);
      if (!status) {
        validationError(res, 'status must be a non-empty string');
        return;
      }
      insertValues.status = status;
    }

    if (hasOwn(body, 'sortOrder') || hasOwn(body, 'sort_order')) {
      const sortOrder = getNumber(body.sortOrder ?? body.sort_order);
      if (sortOrder === null) {
        validationError(res, 'sort_order must be a number');
        return;
      }
      insertValues.sortOrder = sortOrder;
    }

    const [created] = await db.insert(keyResults).values(insertValues as any).returning();

    success(res, created, 201);
  }),
);

keyResultsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id as string)) {
      validationError(res, 'id must be a valid UUID');
      return;
    }

    const body = asRecord(req.body);
    const updateValues: Record<string, unknown> = {
      updatedAt: sql`now()`,
    };

    if (hasOwn(body, 'title')) {
      const title = getTrimmedString(body.title);
      if (!title) {
        validationError(res, 'title must be a non-empty string');
        return;
      }
      updateValues.title = title;
    }

    if (hasOwn(body, 'metricType') || hasOwn(body, 'metric_type')) {
      const metricType = getTrimmedString(body.metricType ?? body.metric_type);
      if (!metricType) {
        validationError(res, 'metric_type must be a non-empty string');
        return;
      }
      updateValues.metricType = metricType;
    }

    if (hasOwn(body, 'targetValue') || hasOwn(body, 'target_value')) {
      const targetValue = getNumber(body.targetValue ?? body.target_value);
      if (targetValue === null) {
        validationError(res, 'target_value must be a number');
        return;
      }
      updateValues.targetValue = targetValue;
    }

    if (hasOwn(body, 'currentValue') || hasOwn(body, 'current_value')) {
      const currentValue = getNumber(body.currentValue ?? body.current_value);
      if (currentValue === null) {
        validationError(res, 'current_value must be a number');
        return;
      }
      updateValues.currentValue = currentValue;
    }

    if (hasOwn(body, 'unit')) {
      if (body.unit === null) {
        updateValues.unit = null;
      } else {
        const unit = getTrimmedString(body.unit);
        if (!unit) {
          validationError(res, 'unit must be a non-empty string or null');
          return;
        }
        updateValues.unit = unit;
      }
    }

    if (hasOwn(body, 'status')) {
      const status = getTrimmedString(body.status);
      if (!status) {
        validationError(res, 'status must be a non-empty string');
        return;
      }
      updateValues.status = status;
    }

    if (hasOwn(body, 'sortOrder') || hasOwn(body, 'sort_order')) {
      const sortOrder = getNumber(body.sortOrder ?? body.sort_order);
      if (sortOrder === null) {
        validationError(res, 'sort_order must be a number');
        return;
      }
      updateValues.sortOrder = sortOrder;
    }

    if (Object.keys(updateValues).length === 1) {
      validationError(res, 'No valid fields to update');
      return;
    }

    const [updated] = await db
      .update(keyResults)
      .set(updateValues as any)
      .where(and(eq(keyResults.id, req.params.id as string), eq(keyResults.userId, req.userId)))
      .returning();

    if (!updated) {
      notFound(res, 'Key result not found');
      return;
    }

    await onKeyResultUpdate(req.userId, updated.id);

    success(res, updated);
  }),
);

keyResultsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id as string)) {
      validationError(res, 'id must be a valid UUID');
      return;
    }

    const [deleted] = await db
      .delete(keyResults)
      .where(and(eq(keyResults.id, req.params.id as string), eq(keyResults.userId, req.userId)))
      .returning();

    if (!deleted) {
      notFound(res, 'Key result not found');
      return;
    }

    success(res, deleted);
  }),
);

export { keyResultsRouter, objectivesRouter };
