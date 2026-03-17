import { PrismaClient, type IntegrationStatus, type IntegrationType } from '@prisma/client';
import { assertCanManageOrganization, assertCanViewOrganization } from './organization-access';
import { resolveAccess } from './access';
import { ActivityService } from './activity-service';
import { encrypt, decrypt, maskSecret } from './encryption';

export class IntegrationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly activityService = new ActivityService(prisma),
  ) {}

  async createConnection(params: {
    actorUserId: string;
    organizationId: string;
    type: IntegrationType;
    name: string;
    config?: Record<string, unknown>;
  }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    const connection = await this.prisma.integrationConnection.create({
      data: {
        organizationId: params.organizationId,
        type: params.type,
        name: params.name,
        config: params.config ?? {},
        status: 'disconnected',
      },
    });

    await this.activityService.appendEvent({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      source: 'admin',
      eventType: 'integration_created',
      title: `Integration created: ${connection.name}`,
      metadata: { integrationId: connection.id, type: connection.type },
    });

    return connection;
  }

  async setSecret(params: {
    actorUserId: string;
    organizationId: string;
    integrationConnectionId: string;
    secretKey: string;
    plainValue: string;
  }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    // Verify connection belongs to this org
    await this.prisma.integrationConnection.findFirstOrThrow({
      where: { id: params.integrationConnectionId, organizationId: params.organizationId },
    });

    const encryptedValue = encrypt(params.plainValue);

    const secret = await this.prisma.integrationSecret.upsert({
      where: {
        integrationConnectionId_secretKey: {
          integrationConnectionId: params.integrationConnectionId,
          secretKey: params.secretKey,
        },
      },
      update: { encryptedValue },
      create: {
        integrationConnectionId: params.integrationConnectionId,
        secretKey: params.secretKey,
        encryptedValue,
      },
    });

    return { id: secret.id, secretKey: secret.secretKey, masked: maskSecret(params.plainValue) };
  }

  async getSecretDecrypted(params: {
    actorUserId: string;
    organizationId: string;
    integrationConnectionId: string;
    secretKey: string;
  }): Promise<string> {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    // Verify connection belongs to this org
    await this.prisma.integrationConnection.findFirstOrThrow({
      where: { id: params.integrationConnectionId, organizationId: params.organizationId },
    });

    const secret = await this.prisma.integrationSecret.findUniqueOrThrow({
      where: {
        integrationConnectionId_secretKey: {
          integrationConnectionId: params.integrationConnectionId,
          secretKey: params.secretKey,
        },
      },
    });
    return decrypt(secret.encryptedValue);
  }

  async updateStatus(params: {
    actorUserId: string;
    organizationId: string;
    integrationConnectionId: string;
    status: IntegrationStatus;
    lastError?: string;
  }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    // Verify connection belongs to this org
    await this.prisma.integrationConnection.findFirstOrThrow({
      where: { id: params.integrationConnectionId, organizationId: params.organizationId },
    });

    return this.prisma.integrationConnection.update({
      where: { id: params.integrationConnectionId },
      data: {
        status: params.status,
        lastTestedAt: new Date(),
        lastError: params.lastError ?? null,
      },
    });
  }

  async listConnections(params: { actorUserId: string; organizationId: string }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanViewOrganization(access);

    return this.prisma.integrationConnection.findMany({
      where: { organizationId: params.organizationId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
