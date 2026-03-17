import { PrismaClient } from '@prisma/client';

export class ActivityService {
  constructor(private readonly prisma: PrismaClient) {}

  async appendEvent(params: {
    organizationId: string;
    actorUserId?: string;
    source: string;
    eventType: string;
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.activityEvent.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        source: params.source,
        eventType: params.eventType,
        title: params.title,
        description: params.description,
        metadata: params.metadata ?? {},
      },
    });
  }

  async listRecent(organizationId: string, limit = 20) {
    return this.prisma.activityEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
