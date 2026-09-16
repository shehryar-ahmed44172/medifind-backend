import { responderRepository } from '../repositories/responderRepository';
import { emergencyRepository } from '../repositories/emergencyRepository';
import { getIo } from '../server';
import prisma from '../lib/prisma';
import { encrypt } from '../utils/encryption';
import { decryptSensitiveFields } from './medicalProfileService';
import { sendNotification } from './notification';
import { NotificationType, NotificationChannel, NotificationPayload } from '../types/notification';
import * as caregiverRepository from '../repositories/caregiverRepository';
import { redispatchEmergency } from './emergencyService';
import logger from '../utils/logger';

/**
 * Responder accepts an emergency request.
 * First-accept-wins: the request and the emergency are claimed with conditional
 * updates inside a transaction, so two simultaneous accepts can never both succeed (FR5.5 - FR5.7).
 */
export const acceptEmergencyRequest = async (emergencyId: string, responderId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const emergency = await tx.emergency.findUnique({
      where: { id: emergencyId },
      include: {
        patient: { select: { id: true, fullName: true, phoneNumber: true, medicalProfile: true } },
      },
    });

    if (!emergency) throw new Error('Emergency not found');

    // A row count of 0 means another responder (or a cancellation) got there first —
    // throwing rolls the whole transaction back.
    const claimedRequest = await tx.emergencyRequest.updateMany({
      where: { emergencyId, responderId, status: 'PENDING' },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
    if (claimedRequest.count === 0) {
      throw new Error('This request is no longer valid or has been responded to.');
    }

    const claimedEmergency = await tx.emergency.updateMany({
      where: { id: emergencyId, status: 'ACTIVE' },
      data: { status: 'ASSIGNED' },
    });
    if (claimedEmergency.count === 0) {
      throw new Error('This emergency has already been assigned or cancelled.');
    }

    // Close every other pending request for this SOS
    await tx.emergencyRequest.updateMany({
      where: { emergencyId, responderId: { not: responderId }, status: 'PENDING' },
      data: { status: 'COMPLETED' },
    });

    await tx.responder.update({
      where: { userId: responderId },
      data: { isAvailable: false },
    });

    const acceptedRequest = await tx.emergencyRequest.findUnique({
      where: { emergencyId_responderId: { emergencyId, responderId } },
    });

    return { acceptedRequest: acceptedRequest!, emergency };
  });

  const { emergency } = result;
  const patient = emergency.patient;
  const medicalProfile: any = patient?.medicalProfile ? decryptSensitiveFields(patient.medicalProfile as any) : null;

  // Real-time events are emitted only after the transaction has committed
  const responderDetails = await prisma.responder.findUnique({
    where: { userId: responderId },
    include: { user: { select: { fullName: true, phoneNumber: true, profileImageUrl: true } } },
  });

  // Clear the alert from every other responder's screen
  getIo().to('responders').emit('EMERGENCY_ASSIGNED', {
    type: 'EMERGENCY_ASSIGNED',
    data: { emergencyId, assignedTo: responderId },
  });

  const assignedPayload = {
    type: 'EMERGENCY_STATUS_CHANGE',
    data: {
      emergencyId,
      newStatus: 'ASSIGNED',
      responderId,
      responderName:         responderDetails?.user.fullName,
      responderPhone:        responderDetails?.user.phoneNumber,
      responderProfileImage: responderDetails?.user.profileImageUrl ?? null,
      responderRating:       responderDetails?.rating ?? 5.0,
      responderType:         responderDetails?.responderType ?? null,
      organization:          responderDetails?.organization ?? null,
      vehicleType:           responderDetails?.vehicleType ?? 'MOTORBIKE_AMBULANCE',
      motorbikeNumber:       responderDetails?.motorbikeNumber ?? null,
      timestamp:             new Date().toISOString(),
    },
  };
  getIo().to(`emergency:${emergencyId}`).emit('EMERGENCY_STATUS_CHANGE', assignedPayload);
  getIo().to('admin_notifications').emit('EMERGENCY_STATUS_CHANGE', assignedPayload);

  // Push to patient and linked caregivers so they know even if the app is in the background
  const responderName = responderDetails?.user.fullName || 'A responder';
  const assignedNotice: NotificationPayload = {
    type: NotificationType.RESPONDER_ASSIGNED,
    title: 'Help is on the way',
    body: `${responderName} accepted your SOS and is heading to you.`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    priority: 'high',
    data: { emergencyId, status: 'ASSIGNED', responderId },
  };
  sendNotification(emergency.patientId, assignedNotice).catch(err =>
    logger.error(`[Accept] Failed to notify patient ${emergency.patientId}: ${err.message}`));
  notifyLinkedCaregivers(emergency.patientId, {
    ...assignedNotice,
    body: `${responderName} is responding to ${patient?.fullName || 'your patient'}'s emergency.`,
  });

  // Generate AI medical brief outside the transaction so it doesn't hold the DB connection
  let aiBrief: { brief: string; criticalFlags: string[]; recommendedActions: string[] } | null = null;
  try {
    const { generateMedicalBrief } = await import('./aiService');
    aiBrief = await generateMedicalBrief({
      patientName: patient?.fullName || 'Unknown',
      emergencyType: emergency.emergencyType,
      bloodType: medicalProfile?.bloodType || 'Unknown',
      allergies: (medicalProfile?.allergies as string[]) || [],
      chronicDiseases: (medicalProfile?.chronicDiseases as string[]) || [],
      medications: (medicalProfile?.medications as string[]) || [],
      patientType: medicalProfile?.patientType || 'NORMAL',
      additionalInfo: emergency.additionalInfo || '',
    });
  } catch { /* brief is optional — never block the accept flow */ }

  // Deaf patient: open the emergency chat with a system briefing for the responder
  if (medicalProfile?.patientType === 'DEAF') {
    try {
      let chatRoom = await prisma.chatRoom.findFirst({
        where: { roomType: 'EMERGENCY_RESPONDER', patientId: emergency.patientId, responderId, emergencyId },
      });
      if (!chatRoom) {
        chatRoom = await prisma.chatRoom.create({
          data: { roomType: 'EMERGENCY_RESPONDER', patientId: emergency.patientId, responderId, emergencyId },
        });
      }

      const content = '⚠️ SYSTEM: This patient is DEAF and cannot speak or hear. Please communicate exclusively via this text chat. Do NOT ring the doorbell — knock loudly and wave. The patient may also use quick-tap message cards.';
      const autoMsg = await prisma.chatMessage.create({
        data: { roomId: chatRoom.id, senderId: emergency.patientId, content: encrypt(content), messageType: 'TEXT' },
      });

      getIo().to(`chat:${chatRoom.id}`).emit('message:new', { ...autoMsg, content });
    } catch (err: any) {
      logger.error(`[DeafAutoMsg] Failed for emergency ${emergencyId}: ${err.message}`);
    }
  }

  return {
    ...result.acceptedRequest,
    emergency: {
      id: emergency.id,
      latitude: emergency.latitude,
      longitude: emergency.longitude,
      emergencyType: emergency.emergencyType,
      additionalInfo: emergency.additionalInfo,
      voiceSummary: emergency.voiceSummary,
      patientId: emergency.patientId,
      patientName: patient?.fullName,
      patientPhone: patient?.phoneNumber,
      medicalProfile,
    },
    aiBrief,
  };
};

