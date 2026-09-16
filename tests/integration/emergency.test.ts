/**
 * Integration tests — Emergency API
 *
 * Tests the full SOS lifecycle: create, cancel, accept, resolve, rate.
 * Requires a real database.
 */

import request from 'supertest';
import { app } from '../../src/server';
import {
  createPatient,
  createResponder,
  createEmergency,
  cleanupTestUsers,
} from '../helpers/factories';

let dbAvailable = true;

beforeAll(async () => {
  try {
    const { default: prisma } = await import('../../src/lib/prisma');
    await (prisma as any).$queryRaw`SELECT 1`;
    await cleanupTestUsers('@medifind.test');
  } catch {
    dbAvailable = false;
    console.warn('⚠️  Skipping integration/emergency: no database connection');
  }
});

afterAll(async () => {
  if (dbAvailable) {
    await cleanupTestUsers('@medifind.test');
    const { default: prisma } = await import('../../src/lib/prisma');
    await (prisma as any).$disconnect();
  }
});

const skipIfNoDb = () => { if (!dbAvailable) return true; return false; };

// ── POST /api/emergencies ─────────────────────────────────────────────────────

describe('POST /api/emergencies', () => {
  let patientToken: string;
  let responderToken: string;

  beforeAll(async () => {
    if (!dbAvailable) return;
    const p = await createPatient();
    patientToken = p.accessToken;
    const r = await createResponder();
    responderToken = r.accessToken;
  });

  it('201 — patient creates SOS emergency', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/emergencies')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        emergencyType: 'MEDICAL',
        latitude: 31.5204,
        longitude: 74.3587,
        additionalInfo: 'Chest pain',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data).toHaveProperty('cancellationWindowSeconds');
    expect(res.body.data.cancellationWindowSeconds).toBeGreaterThan(0);
  });

  it('400 — missing latitude', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/emergencies')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ emergencyType: 'MEDICAL', longitude: 74.3587 });

    expect(res.status).toBe(400);
  });

  it('403 — responder cannot create emergency', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/emergencies')
      .set('Authorization', `Bearer ${responderToken}`)
      .send({ emergencyType: 'MEDICAL', latitude: 31.52, longitude: 74.36 });

    expect(res.status).toBe(403);
  });

  it('401 — unauthenticated request', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/emergencies')
      .send({ emergencyType: 'MEDICAL', latitude: 31.52, longitude: 74.36 });

    expect(res.status).toBe(401);
  });
});

// ── POST /api/emergencies/:id/cancel ─────────────────────────────────────────

describe('POST /api/emergencies/:id/cancel', () => {
  let patientToken: string;
  let patientId: string;
  let emergencyId: string;

  beforeAll(async () => {
    if (!dbAvailable) return;
    const { user, accessToken } = await createPatient();
    patientToken = accessToken;
    patientId = user.id;

    const em = await createEmergency({ patientId, status: 'ACTIVE' });
    emergencyId = em.id;
  });

  it('200 — cancels within the window', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post(`/api/emergencies/${emergencyId}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  it('400 — cannot cancel an already-cancelled emergency', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post(`/api/emergencies/${emergencyId}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(400);
  });
});

// ── POST /api/emergencies/:id/cancel — expired window ─────────────────────────

