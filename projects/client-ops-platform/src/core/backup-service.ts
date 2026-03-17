import { PrismaClient, type BackupKind, type BackupStatus } from '@prisma/client';
import { assertCanManageOrganization } from './organization-access';
import { resolveAccess } from './access';
import { ActivityService } from './activity-service';
import { AuditService } from './audit-service';

const VALID_BACKUP_TRANSITIONS: Record<string, BackupStatus[]> = {
  creating: ['ready', 'failed'],
  ready: ['restoring'],
  failed: [],
  restoring: ['restored', 'failed'],
  restored: [],
};

export class BackupService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly activityService = new ActivityService(prisma),
    private readonly auditService = new AuditService(prisma),
  ) {}

  async createBackup(params: {
    actorUserId: string;
    organizationId: string;
    kind: BackupKind;
    sourceReleaseId?: string;
  }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    const backup = await this.prisma.backup.create({
      data: {
        organizationId: params.organizationId,
        kind: params.kind,
        status: 'creating',
        sourceReleaseId: params.sourceReleaseId,
        createdById: params.actorUserId,
      },
    });

    await this.activityService.appendEvent({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      source: 'system',
      eventType: 'backup_started',
      title: `Backup started: ${params.kind}`,
      metadata: { backupId: backup.id, kind: params.kind },
    });

    await this.auditService.log({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: 'create_backup',
      entityType: 'Backup',
      entityId: backup.id,
      metadata: { kind: params.kind },
    });

    return backup;
  }

  async transitionBackupStatus(params: {
    backupId: string;
    organizationId: string;
    newStatus: BackupStatus;
    sizeBytes?: bigint;
    checksum?: string;
  }) {
    // Scoped by organizationId to prevent cross-tenant mutation
    const backup = await this.prisma.backup.findFirstOrThrow({
      where: { id: params.backupId, organizationId: params.organizationId },
    });

    const allowed = VALID_BACKUP_TRANSITIONS[backup.status];
    if (!allowed || !allowed.includes(params.newStatus)) {
      throw new Error(`Cannot transition backup from ${backup.status} to ${params.newStatus}`);
    }

    return this.prisma.backup.update({
      where: { id: params.backupId },
      data: {
        status: params.newStatus,
        sizeBytes: params.sizeBytes,
        checksum: params.checksum,
        restoredAt: params.newStatus === 'restored' ? new Date() : undefined,
      },
    });
  }

  async listBackups(organizationId: string, limit = 20) {
    return this.prisma.backup.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
