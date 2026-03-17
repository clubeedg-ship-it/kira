import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('infrastructure bootstrap files', () => {
  const composePath = resolve(process.cwd(), 'docker-compose.yml');

  it('includes a docker compose file for postgres', () => {
    expect(existsSync(composePath)).toBe(true);
  });

  it('defines a postgres service in docker compose', () => {
    const compose = readFileSync(composePath, 'utf8');
    expect(compose).toContain('postgres:');
    expect(compose).toContain('POSTGRES_DB: clientops');
    expect(compose).toContain('POSTGRES_USER: clientops');
  });
});
