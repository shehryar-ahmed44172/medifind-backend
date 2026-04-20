import { trackingRepository } from '../repositories/trackingRepository';
import { responderRepository } from '../repositories/responderRepository';
import { getIo } from '../server';
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

  // Broadcast location update (FR7.4)
  getIo().to(`location:${data.emergencyId}`).emit('LOCATION_UPDATE', {
    type: "LOCATION_UPDATE",
    data: {
      emergencyId: data.emergencyId,
      responderId: data.responderId,
      latitude: data.latitude,
      longitude: data.longitude,
      status: data.status,
      // For now, ETA is recalculated based on progress (static speed assumption)
      estimatedArrivalMinutes: Math.max(0, Math.ceil((1.0 / 40) * 60)) // Placeholder Progress indicator
    }
  });

  // Handle arrival logic and metrics (The Perfect Approach)
  if (data.status === 'ARRIVED') {
    handleArrival(data.emergencyId, data.responderId).catch(err => 
      logger.error(`Failed to handle arrival metrics: ${err.message}`)
    );
  }

  return tracking;
};

/**
 * Internal logic for arrival: Notify and calculate metrics
 */
async function handleArrival(emergencyId: string, responderId: string) {
  // 1. Notify patient and caregivers
  getIo().to(`emergency:${emergencyId}`).emit('RESPONDER_ARRIVED', {
    type: 'RESPONDER_ARRIVED',
    data: { emergencyId, responderId, timestamp: new Date().toISOString() }
  });

  // 2. Calculate Response Time Metrics
  const { responderRepository } = await import('../repositories/responderRepository');
  const request = await responderRepository.findEmergencyRequest(emergencyId, responderId);
  
  if (request && request.sentAt) {
    const arrivalTime = new Date();
    const responseTimeSeconds = Math.round((arrivalTime.getTime() - new Date(request.sentAt).getTime()) / 1000);
    
    logger.info(`Emergency ${emergencyId}: Responder ${responderId} arrived in ${responseTimeSeconds}s`);
    
    // Update the running average in the database
    await responderRepository.updateResponderStats(responderId, responseTimeSeconds);
  }
}

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
