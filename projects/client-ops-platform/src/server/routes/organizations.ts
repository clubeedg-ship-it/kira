import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { OrganizationService } from '../../core/organization-service';
import type { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const orgService = new OrganizationService(prisma);

export const organizationsRouter = Router();

// GET /orgs/:orgId
organizationsRouter.get('/:orgId', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const org = await orgService.getOrganizationForUser({
      organizationId: req.params.orgId,
      userId: authReq.userId,
    });
    res.json({ data: org });
  } catch (err) {
    next(err);
  }
});

// GET /orgs/:orgId/members
organizationsRouter.get('/:orgId/members', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    res.json({ data: members });
  } catch (err) {
    next(err);
  }
});

// POST /orgs/:orgId/members
organizationsRouter.post('/:orgId/members', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await orgService.addMember({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
      targetUserId: req.body.userId,
      role: req.body.role,
    });
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});
