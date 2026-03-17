import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { BrandingService } from '../../core/branding-service';
import type { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const brandingService = new BrandingService(prisma);

export const brandingRouter = Router();

// GET /orgs/:orgId/branding
brandingRouter.get('/:orgId/branding', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const branding = await prisma.brandSettings.findUnique({
      where: { organizationId: orgId },
    });
    res.json({ data: branding });
  } catch (err) {
    next(err);
  }
});

// PATCH /orgs/:orgId/branding
brandingRouter.patch('/:orgId/branding', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const result = await brandingService.upsertBrandSettings({
      actorUserId: authReq.userId,
      organizationId: orgId,
      input: req.body,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /orgs/:orgId/content-blocks
brandingRouter.get('/:orgId/content-blocks', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const blocks = await prisma.contentBlock.findMany({
      where: { organizationId: orgId },
      orderBy: { key: 'asc' },
    });
    res.json({ data: blocks });
  } catch (err) {
    next(err);
  }
});

// PUT /orgs/:orgId/content-blocks/:key
brandingRouter.put('/:orgId/content-blocks/:key', async (req, res, next) => {
  try {
    const { orgId, key } = req.params;
    const authReq = req as AuthenticatedRequest;
    const result = await brandingService.upsertContentBlock({
      actorUserId: authReq.userId,
      organizationId: orgId,
      key,
      label: req.body.label,
      type: req.body.type,
      status: req.body.status,
      value: req.body.value,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /orgs/:orgId/snapshot
brandingRouter.get('/:orgId/snapshot', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const snapshot = await brandingService.buildPublishedSnapshot(orgId);
    res.json({ data: snapshot });
  } catch (err) {
    next(err);
  }
});
