import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { DeploymentService } from '../../core/deployment-service';
import type { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const deploymentService = new DeploymentService(prisma);

export const deploymentsRouter = Router();

// GET /orgs/:orgId/deployment-targets
deploymentsRouter.get('/:orgId/deployment-targets', async (req, res, next) => {
  try {
    const targets = await prisma.deploymentTarget.findMany({
      where: { organizationId: req.params.orgId },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: targets });
  } catch (err) {
    next(err);
  }
});

// POST /orgs/:orgId/deployment-targets
deploymentsRouter.post('/:orgId/deployment-targets', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const target = await deploymentService.createTarget({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
      ...req.body,
    });
    res.status(201).json({ data: target });
  } catch (err) {
    next(err);
  }
});

// POST /orgs/:orgId/deployment-targets/:targetId/secrets
deploymentsRouter.post('/:orgId/deployment-targets/:targetId/secrets', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await deploymentService.setTargetSecret({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
      deploymentTargetId: req.params.targetId,
      secretKey: req.body.secretKey,
      plainValue: req.body.value,
    });
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /orgs/:orgId/releases
deploymentsRouter.post('/:orgId/releases', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const release = await deploymentService.createRelease({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
      ...req.body,
    });
    res.status(201).json({ data: release });
  } catch (err) {
    next(err);
  }
});

// PATCH /orgs/:orgId/releases/:releaseId/status
deploymentsRouter.patch('/:orgId/releases/:releaseId/status', async (req, res, next) => {
  try {
    const result = await deploymentService.transitionReleaseStatus({
      releaseId: req.params.releaseId,
      organizationId: req.params.orgId,
      newStatus: req.body.status,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /orgs/:orgId/jobs
deploymentsRouter.post('/:orgId/jobs', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const job = await deploymentService.createDeploymentJob({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
      ...req.body,
    });
    res.status(201).json({ data: job });
  } catch (err) {
    next(err);
  }
});

// GET /orgs/:orgId/jobs
deploymentsRouter.get('/:orgId/jobs', async (req, res, next) => {
  try {
    const jobs = await prisma.deploymentJob.findMany({
      where: { organizationId: req.params.orgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: jobs });
  } catch (err) {
    next(err);
  }
});
