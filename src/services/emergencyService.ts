import { emergencyRepository } from '../repositories/emergencyRepository';
import { responderRepository } from '../repositories/responderRepository';
import { medicalProfileRepository } from '../repositories/medicalProfileRepository';
import { decryptJson } from '../utils/encryption';
import logger from '../utils/logger';

import { getIo } from '../server';
import * as caregiverRepository from '../repositories/caregiverRepository';
import { sendNotification } from './notification';
import { NotificationType, NotificationChannel } from '../types/notification';
import prisma from '../lib/prisma';

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

  // Attach medical profile to emergency context — decrypt sensitive fields before use
  const medicalProfile = await medicalProfileRepository.findByUserId(data.patientId);

  const allergies   = (decryptJson(medicalProfile?.allergies)        as string[]) || [];
  const chronic     = (decryptJson(medicalProfile?.chronicDiseases)   as string[]) || [];
  const medications = (decryptJson(medicalProfile?.medications)       as string[]) || [];
  const isDeaf = medicalProfile?.patientType === 'DEAF';

  // Build the fallback template first — used immediately if AI is slow or unavailable.
  // SOS creation must never be delayed by an AI call, so we race Gemini against a
  // 1.5-second hard timeout. The patient gets a confirmed SOS within normal latency.
  const fallbackSummary =
    (isDeaf ? 'ATTENTION: PATIENT IS DEAF AND UNABLE TO SPEAK. ' : '') +
    `Emergency Type: ${data.emergencyType || 'MEDICAL'}. ` +
    (allergies.length > 0 ? `Patient has allergies: ${allergies.join(', ')}. ` : '') +
    (chronic.length > 0 ? `Chronic conditions: ${chronic.join(', ')}.` : '');

  let voiceSummary: string;
  try {
    const { generateVoiceSummary } = await import('./aiService');
    const timeout = new Promise<string>((resolve) =>
      setTimeout(() => resolve(fallbackSummary), 1500)
    );
    voiceSummary = await Promise.race([
      generateVoiceSummary({
        patientName,
        emergencyType: data.emergencyType || 'MEDICAL',
        isDeaf,
        allergies,
        chronicDiseases: chronic,
        medications,
        bloodType: medicalProfile?.bloodType || 'Unknown',
      }),
      timeout,
    ]);
  } catch {
    voiceSummary = fallbackSummary;
  }

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
  notifyNearbyResponders(emergency.id, data.latitude, data.longitude, data.patientId, patientName, voiceSummary, data.emergencyType || 'OTHER').catch((err) =>
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

  const cancelPayload = {
    type: "EMERGENCY_STATUS_CHANGE",
    data: {
      emergencyId,
      newStatus: "CANCELLED",
      timestamp: new Date().toISOString()
    }
  };
  // Notify the emergency room (mobile clients watching this emergency)
  getIo().to(`emergency:${emergencyId}`).emit('EMERGENCY_STATUS_CHANGE', cancelPayload);
  // Notify admin dashboard so it updates in real-time without waiting for the poll
  getIo().to('admin_notifications').emit('EMERGENCY_STATUS_CHANGE', cancelPayload);

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
 * Update emergency status (Generic endpoint for ARRIVED, COMPLETED, etc.)
 */
export const updateEmergencyStatus = async (emergencyId: string, status: string) => {
  const emergency = await emergencyRepository.findById(emergencyId);
  if (!emergency) throw new Error('Emergency not found');

  const updated = await (emergencyRepository as any).updateStatus(emergencyId, status);

  const statusPayload = {
    type: "EMERGENCY_STATUS_CHANGE",
    data: {
      emergencyId,
      newStatus: status,
      timestamp: new Date().toISOString()
    }
  };
  getIo().to(`emergency:${emergencyId}`).emit('EMERGENCY_STATUS_CHANGE', statusPayload);
  // Also broadcast to admin dashboard for real-time updates
  getIo().to('admin_notifications').emit('EMERGENCY_STATUS_CHANGE', statusPayload);

  return updated;
};

/**
 * Get all active emergencies (for responders — ACTIVE only).
 */
export const getActiveEmergencies = async () => {
  return await emergencyRepository.findAllActive();
};

/**
 * Get ALL emergencies across all statuses (admin dashboard only).
 */
export const getAllEmergenciesForAdmin = async () => {
  return await (emergencyRepository as any).findAllForAdmin();
};

/**
 * Find nearby responders and send them emergency requests.
 */
// Maps each emergency type to the responder specialisations best suited for it.
// The list is ordered by priority (most qualified first).
// undefined means "any available responder" (used for generic / unknown types).
const SPECIALIST_MAP: Record<string, string[]> = {
  CARDIAC:             ['PARAMEDIC', 'EMT'],
  STROKE:              ['PARAMEDIC', 'EMT'],
  CHEST_PAIN:          ['PARAMEDIC', 'EMT'],
  SHORTNESS_OF_BREATH: ['PARAMEDIC', 'EMT', 'FIRST_RESPONDER'],
  TRAUMA:              ['PARAMEDIC', 'RESCUE_OFFICER', 'EMT'],
  SEIZURE:             ['PARAMEDIC', 'EMT'],
  DIABETIC:            ['PARAMEDIC', 'EMT', 'FIRST_RESPONDER'],
};

const notifyNearbyResponders = async (
  emergencyId: string,
  latitude: number,
  longitude: number,
  patientId: string,
  patientName: string = 'Patient',
  voiceSummary: string = '',
  emergencyType: string = 'OTHER'
) => {
  const { userRepository } = await import('../repositories/userRepository');
  const patient = await userRepository.findById(patientId);
  const emergency = await emergencyRepository.findById(emergencyId);

  if (!emergency) {
    logger.error(`Emergency ${emergencyId} not found for notification`);
    return;
  }

  // Step 1: Try specialist responders within 5 km first.
  const specialistTypes = SPECIALIST_MAP[emergencyType.toUpperCase()];
  let nearbyResponders = await responderRepository.findNearbyAvailable(latitude, longitude, 5, specialistTypes);

  if (nearbyResponders.length > 0) {
    logger.info(
      `[Dispatch] Found ${nearbyResponders.length} specialist(s) (${specialistTypes?.join(', ')}) ` +
      `for ${emergencyType} within 5km`
    );
  } else {
    // Step 2: Expand to 10 km — still specialists only.
    if (specialistTypes) {
      nearbyResponders = await responderRepository.findNearbyAvailable(latitude, longitude, 10, specialistTypes);
      logger.info(`[Dispatch] Specialist search expanded to 10km — found ${nearbyResponders.length}`);
    }

    // Step 3: No specialists anywhere → fall back to ANY available responder within 10 km.
    if (nearbyResponders.length === 0) {
      nearbyResponders = await responderRepository.findNearbyAvailable(latitude, longitude, 10);
      logger.warn(
        `[Dispatch] No specialist responders for ${emergencyType}. ` +
        `Falling back to all types — found ${nearbyResponders.length} within 10km`
      );
    }
  }

  if (nearbyResponders.length === 0) {
    // Try expanding radius to 10km (legacy path kept for safety)
    const expanded = await responderRepository.findNearbyAvailable(latitude, longitude, 10);
    logger.warn(`No responders in 5km, found ${expanded.length} in 10km`);

    if (expanded.length > 0) {
      // FIX: Actually add the expanded responders to the list so they get notified
      nearbyResponders.push(...expanded);
    } else if (process.env.NODE_ENV === 'development') {
      // DEVELOPMENT FALLBACK: If no one found, try to find ANY available responder for testing
      logger.warn('DEV MODE: No responders found in radius, searching for ANY available responder...');
      const anyAvailable = await prisma.responder.findFirst({
        where: {
          isAvailable: true,
          user: { isActive: true }
        },
        include: { user: { select: { fullName: true, phoneNumber: true, email: true } } }
      });

      if (anyAvailable) {
        (anyAvailable as any).distanceKm = 99.9; // Artificial distance
        nearbyResponders.push(anyAvailable as any);
        logger.info(`DEV MODE: Force-added responder ${anyAvailable.user.email} for verification`);
      } else {
        logger.error('DEV MODE: No available responders found even in fallback!');
      }
    }
  }

  // AI Responder Scorer: rank by weighted score (distance + rating + response time + specialist match)
  // Pure TypeScript — no API call, negligible latency
  const scoreResponder = (r: any): number => {
    const distScore   = 1 / Math.max(r.distanceKm, 0.1);
    const ratingScore = (r.rating ?? 5.0) / 5.0;
    const avgRtScore  = r.averageResponseTime ? 1 / Math.max(r.averageResponseTime, 1) : 0.5;
    const specBonus   = specialistTypes?.includes(r.responderType) ? 1.0 : 0.0;
    return distScore * 0.4 + ratingScore * 0.3 + avgRtScore * 0.2 + specBonus * 0.1;
  };
  nearbyResponders.sort((a, b) => scoreResponder(b) - scoreResponder(a));
  logger.info(`[Dispatch] Responders ranked by AI score (top: ${nearbyResponders[0]?.userId ?? 'none'})`);

  for (const responder of nearbyResponders) {
    try {
      logger.info(`[Emergency Notification] Processing responder ${responder.userId}...`);
      const existing = await responderRepository.findEmergencyRequest(emergencyId, responder.userId);
      if (!existing) {
        logger.info(`[Emergency Notification] Creating request for ${responder.userId}`);
        await responderRepository.createEmergencyRequest({
          emergencyId,
          responderId: responder.userId,
          distanceKm: responder.distanceKm,
          estimatedArrivalMinutes: Math.ceil((responder.distanceKm / 40) * 60), // Estimate at 40km/h
        });

        // Calculate remaining seconds for the countdown window (FR5.1)
        const now = new Date();
        const remainingSeconds = Math.max(0, Math.floor((emergency.cancellationDeadline.getTime() - now.getTime()) / 1000));

        // Use full notification system (IN_APP + PUSH via Firebase and logs to db)
        logger.info(`[Emergency Notification] Sending push/in-app notification to ${responder.userId}`);
        await sendNotification(responder.userId, {
          type: NotificationType.SOS_TRIGGERED,
          title: "EMERGENCY ALERT",
          body: `Emergency reported nearby by ${patientName}. ETA: ${Math.ceil(((responder.distanceKm || 0) / 40) * 60)} mins.`,
          channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
          priority: 'emergency',
          data: {
            id: emergencyId, // Map to entity id
            emergencyId,
            userId: patientId, // Map to entity userId
            patientId,
            status: "ACTIVE", // Current state
            emergencyType: emergencyType,
            patientName,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            distanceKm: (responder.distanceKm || 0).toString(),
            estimatedArrivalMinutes: Math.ceil(((responder.distanceKm || 0) / 40) * 60).toString(),
            messageExpiry: remainingSeconds.toString(),
            expiresAt: emergency.cancellationDeadline.toISOString(),
            serverTime: now.toISOString(),
            voiceSummary, // FR6 Voice Alert
            bloodType: patient?.medicalProfile?.bloodType || 'Unknown',
            allergies: JSON.stringify(decryptJson(patient?.medicalProfile?.allergies) || []),
            chronicDiseases: JSON.stringify(decryptJson(patient?.medicalProfile?.chronicDiseases) || []),
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
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
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

// Track which emergencies have already received a 60-second escalation alert (prevents re-alert on repeat checks)
const escalatedEmergencyIds = new Set<string>();

/**
 * Periodically check for active emergencies that haven't been accepted (FR5.8 Escalation).
 * At 60s: AI generates an admin alert and re-dispatches with wider radius.
 * At 120s: emergency is force-cancelled by the system.
 */
export const checkAndEscalate = async () => {
  const activeEmergencies = await emergencyRepository.findAllActive();
  const now = new Date();

  for (const emergency of activeEmergencies) {
    const ageSeconds = (now.getTime() - new Date(emergency.createdAt).getTime()) / 1000;

    // 60s bracket: AI escalation alert to admin + wider re-dispatch
    if (ageSeconds > 60 && ageSeconds <= 120 && !escalatedEmergencyIds.has(emergency.id)) {
      const hasAccepted = (emergency.emergencyRequests as any[])?.some((r: any) => r.status === 'ACCEPTED');
      if (!hasAccepted) {
        escalatedEmergencyIds.add(emergency.id);
        try {
          const { generateNotificationDraft } = await import('./aiService');
          const draft = await generateNotificationDraft(
            `URGENT: Emergency ${emergency.id} (${(emergency as any).emergencyType}) has had no responder acceptance for over 60 seconds. Patient at coordinates ${(emergency as any).latitude}, ${(emergency as any).longitude}.`
          );
          getIo().to('admin_notifications').emit('ESCALATION_ALERT', {
            type: 'ESCALATION_ALERT',
            data: {
              emergencyId: emergency.id,
              title: draft.title,
              body: draft.body,
              ageSeconds: Math.round(ageSeconds),
              timestamp: new Date().toISOString(),
            },
          });
          logger.warn(`[Escalation] 60s alert sent for emergency ${emergency.id}: "${draft.title}"`);
          // Re-dispatch to catch any newly available responders
          notifyNearbyResponders(
            emergency.id,
            (emergency as any).latitude,
            (emergency as any).longitude,
            (emergency as any).patientId,
            (emergency as any).patient?.fullName || 'Patient',
            (emergency as any).voiceSummary || '',
            (emergency as any).emergencyType || 'OTHER'
          ).catch(() => {});
        } catch (err: any) {
          logger.error(`[Escalation] Failed to send 60s alert for ${emergency.id}: ${err.message}`);
        }
      }
    }

    // Auto-cancel emergencies with no accepted responder after 2 minutes
    if (ageSeconds > 120) {
      logger.warn(`[Escalation] Auto-cancelling emergency ${emergency.id} — no responder within ${Math.round(ageSeconds)}s`);

      try {
        // Force-cancel directly via repository (bypasses patient cancellation window —
        // this is a system-initiated cleanup, not a patient-initiated cancel).
        await emergencyRepository.cancel(emergency.id);

        const cancelPayload = {
          type: 'EMERGENCY_STATUS_CHANGE',
          data: {
            emergencyId: emergency.id,
            newStatus: 'CANCELLED',
            reason: 'NO_RESPONDER_AVAILABLE',
            timestamp: new Date().toISOString(),
          },
        };

        // Wake up the patient's SOS screen and admin dashboard
        getIo().to(`emergency:${emergency.id}`).emit('EMERGENCY_STATUS_CHANGE', cancelPayload);
        getIo().to('admin_notifications').emit('EMERGENCY_STATUS_CHANGE', cancelPayload);

        // Push notification to patient so they know even if the socket missed them
        const patientId = (emergency as any).patientId;
        if (patientId) {
          sendNotification(patientId, {
            type: NotificationType.EMERGENCY_RESOLVED,
            title: 'No Responders Available',
            body: 'Your SOS request was automatically cancelled — no responders were nearby. Please call 1122.',
            channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
            priority: 'high',
            data: { emergencyId: emergency.id, status: 'CANCELLED' },
          }).catch(err =>
            logger.error(`[Escalation] Failed to push-notify patient ${patientId}: ${err.message}`)
          );
        }

        logger.info(`[Escalation] Emergency ${emergency.id} auto-cancelled and patient notified.`);
      } catch (err: any) {
        logger.error(`[Escalation] Failed to auto-cancel emergency ${emergency.id}: ${err.message}`);
      }
    }
  }
};
