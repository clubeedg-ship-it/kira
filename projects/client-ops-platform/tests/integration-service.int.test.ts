import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { IntegrationService } from '../src/core/integration-service';
import { prisma, resetDb, disconnectDb, createOrganization, createUser } from './helpers';

beforeAll(() => {
  process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-at-least-32-chars-long!!';
});

describe.sequential('IntegrationService integration', () => {
  const service = new IntegrationService(prisma);

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('creates a Ghost integration connection', async () => {
    const org = await createOrganization('ghost-org');
    const owner = await createUser('ghost-owner@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const connection = await service.createConnection({
      actorUserId: owner.id,
      organizationId: org.id,
      type: 'ghost',
      name: 'Client Blog',
      config: { baseUrl: 'https://blog.client.com', adminUrl: 'https://blog.client.com/ghost' },
    });

    expect(connection.type).toBe('ghost');
    expect(connection.status).toBe('disconnected');
  });

  it('stores and retrieves encrypted integration secrets', async () => {
    const org = await createOrganization('int-secret-org');
    const owner = await createUser('int-secret-owner@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const connection = await service.createConnection({
      actorUserId: owner.id,
      organizationId: org.id,
      type: 'ghost',
      name: 'Blog',
    });

    const result = await service.setSecret({
      actorUserId: owner.id,
      organizationId: org.id,
      integrationConnectionId: connection.id,
      secretKey: 'admin_api_key',
      plainValue: 'ghost-admin-key-abc123',
    });

    expect(result.masked).toBe('****c123');

    const decrypted = await service.getSecretDecrypted({
      actorUserId: owner.id,
      organizationId: org.id,
      integrationConnectionId: connection.id,
      secretKey: 'admin_api_key',
    });
    expect(decrypted).toBe('ghost-admin-key-abc123');
  });

  it('updates integration status after health test', async () => {
    const org = await createOrganization('int-health-org');
    const owner = await createUser('int-health@test.local');

    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });

    const connection = await service.createConnection({
      actorUserId: owner.id,
      organizationId: org.id,
      type: 'retell',
      name: 'AI Support',
    });

    const updated = await service.updateStatus({
      actorUserId: owner.id,
      organizationId: org.id,
      integrationConnectionId: connection.id,
      status: 'connected',
    });

    expect(updated.status).toBe('connected');
    expect(updated.lastTestedAt).not.toBeNull();
  });
});
