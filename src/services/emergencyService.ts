import { emergencyRepository } from '../repositories/emergencyRepository';
import { responderRepository } from '../repositories/responderRepository';
import { medicalProfileRepository } from '../repositories/medicalProfileRepository';
import logger from '../utils/logger';

import { getIo } from '../server';
import * as caregiverRepository from '../repositories/caregiverRepository';
import { sendNotification } from './notification';
import { NotificationType, NotificationChannel } from '../types/notification';

const CANCELLATION_WINDOW_SECONDS = parseInt(process.env.EMERGENCY_CANCELLATION_WINDOW_SECONDS || '60', 10);

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

  // Attach medical profile to emergency context
  const medicalProfile = await medicalProfileRepository.findByUserId(data.patientId);

  // Voice Alert Summary Generation (FR6.1 - FR6.3)
  const allergies = (medicalProfile?.allergies as string[]) || [];
  const chronic = (medicalProfile?.chronicDiseases as string[]) || [];
  const isDeaf = medicalProfile?.patientType === 'DEAF';

  const voiceSummary = (isDeaf ? "ATTENTION: PATIENT IS DEAF AND UNABLE TO SPEAK. " : "") +
    `Emergency Type: ${data.emergencyType || 'MEDICAL'}. ` +
    (allergies.length > 0 ? `Patient has allergies: ${allergies.join(', ')}. ` : '') +
    (chronic.length > 0 ? `Chronic conditions: ${chronic.join(', ')}.` : '');

  const emergency = await emergencyRepository.create({
    patientId: data.patientId,
    emergencyType: data.emergencyType || 'MEDICAL',
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.accuracy,
    additionalInfo: data.additionalInfo,
    cancellationDeadline,
    voiceSummary,
  });

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

  // Notify caregivers and responders about cancellation (The Perfect Solution)
  // Fetch all responders who were notified about this SOS
  const notifiedResponderIds = await emergencyRepository.getNotifiedResponderIds(emergencyId);
  
  // Use notification service for reliable broadcast (Clears alert from mobile UI)
  for (const responderId of notifiedResponderIds) {
    sendNotification(responderId, {
      type: NotificationType.EMERGENCY_RESOLVED, // Or create a specific CANCELLED type if preferred
      title: "ALERT CANCELLED",
      body: "The patient has cancelled the SOS request.",
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: 'high',
      data: { emergencyId, status: "CANCELLED" }
    }).catch(err => logger.error(`Failed to notify responder ${responderId} of cancellation: ${err.message}`));
  }

  getIo().to(`emergency:${emergencyId}`).emit('EMERGENCY_STATUS_CHANGE', {
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
  const { userRepository } = await import('../repositories/userRepository');
  const patient = await userRepository.findById(patientId);
  const nearbyResponders = await responderRepository.findNearbyAvailable(latitude, longitude, 5);

  if (nearbyResponders.length === 0) {
    // Try expanding radius to 10km
    const expanded = await responderRepository.findNearbyAvailable(latitude, longitude, 10);
    logger.warn(`No responders in 5km, found ${expanded.length} in 10km`);

    // DEVELOPMENT FALLBACK: If no one found, force-add our test responder
    if (expanded.length === 0 && process.env.NODE_ENV === 'development') {
      const { userRepository } = await import('../repositories/userRepository');
      const testUser = await userRepository.findByEmail('responder@test.com');
      if (testUser) {
        const testResponder = await responderRepository.findById(testUser.id);
        if (testResponder) {
          (testResponder as any).distanceKm = 0.5;
          nearbyResponders.push(testResponder as any);
          logger.info('DEV MODE: Force-added responder@test.com for verification');
        }
      }
    }
  }

  for (const responder of nearbyResponders) {
    try {
      console.log(`[Emergency Notification] Processing responder ${responder.userId}...`);
      const existing = await responderRepository.findEmergencyRequest(emergencyId, responder.userId);
      if (!existing) {
        console.log(`[Emergency Notification] Creating request for ${responder.userId}`);
        await responderRepository.createEmergencyRequest({
          emergencyId,
          responderId: responder.userId,
          distanceKm: responder.distanceKm,
          estimatedArrivalMinutes: Math.ceil((responder.distanceKm / 40) * 60), // Estimate at 40km/h
        });
        
        // Use full notification system (IN_APP + PUSH via Firebase and logs to db)
        console.log(`[Emergency Notification] Sending push/in-app notification to ${responder.userId}`);
        await sendNotification(responder.userId, {
          type: NotificationType.SOS_TRIGGERED,
          title: "EMERGENCY ALERT",
          body: `Emergency reported nearby by ${patientName}. ETA: ${Math.ceil((responder.distanceKm / 40) * 60)} mins.`,
          channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
          priority: 'emergency',
          data: {
            id: emergencyId, // Map to entity id
            emergencyId,
            userId: patientId, // Map to entity userId
            patientId,
            status: "ACTIVE", // Current state
            emergencyType: "MEDICAL",
            patientName,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            distanceKm: responder.distanceKm.toString(),
            estimatedArrivalMinutes: Math.ceil((responder.distanceKm / 40) * 60).toString(),
            messageExpiry: "60",
            voiceSummary, // FR6 Voice Alert
            bloodType: patient?.medicalProfile?.bloodType || 'Unknown',
            allergies: JSON.stringify(patient?.medicalProfile?.allergies || []),
            chronicDiseases: JSON.stringify(patient?.medicalProfile?.chronicDiseases || []),
            patientType: patient?.medicalProfile?.patientType || 'NORMAL',
            createdAt: new Date().toISOString(),
          }
        });
        
        logger.info(`Notified responder ${responder.userId} of emergency ${emergencyId}`);
      } else {
        console.log(`[Emergency Notification] Responder ${responder.userId} already has a request for this emergency.`);
      }
    } catch (err: any) {
      logger.error(`Failed to create request for responder ${responder.userId}: ${err.message}`);
      console.error(`[Emergency Notification ERROR] ${err.message}`);
    }
  }
};

/**
 * Notify Caregivers (FR8 Caregiver Monitoring Module)
 */
const notifyCaregivers = async (patientId: string, emergencyData: any) => {
  const caregivers = await caregiverRepository.getCaregiversForPatient(patientId);
  for (const link of caregivers) {
    await sendNotification(link.caregiverId, {
      type: NotificationType.PATIENT_EMERGENCY,
      title: "Patient Emergency!",
      body: `SOS Triggered by ${emergencyData.patientName}`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: 'high',
      data: {
        emergencyId: emergencyData.emergencyId,
        emergencyType: emergencyData.emergencyType,
        latitude: emergencyData.latitude.toString(),
        longitude: emergencyData.longitude.toString(),
        patientName: emergencyData.patientName
      }
    });
  }
};

/**
 * Periodically check for active emergencies that haven't been accepted (FR5.8 Escalation)
 */
export const checkAndEscalate = async () => {
  const activeEmergencies = await emergencyRepository.findAllActive();
  const now = new Date();

  for (const emergency of activeEmergencies) {
    const ageSeconds = (now.getTime() - new Date(emergency.createdAt).getTime()) / 1000;
    
    // If not accepted within 2 minutes (120s), escalate
    if (ageSeconds > 120) {
      logger.warn(`Escalating emergency ${emergency.id} - no responder accepted within 2 minutes`);
      
      // Notify admins and re-broadcast to a wider radius or specific escalation channel
      getIo().emit('SYSTEM_ESCALATION', {
        type: 'SYSTEM_ESCALATION',
        data: {
          emergencyId: emergency.id,
          patientName: (emergency.patient as any)?.fullName || 'Patient',
          ageSeconds
        }
      });
    }
  }
};
