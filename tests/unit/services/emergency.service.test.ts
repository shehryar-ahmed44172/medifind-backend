/**
 * Unit tests — emergencyService (mocked dependencies)
 *
 * All service methods delegate to emergencyRepository, not prisma directly.
 * Mocks target the repository layer.
 */

import { jest } from '@jest/globals';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../src/lib/prisma', () => ({
  default: {
    emergency: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    emergencyRequest: { updateMany: jest.fn() },
    medicalProfile: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    responder: { findMany: jest.fn() },
  },
  __esModule: true,
}));

jest.mock('../../../src/server', () => ({
  getIo: () => ({ emit: jest.fn(), to: jest.fn().mockReturnThis() }),
}));

jest.mock('../../../src/services/notification', () => ({
  sendNotification: jest.fn(),
}));

jest.mock('../../../src/repositories/emergencyRepository', () => ({
  emergencyRepository: {
    findById:                jest.fn(),
    findAllActive:           jest.fn(),
    updateStatus:            jest.fn(),
    cancel:                  jest.fn(),
    getNotifiedResponderIds: jest.fn(),
    create:                  jest.fn(),
  },
}));

jest.mock('../../../src/repositories/responderRepository', () => ({
  responderRepository: {
    findNearbyAvailable:    jest.fn(),
    createEmergencyRequest: jest.fn(),
  },
}));

jest.mock('../../../src/repositories/caregiverRepository', () => ({
  getCaregiversForPatient: jest.fn(),
  getCaregiverLinks:       jest.fn(),
}));

// ── Imports (AFTER mocks) ─────────────────────────────────────────────────────

import { emergencyRepository } from '../../../src/repositories/emergencyRepository';
import * as emergencyService from '../../../src/services/emergencyService';

const mockFindById               = (emergencyRepository as any).findById as any;
const mockFindAllActive          = (emergencyRepository as any).findAllActive as any;
const mockUpdateStatus           = (emergencyRepository as any).updateStatus as any;
const mockCancel                 = (emergencyRepository as any).cancel as any;
const mockGetNotifiedResponderIds = (emergencyRepository as any).getNotifiedResponderIds as any;

// ── cancelEmergency ───────────────────────────────────────────────────────────

describe('cancelEmergency', () => {
  const patientId   = 'patient-1';
  const emergencyId = 'emergency-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNotifiedResponderIds.mockResolvedValue([]);
  });

  it('throws if emergency does not exist', async () => {
    mockFindById.mockResolvedValue(null);
    await expect(emergencyService.cancelEmergency(emergencyId, patientId))
      .rejects.toThrow(/not found/i);
  });

  it('throws if patient does not own the emergency', async () => {
    mockFindById.mockResolvedValue({
      id: emergencyId,
      patientId: 'different-patient',
      status: 'ACTIVE',
      cancellationDeadline: new Date(Date.now() + 30_000),
    });
    await expect(emergencyService.cancelEmergency(emergencyId, patientId))
      .rejects.toThrow(/unauthorized/i);
  });

  it('throws if emergency is not ACTIVE', async () => {
    mockFindById.mockResolvedValue({
      id: emergencyId,
      patientId,
      status: 'CANCELLED',
      cancellationDeadline: new Date(Date.now() + 30_000),
    });
    await expect(emergencyService.cancelEmergency(emergencyId, patientId))
      .rejects.toThrow(/not active/i);
  });

  it('throws if cancellation window has expired', async () => {
    mockFindById.mockResolvedValue({
      id: emergencyId,
      patientId,
      status: 'ACTIVE',
      cancellationDeadline: new Date(Date.now() - 1000),
    });
    await expect(emergencyService.cancelEmergency(emergencyId, patientId))
      .rejects.toThrow(/window|expired|cannot/i);
  });

  it('successfully cancels within the window', async () => {
    mockFindById.mockResolvedValue({
      id: emergencyId,
      patientId,
      status: 'ACTIVE',
      cancellationDeadline: new Date(Date.now() + 30_000),
    });
    mockCancel.mockResolvedValue({ id: emergencyId, status: 'CANCELLED' });

    const result = await emergencyService.cancelEmergency(emergencyId, patientId);
    expect(result.status).toBe('CANCELLED');
    expect(mockCancel).toHaveBeenCalledWith(emergencyId);
  });
});

// ── getActiveEmergencies ──────────────────────────────────────────────────────

describe('getActiveEmergencies', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an array (even if empty)', async () => {
    mockFindAllActive.mockResolvedValue([]);
    const result = await emergencyService.getActiveEmergencies();
    expect(Array.isArray(result)).toBe(true);
  });

  it('delegates to emergencyRepository.findAllActive', async () => {
    mockFindAllActive.mockResolvedValue([]);
    await emergencyService.getActiveEmergencies();
    expect(mockFindAllActive).toHaveBeenCalledTimes(1);
  });
});

// ── updateEmergencyStatus ─────────────────────────────────────────────────────

describe('updateEmergencyStatus', () => {
  const emergencyId = 'emergency-1';
  beforeEach(() => jest.clearAllMocks());

  it('throws if emergency is not found', async () => {
    mockFindById.mockResolvedValue(null);
    await expect(emergencyService.updateEmergencyStatus(emergencyId, 'RESOLVED' as any))
      .rejects.toThrow(/not found/i);
  });

  it('calls updateStatus with the provided status', async () => {
    mockFindById.mockResolvedValue({ id: emergencyId, status: 'ACTIVE' });
    mockUpdateStatus.mockResolvedValue({ id: emergencyId, status: 'RESOLVED' });

    const result = await emergencyService.updateEmergencyStatus(emergencyId, 'RESOLVED' as any);
    expect(result.status).toBe('RESOLVED');
    expect(mockUpdateStatus).toHaveBeenCalledWith(emergencyId, 'RESOLVED');
  });
});
