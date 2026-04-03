import { trackingRepository } from '../repositories/trackingRepository';
import { responderRepository } from '../repositories/responderRepository';
import logger from '../utils/logger';

/**
 * Submit a live location update for a responder during an active emergency.
 * Persists to DB and returns data to be broadcast via WebSocket.
 */
export const submitLocationUpdate = async (data: {
  emergencyId: string;
  responderId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  status: 'EN_ROUTE' | 'ARRIVED' | 'TREATING' | 'TRANSPORTED';
}) => {
  // Save to DB
  const tracking = await trackingRepository.addTrackingUpdate(data);

  // Also update the responder's current position in the Responder table
  await responderRepository.updateLocation(data.responderId, data.latitude, data.longitude);

  logger.info(`Tracking update for emergency ${data.emergencyId}: responder at [${data.latitude}, ${data.longitude}]`);

  return tracking;
};

/**
 * Get the full tracking history for an emergency.
 */
export const getTrackingHistory = async (emergencyId: string) => {
  return await trackingRepository.getTrackingHistory(emergencyId);
};

/**
 * Get latest position for an emergency (for map).
 */
export const getLatestTracking = async (emergencyId: string) => {
  return await trackingRepository.getLatestTracking(emergencyId);
};
