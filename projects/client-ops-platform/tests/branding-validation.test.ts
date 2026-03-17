import { describe, expect, it } from 'vitest';
import { brandSettingsInputSchema } from '../src/core/branding-service';

describe('branding validation', () => {
  it('accepts valid branding input', () => {
    const parsed = brandSettingsInputSchema.parse({
      companyDisplayName: 'Demo Co',
      primaryColor: '#111827',
      secondaryColor: '#3B82F6',
      contactEmail: 'hello@demo.co',
    });

    expect(parsed.companyDisplayName).toBe('Demo Co');
  });

  it('rejects invalid color values', () => {
    expect(() =>
      brandSettingsInputSchema.parse({
        primaryColor: 'blue',
      }),
    ).toThrow();
  });

  it('rejects invalid email values', () => {
    expect(() =>
      brandSettingsInputSchema.parse({
        contactEmail: 'not-an-email',
      }),
    ).toThrow();
  });
});
