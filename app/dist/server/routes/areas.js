import { and, asc, eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../../db/index';
import { areas, vision } from '../../db/schema';
import { onParentArchived } from '../engine/cascade';
import { asRecord, asyncHandler, getNumber, getTrimmedString, hasOwn, isUuid, notFound, success, validationError, } from './utils';
const areasRouter = Router();
areasRouter.get('/', asyncHandler(async (req, res) => {
    const rows = await db
        .select()
        .from(areas)
        .where(eq(areas.userId, req.userId))
        .orderBy(asc(areas.sortOrder), asc(areas.createdAt));
    success(res, rows);
}));
areasRouter.get('/:id', asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const [row] = await db
        .select()
        .from(areas)
        .where(and(eq(areas.id, req.params.id), eq(areas.userId, req.userId)))
        .limit(1);
    if (!row) {
        notFound(res, 'Area not found');
        return;
    }
    success(res, row);
}));
areasRouter.post('/', asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const name = getTrimmedString(body.name);
    if (!name) {
        validationError(res, 'name is required');
        return;
    }
    const insertValues = {
        userId: req.userId,
        name,
    };
    if (hasOwn(body, 'visionId') || hasOwn(body, 'vision_id')) {
        const rawVisionId = body.visionId ?? body.vision_id;
        if (rawVisionId === null) {
            insertValues.visionId = null;
        }
        else {
            const visionId = getTrimmedString(rawVisionId);
            if (!visionId || !isUuid(visionId)) {
                validationError(res, 'vision_id must be a valid UUID or null');
                return;
            }
            const [existingVision] = await db
                .select({ id: vision.id })
                .from(vision)
                .where(and(eq(vision.id, visionId), eq(vision.userId, req.userId)))
                .limit(1);
            if (!existingVision) {
                notFound(res, 'Vision not found');
                return;
            }
            insertValues.visionId = visionId;
        }
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
    if (hasOwn(body, 'standard')) {
        if (body.standard === null) {
            insertValues.standard = null;
        }
        else {
            const standard = getTrimmedString(body.standard);
            if (!standard) {
                validationError(res, 'standard must be a non-empty string or null');
                return;
            }
            insertValues.standard = standard;
        }
    }
    if (hasOwn(body, 'icon')) {
        if (body.icon === null) {
            insertValues.icon = null;
        }
        else {
            const icon = getTrimmedString(body.icon);
            if (!icon) {
                validationError(res, 'icon must be a non-empty string or null');
                return;
            }
            insertValues.icon = icon;
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
    if (hasOwn(body, 'status')) {
        const status = getTrimmedString(body.status);
        if (!status) {
            validationError(res, 'status must be a non-empty string');
            return;
        }
        insertValues.status = status;
    }
    const [created] = await db.insert(areas).values(insertValues).returning();
    success(res, created, 201);
}));
areasRouter.put('/:id', asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const body = asRecord(req.body);
    const updateValues = {
        updatedAt: sql `now()`,
    };
    let nextStatus = null;
    if (hasOwn(body, 'visionId') || hasOwn(body, 'vision_id')) {
        const rawVisionId = body.visionId ?? body.vision_id;
        if (rawVisionId === null) {
            updateValues.visionId = null;
        }
        else {
            const visionId = getTrimmedString(rawVisionId);
            if (!visionId || !isUuid(visionId)) {
                validationError(res, 'vision_id must be a valid UUID or null');
                return;
            }
            const [existingVision] = await db
                .select({ id: vision.id })
                .from(vision)
                .where(and(eq(vision.id, visionId), eq(vision.userId, req.userId)))
                .limit(1);
            if (!existingVision) {
                notFound(res, 'Vision not found');
                return;
            }
            updateValues.visionId = visionId;
        }
    }
    if (hasOwn(body, 'name')) {
        const name = getTrimmedString(body.name);
        if (!name) {
            validationError(res, 'name must be a non-empty string');
            return;
        }
        updateValues.name = name;
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
    if (hasOwn(body, 'standard')) {
        if (body.standard === null) {
            updateValues.standard = null;
        }
        else {
            const standard = getTrimmedString(body.standard);
            if (!standard) {
                validationError(res, 'standard must be a non-empty string or null');
                return;
            }
            updateValues.standard = standard;
        }
    }
    if (hasOwn(body, 'icon')) {
        if (body.icon === null) {
            updateValues.icon = null;
        }
        else {
            const icon = getTrimmedString(body.icon);
            if (!icon) {
                validationError(res, 'icon must be a non-empty string or null');
                return;
            }
            updateValues.icon = icon;
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
    if (hasOwn(body, 'status')) {
        const status = getTrimmedString(body.status);
        if (!status) {
            validationError(res, 'status must be a non-empty string');
            return;
        }
        nextStatus = status;
        updateValues.status = status;
    }
    if (Object.keys(updateValues).length === 1) {
        validationError(res, 'No valid fields to update');
        return;
    }
    const [updated] = await db
        .update(areas)
        .set(updateValues)
        .where(and(eq(areas.id, req.params.id), eq(areas.userId, req.userId)))
        .returning();
    if (!updated) {
        notFound(res, 'Area not found');
        return;
    }
    if (nextStatus === 'archived' && updated.status === 'archived') {
        await onParentArchived(req.userId, 'area', updated.id);
    }
    success(res, updated);
}));
areasRouter.delete('/:id', asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
        validationError(res, 'id must be a valid UUID');
        return;
    }
    const [updated] = await db
        .update(areas)
        .set({
        status: 'archived',
        updatedAt: sql `now()`,
    })
        .where(and(eq(areas.id, req.params.id), eq(areas.userId, req.userId)))
        .returning();
    if (!updated) {
        notFound(res, 'Area not found');
        return;
    }
    success(res, updated);
}));
export { areasRouter };
//# sourceMappingURL=areas.js.map