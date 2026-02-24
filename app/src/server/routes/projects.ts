import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';

import { db } from '../../db/index';
import { areas, milestones, objectives, projects } from '../../db/schema';
import { onParentArchived, onProjectStatusChange } from '../engine/cascade';
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
  isIsoDateTime,
  isUuid,
  notFound,
  success,
  validationError,
} from './utils';

const projectsRouter = Router();
const milestonesRouter = Router();

async function objectiveBelongsToUser(userId: string, objectiveId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: objectives.id })
    .from(objectives)
    .where(and(eq(objectives.id, objectiveId), eq(objectives.userId, userId)))
    .limit(1);

  return Boolean(row);
}

async function areaBelongsToUser(userId: string, areaId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(and(eq(areas.id, areaId), eq(areas.userId, userId)))
    .limit(1);

  return Boolean(row);
}

async function projectBelongsToUser(userId: string, projectId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  return Boolean(row);
}

projectsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const conditions: SQL<unknown>[] = [eq(projects.userId, req.userId)];

    const objectiveId = getQueryString(req.query.objective_id);
    if (objectiveId) {
      if (!isUuid(objectiveId)) {
        validationError(res, 'objective_id must be a valid UUID');
        return;
      }
      conditions.push(eq(projects.objectiveId, objectiveId));
    }

    const areaId = getQueryString(req.query.area_id);
    if (areaId) {
      if (!isUuid(areaId)) {
        validationError(res, 'area_id must be a valid UUID');
        return;
      }
      conditions.push(eq(projects.areaId, areaId));
    }

    const status = getQueryString(req.query.status);
    if (status) {
      conditions.push(eq(projects.status, status));
    }

    const ownerType = getQueryString(req.query.owner_type);
    if (ownerType) {
      conditions.push(eq(projects.ownerType, ownerType));
    }

    const rows = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(asc(projects.sortOrder), desc(projects.createdAt));

    success(res, rows);
  }),
);

projectsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id as string)) {
      validationError(res, 'id must be a valid UUID');
      return;
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, req.params.id as string), eq(projects.userId, req.userId)))
      .limit(1);

    if (!project) {
      notFound(res, 'Project not found');
      return;
    }

    const relatedMilestones = await db
      .select()
      .from(milestones)
      .where(and(eq(milestones.projectId, project.id), eq(milestones.userId, req.userId)))
      .orderBy(asc(milestones.sortOrder), asc(milestones.createdAt));

    success(res, {
      ...project,
      milestones: relatedMilestones,
    });
  }),
);

projectsRouter.post(
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

    if (hasOwn(body, 'objectiveId') || hasOwn(body, 'objective_id')) {
      const objectiveId = getTrimmedString(body.objectiveId ?? body.objective_id);
      if (!objectiveId || !isUuid(objectiveId)) {
        validationError(res, 'objective_id must be a valid UUID');
        return;
      }

      if (!(await objectiveBelongsToUser(req.userId, objectiveId))) {
        notFound(res, 'Objective not found');
        return;
      }

      insertValues.objectiveId = objectiveId;
    }

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

      insertValues.areaId = areaId;
    }

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

    if (hasOwn(body, 'ownerType') || hasOwn(body, 'owner_type')) {
      const ownerType = getTrimmedString(body.ownerType ?? body.owner_type);
      if (!ownerType) {
        validationError(res, 'owner_type must be a non-empty string');
        return;
      }
      insertValues.ownerType = ownerType;
    }

    if (hasOwn(body, 'ownerId') || hasOwn(body, 'owner_id')) {
      if (body.ownerId === null || body.owner_id === null) {
        insertValues.ownerId = null;
      } else {
        const ownerId = getTrimmedString(body.ownerId ?? body.owner_id);
        if (!ownerId) {
          validationError(res, 'owner_id must be a non-empty string or null');
          return;
        }
        insertValues.ownerId = ownerId;
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

    if (hasOwn(body, 'priority')) {
      const priority = getInteger(body.priority);
      if (priority === null) {
        validationError(res, 'priority must be an integer');
        return;
      }
      insertValues.priority = priority;
    }

    if (hasOwn(body, 'deadline')) {
      if (body.deadline === null) {
        insertValues.deadline = null;
      } else {
        const deadline = getTrimmedString(body.deadline);
        if (!deadline || !isDateOnly(deadline)) {
          validationError(res, 'deadline must be in YYYY-MM-DD format or null');
          return;
        }
        insertValues.deadline = deadline;
      }
    }

    if (hasOwn(body, 'tags')) {
      if (body.tags === null || Array.isArray(body.tags) || typeof body.tags === 'object') {
        insertValues.tags = body.tags;
      } else {
        validationError(res, 'tags must be a JSON array/object/null');
        return;
      }
    }

    if (hasOwn(body, 'sortOrder') || hasOwn(body, 'sort_order')) {
      const sortOrder = getNumber(body.sortOrder ?? body.sort_order);
      if (sortOrder === null) {
        validationError(res, 'sort_order must be a number');
        return;
      }
      insertValues.sortOrder = sortOrder;
    }

    const [created] = await db.insert(projects).values(insertValues as any).returning();

    success(res, created, 201);
  }),
);

