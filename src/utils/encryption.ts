import crypto from 'crypto';
import logger from './logger';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;   // 96-bit IV — recommended for GCM
const TAG_BYTES = 16;  // 128-bit auth tag

function getKey(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    logger.warn('ENCRYPTION_KEY not set or invalid — field encryption disabled');
    return null;
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a UTF-8 string with AES-256-GCM.
 * Returns a base64 blob: IV(12) + AuthTag(16) + Ciphertext.
 * If ENCRYPTION_KEY is missing, returns the plaintext unchanged so the app stays functional.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt a value produced by encrypt().
 * Returns plaintext. If the value was not encrypted (key missing at write time), returns it unchanged.
 */
export function decrypt(value: string): string {
  const key = getKey();
  if (!key) return value;

  // If the stored value is shorter than IV + tag it was never encrypted
  const raw = Buffer.from(value, 'base64');
  if (raw.length <= IV_BYTES + TAG_BYTES) return value;

  try {
    const iv        = raw.subarray(0, IV_BYTES);
    const tag       = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const encrypted = raw.subarray(IV_BYTES + TAG_BYTES);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
  } catch {
    // Value was stored before encryption was enabled — return as-is
    return value;
  }
}

/**
 * Encrypt a JSON-serialisable value (array or object).
 * Stores as an encrypted string that can be detected and reversed by decryptJson.
 */
export function encryptJson(value: unknown): string {
  return encrypt(JSON.stringify(value));
}

/**
 * Decrypt a value that was stored by encryptJson.
 * If the value is not a string (already-plain JSON from before encryption was added), returns it unchanged.
 */
export function decryptJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    const plain = decrypt(value);
    return JSON.parse(plain);
  } catch {
    return value;
  }
}
