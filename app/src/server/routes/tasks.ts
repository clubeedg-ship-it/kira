import { and, asc, desc, eq, isNull, or, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';

import { db } from '../../db/index';
import { dependencies, milestones, projects, tasks, timeBlocks } from '../../db/schema';
import { onTaskComplete } from '../engine/cascade';
import { classifyTask } from '../engine/classifier';
import { emitEvent } from '../events/sse';
import { calculatePriority } from '../engine/priority';
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

const tasksRouter = Router();

async function projectBelongsToUser(userId: string, projectId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  return Boolean(row);
}

async function milestoneBelongsToUser(userId: string, milestoneId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: milestones.id })
    .from(milestones)
    .where(and(eq(milestones.id, milestoneId), eq(milestones.userId, userId)))
    .limit(1);

  return Boolean(row);
}

async function timeBlockBelongsToUser(userId: string, timeBlockId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: timeBlocks.id })
    .from(timeBlocks)
    .where(and(eq(timeBlocks.id, timeBlockId), eq(timeBlocks.userId, userId)))
    .limit(1);

  return Boolean(row);
}

async function getTaskBlockingCount(userId: string, taskId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dependencies)
    .where(
      and(
        eq(dependencies.userId, userId),
        eq(dependencies.blockerType, 'task'),
        eq(dependencies.blockedType, 'task'),
        eq(dependencies.blockerId, taskId),
      ),
    );

  return row?.count ?? 0;
}

tasksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const conditions: SQL<unknown>[] = [eq(tasks.userId, req.userId)];

    const projectId = getQueryString(req.query.project_id);
    if (projectId) {
      if (!isUuid(projectId)) {
        validationError(res, 'project_id must be a valid UUID');
        return;
      }
      conditions.push(eq(tasks.projectId, projectId));
    }

    const status = getQueryString(req.query.status);
    if (status) {
      conditions.push(eq(tasks.status, status));
    }

    const executorType = getQueryString(req.query.executor_type);
    if (executorType) {
      conditions.push(eq(tasks.executorType, executorType));
    }

    const priorityRaw = getQueryString(req.query.priority);
    if (priorityRaw) {
      const priority = getInteger(priorityRaw);
      if (priority === null) {
        validationError(res, 'priority must be an integer');
        return;
      }
      conditions.push(eq(tasks.priority, priority));
    }

    const dueDate = getQueryString(req.query.due_date);
    if (dueDate) {
      if (!isDateOnly(dueDate)) {
        validationError(res, 'due_date must be in YYYY-MM-DD format');
        return;
      }
      conditions.push(eq(tasks.dueDate, dueDate));
    }

    const rows = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.priorityScore), asc(tasks.priority), desc(tasks.createdAt));

    success(res, rows);
  }),
);

tasksRouter.get(
  '/today',
  asyncHandler(async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);

    const rows = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, req.userId),
          or(eq(tasks.scheduledDate, today), eq(tasks.dueDate, today)),
        ),
      )
      .orderBy(desc(tasks.priorityScore), asc(tasks.priority), asc(tasks.createdAt));

    success(res, rows);
  }),
);

tasksRouter.get(
  '/inbox',
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, req.userId), isNull(tasks.projectId)))
      .orderBy(desc(tasks.priorityScore), asc(tasks.priority), asc(tasks.createdAt));

    success(res, rows);
  }),
);

tasksRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id as string)) {
      validationError(res, 'id must be a valid UUID');
      return;
    }

    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, req.params.id as string), eq(tasks.userId, req.userId)))
      .limit(1);

    if (!task) {
      notFound(res, 'Task not found');
      return;
    }

    success(res, task);
  }),
);

