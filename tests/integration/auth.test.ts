/**
 * Integration tests — Authentication API
 *
 * These tests hit a real database. Requires DATABASE_URL to be set.
 * Run: npm test -- --testPathPattern=integration/auth
 */

import request from 'supertest';
import { app } from '../../src/server';
import { cleanupTestUsers } from '../helpers/factories';

// ── Skip integration tests if DB not available ────────────────────────────────
let dbAvailable = true;
beforeAll(async () => {
  try {
    const { default: prisma } = await import('../../src/lib/prisma');
    await (prisma as any).$queryRaw`SELECT 1`;
    // Pre-run cleanup: remove any stale test data from previous crashed runs
    await cleanupTestUsers('@medifind.test');
  } catch {
    dbAvailable = false;
    console.warn('⚠️  Skipping integration/auth: no database connection');
  }
});

afterAll(async () => {
  if (dbAvailable) {
    await cleanupTestUsers('@medifind.test');
    const { default: prisma } = await import('../../src/lib/prisma');
    await (prisma as any).$disconnect();
  }
});

const skipIfNoDb = () => {
  if (!dbAvailable) return true;
  return false;
};

// ── Test data ─────────────────────────────────────────────────────────────────
const ts = Date.now();
const testUser = {
  fullName: 'Integration Test Patient',
  email: `integration-auth-${ts}@medifind.test`,
  phoneNumber: `+923${ts.toString().slice(-9)}`,
  password: 'TestPass@Integration1',
  role: 'PATIENT',
};

let userId: string;
let accessToken: string;
let refreshToken: string;

// ── POST /api/auth/register ───────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('201 — creates a new PATIENT account', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('userId');
    userId = res.body.data.userId;
  });

  it('400 — duplicate email', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('400 — missing required fields', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'incomplete@medifind.test' });

    expect(res.status).toBe(400);
  });

  it('400 — invalid email format', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testUser, email: 'not-an-email', phoneNumber: '+923001111222' });

    expect(res.status).toBe(400);
  });
});

// ── POST /api/auth/verify-email ───────────────────────────────────────────────

describe('POST /api/auth/verify-email', () => {
  it('400 — wrong OTP', async () => {
    if (skipIfNoDb()) return;
    if (!userId) pending('No userId from registration');
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ userId, otp: '000000' });

    expect(res.status).toBe(400);
  });
});

// ── POST /api/auth/login — before verification ────────────────────────────────

describe('POST /api/auth/login (unverified)', () => {
  it('403 — email not verified', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/verify/i);
  });
});

// ── Manually verify email and login ──────────────────────────────────────────

describe('POST /api/auth/login (verified)', () => {
  beforeAll(async () => {
    if (!dbAvailable || !userId) return;
    // Force-verify email for integration test
    const { default: prisma } = await import('../../src/lib/prisma');
    await (prisma.user as any).update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });
  });

  it('200 — returns accessToken and refreshToken', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('401 — wrong password', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
  });

  it('401 — non-existent email', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@medifind.test', password: 'anypass' });

    expect(res.status).toBe(401);
  });
});

// ── GET /api/users/profile ────────────────────────────────────────────────────

describe('GET /api/users/profile', () => {
  it('200 — authenticated request returns profile', async () => {
    if (skipIfNoDb()) return;
    if (!accessToken) pending('No access token');
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(testUser.email);
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('401 — no token', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app).get('/api/users/profile');
    expect(res.status).toBe(401);
  });

  it('401 — malformed token', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/auth/refresh-token ──────────────────────────────────────────────

describe('POST /api/auth/refresh-token', () => {
  it('200 — returns new token pair', async () => {
    if (skipIfNoDb()) return;
    if (!refreshToken) pending('No refresh token');
    const res = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('401 — invalid refresh token', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken: 'not.a.real.token' });

    expect(res.status).toBe(401);
  });
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  it('200 — registered email (no enumeration leak)', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Should not reveal whether email exists
    expect(res.body.message).toMatch(/sent|check|registered/i);
  });

  it('200 — unknown email (no enumeration leak)', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@medifind.test' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('200 — invalidates refresh token', async () => {
    if (skipIfNoDb()) return;
    if (!refreshToken) pending('No refresh token');
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken });

    expect(res.status).toBe(200);
  });

  it('401 — using revoked refresh token after logout', async () => {
    if (skipIfNoDb()) return;
    if (!refreshToken) pending('No refresh token');
    const res = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken });

    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/users/upgrade ──────────────────────────────────────────────────

describe('PATCH /api/users/upgrade', () => {
  let freshToken: string;

  beforeAll(async () => {
    if (!dbAvailable) return;
    // Re-login after logout
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    freshToken = res.body.data?.accessToken;
  });

  it('200 — patient upgrades to PROFESSIONAL', async () => {
    if (skipIfNoDb()) return;
    if (!freshToken) pending('No fresh token');
    const res = await request(app)
      .patch('/api/users/upgrade')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({ plan: 'PROFESSIONAL' });

    expect(res.status).toBe(200);
  });

  it('400 — invalid plan name', async () => {
    if (skipIfNoDb()) return;
    if (!freshToken) return;
    const res = await request(app)
      .patch('/api/users/upgrade')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({ plan: 'DIAMOND' });

    expect(res.status).toBe(400);
  });
});

// ── DELETE /api/users/me ──────────────────────────────────────────────────────

describe('DELETE /api/users/me', () => {
  let deleteToken: string;

  beforeAll(async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    deleteToken = res.body.data?.accessToken;
  });

  it('200 — patient deletes own account', async () => {
    if (skipIfNoDb()) return;
    if (!deleteToken) return;
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${deleteToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('401 — subsequent login fails after self-delete', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(401);
  });
});