projectsRouter.put(
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

    if (hasOwn(body, 'objectiveId') || hasOwn(body, 'objective_id')) {
      if (body.objectiveId === null || body.objective_id === null) {
        updateValues.objectiveId = null;
      } else {
        const objectiveId = getTrimmedString(body.objectiveId ?? body.objective_id);
        if (!objectiveId || !isUuid(objectiveId)) {
          validationError(res, 'objective_id must be a valid UUID or null');
          return;
        }

        if (!(await objectiveBelongsToUser(req.userId, objectiveId))) {
          notFound(res, 'Objective not found');
          return;
        }

        updateValues.objectiveId = objectiveId;
      }
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

    if (hasOwn(body, 'ownerType') || hasOwn(body, 'owner_type')) {
      const ownerType = getTrimmedString(body.ownerType ?? body.owner_type);
      if (!ownerType) {
        validationError(res, 'owner_type must be a non-empty string');
        return;
      }
      updateValues.ownerType = ownerType;
    }

    if (hasOwn(body, 'ownerId') || hasOwn(body, 'owner_id')) {
      if (body.ownerId === null || body.owner_id === null) {
        updateValues.ownerId = null;
      } else {
        const ownerId = getTrimmedString(body.ownerId ?? body.owner_id);
        if (!ownerId) {
          validationError(res, 'owner_id must be a non-empty string or null');
          return;
        }
        updateValues.ownerId = ownerId;
      }
    }

    if (hasOwn(body, 'status')) {
      const status = getTrimmedString(body.status);
      if (!status) {
        validationError(res, 'status must be a non-empty string');
        return;
      }

      const [existingProject] = await db
        .select({ status: projects.status })
        .from(projects)
        .where(and(eq(projects.id, req.params.id as string), eq(projects.userId, req.userId)))
        .limit(1);

      if (!existingProject) {
        notFound(res, 'Project not found');
        return;
      }

      const transition = validateTransition('project', existingProject.status, status);
      if (!transition.valid) {
        validationError(res, transition.error ?? 'Invalid project status transition');
        return;
      }

      previousStatus = existingProject.status;
      nextStatus = status;
      updateValues.status = status;
    }

    if (hasOwn(body, 'priority')) {
      const priority = getInteger(body.priority);
      if (priority === null) {
        validationError(res, 'priority must be an integer');
        return;
      }
      updateValues.priority = priority;
    }

    if (hasOwn(body, 'deadline')) {
      if (body.deadline === null) {
        updateValues.deadline = null;
      } else {
        const deadline = getTrimmedString(body.deadline);
        if (!deadline || !isDateOnly(deadline)) {
          validationError(res, 'deadline must be in YYYY-MM-DD format or null');
          return;
        }
        updateValues.deadline = deadline;
      }
    }

    if (hasOwn(body, 'tags')) {
      if (body.tags === null || Array.isArray(body.tags) || typeof body.tags === 'object') {
        updateValues.tags = body.tags;
      } else {
        validationError(res, 'tags must be a JSON array/object/null');
        return;
      }
    }

    if (hasOwn(body, 'sortOrder') || hasOwn(body, 'sort_order')) {
      const sortOrder = getNumber(body.sortOrder ?? body.sort_order);
      if (sortOrder === null) {
        validationError(res, 'sort_order must be a number');
        return;
      }
      updateValues.sortOrder = sortOrder;
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

    if (Object.keys(updateValues).length === 1) {
      validationError(res, 'No valid fields to update');
      return;
    }

    const [updated] = await db
      .update(projects)
      .set(updateValues as any)
      .where(and(eq(projects.id, req.params.id as string), eq(projects.userId, req.userId)))
      .returning();

    if (!updated) {
      notFound(res, 'Project not found');
      return;
    }

    if (previousStatus !== null && nextStatus !== null && previousStatus !== nextStatus) {
      await onProjectStatusChange(req.userId, updated.id, updated.status);

      if (updated.status === 'archived') {
        await onParentArchived(req.userId, 'project', updated.id);
      }
    }

    success(res, updated);
  }),
);

projectsRouter.post(
  '/:id/milestones',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id as string)) {
      validationError(res, 'id must be a valid UUID');
      return;
    }

    if (!(await projectBelongsToUser(req.userId, req.params.id as string))) {
      notFound(res, 'Project not found');
      return;
    }

    const body = asRecord(req.body);
    const title = getTrimmedString(body.title);

    if (!title) {
      validationError(res, 'title is required');
      return;
    }

    const insertValues: Record<string, unknown> = {
      userId: req.userId,
      projectId: req.params.id as string,
      title,
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

    if (hasOwn(body, 'deadline')) {
      if (body.deadline === null) {
        insertValues.deadline = null;
      } else {
        const deadline = getTrimmedString(body.deadline);
        if (!deadline || !isDateOnly(deadline)) {
          validationError(res, 'deadline must be in YYYY-MM-DD format or null');
          return;
        }
        insertValues.deadline = deadline;
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

    const [created] = await db.insert(milestones).values(insertValues as any).returning();

    success(res, created, 201);
  }),
);

milestonesRouter.put(
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

    if (hasOwn(body, 'deadline')) {
      if (body.deadline === null) {
        updateValues.deadline = null;
      } else {
        const deadline = getTrimmedString(body.deadline);
        if (!deadline || !isDateOnly(deadline)) {
          validationError(res, 'deadline must be in YYYY-MM-DD format or null');
          return;
        }
        updateValues.deadline = deadline;
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
      .update(milestones)
      .set(updateValues as any)
      .where(and(eq(milestones.id, req.params.id as string), eq(milestones.userId, req.userId)))
      .returning();

    if (!updated) {
      notFound(res, 'Milestone not found');
      return;
    }

    success(res, updated);
  }),
);

export { milestonesRouter, projectsRouter };
