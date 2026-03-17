import { PrismaClient, type SupportPriority, type SupportStatus } from '@prisma/client';
import { z } from 'zod';
import { assertCanManageOrganization, assertCanViewOrganization } from './organization-access';
import { resolveAccess } from './access';
import { ActivityService } from './activity-service';

const createRequestSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

export class SupportService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly activityService = new ActivityService(prisma),
  ) {}

  async createRequest(params: {
    actorUserId: string;
    organizationId: string;
    subject: string;
    message: string;
    priority?: SupportPriority;
    channel?: string;
  }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanViewOrganization(access);

    createRequestSchema.parse({
      subject: params.subject,
      message: params.message,
    });

    const request = await this.prisma.supportRequest.create({
      data: {
        organizationId: params.organizationId,
        createdByUserId: params.actorUserId,
        subject: params.subject,
        message: params.message,
        priority: params.priority ?? 'normal',
        channel: params.channel ?? 'dashboard',
      },
    });

    await this.activityService.appendEvent({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      source: 'client',
      eventType: 'support_request_created',
      title: `Support request created: ${request.subject}`,
      metadata: { supportRequestId: request.id, priority: request.priority },
    });

    return request;
  }

  async updateRequestStatus(params: {
    actorUserId: string;
    organizationId: string;
    requestId: string;
    status: SupportStatus;
    assignedToUserId?: string;
  }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    // Scoped by organizationId to prevent cross-tenant mutation
    await this.prisma.supportRequest.findFirstOrThrow({
      where: { id: params.requestId, organizationId: params.organizationId },
    });

    const request = await this.prisma.supportRequest.update({
      where: { id: params.requestId },
      data: {
        status: params.status,
        assignedToUserId: params.assignedToUserId,
        resolvedAt: params.status === 'resolved' || params.status === 'closed' ? new Date() : null,
      },
    });

    await this.activityService.appendEvent({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      source: 'admin',
      eventType: 'support_request_updated',
      title: `Support request updated: ${request.subject}`,
      metadata: { supportRequestId: request.id, status: request.status },
    });

    return request;
  }

  async listRequests(params: { actorUserId: string; organizationId: string }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanViewOrganization(access);

    return this.prisma.supportRequest.findMany({
      where: { organizationId: params.organizationId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }
}
