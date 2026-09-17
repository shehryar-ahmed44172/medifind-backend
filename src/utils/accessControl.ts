import prisma from '../lib/prisma';
import { TokenPayload } from '../types/auth';

/**
 * Whether a user may view an emergency (details, live tracking, socket rooms).
 *  - ADMIN: always
 *  - PATIENT: own emergency
 *  - RESPONDER: was dispatched to it (any request status)
 *  - CAREGIVER: has an accepted link with the patient
 */
export const canAccessEmergency = async (user: Pick<TokenPayload, 'userId' | 'role'>, emergencyId: string): Promise<boolean> => {
  if (!emergencyId) return false;
  if (user.role === 'ADMIN') return true;

  const emergency = await prisma.emergency.findUnique({
    where: { id: emergencyId },
    select: { patientId: true },
  });
  if (!emergency) return false;

  if (emergency.patientId === user.userId) return true;

  if (user.role === 'RESPONDER') {
    const request = await prisma.emergencyRequest.findFirst({
      where: { emergencyId, responderId: user.userId },
      select: { id: true },
    });
    return !!request;
  }

  if (user.role === 'CAREGIVER') {
    const link = await prisma.caregiverLink.findFirst({
      where: { caregiverId: user.userId, patientId: emergency.patientId, status: 'ACCEPTED', isActive: true },
      select: { id: true },
    });
    return !!link;
  }

  return false;
};

/** Whether the responder is the one currently assigned (accepted) to the emergency. */
export const isAssignedResponder = async (responderId: string, emergencyId: string): Promise<boolean> => {
  const request = await prisma.emergencyRequest.findFirst({
    where: { emergencyId, responderId, status: 'ACCEPTED' },
    select: { id: true },
  });
  return !!request;
};

/** Whether the user is a participant of a chat room. */
export const isChatRoomMember = async (userId: string, roomId: string): Promise<boolean> => {
  if (!roomId) return false;
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { patientId: true, caregiverId: true, responderId: true },
  });
  return !!room && [room.patientId, room.caregiverId, room.responderId].includes(userId);
};

/** Emergency statuses during which patient, caregivers and responder may contact each other. */
export const OPEN_EMERGENCY_STATUSES = ['ACTIVE', 'ASSIGNED', 'ARRIVED'] as const;

/**
 * A chat room is locked once its emergency is over (resolved or cancelled): no new
 * messages, uploads, calls or contact details between patient/caregiver and responder.
 * Caregiver-patient rooms (no responder) never lock.
 */
export const isChatRoomLocked = async (room: { responderId: string | null; emergencyId: string | null }): Promise<boolean> => {
  if (!room.responderId) return false;
  if (!room.emergencyId) return true;
  const emergency = await prisma.emergency.findUnique({ where: { id: room.emergencyId }, select: { status: true } });
  return !emergency || !(OPEN_EMERGENCY_STATUSES as readonly string[]).includes(emergency.status);
};

/**
 * Whether `viewer` may see `targetUserId`'s contact details (phone number, email).
 *  - the user themself and ADMIN
 *  - a patient and their caregivers (accepted, active link)
 *  - a patient and the responder assigned to their emergency, only while it is open
 *  - a caregiver and the responder assigned to their linked patient's open emergency
 * Once the responder's job is done the contact details are hidden again.
 */
export const canSeeContactDetails = async (
  viewer: Pick<TokenPayload, 'userId' | 'role'>,
  targetUserId: string,
): Promise<boolean> => {
  if (!targetUserId) return false;
  if (viewer.userId === targetUserId || viewer.role === 'ADMIN') return true;
  const a = viewer.userId;
  const b = targetUserId;

  const caregiverLink = await prisma.caregiverLink.findFirst({
    where: {
      status: 'ACCEPTED',
      isActive: true,
      OR: [{ caregiverId: a, patientId: b }, { caregiverId: b, patientId: a }],
    },
    select: { id: true },
  });
  if (caregiverLink) return true;

  const openEmergency = { status: { in: [...OPEN_EMERGENCY_STATUSES] } };
  const patientResponder = await prisma.emergencyRequest.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { responderId: b, emergency: { patientId: a, ...openEmergency } },
        { responderId: a, emergency: { patientId: b, ...openEmergency } },
      ],
    },
    select: { id: true },
  });
  if (patientResponder) return true;

  if (viewer.role === 'CAREGIVER' || viewer.role === 'RESPONDER') {
    const [caregiverId, responderId] = viewer.role === 'CAREGIVER' ? [a, b] : [b, a];
    const viaPatient = await prisma.emergencyRequest.findFirst({
      where: {
        responderId,
        status: 'ACCEPTED',
        emergency: {
          ...openEmergency,
          patient: { caregiverEmployers: { some: { caregiverId, status: 'ACCEPTED', isActive: true } } },
        },
      },
      select: { id: true },
    });
    if (viaPatient) return true;
  }
  return false;
};

/** Removes phone number and email from a user-like object (returns a copy). */
export const withoutContact = <T extends Record<string, any> | null | undefined>(user: T): T => {
  if (!user) return user;
  const { phoneNumber, email, ...rest } = user as Record<string, any>;
  return rest as T;
};
