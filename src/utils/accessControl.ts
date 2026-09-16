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
