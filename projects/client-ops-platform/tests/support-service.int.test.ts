import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { SupportService } from '../src/core/support-service';
import { prisma, resetDb, disconnectDb, createOrganization, createUser } from './helpers';

describe.sequential('SupportService integration', () => {
  const service = new SupportService(prisma);

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('allows a client member to create a support request and logs activity', async () => {
    const org = await createOrganization('support-org');
    const client = await createUser('support-client@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: client.id, role: 'client' },
    });

    const request = await service.createRequest({
      actorUserId: client.id,
      organizationId: org.id,
      subject: 'Need homepage copy change',
      message: 'Please update the hero title this afternoon.',
      priority: 'high',
    });

    const events = await prisma.activityEvent.findMany({ where: { organizationId: org.id } });

    expect(request.subject).toContain('homepage copy');
    expect(request.priority).toBe('high');
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe('support_request_created');
  });

  it('allows an owner to resolve a request', async () => {
    const org = await createOrganization('support-resolve-org');
    const owner = await createUser('support-owner@test.local');
    const client = await createUser('support-client2@test.local');

    await prisma.organizationMember.createMany({
      data: [
        { organizationId: org.id, userId: owner.id, role: 'owner' },
        { organizationId: org.id, userId: client.id, role: 'client' },
      ],
    });

    const request = await service.createRequest({
      actorUserId: client.id,
      organizationId: org.id,
      subject: 'Add blog CTA',
      message: 'Need CTA block on blog page.',
    });

    const updated = await service.updateRequestStatus({
      actorUserId: owner.id,
      organizationId: org.id,
      requestId: request.id,
      status: 'resolved',
      assignedToUserId: owner.id,
    });

    expect(updated.status).toBe('resolved');
    expect(updated.assignedToUserId).toBe(owner.id);
    expect(updated.resolvedAt).not.toBeNull();
  });

  it('denies clients from changing support request status', async () => {
    const org = await createOrganization('support-deny-org');
    const owner = await createUser('support-owner2@test.local');
    const client = await createUser('support-client3@test.local');

    await prisma.organizationMember.createMany({
      data: [
        { organizationId: org.id, userId: owner.id, role: 'owner' },
        { organizationId: org.id, userId: client.id, role: 'client' },
      ],
    });

    const request = await service.createRequest({
      actorUserId: client.id,
      organizationId: org.id,
      subject: 'Need footer edits',
      message: 'Please update the footer links.',
    });

    await expect(
      service.updateRequestStatus({
        actorUserId: client.id,
        organizationId: org.id,
        requestId: request.id,
        status: 'in_progress',
      }),
    ).rejects.toThrow('Cannot manage organization');
  });
});
