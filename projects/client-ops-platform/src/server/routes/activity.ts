import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ActivityService } from '../../core/activity-service';

const prisma = new PrismaClient();
const activityService = new ActivityService(prisma);

export const activityRouter = Router();

// GET /orgs/:orgId/activity
activityRouter.get('/:orgId/activity', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const events = await activityService.listRecent(req.params.orgId, Math.min(limit, 100));
    res.json({ data: events });
  } catch (err) {
    next(err);
  }
});
