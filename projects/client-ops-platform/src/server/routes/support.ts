import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { SupportService } from '../../core/support-service';
import type { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const supportService = new SupportService(prisma);

export const supportRouter = Router();

// GET /orgs/:orgId/support
supportRouter.get('/:orgId/support', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const requests = await supportService.listRequests({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
    });
    res.json({ data: requests });
  } catch (err) {
    next(err);
  }
});

// POST /orgs/:orgId/support
supportRouter.post('/:orgId/support', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const request = await supportService.createRequest({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
      ...req.body,
    });
    res.status(201).json({ data: request });
  } catch (err) {
    next(err);
  }
});

// PATCH /orgs/:orgId/support/:requestId
supportRouter.patch('/:orgId/support/:requestId', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const request = await supportService.updateRequestStatus({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
      requestId: req.params.requestId,
      ...req.body,
    });
    res.json({ data: request });
  } catch (err) {
    next(err);
  }
});
