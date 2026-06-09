import { trackingRepository } from '../repositories/trackingRepository';
import { responderRepository } from '../repositories/responderRepository';
import { emergencyRepository } from '../repositories/emergencyRepository';
import * as caregiverRepository from '../repositories/caregiverRepository';
import { sendNotification } from './notification';
import { NotificationType, NotificationChannel } from '../types/notification';
import { getIo } from '../server';
import logger from '../utils/logger';
import { haversineDistanceKm, estimateEtaMinutes } from '../utils/geoValidation';

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
  // Get latest tracking update to check for status change
  const latest = await trackingRepository.getLatestTracking(data.emergencyId);
  const statusChanged = !latest || latest.status !== data.status;

  // Save to DB
  const tracking = await trackingRepository.addTrackingUpdate(data);

  // Also update the responder's current position in the Responder table
  await responderRepository.updateLocation(data.responderId, data.latitude, data.longitude);

  logger.info(`Tracking update for emergency ${data.emergencyId}: responder at [${data.latitude}, ${data.longitude}] (Status: ${data.status})`);

  // Calculate live ETA from responder's current position to patient's position
  let estimatedArrivalMinutes = 5; // fallback if we can't fetch emergency coords
  try {
    const emergency = await emergencyRepository.findById(data.emergencyId);
    if (emergency && emergency.latitude != null && emergency.longitude != null) {
      const distKm = haversineDistanceKm(
        data.latitude, data.longitude,
        emergency.latitude, emergency.longitude,
      );
      estimatedArrivalMinutes = data.status === 'ARRIVED' ? 0 : estimateEtaMinutes(distKm);
    }
  } catch (etaErr: any) {
    logger.warn(`ETA calculation failed for emergency ${data.emergencyId}: ${etaErr.message}`);
  }

  // Broadcast location update (FR7.4)
  const locationPayload = {
    type: "LOCATION_UPDATE",
    data: {
      emergencyId: data.emergencyId,
      responderId: data.responderId,
      latitude: data.latitude,
      longitude: data.longitude,
      status: data.status,
      estimatedArrivalMinutes,
    }
  };

  getIo().to(`location:${data.emergencyId}`).emit('LOCATION_UPDATE', locationPayload);
  getIo().to(`emergency:${data.emergencyId}`).emit('LOCATION_UPDATE', locationPayload);
  // Mirror to admin room so the live ambulance map marker moves in real-time on the SOS Monitor
  getIo().to('admin_notifications').emit('LOCATION_UPDATE', locationPayload);

  // Status-specific event emits for clearer UI hooks (FR7.4)
  // Only emit these when the status actually changes to avoid noise
  if (statusChanged) {
    const statusEventMap: Record<string, string> = {
      'EN_ROUTE': 'RESPONDER_EN_ROUTE',
      'ARRIVED': 'RESPONDER_ARRIVED',
      'TREATING': 'RESPONDER_TREATING',
      'TRANSPORTED': 'RESPONDER_TRANSPORTED'
    };

    const eventName = statusEventMap[data.status];
    if (eventName) {
      getIo().to(`emergency:${data.emergencyId}`).emit(eventName, {
        type: eventName,
        data: { 
          emergencyId: data.emergencyId, 
          responderId: data.responderId, 
          status: data.status,
          timestamp: new Date().toISOString() 
        }
      });
    }

    // Handle arrival logic and metrics (Response time, stats)
    if (data.status === 'ARRIVED') {
      handleArrival(data.emergencyId, data.responderId).catch(err => 
        logger.error(`Failed to handle arrival metrics: ${err.message}`)
      );
    }

    // Notify stakeholders of status changes via Push (FR7.4)
    if (['ARRIVED', 'TREATING', 'TRANSPORTED'].includes(data.status)) {
      notifyStakeholdersOfStatusChange(data.emergencyId, data.responderId, data.status).catch(err =>
        logger.error(`Failed to notify stakeholders of status change: ${err.message}`)
      );
    }
  }

  return tracking;
};

/**
 * Notify Patient and Caregivers of status changes via Push Notifications
 */
async function notifyStakeholdersOfStatusChange(emergencyId: string, responderId: string, status: string) {
  const emergency = await emergencyRepository.findById(emergencyId);
  if (!emergency) return;

  const responder = await responderRepository.findById(responderId);
  const responderName = responder?.user?.fullName || 'Responder';

  const statusMessages: Record<string, string> = {
    'ARRIVED': `${responderName} has arrived at the location.`,
    'TREATING': `${responderName} is now providing medical assistance.`,
    'TRANSPORTED': `Patient is being transported to the nearest medical facility.`
  };

  const body = statusMessages[status] || `Responder status updated: ${status}`;

  // 1. Notify Patient
  await sendNotification(emergency.patientId, {
    type: NotificationType.RESPONDER_LOCATION_UPDATE,
    title: "Help has arrived!",
    body: body,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    priority: 'high',
    data: { emergencyId, status }
  });

  // 2. Notify Caregivers
  const caregivers = await caregiverRepository.getCaregiversForPatient(emergency.patientId);
  for (const link of caregivers) {
    await sendNotification(link.caregiverId, {
      type: NotificationType.PATIENT_EMERGENCY,
      title: "Emergency Update",
      body: `Update for ${emergency.patient.fullName}: ${body}`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: 'high',
      data: { emergencyId, status }
    });
  }
}

/**
 * Internal logic for arrival: Notify and calculate metrics
 */
async function handleArrival(emergencyId: string, responderId: string) {
  // NOTE: RESPONDER_ARRIVED socket event is now handled in the main loop to avoid duplication

  // Calculate Response Time Metrics
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
