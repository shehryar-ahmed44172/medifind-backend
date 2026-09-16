/**
 * Unit tests — password utilities
 *
 * Tests bcrypt hashing and verification.
 * No database required.
 */

import { hashPassword, verifyPassword } from '../../../src/utils/password';

describe('hashPassword', () => {
  it('returns a non-empty string', async () => {
    const hash = await hashPassword('TestPass@123');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('returns a bcrypt hash (starts with $2b$)', async () => {
    const hash = await hashPassword('TestPass@123');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('produces different hashes for the same password (salt)', async () => {
    const h1 = await hashPassword('SamePassword!');
    const h2 = await hashPassword('SamePassword!');
    expect(h1).not.toBe(h2);
  });

  it('hashes an empty string without throwing', async () => {
    await expect(hashPassword('')).resolves.toBeDefined();
  });

  it('hashes a very long password without throwing', async () => {
    const longPass = 'A'.repeat(512);
    await expect(hashPassword(longPass)).resolves.toBeDefined();
  });
});

describe('verifyPassword', () => {
  let hash: string;
  const password = 'CorrectHorse@42';

  beforeAll(async () => {
    hash = await hashPassword(password);
  });

  it('returns true for the correct password', async () => {
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  it('returns false for an incorrect password', async () => {
    const result = await verifyPassword('WrongPassword!', hash);
    expect(result).toBe(false);
  });

  it('returns false for an empty string against a real hash', async () => {
    const result = await verifyPassword('', hash);
    expect(result).toBe(false);
  });

  it('is case-sensitive', async () => {
    const result = await verifyPassword('correcthorse@42', hash);
    expect(result).toBe(false);
  });

  it('returns false when the hash is malformed', async () => {
    const result = await verifyPassword(password, 'not-a-bcrypt-hash');
    expect(result).toBe(false);
  });
});