/** Fire-and-forget notification to every caregiver linked to a patient. */
const notifyLinkedCaregivers = (patientId: string, payload: NotificationPayload) => {
  const emergencyId = payload.data?.emergencyId;
  caregiverRepository.getCaregiversForPatient(patientId)
    .then(links => {
      for (const link of links) {
        if (emergencyId) {
          getIo().in(`notifications:${link.caregiverId}`).socketsJoin([`emergency:${emergencyId}`, `location:${emergencyId}`]);
        }
        sendNotification(link.caregiverId, payload).catch(err =>
          logger.error(`Failed to notify caregiver ${link.caregiverId}: ${err.message}`));
      }
    })
    .catch(err => logger.error(`Failed to load caregivers for ${patientId}: ${err.message}`));
};

/**
 * Mark an emergency as RESOLVED. Only the assigned responder may resolve it.
 */
export const resolveEmergency = async (emergencyId: string, responderId: string) => {
  const updatedEmergency = await prisma.$transaction(async (tx) => {
    const emergency = await tx.emergency.findUnique({ where: { id: emergencyId } });
    if (!emergency) throw new Error('Emergency not found');

    const completed = await tx.emergencyRequest.updateMany({
      where: { emergencyId, responderId, status: 'ACCEPTED' },
      data: { status: 'COMPLETED' },
    });
    if (completed.count === 0) {
      throw new Error('Only the assigned responder can resolve this emergency.');
    }

    const updated = await tx.emergency.update({
      where: { id: emergencyId },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });

    await tx.responder.update({
      where: { userId: responderId },
      data: { isAvailable: true },
    });

    return updated;
  });

  const resolvedPayload = {
    type: 'EMERGENCY_STATUS_CHANGE',
    data: { emergencyId, newStatus: 'RESOLVED', responderId, timestamp: new Date().toISOString() },
  };
  getIo().to(`emergency:${emergencyId}`).emit('EMERGENCY_STATUS_CHANGE', resolvedPayload);
  getIo().to('admin_notifications').emit('EMERGENCY_STATUS_CHANGE', resolvedPayload);

  const resolvedNotice: NotificationPayload = {
    type: NotificationType.EMERGENCY_RESOLVED,
    title: 'Emergency resolved',
    body: 'The responder has marked your emergency as resolved. Please rate your experience.',
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    priority: 'normal',
    data: { emergencyId, status: 'RESOLVED', responderId },
  };
  sendNotification(updatedEmergency.patientId, resolvedNotice).catch(err =>
    logger.error(`[Resolve] Failed to notify patient: ${err.message}`));
  notifyLinkedCaregivers(updatedEmergency.patientId, {
    ...resolvedNotice,
    type: NotificationType.PATIENT_SAFE,
    body: "Your patient's emergency has been resolved by the responder.",
  });

  return updatedEmergency;
};

