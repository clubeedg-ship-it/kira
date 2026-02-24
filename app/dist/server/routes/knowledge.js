import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../../db/index';
import { entities, facts, relationships } from '../../db/schema';
import { asyncHandler, asRecord, getTrimmedString, getQueryString, hasOwn, isUuid, notFound, success, validationError, } from './utils';
const knowledgeRouter = Router();
// Helper — Express 5 params can be string | string[]
function paramStr(v) {
    return Array.isArray(v) ? v[0] : v;
}
// ── List entities ────────────────────────────────────────────────────────────
knowledgeRouter.get('/entities', asyncHandler(async (req, res) => {
    const search = getQueryString(req.query.search);
    const type = getQueryString(req.query.type);
    const conditions = [eq(entities.userId, req.userId)];
    if (type)
        conditions.push(eq(entities.type, type));
    if (search)
        conditions.push(ilike(entities.name, `%${search}%`));
    const rows = await db
        .select()
        .from(entities)
        .where(and(...conditions))
        .orderBy(entities.name);
    success(res, rows);
}));
// ── Create entity ────────────────────────────────────────────────────────────
knowledgeRouter.post('/entities', asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const name = getTrimmedString(body.name);
    const type = getTrimmedString(body.type);
    if (!name)
        return validationError(res, 'name is required');
    if (!type)
        return validationError(res, 'type is required');
    const [row] = await db
        .insert(entities)
        .values({
        userId: req.userId,
        name,
        type,
        aliases: body.aliases ?? null,
        properties: body.properties ?? null,
    })
        .returning();
    success(res, row, 201);
}));
// ── Get entity with relationships and facts ──────────────────────────────────
knowledgeRouter.get('/entities/:id', asyncHandler(async (req, res) => {
    const id = paramStr(req.params.id);
    if (!isUuid(id))
        return validationError(res, 'Invalid id');
    const [entity] = await db
        .select()
        .from(entities)
        .where(and(eq(entities.id, id), eq(entities.userId, req.userId)));
    if (!entity)
        return notFound(res, 'Entity not found');
    const rels = await db
        .select()
        .from(relationships)
        .where(and(eq(relationships.userId, req.userId), or(eq(relationships.sourceEntityId, id), eq(relationships.targetEntityId, id))));
    const entityFacts = await db
        .select()
        .from(facts)
        .where(and(eq(facts.entityId, id), eq(facts.userId, req.userId)));
    success(res, { ...entity, relationships: rels, facts: entityFacts });
}));
// ── Update entity ────────────────────────────────────────────────────────────
knowledgeRouter.put('/entities/:id', asyncHandler(async (req, res) => {
    const id = paramStr(req.params.id);
    if (!isUuid(id))
        return validationError(res, 'Invalid id');
    const body = asRecord(req.body);
    const updates = { updatedAt: new Date().toISOString() };
    if (hasOwn(body, 'name')) {
        const name = getTrimmedString(body.name);
        if (!name)
            return validationError(res, 'name cannot be empty');
        updates.name = name;
    }
    if (hasOwn(body, 'type'))
        updates.type = body.type;
    if (hasOwn(body, 'aliases'))
        updates.aliases = body.aliases;
    if (hasOwn(body, 'properties'))
        updates.properties = body.properties;
    const [row] = await db
        .update(entities)
        .set(updates)
        .where(and(eq(entities.id, id), eq(entities.userId, req.userId)))
        .returning();
    if (!row)
        return notFound(res, 'Entity not found');
    success(res, row);
}));
// ── Delete entity + cascade ──────────────────────────────────────────────────
knowledgeRouter.delete('/entities/:id', asyncHandler(async (req, res) => {
    const id = paramStr(req.params.id);
    if (!isUuid(id))
        return validationError(res, 'Invalid id');
    await db.delete(facts).where(and(eq(facts.entityId, id), eq(facts.userId, req.userId)));
    await db
        .delete(relationships)
        .where(and(eq(relationships.userId, req.userId), or(eq(relationships.sourceEntityId, id), eq(relationships.targetEntityId, id))));
    const [row] = await db
        .delete(entities)
        .where(and(eq(entities.id, id), eq(entities.userId, req.userId)))
        .returning();
    if (!row)
        return notFound(res, 'Entity not found');
    success(res, { deleted: true });
}));
// ── Graph data (paginated, top-connected) ────────────────────────────────────
knowledgeRouter.get('/graph', asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(getQueryString(req.query.limit) || '200', 10) || 200, 500);
    const type = getQueryString(req.query.type);
    const search = getQueryString(req.query.search);
    const userId = req.userId;
    // Total counts for stats
    const [entityCount] = await db
        .select({ count: sql `count(*)::int` })
        .from(entities)
        .where(eq(entities.userId, userId));
    const [relCount] = await db
        .select({ count: sql `count(*)::int` })
        .from(relationships)
        .where(eq(relationships.userId, userId));
    // Build WHERE clauses
    const whereParts = [sql `e.user_id = ${userId}`];
    if (type && type !== 'all')
        whereParts.push(sql `e.type = ${type}`);
    if (search)
        whereParts.push(sql `e.name ILIKE ${`%${search}%`}`);
    const whereClause = sql.join(whereParts, sql ` AND `);
    // Top-connected nodes
    const nodes = await db.execute(sql `
      SELECT e.id, e.name, e.type,
        (SELECT count(*)::int FROM relationships r
         WHERE r.source_entity_id = e.id OR r.target_entity_id = e.id) as connections
      FROM entities e
      WHERE ${whereClause}
      ORDER BY connections DESC
      LIMIT ${limit}
    `);
    const nodeIds = nodes.rows.map((n) => n.id);
    let edges = [];
    if (nodeIds.length > 0) {
        const nodeIdArray = `{${nodeIds.join(',')}}`;
        const edgeResult = await db.execute(sql `
        SELECT source_entity_id as source, target_entity_id as target, type
        FROM relationships
        WHERE source_entity_id = ANY(${nodeIdArray}::uuid[])
          AND target_entity_id = ANY(${nodeIdArray}::uuid[])
        LIMIT 2000
      `);
        edges = edgeResult.rows;
    }
    success(res, {
        nodes: nodes.rows,
        edges,
        stats: {
            entities: entityCount?.count ?? 0,
            relationships: relCount?.count ?? 0,
        },
    });
}));
// ── Add fact ─────────────────────────────────────────────────────────────────
knowledgeRouter.post('/facts', asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const entityId = getTrimmedString(body.entityId);
    const key = getTrimmedString(body.key);
    const value = getTrimmedString(body.value);
    if (!entityId || !isUuid(entityId))
        return validationError(res, 'Valid entityId is required');
    if (!key)
        return validationError(res, 'key is required');
    if (!value)
        return validationError(res, 'value is required');
    const [entity] = await db
        .select({ id: entities.id })
        .from(entities)
        .where(and(eq(entities.id, entityId), eq(entities.userId, req.userId)));
    if (!entity)
        return notFound(res, 'Entity not found');
    const [row] = await db
        .insert(facts)
        .values({
        userId: req.userId,
        entityId,
        key,
        value,
        source: getTrimmedString(body.source),
        confidence: typeof body.confidence === 'number' ? body.confidence : 1.0,
    })
        .returning();
    success(res, row, 201);
}));
// ── Stats ────────────────────────────────────────────────────────────────────
knowledgeRouter.get('/stats', asyncHandler(async (req, res) => {
    const entityCountByType = await db
        .select({ type: entities.type, count: sql `count(*)::int` })
        .from(entities)
        .where(eq(entities.userId, req.userId))
        .groupBy(entities.type);
    const [relCount] = await db
        .select({ count: sql `count(*)::int` })
        .from(relationships)
        .where(eq(relationships.userId, req.userId));
    const [factCount] = await db
        .select({ count: sql `count(*)::int` })
        .from(facts)
        .where(eq(facts.userId, req.userId));
    success(res, {
        entityCountByType: Object.fromEntries(entityCountByType.map((r) => [r.type, r.count])),
        totalEntities: entityCountByType.reduce((sum, r) => sum + r.count, 0),
        totalRelationships: relCount?.count ?? 0,
        totalFacts: factCount?.count ?? 0,
    });
}));
export { knowledgeRouter };
//# sourceMappingURL=knowledge.js.map