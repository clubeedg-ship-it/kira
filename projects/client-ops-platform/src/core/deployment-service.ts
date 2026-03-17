import { PrismaClient, type DeploymentJobStatus, type DeploymentJobType, type DeploymentTargetType, type ReleaseSourceType, type ReleaseStatus } from '@prisma/client';
import { z } from 'zod';
import { assertCanManageOrganization } from './organization-access';
import { resolveAccess } from './access';
import { ActivityService } from './activity-service';
import { encrypt, decrypt, maskSecret } from './encryption';

const deploymentTargetConfigSchemas: Record<DeploymentTargetType, z.ZodTypeAny> = {
  hostnet: z.object({
    host: z.string().min(1),
    remotePath: z.string().min(1),
    username: z.string().min(1),
    protocol: z.enum(['sftp', 'ftp']).default('sftp'),
  }),
  hostinger: z.object({
    host: z.string().min(1),
    remotePath: z.string().min(1),
    username: z.string().min(1),
    protocol: z.enum(['sftp', 'ftp']).default('sftp'),
  }),
  sftp: z.object({
    host: z.string().min(1),
    port: z.number().int().default(22),
    remotePath: z.string().min(1),
    username: z.string().min(1),
  }),
  local_fs: z.object({
    path: z.string().min(1),
  }),
  git: z.object({
    repoUrl: z.string().url(),
    branch: z.string().default('main'),
    remotePath: z.string().optional(),
  }),
};

const VALID_JOB_TRANSITIONS: Record<string, DeploymentJobStatus[]> = {
  queued: ['running', 'cancelled'],
  running: ['success', 'failed', 'cancelled'],
  success: [],
  failed: [],
  cancelled: [],
};

const VALID_RELEASE_TRANSITIONS: Record<string, ReleaseStatus[]> = {
  draft: ['publishing'],
  publishing: ['published', 'failed'],
  published: ['rolled_back'],
  failed: ['publishing', 'draft'],
  rolled_back: ['draft'],
};

