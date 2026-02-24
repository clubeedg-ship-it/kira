import { and, desc, eq, or } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../../db/index';
import { dependencies } from '../../db/schema';
import { recalculatePriorities } from '../engine/priority';
import { asRecord, asyncHandler, getQueryString, getTrimmedString, hasOwn, isUuid, notFound, success, validationError, } from './utils';
const dependenciesRouter = Router();
dependenciesRouter.get('/', asyncHandler(async (req, res) => {
    const conditions = [eq(dependencies.userId, req.userId)];
    const taskId = getQueryString(req.query.task_id);
    if (taskId) {
        if (!isUuid(taskId)) {
            validationError(res, 'task_id must be a valid UUID');
            return;
        }
        conditions.push(or(eq(dependencies.blockedId, taskId), eq(dependencies.blockerId, taskId)));
    }
    const rows = await db
        .select()
        .from(dependencies)
        .where(and(...conditions))
        .orderBy(desc(dependencies.createdAt));
    success(res, rows);
}));
dependenciesRouter.post('/', asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const blockerType = getTrimmedString(body.blockerType ?? body.blocker_type);
    const blockerId = getTrimmedString(body.blockerId ?? body.blocker_id);
    const blockedType = getTrimmedString(body.blockedType ?? body.blocked_type);
    const blockedId = getTrimmedString(body.blockedId ?? body.blocked_id);
    if (!blockerType) {
        validationError(res, 'blocker_type is required');
        return;
    }
    if (!blockedType) {
        validationError(res, 'blocked_type is required');
        return;
    }
    if (!blockerId || !isUuid(blockerId)) {
        validationError(res, 'blocker_id is required and must be a valid UUID');
        return;
    }
    if (!blockedId || !isUuid(blockedId)) {
        validationError(res, 'blocked_id is required and must be a valid UUID');
        return;
    }
    if (blockerId === blockedId && blockerType === blockedType) {
        validationError(res, 'dependency cannot reference the same entity as blocker and blocked');
        return;
    }
    const insertValues = {
        userId: req.userId,
        blockerType,
        blockerId,
        blockedType,
        blockedId,
    };
    if (hasOwn(body, 'depType') || hasOwn(body, 'dep_type')) {
        const depType = getTrimmedString(body.depType ?? body.dep_type);
        if (!depType) {
            validationError(res, 'dep_type must be a non-empty string');
            return;
        }
        insertValues.depType = depType;
    }
    const [created] = await db.insert(dependencies).values(insertValues).returning();
    await recalculatePriorities(req.userId);
    success(res, created, 201);
}));
dependenciesRouter.delete('/:id', asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const [deleted] = await db
        .delete(dependencies)
        .where(and(eq(dependencies.id, req.params.id), eq(dependencies.userId, req.userId)))
        .returning();
    if (!deleted) {
        notFound(res, 'Dependency not found');
        return;
    }
    await recalculatePriorities(req.userId);
    success(res, deleted);
}));
export { dependenciesRouter };
//# sourceMappingURL=dependencies.js.map