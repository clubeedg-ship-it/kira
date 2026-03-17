import { PrismaClient, type OrganizationRole } from '@prisma/client';
import { assertCanManageOrganization, assertCanViewOrganization } from './organization-access';
import { resolveAccess } from './access';

export class OrganizationService {
  constructor(private readonly prisma: PrismaClient) {}

  async getOrganizationForUser(params: { organizationId: string; userId: string }) {
    const access = await resolveAccess(this.prisma, params.userId, params.organizationId);
    assertCanViewOrganization(access);

    return this.prisma.organization.findUniqueOrThrow({
      where: { id: params.organizationId },
    });
  }

  async addMember(params: {
    actorUserId: string;
    organizationId: string;
    targetUserId: string;
    role: OrganizationRole;
  }) {
    const access = await resolveAccess(this.prisma, params.actorUserId, params.organizationId);
    assertCanManageOrganization(access);

    return this.prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: params.organizationId,
          userId: params.targetUserId,
        },
      },
      update: { role: params.role },
      create: {
        organizationId: params.organizationId,
        userId: params.targetUserId,
        role: params.role,
      },
    });
  }
}