tasksRouter.post(
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

    if (hasOwn(body, 'projectId') || hasOwn(body, 'project_id')) {
      const projectId = getTrimmedString(body.projectId ?? body.project_id);
      if (!projectId || !isUuid(projectId)) {
        validationError(res, 'project_id must be a valid UUID');
        return;
      }

      if (!(await projectBelongsToUser(req.userId, projectId))) {
        notFound(res, 'Project not found');
        return;
      }

      insertValues.projectId = projectId;
    }

    if (hasOwn(body, 'milestoneId') || hasOwn(body, 'milestone_id')) {
      const milestoneId = getTrimmedString(body.milestoneId ?? body.milestone_id);
      if (!milestoneId || !isUuid(milestoneId)) {
        validationError(res, 'milestone_id must be a valid UUID');
        return;
      }

      if (!(await milestoneBelongsToUser(req.userId, milestoneId))) {
        notFound(res, 'Milestone not found');
        return;
      }

      insertValues.milestoneId = milestoneId;
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

    const executorTypeProvided = hasOwn(body, 'executorType') || hasOwn(body, 'executor_type');

    if (executorTypeProvided) {
      const executorType = getTrimmedString(body.executorType ?? body.executor_type);
      if (!executorType) {
        validationError(res, 'executor_type must be a non-empty string');
        return;
      }
      insertValues.executorType = executorType;
    }

    if (hasOwn(body, 'executorId') || hasOwn(body, 'executor_id')) {
      if (body.executorId === null || body.executor_id === null) {
        insertValues.executorId = null;
      } else {
        const executorId = getTrimmedString(body.executorId ?? body.executor_id);
        if (!executorId) {
          validationError(res, 'executor_id must be a non-empty string or null');
          return;
        }
        insertValues.executorId = executorId;
      }
    }

    if (hasOwn(body, 'requiresInput') || hasOwn(body, 'requires_input')) {
      const requiresInput = getTrimmedString(body.requiresInput ?? body.requires_input);
      if (!requiresInput) {
        validationError(res, 'requires_input must be a non-empty string');
        return;
      }
      insertValues.requiresInput = requiresInput;
    }

    if (!executorTypeProvided) {
      const classification = classifyTask(title);
      insertValues.executorType = classification.executor_type;
      insertValues.requiresInput = classification.requires_input;
    }

    if (hasOwn(body, 'dueDate') || hasOwn(body, 'due_date')) {
      if (body.dueDate === null || body.due_date === null) {
        insertValues.dueDate = null;
      } else {
        const dueDate = getTrimmedString(body.dueDate ?? body.due_date);
        if (!dueDate || !isDateOnly(dueDate)) {
          validationError(res, 'due_date must be in YYYY-MM-DD format or null');
          return;
        }
        insertValues.dueDate = dueDate;
      }
    }

    if (hasOwn(body, 'scheduledDate') || hasOwn(body, 'scheduled_date')) {
      if (body.scheduledDate === null || body.scheduled_date === null) {
        insertValues.scheduledDate = null;
      } else {
        const scheduledDate = getTrimmedString(body.scheduledDate ?? body.scheduled_date);
        if (!scheduledDate || !isDateOnly(scheduledDate)) {
          validationError(res, 'scheduled_date must be in YYYY-MM-DD format or null');
          return;
        }
        insertValues.scheduledDate = scheduledDate;
      }
    }

    if (hasOwn(body, 'timeBlockId') || hasOwn(body, 'time_block_id')) {
      if (body.timeBlockId === null || body.time_block_id === null) {
        insertValues.timeBlockId = null;
      } else {
        const timeBlockId = getTrimmedString(body.timeBlockId ?? body.time_block_id);
        if (!timeBlockId || !isUuid(timeBlockId)) {
          validationError(res, 'time_block_id must be a valid UUID or null');
          return;
        }

        if (!(await timeBlockBelongsToUser(req.userId, timeBlockId))) {
          notFound(res, 'Time block not found');
          return;
        }

        insertValues.timeBlockId = timeBlockId;
      }
    }

    if (hasOwn(body, 'durationEst') || hasOwn(body, 'duration_est')) {
      if (body.durationEst === null || body.duration_est === null) {
        insertValues.durationEst = null;
      } else {
        const durationEst = getInteger(body.durationEst ?? body.duration_est);
        if (durationEst === null) {
          validationError(res, 'duration_est must be an integer or null');
          return;
        }
        insertValues.durationEst = durationEst;
      }
    }

    if (hasOwn(body, 'context')) {
      if (body.context === null) {
        insertValues.context = null;
      } else {
        const context = getTrimmedString(body.context);
        if (!context) {
          validationError(res, 'context must be a non-empty string or null');
          return;
        }
        insertValues.context = context;
      }
    }

    if (hasOwn(body, 'energy')) {
      const energy = getTrimmedString(body.energy);
      if (!energy) {
        validationError(res, 'energy must be a non-empty string');
        return;
      }
      insertValues.energy = energy;
    }

    if (hasOwn(body, 'source')) {
      if (body.source === null) {
        insertValues.source = null;
      } else {
        const source = getTrimmedString(body.source);
        if (!source) {
          validationError(res, 'source must be a non-empty string or null');
          return;
        }
        insertValues.source = source;
      }
    }

    if (hasOwn(body, 'sourceRef') || hasOwn(body, 'source_ref')) {
      if (body.sourceRef === null || body.source_ref === null) {
        insertValues.sourceRef = null;
      } else {
        const sourceRef = getTrimmedString(body.sourceRef ?? body.source_ref);
        if (!sourceRef) {
          validationError(res, 'source_ref must be a non-empty string or null');
          return;
        }
        insertValues.sourceRef = sourceRef;
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

    const priorityForScore =
      typeof insertValues.priority === 'number' ? insertValues.priority : 2;
    const dueDateForScore =
      typeof insertValues.dueDate === 'string' ? insertValues.dueDate : null;
    insertValues.priorityScore = calculatePriority(
      {
        priority: priorityForScore,
        dueDate: dueDateForScore,
      },
      0,
    );

    const [created] = await db.insert(tasks).values(insertValues as any).returning();

    emitEvent(req.userId, 'task', 'task.created', created);
    success(res, created, 201);
  }),
);

tasksRouter.put(
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

    const [existingTask] = await db
      .select({
        id: tasks.id,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
      })
      .from(tasks)
      .where(and(eq(tasks.id, req.params.id as string), eq(tasks.userId, req.userId)))
      .limit(1);

    if (!existingTask) {
      notFound(res, 'Task not found');
      return;
    }

    let previousStatus: string | null = null;
    let nextStatus: string | null = null;

    if (hasOwn(body, 'projectId') || hasOwn(body, 'project_id')) {
      if (body.projectId === null || body.project_id === null) {
        updateValues.projectId = null;
      } else {
        const projectId = getTrimmedString(body.projectId ?? body.project_id);
        if (!projectId || !isUuid(projectId)) {
          validationError(res, 'project_id must be a valid UUID or null');
          return;
        }

        if (!(await projectBelongsToUser(req.userId, projectId))) {
          notFound(res, 'Project not found');
          return;
        }

        updateValues.projectId = projectId;
      }
    }

    if (hasOwn(body, 'milestoneId') || hasOwn(body, 'milestone_id')) {
      if (body.milestoneId === null || body.milestone_id === null) {
        updateValues.milestoneId = null;
      } else {
        const milestoneId = getTrimmedString(body.milestoneId ?? body.milestone_id);
        if (!milestoneId || !isUuid(milestoneId)) {
          validationError(res, 'milestone_id must be a valid UUID or null');
          return;
        }

        if (!(await milestoneBelongsToUser(req.userId, milestoneId))) {
          notFound(res, 'Milestone not found');
          return;
        }

        updateValues.milestoneId = milestoneId;
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

    if (hasOwn(body, 'status')) {
      const status = getTrimmedString(body.status);
      if (!status) {
        validationError(res, 'status must be a non-empty string');
        return;
      }

      const transition = validateTransition('task', existingTask.status, status);
      if (!transition.valid) {
        validationError(res, transition.error ?? 'Invalid task status transition');
        return;
      }

      previousStatus = existingTask.status;
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

    if (hasOwn(body, 'executorType') || hasOwn(body, 'executor_type')) {
      const executorType = getTrimmedString(body.executorType ?? body.executor_type);
      if (!executorType) {
        validationError(res, 'executor_type must be a non-empty string');
        return;
      }
      updateValues.executorType = executorType;
    }

    if (hasOwn(body, 'executorId') || hasOwn(body, 'executor_id')) {
      if (body.executorId === null || body.executor_id === null) {
        updateValues.executorId = null;
      } else {
        const executorId = getTrimmedString(body.executorId ?? body.executor_id);
        if (!executorId) {
          validationError(res, 'executor_id must be a non-empty string or null');
          return;
        }
        updateValues.executorId = executorId;
      }
    }

    if (hasOwn(body, 'requiresInput') || hasOwn(body, 'requires_input')) {
      const requiresInput = getTrimmedString(body.requiresInput ?? body.requires_input);
      if (!requiresInput) {
        validationError(res, 'requires_input must be a non-empty string');
        return;
      }
      updateValues.requiresInput = requiresInput;
    }

    if (hasOwn(body, 'dueDate') || hasOwn(body, 'due_date')) {
      if (body.dueDate === null || body.due_date === null) {
        updateValues.dueDate = null;
      } else {
        const dueDate = getTrimmedString(body.dueDate ?? body.due_date);
        if (!dueDate || !isDateOnly(dueDate)) {
          validationError(res, 'due_date must be in YYYY-MM-DD format or null');
          return;
        }
        updateValues.dueDate = dueDate;
      }
    }

    if (hasOwn(body, 'scheduledDate') || hasOwn(body, 'scheduled_date')) {
      if (body.scheduledDate === null || body.scheduled_date === null) {
        updateValues.scheduledDate = null;
      } else {
        const scheduledDate = getTrimmedString(body.scheduledDate ?? body.scheduled_date);
        if (!scheduledDate || !isDateOnly(scheduledDate)) {
          validationError(res, 'scheduled_date must be in YYYY-MM-DD format or null');
          return;
        }
        updateValues.scheduledDate = scheduledDate;
      }
    }

    if (hasOwn(body, 'timeBlockId') || hasOwn(body, 'time_block_id')) {
      if (body.timeBlockId === null || body.time_block_id === null) {
        updateValues.timeBlockId = null;
      } else {
        const timeBlockId = getTrimmedString(body.timeBlockId ?? body.time_block_id);
        if (!timeBlockId || !isUuid(timeBlockId)) {
          validationError(res, 'time_block_id must be a valid UUID or null');
          return;
        }

        if (!(await timeBlockBelongsToUser(req.userId, timeBlockId))) {
          notFound(res, 'Time block not found');
          return;
        }

        updateValues.timeBlockId = timeBlockId;
      }
    }

    if (hasOwn(body, 'durationEst') || hasOwn(body, 'duration_est')) {
      if (body.durationEst === null || body.duration_est === null) {
        updateValues.durationEst = null;
      } else {
        const durationEst = getInteger(body.durationEst ?? body.duration_est);
        if (durationEst === null) {
          validationError(res, 'duration_est must be an integer or null');
          return;
        }
        updateValues.durationEst = durationEst;
      }
    }

    if (hasOwn(body, 'context')) {
      if (body.context === null) {
        updateValues.context = null;
      } else {
        const context = getTrimmedString(body.context);
        if (!context) {
          validationError(res, 'context must be a non-empty string or null');
          return;
        }
        updateValues.context = context;
      }
    }

    if (hasOwn(body, 'energy')) {
      const energy = getTrimmedString(body.energy);
      if (!energy) {
        validationError(res, 'energy must be a non-empty string');
        return;
      }
      updateValues.energy = energy;
    }

    if (hasOwn(body, 'source')) {
      if (body.source === null) {
        updateValues.source = null;
      } else {
        const source = getTrimmedString(body.source);
        if (!source) {
          validationError(res, 'source must be a non-empty string or null');
          return;
        }
        updateValues.source = source;
      }
    }

    if (hasOwn(body, 'sourceRef') || hasOwn(body, 'source_ref')) {
      if (body.sourceRef === null || body.source_ref === null) {
        updateValues.sourceRef = null;
      } else {
        const sourceRef = getTrimmedString(body.sourceRef ?? body.source_ref);
        if (!sourceRef) {
          validationError(res, 'source_ref must be a non-empty string or null');
          return;
        }
        updateValues.sourceRef = sourceRef;
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

    const nextPriority =
      hasOwn(updateValues, 'priority') && typeof updateValues.priority === 'number'
        ? updateValues.priority
        : existingTask.priority;
    const nextDueDate =
      hasOwn(updateValues, 'dueDate') &&
      (typeof updateValues.dueDate === 'string' || updateValues.dueDate === null)
        ? (updateValues.dueDate as string | null)
        : existingTask.dueDate;
    const blockingCount = await getTaskBlockingCount(req.userId, existingTask.id);

    updateValues.priorityScore = calculatePriority(
      {
        priority: nextPriority,
        dueDate: nextDueDate,
      },
      blockingCount,
    );

    const [updated] = await db
      .update(tasks)
      .set(updateValues as any)
      .where(and(eq(tasks.id, req.params.id as string), eq(tasks.userId, req.userId)))
      .returning();

    if (!updated) {
      notFound(res, 'Task not found');
      return;
    }

    if (previousStatus !== null && nextStatus !== null && previousStatus !== nextStatus) {
      if (updated.status === 'done') {
        await onTaskComplete(req.userId, updated.id);
      }

      emitEvent(req.userId, 'task', 'task.status_changed', {
        id: updated.id,
        task_id: updated.id,
        old_status: previousStatus,
        new_status: nextStatus,
        status: updated.status,
      });
    }

    success(res, updated);
  }),
);

tasksRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id as string)) {
      validationError(res, 'id must be a valid UUID');
      return;
    }

    const [updated] = await db
      .update(tasks)
      .set({
        status: 'cancelled',
        updatedAt: sql`now()`,
      })
      .where(and(eq(tasks.id, req.params.id as string), eq(tasks.userId, req.userId)))
      .returning();

    if (!updated) {
      notFound(res, 'Task not found');
      return;
    }

    success(res, updated);
  }),
);

export { tasksRouter };
