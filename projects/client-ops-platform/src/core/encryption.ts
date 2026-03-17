import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

let _masterKeyValidated = false;

function getMasterKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_MASTER_KEY must be set and at least 32 characters');
  }
  return key;
}

/**
 * Call at application boot to fail fast if encryption key is missing.
 */
export function validateEncryptionKey(): void {
  getMasterKey();
  _masterKeyValidated = true;
}

function deriveKey(salt: Buffer): Buffer {
  return scryptSync(getMasterKey(), salt, KEY_LENGTH);
}

export function encrypt(plaintext: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decrypt(encoded: string): string {
  const parts = encoded.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted value format');
  }

  const [saltB64, ivB64, authTagB64, ciphertextB64] = parts;
  const salt = Buffer.from(saltB64!, 'base64');
  const iv = Buffer.from(ivB64!, 'base64');
  const authTag = Buffer.from(authTagB64!, 'base64');
  const ciphertext = Buffer.from(ciphertextB64!, 'base64');

  const key = deriveKey(salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

export function maskSecret(value: string): string {
  if (value.length <= 4) return '****';
  return '****' + value.slice(-4);
}
