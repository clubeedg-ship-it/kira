import { describe, expect, it } from 'vitest';
import { assertCanManageOrganization, assertCanViewOrganization } from '../src/core/organization-access';
import { AuthorizationError } from '../src/core/errors';

describe('organization access control', () => {
  const platformAdmin = { user: { id: 'u1', isPlatformAdmin: true }, membership: null };
  const owner = { user: { id: 'u2', isPlatformAdmin: false }, membership: { role: 'owner' } };
  const editor = { user: { id: 'u3', isPlatformAdmin: false }, membership: { role: 'editor' } };
  const outsider = { user: { id: 'u4', isPlatformAdmin: false }, membership: null };

  it('allows platform admins to view and manage any organization', () => {
    expect(() => assertCanViewOrganization(platformAdmin)).not.toThrow();
    expect(() => assertCanManageOrganization(platformAdmin)).not.toThrow();
  });

  it('allows members to view according to role', () => {
    expect(() => assertCanViewOrganization(owner)).not.toThrow();
    expect(() => assertCanViewOrganization(editor)).not.toThrow();
  });

  it('restricts management to owner/admin style roles', () => {
    expect(() => assertCanManageOrganization(owner)).not.toThrow();
    expect(() => assertCanManageOrganization(editor)).toThrow(AuthorizationError);
  });

  it('denies outsiders from viewing organizations', () => {
    expect(() => assertCanViewOrganization(outsider)).toThrow(AuthorizationError);
  });
});
