import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';

import { db } from '../../db/index';
import { areas, decisions, principles, projects } from '../../db/schema';
import {
  asRecord,
  asyncHandler,
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

const principlesRouter = Router();
const decisionsRouter = Router();

async function areaBelongsToUser(userId: string, areaId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(and(eq(areas.id, areaId), eq(areas.userId, userId)))
    .limit(1);

  return Boolean(row);
}

async function principleBelongsToUser(userId: string, principleId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: principles.id })
    .from(principles)
    .where(and(eq(principles.id, principleId), eq(principles.userId, userId)))
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

principlesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const conditions: SQL<unknown>[] = [eq(principles.userId, req.userId)];

    const areaId = getQueryString(req.query.area_id);
    if (areaId) {
      if (!isUuid(areaId)) {
        validationError(res, 'area_id must be a valid UUID');
        return;
      }
      conditions.push(eq(principles.areaId, areaId));
    }

    const domain = getQueryString(req.query.domain);
    if (domain) {
      conditions.push(eq(principles.domain, domain));
    }

    const rows = await db
      .select()
      .from(principles)
      .where(and(...conditions))
      .orderBy(desc(principles.createdAt));

    success(res, rows);
  }),
);

principlesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);

    const domain = getTrimmedString(body.domain);
    const rule = getTrimmedString(body.rule);

    if (!domain) {
      validationError(res, 'domain is required');
      return;
    }

    if (!rule) {
      validationError(res, 'rule is required');
      return;
    }

    const insertValues: Record<string, unknown> = {
      userId: req.userId,
      domain,
      rule,
    };

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

    if (hasOwn(body, 'rationale')) {
      if (body.rationale === null) {
        insertValues.rationale = null;
      } else {
        const rationale = getTrimmedString(body.rationale);
        if (!rationale) {
          validationError(res, 'rationale must be a non-empty string or null');
          return;
        }
        insertValues.rationale = rationale;
      }
    }

    if (hasOwn(body, 'examples')) {
      if (body.examples === null || Array.isArray(body.examples) || typeof body.examples === 'object') {
        insertValues.examples = body.examples;
      } else {
        validationError(res, 'examples must be a JSON array/object/null');
        return;
      }
    }

    if (hasOwn(body, 'confidence')) {
      const confidence = getNumber(body.confidence);
      if (confidence === null) {
        validationError(res, 'confidence must be a number');
        return;
      }
      insertValues.confidence = confidence;
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

    const [created] = await db.insert(principles).values(insertValues as any).returning();

    success(res, created, 201);
  }),
);

principlesRouter.put(
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

    if (hasOwn(body, 'domain')) {
      const domain = getTrimmedString(body.domain);
      if (!domain) {
        validationError(res, 'domain must be a non-empty string');
        return;
      }
      updateValues.domain = domain;
    }

    if (hasOwn(body, 'rule')) {
      const rule = getTrimmedString(body.rule);
      if (!rule) {
        validationError(res, 'rule must be a non-empty string');
        return;
      }
      updateValues.rule = rule;
    }

    if (hasOwn(body, 'rationale')) {
      if (body.rationale === null) {
        updateValues.rationale = null;
      } else {
        const rationale = getTrimmedString(body.rationale);
        if (!rationale) {
          validationError(res, 'rationale must be a non-empty string or null');
          return;
        }
        updateValues.rationale = rationale;
      }
    }

    if (hasOwn(body, 'examples')) {
      if (body.examples === null || Array.isArray(body.examples) || typeof body.examples === 'object') {
        updateValues.examples = body.examples;
      } else {
        validationError(res, 'examples must be a JSON array/object/null');
        return;
      }
    }

    if (hasOwn(body, 'confidence')) {
      const confidence = getNumber(body.confidence);
      if (confidence === null) {
        validationError(res, 'confidence must be a number');
        return;
      }
      updateValues.confidence = confidence;
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

    if (Object.keys(updateValues).length === 1) {
      validationError(res, 'No valid fields to update');
      return;
    }

    const [updated] = await db
      .update(principles)
      .set(updateValues as any)
      .where(and(eq(principles.id, req.params.id as string), eq(principles.userId, req.userId)))
      .returning();

    if (!updated) {
      notFound(res, 'Principle not found');
      return;
    }

    success(res, updated);
  }),
);

decisionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const conditions: SQL<unknown>[] = [eq(decisions.userId, req.userId)];

    const projectId = getQueryString(req.query.project_id);
    if (projectId) {
      if (!isUuid(projectId)) {
        validationError(res, 'project_id must be a valid UUID');
        return;
      }
      conditions.push(eq(decisions.projectId, projectId));
    }

    const principleId = getQueryString(req.query.principle_id);
    if (principleId) {
      if (!isUuid(principleId)) {
        validationError(res, 'principle_id must be a valid UUID');
        return;
      }
      conditions.push(eq(decisions.principleId, principleId));
    }

    const rows = await db
      .select()
      .from(decisions)
      .where(and(...conditions))
      .orderBy(desc(decisions.createdAt));

    success(res, rows);
  }),
);

decisionsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);

    const title = getTrimmedString(body.title);
    const context = getTrimmedString(body.context);
    const chosen = getTrimmedString(body.chosen);

    if (!title) {
      validationError(res, 'title is required');
      return;
    }

    if (!context) {
      validationError(res, 'context is required');
      return;
    }

    if (!chosen) {
      validationError(res, 'chosen is required');
      return;
    }

    const insertValues: Record<string, unknown> = {
      userId: req.userId,
      title,
      context,
      chosen,
    };

    if (hasOwn(body, 'principleId') || hasOwn(body, 'principle_id')) {
      const principleId = getTrimmedString(body.principleId ?? body.principle_id);
      if (!principleId || !isUuid(principleId)) {
        validationError(res, 'principle_id must be a valid UUID');
        return;
      }

      if (!(await principleBelongsToUser(req.userId, principleId))) {
        notFound(res, 'Principle not found');
        return;
      }

      insertValues.principleId = principleId;
    }

    if (hasOwn(body, 'options')) {
      if (body.options === null || Array.isArray(body.options) || typeof body.options === 'object') {
        insertValues.options = body.options;
      } else {
        validationError(res, 'options must be a JSON array/object/null');
        return;
      }
    }

    if (hasOwn(body, 'reasoning')) {
      if (body.reasoning === null) {
        insertValues.reasoning = null;
      } else {
        const reasoning = getTrimmedString(body.reasoning);
        if (!reasoning) {
          validationError(res, 'reasoning must be a non-empty string or null');
          return;
        }
        insertValues.reasoning = reasoning;
      }
    }

    if (hasOwn(body, 'outcome')) {
      if (body.outcome === null) {
        insertValues.outcome = null;
      } else {
        const outcome = getTrimmedString(body.outcome);
        if (!outcome) {
          validationError(res, 'outcome must be a non-empty string or null');
          return;
        }
        insertValues.outcome = outcome;
      }
    }

    if (hasOwn(body, 'outcomeDate') || hasOwn(body, 'outcome_date')) {
      if (body.outcomeDate === null || body.outcome_date === null) {
        insertValues.outcomeDate = null;
      } else {
        const outcomeDate = getTrimmedString(body.outcomeDate ?? body.outcome_date);
        if (!outcomeDate || !isDateOnly(outcomeDate)) {
          validationError(res, 'outcome_date must be in YYYY-MM-DD format or null');
          return;
        }
        insertValues.outcomeDate = outcomeDate;
      }
    }

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

    const [created] = await db.insert(decisions).values(insertValues as any).returning();

    success(res, created, 201);
  }),
);

export { decisionsRouter, principlesRouter };
