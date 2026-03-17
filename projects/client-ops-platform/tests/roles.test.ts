import { describe, expect, it } from 'vitest';
import { canEditContent, canManageOrganization, canViewOrganization } from '../src/shared/roles';

describe('organization role permissions', () => {
  it('allows owners and admins to manage organizations', () => {
    expect(canManageOrganization('owner')).toBe(true);
    expect(canManageOrganization('admin')).toBe(true);
    expect(canManageOrganization('editor')).toBe(false);
    expect(canManageOrganization('client')).toBe(false);
  });

  it('allows owners, admins, and editors to edit content', () => {
    expect(canEditContent('owner')).toBe(true);
    expect(canEditContent('admin')).toBe(true);
    expect(canEditContent('editor')).toBe(true);
    expect(canEditContent('viewer')).toBe(false);
    expect(canEditContent('client')).toBe(false);
  });

  it('allows all defined roles to view the organization', () => {
    expect(canViewOrganization('owner')).toBe(true);
    expect(canViewOrganization('admin')).toBe(true);
    expect(canViewOrganization('editor')).toBe(true);
    expect(canViewOrganization('viewer')).toBe(true);
    expect(canViewOrganization('client')).toBe(true);
  });
});
