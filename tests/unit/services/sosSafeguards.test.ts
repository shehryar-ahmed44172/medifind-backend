/**
 * Unit tests — false / abusive SOS safeguards (mocked Prisma)
 */

import { jest } from '@jest/globals';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma: any = {
  emergency: { count: jest.fn() },
  auditLog: { create: jest.fn() },
  user: { findUnique: jest.fn(), findMany: jest.fn() },
};

jest.mock('../../../src/lib/prisma', () => ({ default: mockPrisma, __esModule: true }));
jest.mock('../../../src/server', () => ({
  getIo: () => ({ emit: jest.fn(), to: jest.fn().mockReturnThis() }),
}));
jest.mock('../../../src/services/notification', () => ({
  sendNotification: jest.fn(() => Promise.resolve({ success: true })),
}));

import {
  assertSosAllowed,
  handleFalseAlarm,
  SosRejectedError,
  SOS_HOURLY_LIMIT,
  FALSE_ALARM_REVIEW_THRESHOLD,
} from '../../../src/services/sosSafeguards';
import { sendNotification } from '../../../src/services/notification';

const ORIGINAL_ENV = process.env.NODE_ENV;

describe('assertSosAllowed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({});
  });
  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_ENV;
  });

  it('allows a normal SOS under the hourly limit', async () => {
    mockPrisma.emergency.count.mockResolvedValue(0);
    await expect(assertSosAllowed('patient-1', { locationMocked: false })).resolves.toBeUndefined();
  });

  it('rejects mock GPS locations in production with 422', async () => {
    process.env.NODE_ENV = 'production';
    mockPrisma.emergency.count.mockResolvedValue(0);
    const err = await assertSosAllowed('patient-1', { locationMocked: true }).catch(e => e);
    expect(err).toBeInstanceOf(SosRejectedError);
    expect(err.statusCode).toBe(422);
    expect(err.message).toMatch(/1122/);
  });

  it('does not block mock GPS outside production (emulator testing)', async () => {
    process.env.NODE_ENV = 'development';
    mockPrisma.emergency.count.mockResolvedValue(0);
    await expect(assertSosAllowed('patient-1', { locationMocked: true })).resolves.toBeUndefined();
  });

  it('rate-limits once the hourly limit is reached, telling the user to call 1122', async () => {
    mockPrisma.emergency.count.mockResolvedValue(SOS_HOURLY_LIMIT);
    const err = await assertSosAllowed('patient-1', { locationMocked: false }).catch(e => e);
    expect(err).toBeInstanceOf(SosRejectedError);
    expect(err.statusCode).toBe(429);
    expect(err.message).toMatch(/1122/);
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });
});

describe('handleFalseAlarm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ fullName: 'Test Patient', email: 'p@test.com' });
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
  });

  it('warns the patient without flagging below the threshold', async () => {
    mockPrisma.emergency.count.mockResolvedValue(FALSE_ALARM_REVIEW_THRESHOLD - 1);
    const result = await handleFalseAlarm('e-1', 'patient-1', 'responder-1', 'pocket press');
    expect(result.flagged).toBe(false);
    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect((sendNotification as unknown as jest.Mock<any>).mock.calls[0][0]).toBe('patient-1');
  });

  it('flags the account and alerts admins at the threshold', async () => {
    mockPrisma.emergency.count.mockResolvedValue(FALSE_ALARM_REVIEW_THRESHOLD);
    const result = await handleFalseAlarm('e-2', 'patient-1', 'responder-1', 'no emergency');
    expect(result.flagged).toBe(true);
    const recipients = (sendNotification as unknown as jest.Mock<any>).mock.calls.map((c: any[]) => c[0]);
    expect(recipients).toEqual(expect.arrayContaining(['patient-1', 'admin-1']));
  });
});
