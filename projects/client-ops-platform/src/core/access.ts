import { PrismaClient } from '@prisma/client';
import type { AccessContext } from './organization-access';

/**
 * Shared access resolution. Used by all org-scoped services.
 * Eliminates the duplicated getAccess() pattern.
 */
export async function resolveAccess(
  prisma: PrismaClient,
  actorUserId: string,
  organizationId: string,
): Promise<AccessContext> {
  const [user, membership] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: actorUserId },
      select: { id: true, isPlatformAdmin: true },
    }),
    prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: actorUserId,
        },
      },
      select: { role: true },
    }),
  ]);

  return { user, membership };
}
