import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { IntegrationService } from '../../core/integration-service';
import type { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const integrationService = new IntegrationService(prisma);

export const integrationsRouter = Router();

// GET /orgs/:orgId/integrations
integrationsRouter.get('/:orgId/integrations', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const connections = await integrationService.listConnections({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
    });
    res.json({ data: connections });
  } catch (err) {
    next(err);
  }
});

// POST /orgs/:orgId/integrations
integrationsRouter.post('/:orgId/integrations', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const connection = await integrationService.createConnection({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
      ...req.body,
    });
    res.status(201).json({ data: connection });
  } catch (err) {
    next(err);
  }
});

// POST /orgs/:orgId/integrations/:integrationId/secrets
integrationsRouter.post('/:orgId/integrations/:integrationId/secrets', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await integrationService.setSecret({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
      integrationConnectionId: req.params.integrationId,
      secretKey: req.body.secretKey,
      plainValue: req.body.value,
    });
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// PATCH /orgs/:orgId/integrations/:integrationId/status
integrationsRouter.patch('/:orgId/integrations/:integrationId/status', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await integrationService.updateStatus({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
      integrationConnectionId: req.params.integrationId,
      status: req.body.status,
      lastError: req.body.lastError,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});
