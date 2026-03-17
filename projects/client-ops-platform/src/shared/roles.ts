export const ORG_ROLES = ['owner', 'admin', 'editor', 'viewer', 'client'] as const;
export type OrganizationRole = (typeof ORG_ROLES)[number];

export function canManageOrganization(role: OrganizationRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canEditContent(role: OrganizationRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor';
}

export function canViewOrganization(role: OrganizationRole): boolean {
  return ORG_ROLES.includes(role);
}
