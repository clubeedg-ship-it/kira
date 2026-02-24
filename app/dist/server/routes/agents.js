import { and, asc, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../../db/index';
import { agentWorkLog, agents, inputQueue, tasks } from '../../db/schema';
import { enqueueAgentTask, OrchestratorError } from '../engine/orchestrator';
import { emitEvent } from '../events/sse';
import { asRecord, asyncHandler, getInteger, getTrimmedString, hasOwn, isUuid, notFound, success, validationError, } from './utils';
const agentsRouter = Router();
function respondOrchestratorError(error, handlers) {
    if (!(error instanceof OrchestratorError)) {
        return false;
    }
    if (error.code === 'NOT_FOUND') {
        handlers.notFound(error.message);
        return true;
    }
    if (error.code === 'CAPACITY_REACHED') {
        handlers.capacity(error.message);
        return true;
    }
    handlers.validation(error.message);
    return true;
}
agentsRouter.get('/', asyncHandler(async (req, res) => {
    const rows = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, req.userId))
        .orderBy(desc(agents.createdAt));
    success(res, rows);
}));
agentsRouter.get('/:id', asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const [agent] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, req.params.id), eq(agents.userId, req.userId)))
        .limit(1);
    if (!agent) {
        notFound(res, 'Agent not found');
        return;
    }
    success(res, agent);
}));
agentsRouter.post('/:id/run', asyncHandler(async (req, res) => {
    const agentId = req.params.id;
    if (!isUuid(agentId)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const body = asRecord(req.body);
    const requestedTaskId = getTrimmedString(body.taskId ?? body.task_id);
    if (requestedTaskId && !isUuid(requestedTaskId)) {
        validationError(res, 'task_id must be a valid UUID');
        return;
    }
    const [agent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.userId, req.userId)))
        .limit(1);
    if (!agent) {
        notFound(res, 'Agent not found');
        return;
    }
    if (requestedTaskId) {
        try {
            const queued = await enqueueAgentTask(req.userId, agentId, requestedTaskId);
            success(res, {
                jobId: queued.jobId,
                taskId: queued.taskId,
                agentId: queued.agentId,
            }, 201);
            return;
        }
        catch (error) {
            if (respondOrchestratorError(error, {
                validation: (message) => validationError(res, message),
                notFound: (message) => notFound(res, message),
                capacity: (message) => {
                    res.status(409).json({
                        error: {
                            code: 'CAPACITY_REACHED',
                            message,
                        },
                    });
                },
            })) {
                return;
            }
            throw error;
        }
    }
    const candidateTasks = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.userId, req.userId), eq(tasks.executorType, 'agent'), eq(tasks.status, 'todo'), sql `${tasks.executorId} IS NULL OR ${tasks.executorId} = ${agentId}`))
        .orderBy(desc(tasks.priorityScore), asc(tasks.priority), asc(tasks.createdAt))
        .limit(25);
    for (const candidate of candidateTasks) {
        try {
            const queued = await enqueueAgentTask(req.userId, agentId, candidate.id);
            success(res, {
                jobId: queued.jobId,
                taskId: queued.taskId,
                agentId: queued.agentId,
            }, 201);
            return;
        }
        catch (error) {
            const handled = respondOrchestratorError(error, {
                validation: () => { },
                notFound: () => { },
                capacity: (message) => {
                    res.status(409).json({
                        error: {
                            code: 'CAPACITY_REACHED',
                            message,
                        },
                    });
                },
            });
            if (handled && error instanceof OrchestratorError && error.code === 'CAPACITY_REACHED') {
                return;
            }
            if (!handled) {
                throw error;
            }
        }
    }
    validationError(res, 'No runnable todo task found for this agent');
}));
agentsRouter.get('/:id/stats', asyncHandler(async (req, res) => {
    const agentId = req.params.id;
    if (!isUuid(agentId)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const [agent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.userId, req.userId)))
        .limit(1);
    if (!agent) {
        notFound(res, 'Agent not found');
        return;
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayIso = startOfToday.toISOString();
    const [completedTodayRow, costTodayRow, approvalRow] = await Promise.all([
        db
            .select({
            count: sql `count(distinct ${agentWorkLog.taskId})::int`,
        })
            .from(agentWorkLog)
            .where(and(eq(agentWorkLog.userId, req.userId), eq(agentWorkLog.agentId, agentId), eq(agentWorkLog.action, 'task_completed'), gte(agentWorkLog.createdAt, startOfTodayIso)))
            .then((rows) => rows[0]),
        db
            .select({
            total: sql `coalesce(sum(${agentWorkLog.costUsd}), 0)::float`,
        })
            .from(agentWorkLog)
            .where(and(eq(agentWorkLog.userId, req.userId), eq(agentWorkLog.agentId, agentId), gte(agentWorkLog.createdAt, startOfTodayIso)))
            .then((rows) => rows[0]),
        db
            .select({
            totalCount: sql `count(*)::int`,
            approvedCount: sql `sum(case when ${inputQueue.status} = 'resolved' then 1 else 0 end)::int`,
        })
            .from(inputQueue)
            .where(and(eq(inputQueue.userId, req.userId), eq(inputQueue.agentId, agentId), inArray(inputQueue.status, ['resolved', 'dismissed'])))
            .then((rows) => rows[0]),
    ]);
    const tasksCompletedToday = Number(completedTodayRow?.count ?? 0);
    const totalCostToday = Number(costTodayRow?.total ?? 0);
    const totalReviews = Number(approvalRow?.totalCount ?? 0);
    const approvedReviews = Number(approvalRow?.approvedCount ?? 0);
    const approvalRate = totalReviews > 0 ? approvedReviews / totalReviews : 0;
    success(res, {
        tasks_completed_today: tasksCompletedToday,
        total_cost_today: totalCostToday,
        approval_rate: approvalRate,
    });
}));
agentsRouter.post('/', asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const name = getTrimmedString(body.name);
    const role = getTrimmedString(body.role);
    if (!name) {
        validationError(res, 'name is required');
        return;
    }
    if (!role) {
        validationError(res, 'role is required');
        return;
    }
    const insertValues = {
        userId: req.userId,
        name,
        role,
    };
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
    if (hasOwn(body, 'model')) {
        const model = getTrimmedString(body.model);
        if (!model) {
            validationError(res, 'model must be a non-empty string');
            return;
        }
        insertValues.model = model;
    }
    if (hasOwn(body, 'status')) {
        const status = getTrimmedString(body.status);
        if (!status) {
            validationError(res, 'status must be a non-empty string');
            return;
        }
        insertValues.status = status;
    }
    if (hasOwn(body, 'canExecute') || hasOwn(body, 'can_execute')) {
        const canExecute = body.canExecute ?? body.can_execute;
        if (canExecute === null || Array.isArray(canExecute) || typeof canExecute === 'object') {
            insertValues.canExecute = canExecute;
        }
        else {
            validationError(res, 'can_execute must be a JSON array/object/null');
            return;
        }
    }
    if (hasOwn(body, 'autonomy')) {
        const autonomy = getTrimmedString(body.autonomy);
        if (!autonomy) {
            validationError(res, 'autonomy must be a non-empty string');
            return;
        }
        insertValues.autonomy = autonomy;
    }
    if (hasOwn(body, 'areaIds') || hasOwn(body, 'area_ids')) {
        const areaIds = body.areaIds ?? body.area_ids;
        if (areaIds === null || Array.isArray(areaIds) || typeof areaIds === 'object') {
            insertValues.areaIds = areaIds;
        }
        else {
            validationError(res, 'area_ids must be a JSON array/object/null');
            return;
        }
    }
    if (hasOwn(body, 'maxConcurrent') || hasOwn(body, 'max_concurrent')) {
        const maxConcurrent = getInteger(body.maxConcurrent ?? body.max_concurrent);
        if (maxConcurrent === null) {
            validationError(res, 'max_concurrent must be an integer');
            return;
        }
        insertValues.maxConcurrent = maxConcurrent;
    }
    const [created] = await db.insert(agents).values(insertValues).returning();
    success(res, created, 201);
}));
agentsRouter.put('/:id', asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const body = asRecord(req.body);
    const [existing] = await db
        .select({
        id: agents.id,
        status: agents.status,
    })
        .from(agents)
        .where(and(eq(agents.id, req.params.id), eq(agents.userId, req.userId)))
        .limit(1);
    if (!existing) {
        notFound(res, 'Agent not found');
        return;
    }
    const updateValues = {
        updatedAt: sql `now()`,
    };
    if (hasOwn(body, 'name')) {
        const name = getTrimmedString(body.name);
        if (!name) {
            validationError(res, 'name must be a non-empty string');
            return;
        }
        updateValues.name = name;
    }
    if (hasOwn(body, 'role')) {
        const role = getTrimmedString(body.role);
        if (!role) {
            validationError(res, 'role must be a non-empty string');
            return;
        }
        updateValues.role = role;
    }
    if (hasOwn(body, 'description')) {
        if (body.description === null) {
            updateValues.description = null;
        }
        else {
            const description = getTrimmedString(body.description);
            if (!description) {
                validationError(res, 'description must be a non-empty string or null');
                return;
            }
            updateValues.description = description;
        }
    }
    if (hasOwn(body, 'model')) {
        const model = getTrimmedString(body.model);
        if (!model) {
            validationError(res, 'model must be a non-empty string');
            return;
        }
        updateValues.model = model;
    }
    if (hasOwn(body, 'status')) {
        const status = getTrimmedString(body.status);
        if (!status) {
            validationError(res, 'status must be a non-empty string');
            return;
        }
        updateValues.status = status;
    }
    if (hasOwn(body, 'canExecute') || hasOwn(body, 'can_execute')) {
        const canExecute = body.canExecute ?? body.can_execute;
        if (canExecute === null || Array.isArray(canExecute) || typeof canExecute === 'object') {
            updateValues.canExecute = canExecute;
        }
        else {
            validationError(res, 'can_execute must be a JSON array/object/null');
            return;
        }
    }
    if (hasOwn(body, 'autonomy')) {
        const autonomy = getTrimmedString(body.autonomy);
        if (!autonomy) {
            validationError(res, 'autonomy must be a non-empty string');
            return;
        }
        updateValues.autonomy = autonomy;
    }
    if (hasOwn(body, 'areaIds') || hasOwn(body, 'area_ids')) {
        const areaIds = body.areaIds ?? body.area_ids;
        if (areaIds === null || Array.isArray(areaIds) || typeof areaIds === 'object') {
            updateValues.areaIds = areaIds;
        }
        else {
            validationError(res, 'area_ids must be a JSON array/object/null');
            return;
        }
    }
    if (hasOwn(body, 'maxConcurrent') || hasOwn(body, 'max_concurrent')) {
        const maxConcurrent = getInteger(body.maxConcurrent ?? body.max_concurrent);
        if (maxConcurrent === null) {
            validationError(res, 'max_concurrent must be an integer');
            return;
        }
        updateValues.maxConcurrent = maxConcurrent;
    }
    if (Object.keys(updateValues).length === 1) {
        validationError(res, 'No valid fields to update');
        return;
    }
    const [updated] = await db
        .update(agents)
        .set(updateValues)
        .where(and(eq(agents.id, req.params.id), eq(agents.userId, req.userId)))
        .returning();
    if (!updated) {
        notFound(res, 'Agent not found');
        return;
    }
    if (existing.status !== updated.status) {
        emitEvent(req.userId, 'agent', 'agent.status_changed', {
            agent_id: updated.id,
            id: updated.id,
            old_status: existing.status,
            new_status: updated.status,
            status: updated.status,
        });
    }
    success(res, updated);
}));
agentsRouter.get('/:id/work-log', asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const [agent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, req.params.id), eq(agents.userId, req.userId)))
        .limit(1);
    if (!agent) {
        notFound(res, 'Agent not found');
        return;
    }
    const rows = await db
        .select()
        .from(agentWorkLog)
        .where(and(eq(agentWorkLog.agentId, req.params.id), eq(agentWorkLog.userId, req.userId)))
        .orderBy(desc(agentWorkLog.createdAt));
    success(res, rows);
}));
// ── Agent runs (activity panel) ──────────────────────
agentsRouter.get('/runs', asyncHandler(async (req, res) => {
    const limit = Math.min(getInteger(req.query.limit) || 20, 100);
    try {
        const rows = await db
            .select()
            .from(agentWorkLog)
            .where(eq(agentWorkLog.userId, req.userId))
            .orderBy(desc(agentWorkLog.createdAt))
            .limit(limit);
        const data = rows.map((r) => ({
            id: r.id,
            name: r.action || 'Sub-Agent',
            status: r.durationMs ? 'done' : 'running',
            input: r.details || '',
            output: r.outputRef?.slice(0, 5000) || '',
            error: undefined,
            model: undefined,
            startedAt: r.createdAt,
            finishedAt: r.durationMs
                ? new Date(new Date(r.createdAt).getTime() + r.durationMs).toISOString()
                : undefined,
        }));
        success(res, data);
    }
    catch {
        success(res, []);
    }
}));
agentsRouter.get('/openclaw', asyncHandler(async (_req, res) => {
    try {
        // Call OpenClaw bridge on the host (openclaw CLI not available inside Docker)
        const OPENCLAW_GATEWAY = process.env.OPENCLAW_BRIDGE_URL || 'http://host.docker.internal:3855';
        const OPENCLAW_TOKEN = process.env.OPENCLAW_BRIDGE_TOKEN || 'kira-bridge-2024';
        const resp = await fetch(`${OPENCLAW_GATEWAY}/api/sessions`, {
            headers: { 'Authorization': `Bearer ${OPENCLAW_TOKEN}` },
            signal: AbortSignal.timeout(5000),
        });
        if (!resp.ok) {
            success(res, []);
            return;
        }
        const sessions = await resp.json();
        const subagents = (sessions.sessions || sessions || [])
            .filter((s) => s.kind === 'sub-agent' || s.key?.includes('subagent'))
            .map((s) => ({
            id: s.key || s.sessionKey,
            name: s.label || s.key?.split(':').pop() || 'Sub-Agent',
            status: s.state === 'complete' ? 'done' : s.state === 'error' ? 'error' : 'running',
            input: s.task || '',
            output: s.lastMessages?.[0]?.text?.slice(0, 500) || '',
            startedAt: s.createdAt || new Date().toISOString(),
            finishedAt: s.state === 'complete' ? s.updatedAt : undefined,
            source: 'openclaw',
        }));
        success(res, subagents);
    }
    catch (e) {
        console.error('[openclaw agents] error:', e);
        success(res, []);
    }
}));
export { agentsRouter };
//# sourceMappingURL=agents.js.map