import { describe, expect, it, beforeAll } from 'vitest';
import { encrypt, decrypt, maskSecret } from '../src/core/encryption';

beforeAll(() => {
  process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-at-least-32-chars-long!!';
});

describe('encryption helper', () => {
  it('encrypts and decrypts a secret round-trip', () => {
    const secret = 'my-sftp-password-123';
    const encrypted = encrypt(secret);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(secret);
    expect(encrypted).not.toBe(secret);
    expect(encrypted).toContain(':');
  });

  it('produces different ciphertext for the same input', () => {
    const secret = 'same-value';
    const a = encrypt(secret);
    const b = encrypt(secret);

    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(secret);
    expect(decrypt(b)).toBe(secret);
  });

  it('masks secrets correctly', () => {
    expect(maskSecret('my-long-secret-key')).toBe('****-key');
    expect(maskSecret('ab')).toBe('****');
  });

  it('throws on invalid encrypted format', () => {
    expect(() => decrypt('garbage')).toThrow('Invalid encrypted value format');
  });
});
