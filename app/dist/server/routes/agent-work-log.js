import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../../db/index';
import { agentWorkLog } from '../../db/schema';
import { asyncHandler, getQueryString, isUuid, success, validationError, } from './utils';
const agentWorkLogRouter = Router();
agentWorkLogRouter.get('/', asyncHandler(async (req, res) => {
    const conditions = [eq(agentWorkLog.userId, req.userId)];
    const agentId = getQueryString(req.query.agent_id);
    if (agentId) {
        if (!isUuid(agentId)) {
            validationError(res, 'agent_id must be a valid UUID');
            return;
        }
        conditions.push(eq(agentWorkLog.agentId, agentId));
    }
    const taskId = getQueryString(req.query.task_id);
    if (taskId) {
        if (!isUuid(taskId)) {
            validationError(res, 'task_id must be a valid UUID');
            return;
        }
        conditions.push(eq(agentWorkLog.taskId, taskId));
    }
    const rows = await db
        .select()
        .from(agentWorkLog)
        .where(and(...conditions))
        .orderBy(desc(agentWorkLog.createdAt));
    success(res, rows);
}));
export { agentWorkLogRouter };
//# sourceMappingURL=agent-work-log.js.map