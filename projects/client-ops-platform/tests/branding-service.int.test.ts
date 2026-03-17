import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { BrandingService } from '../src/core/branding-service';
import { prisma, resetDb, disconnectDb, createOrganization, createUser } from './helpers';

describe.sequential('BrandingService integration', () => {
  const service = new BrandingService(prisma);

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('upserts brand settings for a managed organization', async () => {
    const org = await createOrganization('brand-org');
    const owner = await createUser('brand-owner@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const brand = await service.upsertBrandSettings({
      actorUserId: owner.id,
      organizationId: org.id,
      input: {
        companyDisplayName: 'Brand Org',
        primaryColor: '#111827',
        secondaryColor: '#3B82F6',
        contactEmail: 'hello@brand.org',
      },
    });

    expect(brand.companyDisplayName).toBe('Brand Org');
    expect(brand.primaryColor).toBe('#111827');
  });

  it('builds a published snapshot that excludes draft blocks', async () => {
    const org = await createOrganization('snapshot-org');
    const owner = await createUser('snapshot-owner@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    await service.upsertContentBlock({
      actorUserId: owner.id,
      organizationId: org.id,
      key: 'hero',
      type: 'cta',
      status: 'published',
      value: {
        title: 'Published Hero',
        description: 'Visible',
        cta: { label: 'Start', action: '/start' },
      },
    });

    await service.upsertContentBlock({
      actorUserId: owner.id,
      organizationId: org.id,
      key: 'draft-only',
      type: 'text',
      status: 'draft',
      value: 'Do not publish me',
    });

    const snapshot = await service.buildPublishedSnapshot(org.id);

    expect(Object.keys(snapshot.content)).toContain('hero');
    expect(Object.keys(snapshot.content)).not.toContain('draft-only');
  });

  it('denies non-managers from updating branding', async () => {
    const org = await createOrganization('brand-denied');
    const viewer = await createUser('viewer@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: viewer.id, role: 'viewer' },
    });

    await expect(
      service.upsertBrandSettings({
        actorUserId: viewer.id,
        organizationId: org.id,
        input: {
          companyDisplayName: 'Should Fail',
          primaryColor: '#111827',
        },
      }),
    ).rejects.toThrow('Cannot manage organization');
  });
});
