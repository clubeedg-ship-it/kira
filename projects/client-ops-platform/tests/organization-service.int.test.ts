import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { OrganizationService } from '../src/core/organization-service';
import { prisma, resetDb, disconnectDb, createOrganization, createUser } from './helpers';

describe.sequential('OrganizationService integration', () => {
  const service = new OrganizationService(prisma);

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('allows an owner to add another member', async () => {
    const org = await createOrganization('org-owner-adds');
    const owner = await createUser('owner@test.local');
    const target = await createUser('target@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const member = await service.addMember({
      actorUserId: owner.id,
      organizationId: org.id,
      targetUserId: target.id,
      role: 'client',
    });

    expect(member.role).toBe('client');
  });

  it('denies non-managers from adding members', async () => {
    const org = await createOrganization('org-editor-denied');
    const editor = await createUser('editor@test.local');
    const target = await createUser('target2@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: editor.id, role: 'editor' },
    });

    await expect(
      service.addMember({
        actorUserId: editor.id,
        organizationId: org.id,
        targetUserId: target.id,
        role: 'client',
      }),
    ).rejects.toThrow('Cannot manage organization');
  });

  it('allows a member to fetch their own organization', async () => {
    const org = await createOrganization('org-view');
    const owner = await createUser('viewer-owner@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const result = await service.getOrganizationForUser({
      organizationId: org.id,
      userId: owner.id,
    });

    expect(result.slug).toBe('org-view');
  });
});
