import type { OrganizationMember, User } from '@prisma/client';
import { AuthorizationError } from './errors';
import { canManageOrganization, canEditContent, canViewOrganization, type OrganizationRole } from '../shared/roles';

export type AccessContext = {
  user: Pick<User, 'id' | 'isPlatformAdmin'>;
  membership?: Pick<OrganizationMember, 'role'> | null;
};

function getRole(context: AccessContext): OrganizationRole | null {
  if (!context.membership) return null;
  return context.membership.role as OrganizationRole;
}

export function assertCanViewOrganization(context: AccessContext): void {
  if (context.user.isPlatformAdmin) return;

  const role = getRole(context);
  if (!role || !canViewOrganization(role)) {
    throw new AuthorizationError('Cannot view organization');
  }
}

export function assertCanEditContent(context: AccessContext): void {
  if (context.user.isPlatformAdmin) return;

  const role = getRole(context);
  if (!role || !canEditContent(role)) {
    throw new AuthorizationError('Cannot edit content');
  }
}

export function assertCanManageOrganization(context: AccessContext): void {
  if (context.user.isPlatformAdmin) return;

  const role = getRole(context);
  if (!role || !canManageOrganization(role)) {
    throw new AuthorizationError('Cannot manage organization');
  }
}
