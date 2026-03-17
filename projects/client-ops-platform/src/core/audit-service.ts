import { PrismaClient } from '@prisma/client';

export class AuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async log(params: {
    organizationId?: string;
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata ?? {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  async listRecent(organizationId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