export class DeploymentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly activityService = new ActivityService(prisma),
  ) {}

  async createTarget(params: {
    actorUserId: string;
    organizationId: string;
    name: string;
    targetType: DeploymentTargetType;
    config: Record<string, unknown>;
    isPrimary?: boolean;
  }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    const schema = deploymentTargetConfigSchemas[params.targetType];
    const validatedConfig = schema.parse(params.config);

    const target = await this.prisma.deploymentTarget.create({
      data: {
        organizationId: params.organizationId,
        name: params.name,
        targetType: params.targetType,
        config: validatedConfig,
        isPrimary: params.isPrimary ?? false,
      },
    });

    await this.activityService.appendEvent({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      source: 'admin',
      eventType: 'deployment_target_created',
      title: `Deployment target created: ${target.name}`,
      metadata: { targetId: target.id, type: target.targetType },
    });

    return target;
  }

  async setTargetSecret(params: {
    actorUserId: string;
    organizationId: string;
    deploymentTargetId: string;
    secretKey: string;
    plainValue: string;
  }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    // Verify target belongs to this org
    await this.prisma.deploymentTarget.findFirstOrThrow({
      where: { id: params.deploymentTargetId, organizationId: params.organizationId },
    });

    const encryptedValue = encrypt(params.plainValue);

    const secret = await this.prisma.deploymentTargetSecret.upsert({
      where: {
        deploymentTargetId_secretKey: {
          deploymentTargetId: params.deploymentTargetId,
          secretKey: params.secretKey,
        },
      },
      update: { encryptedValue },
      create: {
        deploymentTargetId: params.deploymentTargetId,
        secretKey: params.secretKey,
        encryptedValue,
      },
    });

    await this.activityService.appendEvent({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      source: 'admin',
      eventType: 'deployment_secret_updated',
      title: `Deployment secret updated: ${params.secretKey}`,
      metadata: { targetId: params.deploymentTargetId, secretKey: params.secretKey },
    });

    return { id: secret.id, secretKey: secret.secretKey, masked: maskSecret(params.plainValue) };
  }

  async getTargetSecretDecrypted(params: {
    actorUserId: string;
    organizationId: string;
    deploymentTargetId: string;
    secretKey: string;
  }): Promise<string> {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    // Verify target belongs to this org
    await this.prisma.deploymentTarget.findFirstOrThrow({
      where: { id: params.deploymentTargetId, organizationId: params.organizationId },
    });

    const secret = await this.prisma.deploymentTargetSecret.findUniqueOrThrow({
      where: {
        deploymentTargetId_secretKey: {
          deploymentTargetId: params.deploymentTargetId,
          secretKey: params.secretKey,
        },
      },
    });

    return decrypt(secret.encryptedValue);
  }

  async createRelease(params: {
    actorUserId: string;
    organizationId: string;
    deploymentTargetId?: string;
    sourceType: ReleaseSourceType;
    notes?: string;
  }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    // Atomic version increment using transaction
    const release = await this.prisma.$transaction(async (tx) => {
      const lastRelease = await tx.siteRelease.findFirst({
        where: { organizationId: params.organizationId },
        orderBy: { releaseVersion: 'desc' },
        select: { releaseVersion: true },
      });

      const nextVersion = (lastRelease?.releaseVersion ?? 0) + 1;

      return tx.siteRelease.create({
        data: {
          organizationId: params.organizationId,
          deploymentTargetId: params.deploymentTargetId,
          releaseVersion: nextVersion,
          status: 'draft',
          sourceType: params.sourceType,
          notes: params.notes,
          createdById: params.actorUserId,
        },
      });
    });

    await this.activityService.appendEvent({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      source: 'admin',
      eventType: 'release_created',
      title: `Release v${release.releaseVersion} created`,
      metadata: { releaseId: release.id, version: release.releaseVersion },
    });

    return release;
  }

  async transitionReleaseStatus(params: {
    releaseId: string;
    organizationId: string;
    newStatus: ReleaseStatus;
  }) {
    // Scoped by organizationId to prevent cross-tenant mutation
    const release = await this.prisma.siteRelease.findFirstOrThrow({
      where: { id: params.releaseId, organizationId: params.organizationId },
    });

    const allowed = VALID_RELEASE_TRANSITIONS[release.status];
    if (!allowed || !allowed.includes(params.newStatus)) {
      throw new Error(`Cannot transition release from ${release.status} to ${params.newStatus}`);
    }

    return this.prisma.siteRelease.update({
      where: { id: params.releaseId },
      data: {
        status: params.newStatus,
        publishedAt: params.newStatus === 'published' ? new Date() : undefined,
      },
    });
  }

  async createDeploymentJob(params: {
    actorUserId: string;
    organizationId: string;
    deploymentTargetId: string;
    siteReleaseId?: string;
    jobType: DeploymentJobType;
  }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    // Verify target belongs to this org
    await this.prisma.deploymentTarget.findFirstOrThrow({
      where: { id: params.deploymentTargetId, organizationId: params.organizationId },
    });

    const job = await this.prisma.deploymentJob.create({
      data: {
        organizationId: params.organizationId,
        deploymentTargetId: params.deploymentTargetId,
        siteReleaseId: params.siteReleaseId,
        jobType: params.jobType,
        status: 'queued',
      },
    });

    await this.activityService.appendEvent({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      source: 'system',
      eventType: 'deployment_job_queued',
      title: `Deployment job queued: ${params.jobType}`,
      metadata: { jobId: job.id, jobType: params.jobType },
    });

    return job;
  }

  async transitionJobStatus(params: {
    jobId: string;
    organizationId: string;
    newStatus: DeploymentJobStatus;
    errorMessage?: string;
    logExcerpt?: string;
  }) {
    // Scoped by organizationId to prevent cross-tenant mutation
    const job = await this.prisma.deploymentJob.findFirstOrThrow({
      where: { id: params.jobId, organizationId: params.organizationId },
    });

    const allowed = VALID_JOB_TRANSITIONS[job.status];
    if (!allowed || !allowed.includes(params.newStatus)) {
      throw new Error(`Cannot transition job from ${job.status} to ${params.newStatus}`);
    }

    const isTerminal = ['success', 'failed', 'cancelled'].includes(params.newStatus);

    return this.prisma.deploymentJob.update({
      where: { id: params.jobId },
      data: {
        status: params.newStatus,
        startedAt: params.newStatus === 'running' ? new Date() : undefined,
        finishedAt: isTerminal ? new Date() : undefined,
        errorMessage: params.errorMessage,
        logExcerpt: params.logExcerpt,
      },
    });
  }
}