/**
 * Responder rejects an emergency request.
 * Idempotent: returns success even if already rejected or completed by someone else.
 */
export const rejectEmergencyRequest = async (
  emergencyId: string,
  responderId: string,
  reason?: string
) => {
  const request = await responderRepository.findEmergencyRequest(emergencyId, responderId);
  if (!request) throw new Error('Emergency request not found');
  
  // If already rejected, just return the existing record
  if (request.status === 'REJECTED') return request;
  
  // If already completed/accepted by others, we still allow marking as REJECTED for this responder
  // to clear their UI, but we don't throw an error.
  if (request.status !== 'PENDING') {
    return request; // Or we could update to REJECTED anyway
  }

  return await responderRepository.updateEmergencyRequest(emergencyId, responderId, 'REJECTED', {
    rejectionReason: reason,
  });
};

/**
 * Responder cancels an already accepted assignment.
 * The emergency goes back to ACTIVE and is re-dispatched to other nearby responders.
 */
export const cancelAcceptedEmergency = async (emergencyId: string, responderId: string) => {
  const emergency = await prisma.$transaction(async (tx) => {
    const dropped = await tx.emergencyRequest.updateMany({
      where: { emergencyId, responderId, status: 'ACCEPTED' },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: 'Cancelled by responder after accepting' },
    });
    if (dropped.count === 0) {
      throw new Error('You do not have an active accepted request for this emergency.');
    }

    await tx.responder.update({
      where: { userId: responderId },
      data: { isAvailable: true },
    });

    await tx.emergency.updateMany({
      where: { id: emergencyId, status: 'ASSIGNED' },
      data: { status: 'ACTIVE' },
    });

    return tx.emergency.findUnique({ where: { id: emergencyId } });
  });

  const payload = {
    type: 'EMERGENCY_STATUS_CHANGE',
    data: {
      emergencyId,
      newStatus: 'ACTIVE',
      message: 'The assigned responder is no longer available. Finding another responder for you.',
      timestamp: new Date().toISOString(),
    },
  };
  getIo().to(`emergency:${emergencyId}`).emit('EMERGENCY_STATUS_CHANGE', payload);
  getIo().to('admin_notifications').emit('EMERGENCY_STATUS_CHANGE', payload);

  if (emergency && emergency.status === 'ACTIVE') {
    redispatchEmergency(emergencyId).catch(err =>
      logger.error(`[Redispatch] Failed for ${emergencyId}: ${err.message}`));
  }

  return { success: true };
};

/**
 * Get all available responders near a location.
 */
export const getNearbyResponders = async (latitude: number, longitude: number, radiusKm = 5) => {
  return await responderRepository.findNearbyAvailable(latitude, longitude, radiusKm);
};

/**
 * Update a responder's live location.
 */
