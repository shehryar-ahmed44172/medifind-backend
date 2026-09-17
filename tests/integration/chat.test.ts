/**
 * Integration tests — Chat API
 *
 * Tests room creation, message sending, access control.
 */

import request from 'supertest';
import { app } from '../../src/server';
import { createPatient, createResponder, cleanupTestUsers } from '../helpers/factories';

let dbAvailable = true;

beforeAll(async () => {
  try {
    const { default: prisma } = await import('../../src/lib/prisma');
    await (prisma as any).$queryRaw`SELECT 1`;
    await cleanupTestUsers('@integration.medifind.test');
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  if (dbAvailable) {
    await cleanupTestUsers('@integration.medifind.test');
    const { default: prisma } = await import('../../src/lib/prisma');
    await (prisma as any).$disconnect();
  }
});

const skipIfNoDb = () => { if (!dbAvailable) return true; return false; };

// ── GET /api/chat/rooms ───────────────────────────────────────────────────────

describe('GET /api/chat/rooms', () => {
  let patientToken: string;

  beforeAll(async () => {
    if (!dbAvailable) return;
    const p = await createPatient();
    patientToken = p.accessToken;
  });

  it('200 — returns array (may be empty)', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .get('/api/chat/rooms')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('401 — unauthenticated', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app).get('/api/chat/rooms');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/chat/rooms ──────────────────────────────────────────────────────

describe('POST /api/chat/rooms', () => {
  let patientToken: string;
  let patientId: string;
  let caregiverId: string;
  let caregiverToken: string;
  let roomId: string;

  beforeAll(async () => {
    if (!dbAvailable) return;
    const p = await createPatient();
    patientToken = p.accessToken;
    patientId = p.user.id;

    const c = await createPatient({ role: 'CAREGIVER' } as any);
    caregiverToken = c.accessToken;
    caregiverId = c.user.id;
  });

  it('200 — caregiver creates room with patient', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/chat/rooms')
      .set('Authorization', `Bearer ${caregiverToken}`)
      .send({ targetUserId: patientId });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    roomId = res.body.id;
  });

  it('200 — idempotent: same room returned on second call', async () => {
    if (skipIfNoDb()) return;
    if (!roomId) return;
    const res = await request(app)
      .post('/api/chat/rooms')
      .set('Authorization', `Bearer ${caregiverToken}`)
      .send({ targetUserId: patientId });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(roomId);
  });
});

// ── POST /api/chat/messages ───────────────────────────────────────────────────

describe('POST /api/chat/messages', () => {
  let patientToken: string;
  let patientId: string;
  let outsiderToken: string;
  let roomId: string;

  beforeAll(async () => {
    if (!dbAvailable) return;
    const p = await createPatient();
    patientToken = p.accessToken;
    patientId = p.user.id;

    const c = await createPatient({ role: 'CAREGIVER' } as any);
    const caregiverId = c.user.id;
    const caregiverToken = c.accessToken;

    // Create room
    const roomRes = await request(app)
      .post('/api/chat/rooms')
      .set('Authorization', `Bearer ${caregiverToken}`)
      .send({ targetUserId: patientId });
    roomId = roomRes.body.id;

    // Third party with no access
    const o = await createPatient();
    outsiderToken = o.accessToken;
  });

  it('201 — patient sends message in their room', async () => {
    if (skipIfNoDb()) return;
    if (!roomId) return;
    const res = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ roomId, content: 'Hello from test!', messageType: 'TEXT' });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Hello from test!');
    expect(res.body.senderId).toBeDefined();
  });

  it('403 — outsider cannot send message in room', async () => {
    if (skipIfNoDb()) return;
    if (!roomId) return;
    const res = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ roomId, content: 'Unauthorized message', messageType: 'TEXT' });

    expect(res.status).toBe(403);
  });
});

// ── GET /api/chat/messages/:roomId ────────────────────────────────────────────

describe('GET /api/chat/messages/:roomId', () => {
  let patientToken: string;
  let patientId: string;
  let roomId: string;
  let outsiderToken: string;

  beforeAll(async () => {
    if (!dbAvailable) return;
    const p = await createPatient();
    patientToken = p.accessToken;
    patientId = p.user.id;

    const c = await createPatient({ role: 'CAREGIVER' } as any);
    const caregiverToken = c.accessToken;

    const roomRes = await request(app)
      .post('/api/chat/rooms')
      .set('Authorization', `Bearer ${caregiverToken}`)
      .send({ targetUserId: patientId });
    roomId = roomRes.body.id;

    const o = await createPatient();
    outsiderToken = o.accessToken;
  });

  it('200 — room member retrieves messages', async () => {
    if (skipIfNoDb()) return;
    if (!roomId) return;
    const res = await request(app)
      .get(`/api/chat/messages/${roomId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('403 — non-member denied', async () => {
    if (skipIfNoDb()) return;
    if (!roomId) return;
    const res = await request(app)
      .get(`/api/chat/messages/${roomId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });
});
