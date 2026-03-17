import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app';
import { prisma, resetDb, disconnectDb, createUser, createOrganization } from './helpers';

const app = createApp();

describe.sequential('API integration', () => {
  let ownerId: string;
  let orgId: string;

  beforeAll(async () => {
    process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-at-least-32-chars-long!!';
  });

  beforeEach(async () => {
    await resetDb();
    const owner = await createUser('api-owner@test.local');
    const org = await createOrganization('api-org');
    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: owner.id, role: 'owner' },
    });
    ownerId = owner.id;
    orgId = org.id;
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('returns health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get(`/orgs/${orgId}`);
    expect(res.status).toBe(401);
  });

  it('fetches organization for authenticated user', async () => {
    const res = await request(app)
      .get(`/orgs/${orgId}`)
      .set('X-User-Id', ownerId);
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe('api-org');
  });

  it('creates and retrieves branding', async () => {
    const patchRes = await request(app)
      .patch(`/orgs/${orgId}/branding`)
      .set('X-User-Id', ownerId)
      .send({
        companyDisplayName: 'API Test Co',
        primaryColor: '#FF0000',
        contactEmail: 'api@test.co',
      });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.companyDisplayName).toBe('API Test Co');

    const getRes = await request(app)
      .get(`/orgs/${orgId}/branding`)
      .set('X-User-Id', ownerId);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.primaryColor).toBe('#FF0000');
  });

  it('creates a service and lists it', async () => {
    const createRes = await request(app)
      .post(`/orgs/${orgId}/services`)
      .set('X-User-Id', ownerId)
      .send({
        name: 'Website',
        type: 'website',
        status: 'active',
      });
    expect(createRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/orgs/${orgId}/services`)
      .set('X-User-Id', ownerId);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
  });

  it('creates a support request', async () => {
    const res = await request(app)
      .post(`/orgs/${orgId}/support`)
      .set('X-User-Id', ownerId)
      .send({
        subject: 'Fix logo',
        message: 'The logo is too small',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.subject).toBe('Fix logo');
  });

  it('fetches activity feed', async () => {
    // Create a service to generate an activity event
    await request(app)
      .post(`/orgs/${orgId}/services`)
      .set('X-User-Id', ownerId)
      .send({ name: 'Blog', type: 'blog', status: 'setup' });

    const res = await request(app)
      .get(`/orgs/${orgId}/activity`)
      .set('X-User-Id', ownerId);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('creates a deployment target and release', async () => {
    const targetRes = await request(app)
      .post(`/orgs/${orgId}/deployment-targets`)
      .set('X-User-Id', ownerId)
      .send({
        name: 'Local Deploy',
        targetType: 'local_fs',
        config: { path: '/tmp/deploy' },
      });
    expect(targetRes.status).toBe(201);

    const releaseRes = await request(app)
      .post(`/orgs/${orgId}/releases`)
      .set('X-User-Id', ownerId)
      .send({
        sourceType: 'config_export',
        deploymentTargetId: targetRes.body.data.id,
        notes: 'First release',
      });
    expect(releaseRes.status).toBe(201);
    expect(releaseRes.body.data.releaseVersion).toBe(1);
  });

  it('stores deployment secrets with masking', async () => {
    const targetRes = await request(app)
      .post(`/orgs/${orgId}/deployment-targets`)
      .set('X-User-Id', ownerId)
      .send({
        name: 'SFTP Target',
        targetType: 'sftp',
        config: { host: 'sftp.test.com', port: 22, remotePath: '/var/www', username: 'deploy' },
      });

    const secretRes = await request(app)
      .post(`/orgs/${orgId}/deployment-targets/${targetRes.body.data.id}/secrets`)
      .set('X-User-Id', ownerId)
      .send({
        secretKey: 'password',
        value: 'my-secret-pass',
      });
    expect(secretRes.status).toBe(201);
    expect(secretRes.body.data.masked).toBe('****pass');
    expect(secretRes.body.data.secretKey).toBe('password');
  });

  it('creates an integration and sets a secret', async () => {
    const intRes = await request(app)
      .post(`/orgs/${orgId}/integrations`)
      .set('X-User-Id', ownerId)
      .send({
        type: 'ghost',
        name: 'Blog Ghost',
        config: { baseUrl: 'https://blog.test.com' },
      });
    expect(intRes.status).toBe(201);

    const secretRes = await request(app)
      .post(`/orgs/${orgId}/integrations/${intRes.body.data.id}/secrets`)
      .set('X-User-Id', ownerId)
      .send({
        secretKey: 'admin_api_key',
        value: 'ghost-key-xyz',
      });
    expect(secretRes.status).toBe(201);
    expect(secretRes.body.data.masked).toBe('****-xyz');
  });

  it('creates a backup', async () => {
    const res = await request(app)
      .post(`/orgs/${orgId}/backups`)
      .set('X-User-Id', ownerId)
      .send({ kind: 'site_bundle' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('creating');
  });
});