export const updateResponderLocation = async (
  userId: string,
  latitude: number,
  longitude: number
) => {
  const updated = await responderRepository.updateLocation(userId, latitude, longitude);
  
  // Plan v6: Broadcast location to the active emergency room
  // 1. Find the active emergency request for this responder
  const activeRequest = await prisma.emergencyRequest.findFirst({
    where: { responderId: userId, status: 'ACCEPTED' },
    select: { emergencyId: true }
  });

  if (activeRequest) {
    getIo().to(`location:${activeRequest.emergencyId}`).emit('RESPONDER_LOCATION_UPDATE', {
      emergencyId: activeRequest.emergencyId,
      responderId: userId,
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    });
    
    // Also emit to the specific emergency room for general UI updates
    getIo().to(`emergency:${activeRequest.emergencyId}`).emit('RESPONDER_LOCATION_UPDATE', {
      emergencyId: activeRequest.emergencyId,
      latitude,
      longitude
    });
  }

  return updated;
};

/**
 * Mark a responder as available or unavailable.
 */
export const setResponderAvailability = async (userId: string, isAvailable: boolean) => {
  return await responderRepository.setAvailability(userId, isAvailable);
};

/**
 * Get all emergency history for a responder.
 */
export const getResponderHistory = async (responderId: string, since?: Date) => {
  return await responderRepository.getHistory(responderId, since);
};
/**
 * Submit a rating for a responder after an emergency is resolved.
 * Only the patient involved in the emergency may rate the responder.
 * Uses a running-average formula to update the stored rating.
 *
 * @param emergencyId  The resolved emergency the rating applies to
 * @param patientId    The authenticated patient submitting the rating
 * @param responderId  The responder being rated
 * @param stars        Rating value 1–5
 */
export const rateResponder = async (
  emergencyId: string,
  patientId: string,
  responderId: string,
  stars: number,
) => {
  if (stars < 1 || stars > 5 || !Number.isInteger(stars)) {
    throw new Error('Rating must be a whole number between 1 and 5');
  }

  // Verify the emergency exists, belongs to this patient, and is resolved
  const emergency = await prisma.emergency.findUnique({
    where: { id: emergencyId },
    include: { emergencyRequests: { where: { responderId, status: 'COMPLETED' } } },
  });

  if (!emergency) throw new Error('Emergency not found');
  if (emergency.patientId !== patientId) {
    throw new Error('You can only rate responders from your own emergencies');
  }
  if (!['RESOLVED', 'COMPLETED'].includes(emergency.status)) {
    throw new Error('You can only rate a responder after the emergency is resolved');
  }
  if (emergency.emergencyRequests.length === 0) {
    throw new Error('This responder did not complete a request for this emergency');
  }

  // Check for duplicate rating (stored on the EmergencyRequest as patientRating)
  const completedRequest = emergency.emergencyRequests[0];
  if (completedRequest.patientRating != null) {
    throw new Error('You have already rated this responder for this emergency');
  }

  // Save rating on the request record (prevents double-rating)
  await prisma.emergencyRequest.update({
    where: { id: completedRequest.id },
    data: { patientRating: stars, ratedAt: new Date() },
  });

  // Update running average on the Responder table
  const responder = await prisma.responder.findUnique({ where: { userId: responderId } });
  if (!responder) throw new Error('Responder profile not found');

  const currentTotal = responder.totalRatings ?? 0;
  const currentRating = responder.rating ?? 5.0;
  const newTotal = currentTotal + 1;
  const newRating = parseFloat(
    ((currentRating * currentTotal + stars) / newTotal).toFixed(2),
  );

  await prisma.responder.update({
    where: { userId: responderId },
    data: { rating: newRating, totalRatings: newTotal },
  });

  return { newRating, totalRatings: newTotal };
};

/**
 * Get active emergency requests for a responder.
 */
export const getActiveEmergencyRequests = async (responderId: string) => {
  const requests = await prisma.emergencyRequest.findMany({
    where: { 
      responderId,
      status: { in: ['PENDING', 'ACCEPTED'] }
    },
    include: {
      emergency: {
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              email: true,
              medicalProfile: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Map to a format that the mobile app expects (Emergency objects with requests array).
  // Pending requests whose emergency is no longer open are stale and hidden.
  return requests
    .filter(req => req.status === 'ACCEPTED' || req.emergency.status === 'ACTIVE')
    .map(({ emergency, ...request }) => ({
      ...emergency,
      patient: emergency.patient && {
        ...emergency.patient,
        medicalProfile: emergency.patient.medicalProfile
          ? decryptSensitiveFields(emergency.patient.medicalProfile as any)
          : null,
      },
      status: request.status === 'ACCEPTED' ? 'ASSIGNED' : 'ACTIVE',
      distanceKm: request.distanceKm,
      estimatedArrivalMinutes: request.estimatedArrivalMinutes,
      requests: [request],
    }));
};
