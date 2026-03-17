import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { BackupService } from '../src/core/backup-service';
import { prisma, resetDb, disconnectDb, createOrganization, createUser } from './helpers';

describe.sequential('BackupService integration', () => {
  const service = new BackupService(prisma);

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('creates a backup and logs an audit entry', async () => {
    const org = await createOrganization('backup-org');
    const owner = await createUser('backup-owner@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const backup = await service.createBackup({
      actorUserId: owner.id,
      organizationId: org.id,
      kind: 'site_bundle',
    });

    expect(backup.status).toBe('creating');
    expect(backup.kind).toBe('site_bundle');

    const auditLogs = await prisma.auditLog.findMany({ where: { organizationId: org.id } });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.action).toBe('create_backup');
  });

  it('enforces backup status transitions', async () => {
    const org = await createOrganization('backup-trans-org');
    const owner = await createUser('backup-trans@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const backup = await service.createBackup({
      actorUserId: owner.id,
      organizationId: org.id,
      kind: 'config',
    });

    // creating -> ready
    const ready = await service.transitionBackupStatus({
      backupId: backup.id,
      organizationId: org.id,
      newStatus: 'ready',
      sizeBytes: BigInt(1024),
      checksum: 'sha256:abc123',
    });

    expect(ready.status).toBe('ready');
    expect(ready.sizeBytes).toBe(BigInt(1024));

    // ready -> restoring
    await service.transitionBackupStatus({
      backupId: backup.id,
      organizationId: org.id,
      newStatus: 'restoring',
    });

    // restoring -> restored
    const restored = await service.transitionBackupStatus({
      backupId: backup.id,
      organizationId: org.id,
      newStatus: 'restored',
    });

    expect(restored.status).toBe('restored');
    expect(restored.restoredAt).not.toBeNull();
  });

  it('rejects invalid backup transitions', async () => {
    const org = await createOrganization('backup-invalid-org');
    const owner = await createUser('backup-invalid@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const backup = await service.createBackup({
      actorUserId: owner.id,
      organizationId: org.id,
      kind: 'assets',
    });

    // creating -> restored NOT allowed
    await expect(
      service.transitionBackupStatus({
        backupId: backup.id,
        organizationId: org.id,
        newStatus: 'restored',
      }),
    ).rejects.toThrow('Cannot transition backup from creating to restored');
  });
});
