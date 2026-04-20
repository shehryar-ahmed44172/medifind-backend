import { responderRepository } from '../repositories/responderRepository';
import { emergencyRepository } from '../repositories/emergencyRepository';
import { getIo } from '../server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Responder accepts an emergency request.
 * Uses a transaction to handle race conditions (FR5.5 - FR5.7)
 */
export const acceptEmergencyRequest = async (emergencyId: string, responderId: string) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Check if the emergency is still ACTIVE and unassigned
    const emergency = await tx.emergency.findUnique({
      where: { id: emergencyId },
      include: { 
        emergencyRequests: true,
        medicalReports: true
      }
    });

    if (!emergency) throw new Error('Emergency not found');
    if (emergency.status !== 'ACTIVE') {
      throw new Error('This emergency has already been assigned or cancelled.');
    }

    // 2. Check if this specific responder's request is still PENDING
    const request = await tx.emergencyRequest.findUnique({
      where: { emergencyId_responderId: { emergencyId, responderId } }
    });

    if (!request || request.status !== 'PENDING') {
      throw new Error('This request is no longer valid or has been responded to.');
    }

    // 3. Update This responder's request to ACCEPTED
    const acceptedRequest = await tx.emergencyRequest.update({
      where: { emergencyId_responderId: { emergencyId, responderId } },
      data: { 
        status: 'ACCEPTED',
        acceptedAt: new Date()
      }
    });

    // 4. Update the Emergency status to ASSIGNED and assign this responder
    await tx.emergency.update({
      where: { id: emergencyId },
      data: { status: 'ASSIGNED' }
    });

    // 5. Systematically CLOSE (mark as COMPLETED/EXPIRED) all other pending requests for this SOS
    await tx.emergencyRequest.updateMany({
      where: {
        emergencyId,
        responderId: { not: responderId },
        status: 'PENDING'
      },
      data: { status: 'COMPLETED' }
    });

    // 6. Set this responder's availability to false
    await tx.responder.update({
      where: { userId: responderId },
      data: { isAvailable: false }
    });

    // 7. REAL-TIME: Notify all other responders to clear the notification from their screens
    // We broadcast to the generic 'emergencies' room or specific responder IDs
    getIo().emit('EMERGENCY_ASSIGNED', {
      type: 'EMERGENCY_ASSIGNED',
      data: { emergencyId, assignedTo: responderId }
    });

    // Notify the patient and caregivers that help is on the way (FR7.4)
    // Plan v6: Include responder profile details so they can be displayed on the map
    const responderDetails = await tx.responder.findUnique({
      where: { userId: responderId },
      include: { user: { select: { fullName: true, phoneNumber: true } } }
    });

    getIo().to(`emergency:${emergencyId}`).emit('EMERGENCY_STATUS_CHANGE', {
      type: 'EMERGENCY_STATUS_CHANGE',
      data: { 
        emergencyId, 
        newStatus: 'ASSIGNED',
        responderId,
        responderName: responderDetails?.user.fullName,
        responderPhone: responderDetails?.user.phoneNumber
      }
    });

    // Also join responder to the location room for this emergency automatically
    // Note: We'll do this via the socket listener in server.ts if they join room explicitly,
    // but here we ensure the room exists.

    return {
      ...acceptedRequest,
      emergency: {
        id: emergency.id,
        latitude: emergency.latitude,
        longitude: emergency.longitude,
        emergencyType: emergency.emergencyType,
        additionalInfo: emergency.additionalInfo,
        voiceSummary: (emergency as any).voiceSummary, // Explicitly pull if available
        medicalProfile: emergency.medicalReports, // Or actual profile data
      }
    };
  });
};

/**
 * Mark an emergency as RESOLVED (Completed).
 */
export const resolveEmergency = async (emergencyId: string, responderId: string) => {
  return await prisma.$transaction(async (tx) => {
    const emergency = await tx.emergency.findUnique({ where: { id: emergencyId } });
    if (!emergency) throw new Error('Emergency not found');
    
    // Update emergency status
    const updatedEmergency = await tx.emergency.update({
      where: { id: emergencyId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date()
      }
    });

    // Update the request status (the one for this responder)
    await tx.emergencyRequest.updateMany({
      where: { emergencyId, responderId, status: 'ACCEPTED' },
      data: { status: 'COMPLETED' }
    });

    // Set responder back to available
    await tx.responder.update({
      where: { userId: responderId },
      data: { isAvailable: true }
    });

    // Broadcast resolution
    getIo().to(`emergency:${emergencyId}`).emit('EMERGENCY_STATUS_CHANGE', {
      type: 'EMERGENCY_STATUS_CHANGE',
      data: { emergencyId, newStatus: 'RESOLVED' }
    });

    return updatedEmergency;
  });
};

/**
 * Responder rejects an emergency request.
 */
export const rejectEmergencyRequest = async (
  emergencyId: string,
  responderId: string,
  reason?: string
) => {
  const request = await responderRepository.findEmergencyRequest(emergencyId, responderId);
  if (!request) throw new Error('Emergency request not found');
  if (request.status !== 'PENDING') throw new Error('Request is no longer pending');

  return await responderRepository.updateEmergencyRequest(emergencyId, responderId, 'REJECTED', {
    rejectionReason: reason,
  });
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
