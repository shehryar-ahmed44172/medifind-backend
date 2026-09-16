/**
 * Unit tests — JWT utilities
 *
 * Tests token generation, verification, and expiry logic.
 * No database required.
 */

import { generateAccessToken, generateRefreshToken, decodeToken, verifyToken } from '../../../src/utils/jwt';

// Set a known JWT_SECRET for deterministic tests
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-testing-purposes';
process.env.JWT_EXPIRATION = '1h';
process.env.JWT_REFRESH_EXPIRATION = '7d';

const validPayload = {
  userId: 'user-123',
  email: 'test@medifind.test',
  role: 'PATIENT' as const,
};

// ── generateAccessToken ───────────────────────────────────────────────────────

describe('generateAccessToken', () => {
  it('returns a non-empty string', () => {
    const token = generateAccessToken(validPayload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('produces three JWT segments separated by dots', () => {
    const token = generateAccessToken(validPayload);
    expect(token.split('.')).toHaveLength(3);
  });

  it('embeds the correct userId, email, and role', () => {
    const token = generateAccessToken(validPayload);
    const decoded = decodeToken(token);
    expect(decoded).not.toBeNull();
    expect((decoded as any).userId).toBe(validPayload.userId);
    expect((decoded as any).email).toBe(validPayload.email);
    expect((decoded as any).role).toBe(validPayload.role);
  });

  it('generates tokens for different users that are distinct', () => {
    const t1 = generateAccessToken({ userId: 'user-A', email: 'a@test.com', role: 'PATIENT' });
    const t2 = generateAccessToken({ userId: 'user-B', email: 'b@test.com', role: 'RESPONDER' });
    expect(t1).not.toBe(t2);
    const d1 = decodeToken(t1) as any;
    const d2 = decodeToken(t2) as any;
    expect(d1.userId).toBe('user-A');
    expect(d2.userId).toBe('user-B');
  });
});

// ── generateRefreshToken ──────────────────────────────────────────────────────

describe('generateRefreshToken', () => {
  it('returns a non-empty string', () => {
    const token = generateRefreshToken(validPayload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('produces a valid JWT', () => {
    const token = generateRefreshToken(validPayload);
    const decoded = decodeToken(token);
    expect(decoded).not.toBeNull();
    expect((decoded as any).userId).toBe(validPayload.userId);
  });

  it('access token and refresh token are different', () => {
    const access = generateAccessToken(validPayload);
    const refresh = generateRefreshToken(validPayload);
    expect(access).not.toBe(refresh);
  });
});

// ── decodeToken ───────────────────────────────────────────────────────────────

describe('decodeToken', () => {
  it('returns the payload for a valid token', () => {
    const token = generateAccessToken(validPayload);
    const decoded = decodeToken(token);
    expect(decoded).not.toBeNull();
    expect((decoded as any).userId).toBe('user-123');
    expect((decoded as any).role).toBe('PATIENT');
  });

  it('returns null for an invalid token string', () => {
    const decoded = decodeToken('not.a.jwt');
    expect(decoded).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(decodeToken('')).toBeNull();
  });

  it('returns null for a token signed with a different secret (verifyToken)', () => {
    // decodeToken uses jwt.decode() and does NOT verify signatures.
    // Use verifyToken (jwt.verify) to test signature validation.
    const token = generateAccessToken(validPayload);
    const parts = token.split('.');
    parts[2] = 'tampered-signature';
    const tampered = parts.join('.');
    expect(verifyToken(tampered)).toBeNull();
  });

  it('includes standard JWT fields (iat, exp)', () => {
    const token = generateAccessToken(validPayload);
    const decoded = decodeToken(token) as any;
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });
});
