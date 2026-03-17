import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const schemaPath = resolve(process.cwd(), 'prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('prisma schema shape', () => {
  it('defines the core multi-tenant models', () => {
    expect(schema).toContain('model Organization {');
    expect(schema).toContain('model User {');
    expect(schema).toContain('model OrganizationMember {');
    expect(schema).toContain('model BrandSettings {');
    expect(schema).toContain('model ContentBlock {');
    expect(schema).toContain('model DeploymentTarget {');
    expect(schema).toContain('model SiteRelease {');
    expect(schema).toContain('model AuditLog {');
  });

  it('enforces key uniqueness constraints', () => {
    expect(schema).toContain('@@unique([organizationId, userId])');
    expect(schema).toContain('@@unique([organizationId, key])');
    expect(schema).toContain('@@unique([organizationId, releaseVersion])');
  });

  it('contains controlled enums for critical lifecycle state', () => {
    expect(schema).toContain('enum OrganizationRole');
    expect(schema).toContain('enum DeploymentJobStatus');
    expect(schema).toContain('enum ReleaseStatus');
    expect(schema).toContain('enum BackupStatus');
  });
});
