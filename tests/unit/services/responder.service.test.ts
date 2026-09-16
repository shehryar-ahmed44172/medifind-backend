/**
 * Unit tests — responderService (mocked Prisma)
 *
 * Tests business logic in isolation without a real database.
 */

import { jest } from '@jest/globals';

// ── Mock Prisma singleton ─────────────────────────────────────────────────────
// Typed as jest.Mock so mockResolvedValue accepts arbitrary values
const mockPrisma: Record<string, Record<string, jest.Mock>> = {
  emergency: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  emergencyRequest: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
  },
  responder: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../../src/lib/prisma', () => ({ default: mockPrisma, __esModule: true }));
jest.mock('../../../src/server', () => ({
  getIo: () => ({
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
  }),
}));

import * as responderService from '../../../src/services/responderService';

// ── rateResponder ─────────────────────────────────────────────────────────────

describe('rateResponder', () => {
  const patientId = 'patient-1';
  const responderId = 'responder-1';
  const emergencyId = 'emergency-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws for invalid star value (0)', async () => {
    await expect(
      responderService.rateResponder(emergencyId, patientId, responderId, 0),
    ).rejects.toThrow('between 1 and 5');
  });

  it('throws for invalid star value (6)', async () => {
    await expect(
      responderService.rateResponder(emergencyId, patientId, responderId, 6),
    ).rejects.toThrow('between 1 and 5');
  });

  it('throws for non-integer stars', async () => {
    await expect(
      responderService.rateResponder(emergencyId, patientId, responderId, 3.5),
    ).rejects.toThrow('between 1 and 5');
  });

  it('throws if emergency not found', async () => {
    (mockPrisma.emergency.findUnique as any).mockResolvedValue(null);

    await expect(
      responderService.rateResponder(emergencyId, patientId, responderId, 5),
    ).rejects.toThrow('Emergency not found');
  });

  it('throws if patient does not own emergency', async () => {
    (mockPrisma.emergency.findUnique as any).mockResolvedValue({
      id: emergencyId,
      patientId: 'other-patient',
      status: 'RESOLVED',
      emergencyRequests: [],
    });

    await expect(
      responderService.rateResponder(emergencyId, patientId, responderId, 5),
    ).rejects.toThrow(/your own emergencies|not your emergency/i);
  });

  it('throws if emergency is not resolved', async () => {
    (mockPrisma.emergency.findUnique as any).mockResolvedValue({
      id: emergencyId,
      patientId,
      status: 'ACTIVE',
      emergencyRequests: [],
    });

    await expect(
      responderService.rateResponder(emergencyId, patientId, responderId, 5),
    ).rejects.toThrow('resolved');
  });

  it('throws if responder did not complete a request', async () => {
    (mockPrisma.emergency.findUnique as any).mockResolvedValue({
      id: emergencyId,
      patientId,
      status: 'RESOLVED',
      emergencyRequests: [], // empty
    });

    await expect(
      responderService.rateResponder(emergencyId, patientId, responderId, 5),
    ).rejects.toThrow('did not complete');
  });

  it('throws if already rated', async () => {
    (mockPrisma.emergency.findUnique as any).mockResolvedValue({
      id: emergencyId,
      patientId,
      status: 'RESOLVED',
      emergencyRequests: [{ id: 'req-1', patientRating: 4 }],
    });

    await expect(
      responderService.rateResponder(emergencyId, patientId, responderId, 5),
    ).rejects.toThrow('already rated');
  });

  it('calculates updated running average correctly', async () => {
    const existingRating = 4.0;
    const existingTotal = 5;

    (mockPrisma.emergency.findUnique as any).mockResolvedValue({
      id: emergencyId,
      patientId,
      status: 'RESOLVED',
      emergencyRequests: [{ id: 'req-1', patientRating: null }],
    });

    (mockPrisma.emergencyRequest.update as any).mockResolvedValue({});

    (mockPrisma.responder.findUnique as any).mockResolvedValue({
      userId: responderId,
      rating: existingRating,
      totalRatings: existingTotal,
    });

    (mockPrisma.responder.update as any).mockResolvedValue({});

    const result = await responderService.rateResponder(
      emergencyId,
      patientId,
      responderId,
      5,
    );

    // (4.0 * 5 + 5) / 6 = 25/6 = 4.17
    expect(result.newRating).toBeCloseTo(4.17, 1);
    expect(result.totalRatings).toBe(6);
  });

  it('handles first-ever rating (totalRatings = 0)', async () => {
    (mockPrisma.emergency.findUnique as any).mockResolvedValue({
      id: emergencyId,
      patientId,
      status: 'RESOLVED',
      emergencyRequests: [{ id: 'req-1', patientRating: null }],
    });

    (mockPrisma.emergencyRequest.update as any).mockResolvedValue({});

    (mockPrisma.responder.findUnique as any).mockResolvedValue({
      userId: responderId,
      rating: 5.0,
      totalRatings: 0,
    });

    (mockPrisma.responder.update as any).mockResolvedValue({});

    const result = await responderService.rateResponder(
      emergencyId,
      patientId,
      responderId,
      3,
    );

    // (5.0 * 0 + 3) / 1 = 3.0
    expect(result.newRating).toBe(3.0);
    expect(result.totalRatings).toBe(1);
  });
});

// ── setResponderAvailability ──────────────────────────────────────────────────

describe('setResponderAvailability', () => {
  it('is exported from the service', () => {
    // Structural check — actual behaviour tested in integration tests
    expect(typeof responderService.setResponderAvailability).toBe('function');
  });
});

// ── getNearbyResponders ───────────────────────────────────────────────────────

describe('getNearbyResponders', () => {
  it('is exported from the service', () => {
    expect(typeof responderService.getNearbyResponders).toBe('function');
  });
});
