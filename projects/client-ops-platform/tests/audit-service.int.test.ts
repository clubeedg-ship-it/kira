import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AuditService } from '../src/core/audit-service';
import { prisma, resetDb, disconnectDb, createOrganization, createUser } from './helpers';

describe.sequential('AuditService integration', () => {
  const service = new AuditService(prisma);

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('creates an audit log entry', async () => {
    const org = await createOrganization('audit-org');
    const owner = await createUser('audit-owner@test.local');

    const entry = await service.log({
      organizationId: org.id,
      actorUserId: owner.id,
      action: 'update_branding',
      entityType: 'BrandSettings',
      entityId: 'bs-123',
      metadata: { field: 'primaryColor', oldValue: '#000', newValue: '#111' },
      ipAddress: '192.168.1.1',
    });

    expect(entry.action).toBe('update_branding');
    expect(entry.entityType).toBe('BrandSettings');
  });

  it('lists recent audit logs in descending order', async () => {
    const org = await createOrganization('audit-list-org');
    const owner = await createUser('audit-list@test.local');

    await service.log({ organizationId: org.id, actorUserId: owner.id, action: 'first', entityType: 'Test' });
    await service.log({ organizationId: org.id, actorUserId: owner.id, action: 'second', entityType: 'Test' });
    await service.log({ organizationId: org.id, actorUserId: owner.id, action: 'third', entityType: 'Test' });

    const logs = await service.listRecent(org.id, 2);

    expect(logs).toHaveLength(2);
    expect(logs[0]?.action).toBe('third');
    expect(logs[1]?.action).toBe('second');
  });
});
