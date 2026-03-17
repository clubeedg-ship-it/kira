import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../../core/audit-service';

const prisma = new PrismaClient();
const auditService = new AuditService(prisma);

export const auditRouter = Router();

// GET /orgs/:orgId/audit
auditRouter.get('/:orgId/audit', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await auditService.listRecent(req.params.orgId, Math.min(limit, 200));
    res.json({ data: logs });
  } catch (err) {
    next(err);
  }
});
