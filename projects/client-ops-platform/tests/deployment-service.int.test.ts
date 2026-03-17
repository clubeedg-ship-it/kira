import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DeploymentService } from '../src/core/deployment-service';
import { prisma, resetDb, disconnectDb, createOrganization, createUser } from './helpers';

beforeAll(() => {
  process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-at-least-32-chars-long!!';
});

describe.sequential('DeploymentService integration', () => {
  const service = new DeploymentService(prisma);

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('creates a deployment target with validated config', async () => {
    const org = await createOrganization('deploy-org');
    const owner = await createUser('deploy-owner@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const target = await service.createTarget({
      actorUserId: owner.id,
      organizationId: org.id,
      name: 'Hostnet Production',
      targetType: 'hostnet',
      config: {
        host: 'ftp.hostnet.nl',
        remotePath: '/public_html',
        username: 'clientuser',
        protocol: 'sftp',
      },
      isPrimary: true,
    });

    expect(target.name).toBe('Hostnet Production');
    expect(target.isPrimary).toBe(true);
  });

  it('rejects invalid config for a target type', async () => {
    const org = await createOrganization('deploy-invalid-org');
    const owner = await createUser('deploy-invalid@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    await expect(
      service.createTarget({
        actorUserId: owner.id,
        organizationId: org.id,
        name: 'Bad Target',
        targetType: 'sftp',
        config: { host: '' },
      }),
    ).rejects.toThrow();
  });

  it('stores and retrieves encrypted secrets', async () => {
    const org = await createOrganization('secret-org');
    const owner = await createUser('secret-owner@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const target = await service.createTarget({
      actorUserId: owner.id,
      organizationId: org.id,
      name: 'SFTP Target',
      targetType: 'sftp',
      config: { host: 'sftp.example.com', port: 22, remotePath: '/var/www', username: 'deploy' },
    });

    const result = await service.setTargetSecret({
      actorUserId: owner.id,
      organizationId: org.id,
      deploymentTargetId: target.id,
      secretKey: 'password',
      plainValue: 'super-secret-password-123',
    });

    expect(result.masked).toBe('****-123');

    // Verify the raw DB value is encrypted
    const raw = await prisma.deploymentTargetSecret.findFirst({
      where: { deploymentTargetId: target.id },
    });
    expect(raw!.encryptedValue).not.toBe('super-secret-password-123');
    expect(raw!.encryptedValue).toContain(':');

    // Verify round-trip decryption
    const decrypted = await service.getTargetSecretDecrypted({
      actorUserId: owner.id,
      organizationId: org.id,
      deploymentTargetId: target.id,
      secretKey: 'password',
    });
    expect(decrypted).toBe('super-secret-password-123');
  });

  it('creates releases with auto-incrementing versions', async () => {
    const org = await createOrganization('release-org');
    const owner = await createUser('release-owner@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const r1 = await service.createRelease({
      actorUserId: owner.id,
      organizationId: org.id,
      sourceType: 'config_export',
      notes: 'First release',
    });

    const r2 = await service.createRelease({
      actorUserId: owner.id,
      organizationId: org.id,
      sourceType: 'config_export',
      notes: 'Second release',
    });

    expect(r1.releaseVersion).toBe(1);
    expect(r2.releaseVersion).toBe(2);
    expect(r1.status).toBe('draft');
  });

  it('enforces valid release status transitions', async () => {
    const org = await createOrganization('release-transition-org');
    const owner = await createUser('release-trans@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const release = await service.createRelease({
      actorUserId: owner.id,
      organizationId: org.id,
      sourceType: 'config_export',
    });

    // draft -> publishing OK
    await service.transitionReleaseStatus({
      releaseId: release.id,
      organizationId: org.id,
      newStatus: 'publishing',
    });

    // publishing -> published OK
    const published = await service.transitionReleaseStatus({
      releaseId: release.id,
      organizationId: org.id,
      newStatus: 'published',
    });

    expect(published.status).toBe('published');
    expect(published.publishedAt).not.toBeNull();

    // published -> draft NOT allowed
    await expect(
      service.transitionReleaseStatus({
        releaseId: release.id,
        organizationId: org.id,
        newStatus: 'draft',
      }),
    ).rejects.toThrow('Cannot transition release from published to draft');
  });

  it('enforces valid job status transitions', async () => {
    const org = await createOrganization('job-transition-org');
    const owner = await createUser('job-trans@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const target = await service.createTarget({
      actorUserId: owner.id,
      organizationId: org.id,
      name: 'Job Target',
      targetType: 'local_fs',
      config: { path: '/tmp/deploy' },
    });

    const job = await service.createDeploymentJob({
      actorUserId: owner.id,
      organizationId: org.id,
      deploymentTargetId: target.id,
      jobType: 'publish',
    });

    expect(job.status).toBe('queued');

    // queued -> running
    await service.transitionJobStatus({
      jobId: job.id,
      organizationId: org.id,
      newStatus: 'running',
    });

    // running -> failed
    const failed = await service.transitionJobStatus({
      jobId: job.id,
      organizationId: org.id,
      newStatus: 'failed',
      errorMessage: 'Connection refused',
    });

    expect(failed.status).toBe('failed');
    expect(failed.errorMessage).toBe('Connection refused');
    expect(failed.finishedAt).not.toBeNull();

    // failed -> success NOT allowed
    await expect(
      service.transitionJobStatus({
        jobId: job.id,
        organizationId: org.id,
        newStatus: 'success',
      }),
    ).rejects.toThrow('Cannot transition job from failed to success');
  });

  it('does not mark release published when job fails', async () => {
    const org = await createOrganization('fail-release-org');
    const owner = await createUser('fail-release@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const target = await service.createTarget({
      actorUserId: owner.id,
      organizationId: org.id,
      name: 'Fail Target',
      targetType: 'local_fs',
      config: { path: '/tmp/fail' },
    });

    const release = await service.createRelease({
      actorUserId: owner.id,
      organizationId: org.id,
      sourceType: 'config_export',
      deploymentTargetId: target.id,
    });

    await service.transitionReleaseStatus({
      releaseId: release.id,
      organizationId: org.id,
      newStatus: 'publishing',
    });

    const job = await service.createDeploymentJob({
      actorUserId: owner.id,
      organizationId: org.id,
      deploymentTargetId: target.id,
      siteReleaseId: release.id,
      jobType: 'publish',
    });

    await service.transitionJobStatus({
      jobId: job.id,
      organizationId: org.id,
      newStatus: 'running',
    });

    await service.transitionJobStatus({
      jobId: job.id,
      organizationId: org.id,
      newStatus: 'failed',
      errorMessage: 'Upload failed',
    });

    // Release should still be in publishing state, NOT published
    const currentRelease = await prisma.siteRelease.findUniqueOrThrow({
      where: { id: release.id },
    });

    expect(currentRelease.status).toBe('publishing');
    expect(currentRelease.publishedAt).toBeNull();
  });
});
