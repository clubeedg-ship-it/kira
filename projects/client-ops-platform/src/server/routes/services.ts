import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ServiceCatalogService } from '../../core/service-catalog-service';
import type { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const catalogService = new ServiceCatalogService(prisma);

export const servicesRouter = Router();

// GET /orgs/:orgId/services
servicesRouter.get('/:orgId/services', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const services = await catalogService.listServices({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
    });
    res.json({ data: services });
  } catch (err) {
    next(err);
  }
});

// POST /orgs/:orgId/services
servicesRouter.post('/:orgId/services', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const service = await catalogService.createService({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
      ...req.body,
    });
    res.status(201).json({ data: service });
  } catch (err) {
    next(err);
  }
});

// PATCH /orgs/:orgId/services/:serviceId
servicesRouter.patch('/:orgId/services/:serviceId', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const service = await catalogService.updateServiceStatus({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
      serviceId: req.params.serviceId,
      ...req.body,
    });
    res.json({ data: service });
  } catch (err) {
    next(err);
  }
});
