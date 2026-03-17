import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ServiceCatalogService } from '../src/core/service-catalog-service';
import { prisma, resetDb, disconnectDb, createOrganization, createUser } from './helpers';

describe.sequential('ServiceCatalogService integration', () => {
  const service = new ServiceCatalogService(prisma);

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('creates a service and writes an activity event', async () => {
    const org = await createOrganization('services-org');
    const owner = await createUser('services-owner@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const created = await service.createService({
      actorUserId: owner.id,
      organizationId: org.id,
      name: 'Ghost Blog',
      type: 'blog',
      status: 'active',
      healthStatus: 'healthy',
      description: 'Managed blog service',
    });

    const events = await prisma.activityEvent.findMany({ where: { organizationId: org.id } });

    expect(created.name).toBe('Ghost Blog');
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe('service_created');
  });

  it('updates service status and appends another event', async () => {
    const org = await createOrganization('services-update-org');
    const owner = await createUser('services-updater@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const created = await service.createService({
      actorUserId: owner.id,
      organizationId: org.id,
      name: 'Website Ops',
      type: 'website',
      status: 'setup',
    });

    const updated = await service.updateServiceStatus({
      actorUserId: owner.id,
      organizationId: org.id,
      serviceId: created.id,
      status: 'active',
      healthStatus: 'healthy',
    });

    const events = await prisma.activityEvent.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(updated.status).toBe('active');
    expect(updated.healthStatus).toBe('healthy');
    expect(events).toHaveLength(2);
    expect(events[1]?.eventType).toBe('service_updated');
  });

  it('lets viewers list services but not create them', async () => {
    const org = await createOrganization('services-view-org');
    const owner = await createUser('services-owner2@test.local');
    const viewer = await createUser('services-viewer@test.local');

    await prisma.organizationMember.createMany({
      data: [
        { organizationId: org.id, userId: owner.id, role: 'owner' },
        { organizationId: org.id, userId: viewer.id, role: 'viewer' },
      ],
    });

    await service.createService({
      actorUserId: owner.id,
      organizationId: org.id,
      name: 'Support AI',
      type: 'ai_support',
      status: 'active',
    });

    const list = await service.listServices({ actorUserId: viewer.id, organizationId: org.id });

    expect(list).toHaveLength(1);

    await expect(
      service.createService({
        actorUserId: viewer.id,
        organizationId: org.id,
        name: 'Should Fail',
        type: 'custom',
        status: 'active',
      }),
    ).rejects.toThrow('Cannot manage organization');
  });
});
