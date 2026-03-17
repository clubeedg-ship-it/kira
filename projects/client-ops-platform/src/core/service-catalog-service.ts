import { PrismaClient, type HealthStatus, type ServiceStatus, type ServiceType } from '@prisma/client';
import { z } from 'zod';
import { assertCanManageOrganization, assertCanViewOrganization } from './organization-access';
import { resolveAccess } from './access';
import { ActivityService } from './activity-service';

const createServiceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  externalUrl: z.string().url().optional(),
});

export class ServiceCatalogService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly activityService = new ActivityService(prisma),
  ) {}

  async createService(params: {
    actorUserId: string;
    organizationId: string;
    name: string;
    type: ServiceType;
    status: ServiceStatus;
    description?: string;
    externalUrl?: string;
    healthStatus?: HealthStatus;
    metadata?: Record<string, unknown>;
  }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    createServiceSchema.parse({
      name: params.name,
      description: params.description,
      externalUrl: params.externalUrl,
    });

    const service = await this.prisma.service.create({
      data: {
        organizationId: params.organizationId,
        name: params.name,
        type: params.type,
        status: params.status,
        description: params.description,
        externalUrl: params.externalUrl,
        healthStatus: params.healthStatus ?? 'unknown',
        metadata: params.metadata ?? {},
        lastUpdatedAt: new Date(),
      },
    });

    await this.activityService.appendEvent({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      source: 'admin',
      eventType: 'service_created',
      title: `Service created: ${service.name}`,
      metadata: { serviceId: service.id, type: service.type },
    });

    return service;
  }

  async updateServiceStatus(params: {
    actorUserId: string;
    organizationId: string;
    serviceId: string;
    status?: ServiceStatus;
    healthStatus?: HealthStatus;
  }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    // Scoped by organizationId to prevent cross-tenant mutation
    const existing = await this.prisma.service.findFirstOrThrow({
      where: { id: params.serviceId, organizationId: params.organizationId },
    });

    const service = await this.prisma.service.update({
      where: { id: params.serviceId },
      data: {
        status: params.status,
        healthStatus: params.healthStatus,
        lastUpdatedAt: new Date(),
        lastCheckedAt: params.healthStatus ? new Date() : undefined,
      },
    });

    await this.activityService.appendEvent({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      source: 'admin',
      eventType: 'service_updated',
      title: `Service updated: ${service.name}`,
      metadata: { serviceId: service.id, status: service.status, healthStatus: service.healthStatus },
    });

    return service;
  }

  async listServices(params: { actorUserId: string; organizationId: string }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanViewOrganization(access);

    return this.prisma.service.findMany({
      where: { organizationId: params.organizationId },
      orderBy: [{ createdAt: 'asc' }],
    });
  }
}
