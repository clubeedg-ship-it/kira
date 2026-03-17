import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { BackupService } from '../../core/backup-service';
import type { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const backupService = new BackupService(prisma);

export const backupsRouter = Router();

// GET /orgs/:orgId/backups
backupsRouter.get('/:orgId/backups', async (req, res, next) => {
  try {
    const backups = await backupService.listBackups(req.params.orgId);
    res.json({ data: backups });
  } catch (err) {
    next(err);
  }
});

// POST /orgs/:orgId/backups
backupsRouter.post('/:orgId/backups', async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const backup = await backupService.createBackup({
      actorUserId: authReq.userId,
      organizationId: req.params.orgId,
      ...req.body,
    });
    res.status(201).json({ data: backup });
  } catch (err) {
    next(err);
  }
});

// PATCH /orgs/:orgId/backups/:backupId/status
backupsRouter.patch('/:orgId/backups/:backupId/status', async (req, res, next) => {
  try {
    const result = await backupService.transitionBackupStatus({
      backupId: req.params.backupId,
      organizationId: req.params.orgId,
      newStatus: req.body.status,
      sizeBytes: req.body.sizeBytes ? BigInt(req.body.sizeBytes) : undefined,
      checksum: req.body.checksum,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});
