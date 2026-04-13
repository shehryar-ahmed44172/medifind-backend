import { emergencyRepository } from '../repositories/emergencyRepository';
import { responderRepository } from '../repositories/responderRepository';
import { medicalProfileRepository } from '../repositories/medicalProfileRepository';
import logger from '../utils/logger';

import { io } from '../server';
import { caregiverRepository } from '../repositories/caregiverRepository';

const CANCELLATION_WINDOW_SECONDS = 10;

/**
 * Create a new SOS emergency.
 * Sets a 10-second cancellation deadline as required.
 */
export const createEmergency = async (data: {
  patientId: string;
  emergencyType?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  additionalInfo?: string;
}) => {
  const cancellationDeadline = new Date(Date.now() + CANCELLATION_WINDOW_SECONDS * 1000);

  // Fetch Patient Name for alerts
  const patientUser = await (await import('../repositories/userRepository')).userRepository.findById(data.patientId);
  const patientName = patientUser?.fullName || 'Unknown Patient';

  const emergency = await emergencyRepository.create({
    patientId: data.patientId,
    emergencyType: data.emergencyType || 'MEDICAL',
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.accuracy,
    additionalInfo: data.additionalInfo,
    cancellationDeadline,
  });

  // Attach medical profile to emergency context (non-blocking)
  const medicalProfile = await medicalProfileRepository.findByUserId(data.patientId);
  logger.info(`Emergency ${emergency.id} created for patient ${data.patientId}`);
  
  // Voice Alert Summary Generation (FR6.1 - FR6.3)
  const allergies = medicalProfile?.allergies ? JSON.parse(medicalProfile.allergies as string) : [];
  const chronic = medicalProfile?.chronicDiseases ? JSON.parse(medicalProfile.chronicDiseases as string) : [];
  const voiceSummary = `Emergency Type: ${emergency.emergencyType}. ` +
    (allergies.length > 0 ? `Patient has allergies: ${allergies.join(', ')}. ` : '') +
    (chronic.length > 0 ? `Chronic conditions: ${chronic.join(', ')}.` : '');

  // Notify caregivers immediately via socket
  notifyCaregivers(data.patientId, {
    emergencyId: emergency.id,
    emergencyType: emergency.emergencyType,
    latitude: emergency.latitude,
    longitude: emergency.longitude,
    patientName
  }).catch((err) => logger.error(`Failed to notify caregivers: ${err.message}`));

  // Notify nearby responders asynchronously
  notifyNearbyResponders(emergency.id, data.latitude, data.longitude, data.patientId, patientName, voiceSummary).catch((err) =>
    logger.error(`Failed to notify responders: ${err.message}`)
  );

  return {
    ...emergency,
    cancellationDeadline,
    cancellationWindowSeconds: CANCELLATION_WINDOW_SECONDS,
    medicalProfile,
    voiceSummary
  };
};

/**
 * Cancel an emergency - only within the 10-second window.
 */
export const cancelEmergency = async (emergencyId: string, patientId: string) => {
  const emergency = await emergencyRepository.findById(emergencyId);

  if (!emergency) throw new Error('Emergency not found');
  if (emergency.patientId !== patientId) throw new Error('Unauthorized');
  if (emergency.status !== 'ACTIVE') throw new Error('Emergency is not active');

  // CRITICAL: enforce 10-second cancellation window
  const now = new Date();
  if (now > emergency.cancellationDeadline) {
    throw new Error('Cancellation window has expired. Emergency cannot be cancelled.');
  }

  const cancelled = await emergencyRepository.cancel(emergencyId);

  // Notify caregivers and responders about cancellation (FR4.6)
  io.to(`emergency:${emergencyId}`).emit('EMERGENCY_STATUS_CHANGE', {
    type: "EMERGENCY_STATUS_CHANGE",
    data: {
      emergencyId,
      newStatus: "CANCELLED",
      timestamp: new Date().toISOString()
    }
  });

  return cancelled;
};

/**
 * Get full emergency details.
 */
export const getEmergency = async (emergencyId: string) => {
  const emergency = await emergencyRepository.findById(emergencyId);
  if (!emergency) throw new Error('Emergency not found');
  return emergency;
};

/**
 * Get all active emergencies (for admin/responders).
 */
export const getActiveEmergencies = async () => {
  return await emergencyRepository.findAllActive();
};

/**
 * Find nearby responders and send them emergency requests.
 */
const notifyNearbyResponders = async (
  emergencyId: string,
  latitude: number,
  longitude: number,
  patientId: string,
  patientName: string = 'Patient',
  voiceSummary: string = ''
) => {
  const nearbyResponders = await responderRepository.findNearbyAvailable(latitude, longitude, 5);

  if (nearbyResponders.length === 0) {
    // Try expanding radius to 10km
    const expanded = await responderRepository.findNearbyAvailable(latitude, longitude, 10);
    logger.warn(`No responders in 5km, found ${expanded.length} in 10km`);
  }

  for (const responder of nearbyResponders) {
    try {
      const existing = await responderRepository.findEmergencyRequest(emergencyId, responder.userId);
      if (!existing) {
        await responderRepository.createEmergencyRequest({
          emergencyId,
          responderId: responder.userId,
          distanceKm: responder.distanceKm,
          estimatedArrivalMinutes: Math.ceil((responder.distanceKm / 40) * 60), // Estimate at 40km/h
        });
        
        // Emit Socket.io EMERGENCY_ALERT (MUST HAVE FORMAT)
        io.to(`notifications:${responder.userId}`).emit('EMERGENCY_ALERT', {
          type: "EMERGENCY_ALERT",
          data: {
            emergencyId,
            emergencyType: "MEDICAL",
            patientName,
            latitude,
            longitude,
            distanceKm: responder.distanceKm,
            estimatedArrivalMinutes: Math.ceil((responder.distanceKm / 40) * 60),
            messageExpiry: 60,
            voiceSummary // FR6 Voice Alert
          }
        });
        
        logger.info(`Notified responder ${responder.userId} of emergency ${emergencyId}`);
      }
    } catch (err: any) {
      logger.error(`Failed to create request for responder ${responder.userId}: ${err.message}`);
    }
  }
};

/**
 * Notify Caregivers (FR8 Caregiver Monitoring Module)
 */
const notifyCaregivers = async (patientId: string, emergencyData: any) => {
  const caregivers = await caregiverRepository.getCaregiversForPatient(patientId);
  for (const link of caregivers) {
    io.to(`notifications:${link.caregiverId}`).emit('CAREGIVER_ALERT', {
      type: "CAREGIVER_ALERT",
      data: emergencyData
    });
  }
};
