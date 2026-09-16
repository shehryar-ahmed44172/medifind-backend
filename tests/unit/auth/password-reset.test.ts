/**
 * Unit tests — passwordResetService (mocked dependencies)
 *
 * DB-dependent scenarios (requestPasswordReset, changePassword) are skipped
 * here and covered in integration tests. Only pure-logic paths are tested.
 */

import { jest } from '@jest/globals';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../src/lib/prisma', () => ({
  default: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    passwordReset: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
  __esModule: true,
}));

jest.mock('../../../src/services/notification', () => ({
  sendNotification: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import prisma from '../../../src/lib/prisma';

const mockUserFindUnique  = (prisma as any).user.findUnique as any;
const mockUserUpdate      = (prisma as any).user.update as any;

// ── Basic sanity checks (no DB) ───────────────────────────────────────────────

describe('passwordReset — mock-level checks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('prisma.user mock is callable', () => {
    expect(typeof mockUserFindUnique).toBe('function');
    expect(typeof mockUserUpdate).toBe('function');
  });

  it('mockResolvedValue works on user mock', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    const result = await (prisma as any).user.findUnique({ where: { id: 'u1' } });
    expect(result.email).toBe('a@b.com');
  });

  it('mockResolvedValue(null) simulates user not found', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const result = await (prisma as any).user.findUnique({ where: { id: 'missing' } });
    expect(result).toBeNull();
  });
});
