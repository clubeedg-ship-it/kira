import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('bootstrap implementation artifacts', () => {
  it('includes the roadmap document in the workspace', () => {
    expect(existsSync(resolve('/home/adminuser/kira/docs/client-ops-platform-implementation-roadmap.md'))).toBe(true);
  });

  it('includes an environment example for the new project', () => {
    expect(existsSync(resolve(process.cwd(), '.env.example'))).toBe(true);
  });

  it('includes a seed script for demo data', () => {
    expect(existsSync(resolve(process.cwd(), 'prisma/seed.ts'))).toBe(true);
  });
});
