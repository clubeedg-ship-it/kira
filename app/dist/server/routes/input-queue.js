import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../../db/index';
import { agents, areas, inputQueue, tasks } from '../../db/schema';
import { emitEvent } from '../events/sse';
import { asRecord, asyncHandler, getInteger, getQueryString, getTrimmedString, hasOwn, isIsoDateTime, isUuid, notFound, success, validationError, } from './utils';
const inputQueueRouter = Router();
async function taskBelongsToUser(userId, taskId) {
    const [row] = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
        .limit(1);
    return Boolean(row);
}
async function agentBelongsToUser(userId, agentId) {
    const [row] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
        .limit(1);
    return Boolean(row);
}
async function areaBelongsToUser(userId, areaId) {
    const [row] = await db
        .select({ id: areas.id })
        .from(areas)
        .where(and(eq(areas.id, areaId), eq(areas.userId, userId)))
        .limit(1);
    return Boolean(row);
}
async function getPendingCount(userId) {
    const [row] = await db
        .select({
        pendingCount: sql `count(*)`,
    })
        .from(inputQueue)
        .where(and(eq(inputQueue.userId, userId), eq(inputQueue.status, 'pending')));
    return Number(row?.pendingCount ?? 0);
}
async function emitPendingCountChanged(userId) {
    const pendingCount = await getPendingCount(userId);
    emitEvent(userId, 'input_queue', 'input_queue.count_changed', { pendingCount });
}
inputQueueRouter.get('/', asyncHandler(async (req, res) => {
    const conditions = [eq(inputQueue.userId, req.userId)];
    const status = getQueryString(req.query.status);
    if (status) {
        const statuses = status
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
        if (statuses.length === 1) {
            conditions.push(eq(inputQueue.status, statuses[0]));
        }
        else if (statuses.length > 1) {
            conditions.push(inArray(inputQueue.status, statuses));
        }
    }
    const queueType = getQueryString(req.query.queue_type);
    if (queueType) {
        conditions.push(eq(inputQueue.queueType, queueType));
    }
    const areaId = getQueryString(req.query.area_id);
    if (areaId) {
        if (!isUuid(areaId)) {
            validationError(res, 'area_id must be a valid UUID');
            return;
        }
        conditions.push(eq(inputQueue.areaId, areaId));
    }
    const rows = await db
        .select({
        id: inputQueue.id,
        userId: inputQueue.userId,
        taskId: inputQueue.taskId,
        agentId: inputQueue.agentId,
        agentName: agents.name,
        queueType: inputQueue.queueType,
        title: inputQueue.title,
        description: inputQueue.description,
        options: inputQueue.options,
        deliverable: inputQueue.deliverable,
        areaId: inputQueue.areaId,
        areaName: areas.name,
        priority: inputQueue.priority,
        status: inputQueue.status,
        scheduledFor: inputQueue.scheduledFor,
        resolvedAt: inputQueue.resolvedAt,
        resolution: inputQueue.resolution,
        createdAt: inputQueue.createdAt,
    })
        .from(inputQueue)
        .leftJoin(agents, and(eq(agents.id, inputQueue.agentId), eq(agents.userId, req.userId)))
        .leftJoin(areas, and(eq(areas.id, inputQueue.areaId), eq(areas.userId, req.userId)))
        .where(and(...conditions))
        .orderBy(asc(inputQueue.priority), desc(inputQueue.createdAt));
    success(res, rows);
}));
inputQueueRouter.get('/count', asyncHandler(async (req, res) => {
    const pendingCount = await getPendingCount(req.userId);
    success(res, { pendingCount });
}));
inputQueueRouter.get('/:id', asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const [row] = await db
        .select()
        .from(inputQueue)
        .where(and(eq(inputQueue.id, req.params.id), eq(inputQueue.userId, req.userId)))
        .limit(1);
    if (!row) {
        notFound(res, 'Input queue item not found');
        return;
    }
    success(res, row);
}));
inputQueueRouter.post('/', asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const queueType = getTrimmedString(body.queueType ?? body.queue_type);
    const title = getTrimmedString(body.title);
    if (!queueType) {
        validationError(res, 'queue_type is required');
        return;
    }
    if (!title) {
        validationError(res, 'title is required');
        return;
    }
    const insertValues = {
        userId: req.userId,
        queueType,
        title,
    };
    if (hasOwn(body, 'taskId') || hasOwn(body, 'task_id')) {
        const taskId = getTrimmedString(body.taskId ?? body.task_id);
        if (!taskId || !isUuid(taskId)) {
            validationError(res, 'task_id must be a valid UUID');
            return;
        }
        if (!(await taskBelongsToUser(req.userId, taskId))) {
            notFound(res, 'Task not found');
            return;
        }
        insertValues.taskId = taskId;
    }
    if (hasOwn(body, 'agentId') || hasOwn(body, 'agent_id')) {
        const agentId = getTrimmedString(body.agentId ?? body.agent_id);
        if (!agentId || !isUuid(agentId)) {
            validationError(res, 'agent_id must be a valid UUID');
            return;
        }
        if (!(await agentBelongsToUser(req.userId, agentId))) {
            notFound(res, 'Agent not found');
            return;
        }
        insertValues.agentId = agentId;
    }
    if (hasOwn(body, 'description')) {
        if (body.description === null) {
            insertValues.description = null;
        }
        else {
            const description = getTrimmedString(body.description);
            if (!description) {
                validationError(res, 'description must be a non-empty string or null');
                return;
            }
            insertValues.description = description;
        }
    }
    if (hasOwn(body, 'options')) {
        if (body.options === null || Array.isArray(body.options) || typeof body.options === 'object') {
            insertValues.options = body.options;
        }
        else {
            validationError(res, 'options must be a JSON array/object/null');
            return;
        }
    }
    if (hasOwn(body, 'deliverable')) {
        if (body.deliverable === null) {
            insertValues.deliverable = null;
        }
        else {
            const deliverable = getTrimmedString(body.deliverable);
            if (!deliverable) {
                validationError(res, 'deliverable must be a non-empty string or null');
                return;
            }
            insertValues.deliverable = deliverable;
        }
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
    if (hasOwn(body, 'priority')) {
        const priority = getInteger(body.priority);
        if (priority === null) {
            validationError(res, 'priority must be an integer');
            return;
        }
        insertValues.priority = priority;
    }
    if (hasOwn(body, 'status')) {
        const status = getTrimmedString(body.status);
        if (!status) {
            validationError(res, 'status must be a non-empty string');
            return;
        }
        insertValues.status = status;
    }
    if (hasOwn(body, 'scheduledFor') || hasOwn(body, 'scheduled_for')) {
        if (body.scheduledFor === null || body.scheduled_for === null) {
            insertValues.scheduledFor = null;
        }
        else {
            const scheduledFor = getTrimmedString(body.scheduledFor ?? body.scheduled_for);
            if (!scheduledFor || !isIsoDateTime(scheduledFor)) {
                validationError(res, 'scheduled_for must be a valid ISO datetime or null');
                return;
            }
            insertValues.scheduledFor = new Date(scheduledFor).toISOString();
        }
    }
    const [created] = await db.insert(inputQueue).values(insertValues).returning();
    emitEvent(req.userId, 'input_queue', 'input_queue.item_added', created);
    await emitPendingCountChanged(req.userId);
    success(res, created, 201);
}));
const resolveItemHandler = asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const body = asRecord(req.body);
    const resolution = getTrimmedString(body.resolution);
    if (!resolution) {
        validationError(res, 'resolution is required');
        return;
    }
    const [updated] = await db
        .update(inputQueue)
        .set({
        resolution,
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
    })
        .where(and(eq(inputQueue.id, req.params.id), eq(inputQueue.userId, req.userId)))
        .returning();
    if (!updated) {
        notFound(res, 'Input queue item not found');
        return;
    }
    emitEvent(req.userId, 'input_queue', 'input_queue.item_resolved', updated);
    await emitPendingCountChanged(req.userId);
    success(res, updated);
});
inputQueueRouter.post('/:id/resolve', resolveItemHandler);
inputQueueRouter.put('/:id/resolve', resolveItemHandler);
const dismissItemHandler = asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const [updated] = await db
        .update(inputQueue)
        .set({
        status: 'dismissed',
        resolvedAt: new Date().toISOString(),
    })
        .where(and(eq(inputQueue.id, req.params.id), eq(inputQueue.userId, req.userId)))
        .returning();
    if (!updated) {
        notFound(res, 'Input queue item not found');
        return;
    }
    emitEvent(req.userId, 'input_queue', 'input_queue.item_resolved', updated);
    await emitPendingCountChanged(req.userId);
    success(res, updated);
});
inputQueueRouter.post('/:id/dismiss', dismissItemHandler);
inputQueueRouter.put('/:id/dismiss', dismissItemHandler);
const snoozeItemHandler = asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const body = asRecord(req.body);
    const scheduledFor = getTrimmedString(body.scheduledFor ?? body.scheduled_for);
    if (!scheduledFor || !isIsoDateTime(scheduledFor)) {
        validationError(res, 'scheduled_for is required and must be a valid ISO datetime');
        return;
    }
    const [updated] = await db
        .update(inputQueue)
        .set({
        status: 'scheduled',
        scheduledFor: new Date(scheduledFor).toISOString(),
        resolvedAt: null,
    })
        .where(and(eq(inputQueue.id, req.params.id), eq(inputQueue.userId, req.userId)))
        .returning();
    if (!updated) {
        notFound(res, 'Input queue item not found');
        return;
    }
    emitEvent(req.userId, 'input_queue', 'input_queue.item_updated', updated);
    await emitPendingCountChanged(req.userId);
    success(res, updated);
});
inputQueueRouter.post('/:id/snooze', snoozeItemHandler);
inputQueueRouter.put('/:id/snooze', snoozeItemHandler);
export { inputQueueRouter };
//# sourceMappingURL=input-queue.js.map