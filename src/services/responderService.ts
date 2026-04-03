import { responderRepository } from '../repositories/responderRepository';
import { emergencyRepository } from '../repositories/emergencyRepository';

/**
 * Responder accepts an emergency request.
 * Marks the responder as BUSY and all other requests for this emergency as COMPLETED (closed).
 */
export const acceptEmergencyRequest = async (emergencyId: string, responderId: string) => {
  const request = await responderRepository.findEmergencyRequest(emergencyId, responderId);
  if (!request) throw new Error('Emergency request not found');
  if (request.status !== 'PENDING') throw new Error('Request is no longer pending');

  const emergency = await emergencyRepository.findById(emergencyId);
  if (!emergency) throw new Error('Emergency not found');
  if (emergency.status !== 'ACTIVE') throw new Error('Emergency is no longer active');

  // Accept request
  const accepted = await responderRepository.updateEmergencyRequest(emergencyId, responderId, 'ACCEPTED');

  // Mark responder as unavailable
  await responderRepository.setAvailability(responderId, false);

  return accepted;
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
  return await responderRepository.updateLocation(userId, latitude, longitude);
};

/**
 * Mark a responder as available or unavailable.
 */
export const setResponderAvailability = async (userId: string, isAvailable: boolean) => {
  return await responderRepository.setAvailability(userId, isAvailable);
};
