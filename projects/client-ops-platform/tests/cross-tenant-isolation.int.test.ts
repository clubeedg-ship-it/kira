import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OrganizationService } from '../src/core/organization-service';
import { BrandingService } from '../src/core/branding-service';
import { ServiceCatalogService } from '../src/core/service-catalog-service';
import { SupportService } from '../src/core/support-service';
import { DeploymentService } from '../src/core/deployment-service';
import { IntegrationService } from '../src/core/integration-service';
import { BackupService } from '../src/core/backup-service';
import { prisma, resetDb, disconnectDb, createOrganization, createUser } from './helpers';

beforeAll(() => {
  process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-at-least-32-chars-long!!';
});

describe.sequential('Cross-tenant isolation', () => {
  const orgService = new OrganizationService(prisma);
  const brandingService = new BrandingService(prisma);
  const catalogService = new ServiceCatalogService(prisma);
  const supportService = new SupportService(prisma);
  const deploymentService = new DeploymentService(prisma);
  const integrationService = new IntegrationService(prisma);
  const backupService = new BackupService(prisma);

  let orgAId: string;
  let orgBId: string;
  let ownerAId: string;
  let ownerBId: string;

  beforeEach(async () => {
    await resetDb();
    const orgA = await createOrganization('org-a');
    const orgB = await createOrganization('org-b');
    const ownerA = await createUser('owner-a@test.local');
    const ownerB = await createUser('owner-b@test.local');

    await prisma.organizationMember.createMany({
      data: [
        { organizationId: orgA.id, userId: ownerA.id, role: 'owner' },
        { organizationId: orgB.id, userId: ownerB.id, role: 'owner' },
      ],
    });

    orgAId = orgA.id;
    orgBId = orgB.id;
    ownerAId = ownerA.id;
    ownerBId = ownerB.id;
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('owner A cannot view org B', async () => {
    await expect(
      orgService.getOrganizationForUser({ organizationId: orgBId, userId: ownerAId }),
    ).rejects.toThrow('Cannot view organization');
  });

  it('owner A cannot update org B branding', async () => {
    await expect(
      brandingService.upsertBrandSettings({
        actorUserId: ownerAId,
        organizationId: orgBId,
        input: { companyDisplayName: 'Hacked' },
      }),
    ).rejects.toThrow('Cannot manage organization');
  });

  it('owner A cannot create services in org B', async () => {
    await expect(
      catalogService.createService({
        actorUserId: ownerAId,
        organizationId: orgBId,
        name: 'Injected',
        type: 'website',
        status: 'active',
      }),
    ).rejects.toThrow('Cannot manage organization');
  });

  it('owner A cannot update org B service status', async () => {
    const service = await catalogService.createService({
      actorUserId: ownerBId,
      organizationId: orgBId,
      name: 'Real Service',
      type: 'website',
      status: 'active',
    });

    await expect(
      catalogService.updateServiceStatus({
        actorUserId: ownerAId,
        organizationId: orgBId,
        serviceId: service.id,
        status: 'error',
      }),
    ).rejects.toThrow('Cannot manage organization');
  });

  it('owner A cannot update org B support request status', async () => {
    const request = await supportService.createRequest({
      actorUserId: ownerBId,
      organizationId: orgBId,
      subject: 'Help',
      message: 'Need help',
    });

    await expect(
      supportService.updateRequestStatus({
        actorUserId: ownerAId,
        organizationId: orgBId,
        requestId: request.id,
        status: 'resolved',
      }),
    ).rejects.toThrow('Cannot manage organization');
  });

  it('owner A cannot transition org B release status', async () => {
    const release = await deploymentService.createRelease({
      actorUserId: ownerBId,
      organizationId: orgBId,
      sourceType: 'config_export',
    });

    // Even if A somehow knows the release ID, scoping prevents mutation
    await expect(
      deploymentService.transitionReleaseStatus({
        releaseId: release.id,
        organizationId: orgAId,
        newStatus: 'publishing',
      }),
    ).rejects.toThrow(); // findFirstOrThrow will fail because release belongs to orgB
  });

  it('owner A cannot transition org B job status', async () => {
    const target = await deploymentService.createTarget({
      actorUserId: ownerBId,
      organizationId: orgBId,
      name: 'Target',
      targetType: 'local_fs',
      config: { path: '/tmp/b' },
    });

    const job = await deploymentService.createDeploymentJob({
      actorUserId: ownerBId,
      organizationId: orgBId,
      deploymentTargetId: target.id,
      jobType: 'publish',
    });

    await expect(
      deploymentService.transitionJobStatus({
        jobId: job.id,
        organizationId: orgAId,
        newStatus: 'running',
      }),
    ).rejects.toThrow();
  });

  it('owner A cannot transition org B backup status', async () => {
    const backup = await backupService.createBackup({
      actorUserId: ownerBId,
      organizationId: orgBId,
      kind: 'site_bundle',
    });

    await expect(
      backupService.transitionBackupStatus({
        backupId: backup.id,
        organizationId: orgAId,
        newStatus: 'ready',
      }),
    ).rejects.toThrow();
  });

  it('owner A cannot read org B integration secrets', async () => {
    const connection = await integrationService.createConnection({
      actorUserId: ownerBId,
      organizationId: orgBId,
      type: 'ghost',
      name: 'Blog',
    });

    await integrationService.setSecret({
      actorUserId: ownerBId,
      organizationId: orgBId,
      integrationConnectionId: connection.id,
      secretKey: 'api_key',
      plainValue: 'secret-value',
    });

    await expect(
      integrationService.getSecretDecrypted({
        actorUserId: ownerAId,
        organizationId: orgBId,
        integrationConnectionId: connection.id,
        secretKey: 'api_key',
      }),
    ).rejects.toThrow('Cannot manage organization');
  });

  it('owner A cannot read org B deployment target secrets', async () => {
    const target = await deploymentService.createTarget({
      actorUserId: ownerBId,
      organizationId: orgBId,
      name: 'SFTP',
      targetType: 'sftp',
      config: { host: 'sftp.b.com', port: 22, remotePath: '/var/www', username: 'deploy' },
    });

    await deploymentService.setTargetSecret({
      actorUserId: ownerBId,
      organizationId: orgBId,
      deploymentTargetId: target.id,
      secretKey: 'password',
      plainValue: 'secret-pass',
    });

    await expect(
      deploymentService.getTargetSecretDecrypted({
        actorUserId: ownerAId,
        organizationId: orgBId,
        deploymentTargetId: target.id,
        secretKey: 'password',
      }),
    ).rejects.toThrow('Cannot manage organization');
  });
});
