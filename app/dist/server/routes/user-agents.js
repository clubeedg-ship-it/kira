import { and, desc, eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../../db/index';
import { userAgents, agentRuns } from '../../db/schema';
import { runAgentNow, scheduleAgent, unscheduleAgent } from '../agent-scheduler';
import { asyncHandler, asRecord, getTrimmedString, isUuid, notFound, success, validationError, } from './utils';
const userAgentsRouter = Router();
/* GET /api/v1/user-agents — list user's automation agents */
userAgentsRouter.get('/', asyncHandler(async (req, res) => {
    const rows = await db
        .select()
        .from(userAgents)
        .where(eq(userAgents.userId, req.userId))
        .orderBy(desc(userAgents.createdAt));
    success(res, rows);
}));
/* POST /api/v1/user-agents — create agent */
userAgentsRouter.post('/', asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const name = getTrimmedString(body.name);
    const systemPrompt = getTrimmedString(body.systemPrompt ?? body.system_prompt);
    if (!name) {
        validationError(res, 'name is required');
        return;
    }
    if (!systemPrompt) {
        validationError(res, 'systemPrompt is required');
        return;
    }
    const [created] = await db
        .insert(userAgents)
        .values({
        userId: req.userId,
        name,
        type: getTrimmedString(body.type) || 'custom',
        model: getTrimmedString(body.model) || 'minimax/minimax-m2.5',
        systemPrompt,
        tools: Array.isArray(body.tools) ? body.tools : [],
        schedule: getTrimmedString(body.schedule) || null,
        enabled: body.enabled !== false,
        config: body.config && typeof body.config === 'object' ? body.config : {},
    })
        .returning();
    // Schedule if cron
    await scheduleAgent(created);
    success(res, created, 201);
}));
/* PUT /api/v1/user-agents/:id — update agent */
userAgentsRouter.put('/:id', asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (!isUuid(id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const [existing] = await db
        .select()
        .from(userAgents)
        .where(and(eq(userAgents.id, id), eq(userAgents.userId, req.userId)))
        .limit(1);
    if (!existing) {
        notFound(res, 'Agent not found');
        return;
    }
    const body = asRecord(req.body);
    const updates = { updatedAt: sql `now()` };
    if (body.name !== undefined)
        updates.name = getTrimmedString(body.name) || existing.name;
    if (body.type !== undefined)
        updates.type = getTrimmedString(body.type) || existing.type;
    if (body.model !== undefined)
        updates.model = getTrimmedString(body.model) || existing.model;
    if (body.systemPrompt !== undefined || body.system_prompt !== undefined) {
        updates.systemPrompt = getTrimmedString(body.systemPrompt ?? body.system_prompt) || existing.systemPrompt;
    }
    if (body.tools !== undefined)
        updates.tools = Array.isArray(body.tools) ? body.tools : existing.tools;
    if (body.schedule !== undefined)
        updates.schedule = getTrimmedString(body.schedule) || null;
    if (body.enabled !== undefined)
        updates.enabled = !!body.enabled;
    if (body.config !== undefined)
        updates.config = body.config;
    const [updated] = await db
        .update(userAgents)
        .set(updates)
        .where(and(eq(userAgents.id, id), eq(userAgents.userId, req.userId)))
        .returning();
    // Re-schedule
    await unscheduleAgent(id);
    if (updated.enabled && updated.schedule) {
        await scheduleAgent(updated);
    }
    success(res, updated);
}));
/* DELETE /api/v1/user-agents/:id */
userAgentsRouter.delete('/:id', asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (!isUuid(id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    await unscheduleAgent(id);
    // Delete runs first (FK constraint)
    await db.delete(agentRuns).where(eq(agentRuns.agentId, id));
    const deleted = await db
        .delete(userAgents)
        .where(and(eq(userAgents.id, id), eq(userAgents.userId, req.userId)))
        .returning();
    if (deleted.length === 0) {
        notFound(res, 'Agent not found');
        return;
    }
    success(res, { deleted: true });
}));
/* POST /api/v1/user-agents/:id/run — trigger manual run */
userAgentsRouter.post('/:id/run', asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (!isUuid(id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const [agent] = await db
        .select({ id: userAgents.id })
        .from(userAgents)
        .where(and(eq(userAgents.id, id), eq(userAgents.userId, req.userId)))
        .limit(1);
    if (!agent) {
        notFound(res, 'Agent not found');
        return;
    }
    const jobId = await runAgentNow(id, req.userId);
    success(res, { jobId, agentId: id }, 201);
}));
/* GET /api/v1/user-agents/:id/runs — run history */
userAgentsRouter.get('/:id/runs', asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (!isUuid(id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const rows = await db
        .select()
        .from(agentRuns)
        .where(and(eq(agentRuns.agentId, id), eq(agentRuns.userId, req.userId)))
        .orderBy(desc(agentRuns.createdAt))
        .limit(20);
    success(res, rows);
}));
/* GET /api/v1/user-agents/runs/recent — recent runs across all agents */
userAgentsRouter.get('/runs/recent', asyncHandler(async (req, res) => {
    const rows = await db
        .select({
        id: agentRuns.id,
        agentId: agentRuns.agentId,
        agentName: userAgents.name,
        status: agentRuns.status,
        tokensUsed: agentRuns.tokensUsed,
        output: agentRuns.output,
        error: agentRuns.error,
        startedAt: agentRuns.startedAt,
        finishedAt: agentRuns.finishedAt,
        createdAt: agentRuns.createdAt,
    })
        .from(agentRuns)
        .innerJoin(userAgents, eq(agentRuns.agentId, userAgents.id))
        .where(eq(agentRuns.userId, req.userId))
        .orderBy(desc(agentRuns.createdAt))
        .limit(20);
    success(res, rows);
}));
export { userAgentsRouter };
//# sourceMappingURL=user-agents.js.map