describe('POST /api/emergencies/:id/cancel (expired window)', () => {
  let patientToken: string;
  let patientId: string;
  let expiredEmergencyId: string;

  beforeAll(async () => {
    if (!dbAvailable) return;
    const { default: prisma } = await import('../../src/lib/prisma');
    const { user, accessToken } = await createPatient();
    patientToken = accessToken;
    patientId = user.id;

    // Create with an already-expired deadline
    const em = await (prisma.emergency as any).create({
      data: {
        patientId,
        emergencyType: 'MEDICAL',
        latitude: 31.52,
        longitude: 74.36,
        status: 'ACTIVE',
        cancellationDeadline: new Date(Date.now() - 5000), // expired 5s ago
      },
    });
    expiredEmergencyId = em.id;
  });

  it('400 — cancellation window expired', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post(`/api/emergencies/${expiredEmergencyId}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/window|expired/i);
  });
});

// ── GET /api/emergencies ──────────────────────────────────────────────────────

describe('GET /api/emergencies', () => {
  let responderToken: string;
  let patientToken: string;

  beforeAll(async () => {
    if (!dbAvailable) return;
    const r = await createResponder();
    responderToken = r.accessToken;
    const p = await createPatient();
    patientToken = p.accessToken;
  });

  it('200 — responder gets active emergencies list', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .get('/api/emergencies')
      .set('Authorization', `Bearer ${responderToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('403 — patient cannot list all emergencies', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .get('/api/emergencies')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });
});

// ── GET /api/emergencies/:id ──────────────────────────────────────────────────

describe('GET /api/emergencies/:id', () => {
  let patientToken: string;
  let patientId: string;
  let emergencyId: string;
  let responderToken: string;

  beforeAll(async () => {
    if (!dbAvailable) return;
    const p = await createPatient();
    patientToken = p.accessToken;
    patientId = p.user.id;

    const em = await createEmergency({ patientId, status: 'ACTIVE' });
    emergencyId = em.id;

    const r = await createResponder();
    responderToken = r.accessToken;
  });

  it('200 — patient can view their own emergency', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .get(`/api/emergencies/${emergencyId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(emergencyId);
  });

  it('200 — responder can view emergency', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .get(`/api/emergencies/${emergencyId}`)
      .set('Authorization', `Bearer ${responderToken}`);

    expect(res.status).toBe(200);
  });

  it('404 — non-existent emergency', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .get('/api/emergencies/non-existent-id')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(404);
  });
});

// ── Responder location — bounds validation ────────────────────────────────────

describe('POST /api/responders/location', () => {
  let responderToken: string;

  beforeAll(async () => {
    if (!dbAvailable) return;
    const r = await createResponder();
    responderToken = r.accessToken;
  });

  it('200 — valid Pakistan coordinates accepted', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/responders/location')
      .set('Authorization', `Bearer ${responderToken}`)
      .send({ latitude: 31.5204, longitude: 74.3587 });

    expect(res.status).toBe(200);
  });

  it('422 — Dubai coordinates rejected', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/responders/location')
      .set('Authorization', `Bearer ${responderToken}`)
      .send({ latitude: 25.2048, longitude: 55.2708 });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/outside|service area/i);
  });

  it('400 — missing coordinates', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post('/api/responders/location')
      .set('Authorization', `Bearer ${responderToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('403 — patient cannot update responder location', async () => {
    if (skipIfNoDb()) return;
    const { accessToken } = await createPatient();
    const res = await request(app)
      .post('/api/responders/location')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ latitude: 31.52, longitude: 74.36 });

    expect(res.status).toBe(403);
  });
});

// ── POST /api/responders/:responderId/rate ────────────────────────────────────

describe('POST /api/responders/:responderId/rate', () => {
  let patientToken: string;
  let patientId: string;
  let responderId: string;
  let resolvedEmergencyId: string;

  beforeAll(async () => {
    if (!dbAvailable) return;
    const { default: prisma } = await import('../../src/lib/prisma');

    const p = await createPatient();
    patientToken = p.accessToken;
    patientId = p.user.id;

    const r = await createResponder();
    responderId = r.user.id;

    // Create a RESOLVED emergency
    const em = await (prisma.emergency as any).create({
      data: {
        patientId,
        emergencyType: 'MEDICAL',
        latitude: 31.52,
        longitude: 74.36,
        status: 'RESOLVED',
        cancellationDeadline: new Date(Date.now() + 60_000),
      },
    });
    resolvedEmergencyId = em.id;

    // Create a COMPLETED request for this responder
    await (prisma.emergencyRequest as any).create({
      data: {
        emergencyId: resolvedEmergencyId,
        responderId,
        status: 'COMPLETED',
      },
    });
  });

  it('200 — patient rates responder', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post(`/api/responders/${responderId}/rate`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ emergencyId: resolvedEmergencyId, stars: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('newRating');
    expect(res.body.data).toHaveProperty('totalRatings');
  });

  it('400 — cannot rate twice', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post(`/api/responders/${responderId}/rate`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ emergencyId: resolvedEmergencyId, stars: 3 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already rated/i);
  });

  it('400 — stars out of range', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app)
      .post(`/api/responders/${responderId}/rate`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ emergencyId: resolvedEmergencyId, stars: 10 });

    expect(res.status).toBe(400);
  });

  it('403 — responder cannot submit rating', async () => {
    if (skipIfNoDb()) return;
    const r = await createResponder();
    const res = await request(app)
      .post(`/api/responders/${responderId}/rate`)
      .set('Authorization', `Bearer ${r.accessToken}`)
      .send({ emergencyId: resolvedEmergencyId, stars: 4 });

    expect(res.status).toBe(403);
  });
});
