/**
 * Test data factories — create consistent test fixtures.
 *
 * Use these helpers in integration tests to create and clean up database
 * records without coupling tests to each other's data.
 */

import prisma from '../../src/lib/prisma';
import { hashPassword } from '../../src/utils/password';
import { generateAccessToken } from '../../src/utils/jwt';

// ── Unique ID generator ───────────────────────────────────────────────────────
let seq = Date.now();
export const uid = (prefix = '') => `${prefix}${++seq}`;

// ── User Factories ────────────────────────────────────────────────────────────

export interface CreateUserOptions {
  role?: 'PATIENT' | 'RESPONDER' | 'CAREGIVER' | 'ADMIN';
  isEmailVerified?: boolean;
  isActive?: boolean;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
}

/**
 * Create a user directly in the database.
 * Returns the user record and a valid JWT access token.
 */
export async function createUser(opts: CreateUserOptions = {}) {
  const {
    role = 'PATIENT',
    isEmailVerified = true,
    isActive = true,
    fullName = `Test User ${uid()}`,
    email = `test-${uid()}@integration.medifind.test`,
    phoneNumber = `+923${String(seq % 1_000_000_000).padStart(9, '0')}`,
  } = opts;

  const passwordHash = await hashPassword('TestPass@123!');

  const user = await (prisma.user as any).create({
    data: {
      fullName,
      email,
      phoneNumber,
      passwordHash,
      role,
      isEmailVerified,
      isActive,
    },
  });

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return { user, accessToken, password: 'TestPass@123!' };
}

/**
 * Create a verified responder with a responder profile.
 */
export async function createResponder(opts: Partial<CreateUserOptions> = {}) {
  const { user, accessToken, password } = await createUser({
    ...opts,
    role: 'RESPONDER',
  });

  const responder = await prisma.responder.create({
    data: {
      userId: user.id,
      licenseNumber: `LIC-${uid()}`,
      isVerified: true,
      isAvailable: true,
      currentLatitude: 31.5204,
      currentLongitude: 74.3587,
    } as any,
  });

  return { user, responder, accessToken, password };
}

/**
 * Create a patient with a medical profile.
 */
export async function createPatient(opts: Partial<CreateUserOptions> = {}) {
  const { user, accessToken, password } = await createUser({
    ...opts,
    role: 'PATIENT',
  });

  const medicalProfile = await (prisma.medicalProfile as any).create({
    data: {
      userId: user.id,
      bloodType: 'B+',
      chronicDiseases: ['Asthma'],
      allergies: ['Penicillin'],
      medications: [],
      emergencyContacts: [{ name: 'Emergency Contact', phone: '+923001234567', relationship: 'Spouse' }],
      patientType: 'NORMAL',
    },
  });

  return { user, medicalProfile, accessToken, password };
}

// ── Emergency Factories ───────────────────────────────────────────────────────

export interface CreateEmergencyOptions {
  patientId: string;
  status?: string;
  latitude?: number;
  longitude?: number;
}

export async function createEmergency(opts: CreateEmergencyOptions) {
  const {
    patientId,
    status = 'ACTIVE',
    latitude = 31.5204,
    longitude = 74.3587,
  } = opts;

  return await prisma.emergency.create({
    data: {
      patientId,
      emergencyType: 'MEDICAL',
      latitude,
      longitude,
      status,
      cancellationDeadline: new Date(Date.now() + 60_000),
      voiceSummary: 'Test patient | Blood: B+ | Allergies: Penicillin',
    } as any,
  });
}

export async function createEmergencyRequest(opts: {
  emergencyId: string;
  responderId: string;
  status?: string;
}) {
  return await prisma.emergencyRequest.create({
    data: {
      emergencyId: opts.emergencyId,
      responderId: opts.responderId,
      status: opts.status ?? 'PENDING',
    } as any,
  });
}

// ── Chat Factories ────────────────────────────────────────────────────────────

export async function createChatRoom(opts: {
  patientId: string;
  caregiverId?: string;
  responderId?: string;
  emergencyId?: string;
  roomType?: string;
}) {
  return await prisma.chatRoom.create({
    data: {
      patientId: opts.patientId,
      caregiverId: opts.caregiverId ?? null,
      responderId: opts.responderId ?? null,
      emergencyId: opts.emergencyId ?? null,
      roomType: opts.roomType ?? 'CAREGIVER_PATIENT',
    } as any,
  });
}

// ── Cleanup Utilities ─────────────────────────────────────────────────────────

/**
 * Delete users by email pattern — use in afterAll for test cleanup.
 * Example: cleanupTestUsers('@integration.medifind.test')
 */
export async function cleanupTestUsers(emailSuffix = '@integration.medifind.test') {
  // Never touch demo accounts (@medifind.test) or real users on a shared dev database
  if (!emailSuffix.endsWith('@integration.medifind.test')) {
    throw new Error(`Refusing to delete users with suffix ${emailSuffix}`);
  }
  await prisma.user.deleteMany({
    where: { email: { endsWith: emailSuffix } },
  });
}
