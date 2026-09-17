import { OPEN_EMERGENCY_STATUSES } from '../utils/accessControl';
import { emergencyRepository } from '../repositories/emergencyRepository';
import { responderRepository } from '../repositories/responderRepository';
import { medicalProfileRepository } from '../repositories/medicalProfileRepository';
import { decryptJson } from '../utils/encryption';
import { toNameList } from '../utils/medical';
import { validatePakistanCoordinates } from '../utils/geoValidation';
import { decryptSensitiveFields } from './medicalProfileService';
import logger from '../utils/logger';

import { getIo } from '../server';
import * as caregiverRepository from '../repositories/caregiverRepository';
import { sendNotification } from './notification';
import { NotificationType, NotificationChannel } from '../types/notification';
import prisma from '../lib/prisma';

const CANCELLATION_WINDOW_SECONDS = parseInt(process.env.EMERGENCY_CANCELLATION_WINDOW_SECONDS || '60', 10);

/** Emergency statuses that mean the SOS is still open. */
const OPEN_STATUSES = ['ACTIVE', 'ASSIGNED', 'ARRIVED'] as const;

/** Decrypts the medical profile nested in an emergency before it is sent to a client. */
const withDecryptedProfile = <T extends { patient?: any }>(emergency: T): T => {
  if (!emergency?.patient?.medicalProfile) return emergency;
  return {
    ...emergency,
    patient: { ...emergency.patient, medicalProfile: decryptSensitiveFields(emergency.patient.medicalProfile) },
  };
};

/**
 * Create a new SOS emergency.
 * Sets a cancellation deadline (EMERGENCY_CANCELLATION_WINDOW_SECONDS, default 60s).
 * If the patient already has an open SOS, that one is returned instead of creating a duplicate.
 */
export const createEmergency = async (data: {
  patientId: string;
  emergencyType?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  additionalInfo?: string;
  locationMocked?: boolean;
}) => {
  if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
    throw new Error('Valid latitude and longitude are required');
  }
  const coordError = validatePakistanCoordinates(data.latitude, data.longitude);
  if (coordError) throw new Error(coordError);

  // Idempotent SOS: a double tap or retry must not dispatch responders twice
  const openEmergency = await prisma.emergency.findFirst({
    where: { patientId: data.patientId, status: { in: [...OPEN_STATUSES] } },
    orderBy: { createdAt: 'desc' },
  });
  if (openEmergency) {
    logger.warn(`[SOS] Patient ${data.patientId} already has open emergency ${openEmergency.id} — returning it`);
    return {
      ...openEmergency,
      alreadyActive: true,
      cancellationWindowSeconds: Math.max(0, Math.floor((openEmergency.cancellationDeadline.getTime() - Date.now()) / 1000)),
      medicalProfile: null,
      voiceSummary: openEmergency.voiceSummary,
    };
  }

  const { assertSosAllowed } = await import('./sosSafeguards');
  await assertSosAllowed(data.patientId, { locationMocked: !!data.locationMocked });

  const cancellationDeadline = new Date(Date.now() + CANCELLATION_WINDOW_SECONDS * 1000);

  // Fetch Patient Name for alerts
  const patientUser = await (await import('../repositories/userRepository')).userRepository.findById(data.patientId);
  const patientName = patientUser?.fullName || 'Unknown Patient';

  // Attach medical profile to emergency context — decrypt sensitive fields before use
  const medicalProfile = await medicalProfileRepository.findByUserId(data.patientId);

  const allergies   = (decryptJson(medicalProfile?.allergies)        as string[]) || [];
  const chronic     = (decryptJson(medicalProfile?.chronicDiseases)   as string[]) || [];
  const medications = toNameList(decryptJson(medicalProfile?.medications));
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
    locationMocked: !!data.locationMocked,
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
    medicalProfile: medicalProfile ? decryptSensitiveFields(medicalProfile as any) : null,
    voiceSummary
  };
};

/**
 * Cancel an emergency - only within the cancellation window.
 */
export const cancelEmergency = async (emergencyId: string, patientId: string) => {
  const emergency = await emergencyRepository.findById(emergencyId);

  if (!emergency) throw new Error('Emergency not found');
  if (emergency.patientId !== patientId) throw new Error('Unauthorized');
  if (emergency.status !== 'ACTIVE') throw new Error('Emergency is not active');

  // CRITICAL: enforce the cancellation window
  const now = new Date();
  if (now > emergency.cancellationDeadline) {
    throw new Error('Cancellation window has expired. Emergency cannot be cancelled.');
  }

  const cancelled = await emergencyRepository.cancel(emergencyId);
  clearDispatchState(emergencyId);

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
 * Get full emergency details (medical profile decrypted).
 */
export const getEmergency = async (emergencyId: string) => {
  const emergency = await emergencyRepository.findById(emergencyId);
  if (!emergency) throw new Error('Emergency not found');

  const assigned = emergency.emergencyRequests.find(r => !!r.acceptedAt && (r.status === 'ACCEPTED' || r.status === 'COMPLETED'));
  return {
    ...withDecryptedProfile(emergency),
    assignedResponderId: assigned?.responderId ?? null,
    assignedResponderName: assigned?.responder?.user?.fullName ?? null,
  };
};

const TRACKING_STATUSES = ['EN_ROUTE', 'ARRIVED', 'TREATING', 'TRANSPORTED'] as const;
type TrackingStatusValue = typeof TRACKING_STATUSES[number];

/**
 * Update emergency status.
 *  - Assigned responder: EN_ROUTE / ARRIVED / TREATING / TRANSPORTED are recorded as tracking
 *    updates (patient + caregivers notified); RESOLVED completes the emergency.
 *  - Admin: may set any EmergencyStatus (e.g. CANCELLED); the responder is released.
 */
export const updateEmergencyStatus = async (
  emergencyId: string,
  rawStatus: string,
  actor: { userId: string; role: string },
  location?: { latitude?: number; longitude?: number },
) => {
  const status = String(rawStatus || '').toUpperCase();
  const emergency = await emergencyRepository.findById(emergencyId);
  if (!emergency) throw new Error('Emergency not found');

  if (actor.role === 'RESPONDER') {
    const { isAssignedResponder } = await import('../utils/accessControl');
    if (!(await isAssignedResponder(actor.userId, emergencyId))) {
      throw new Error('Only the assigned responder can update this emergency.');
    }

    if (status === 'RESOLVED' || status === 'COMPLETED') {
      const { resolveEmergency } = await import('./responderService');
      return resolveEmergency(emergencyId, actor.userId);
    }

    if (!(TRACKING_STATUSES as readonly string[]).includes(status)) {
      throw new Error(`Invalid status. Allowed: ${TRACKING_STATUSES.join(', ')}, RESOLVED`);
    }

    const responder = await prisma.responder.findUnique({ where: { userId: actor.userId } });
    const latitude = Number.isFinite(location?.latitude) ? location!.latitude! : responder?.currentLatitude;
    const longitude = Number.isFinite(location?.longitude) ? location!.longitude! : responder?.currentLongitude;
    if (latitude == null || longitude == null) {
      throw new Error('Current location is required to update status. Please enable GPS.');
    }

    const { submitLocationUpdate } = await import('./trackingService');
    await submitLocationUpdate({
      emergencyId,
      responderId: actor.userId,
      latitude,
      longitude,
      status: status as TrackingStatusValue,
    });

    if (status === 'ARRIVED') {
      await prisma.emergency.updateMany({ where: { id: emergencyId, status: 'ASSIGNED' }, data: { status: 'ARRIVED' } });
    }

    const payload = {
      type: 'EMERGENCY_STATUS_CHANGE',
      data: { emergencyId, newStatus: status, responderId: actor.userId, timestamp: new Date().toISOString() },
    };
    getIo().to(`emergency:${emergencyId}`).emit('EMERGENCY_STATUS_CHANGE', payload);
    getIo().to('admin_notifications').emit('EMERGENCY_STATUS_CHANGE', payload);
    return { ...emergency, trackingStatus: status };
  }

  // ADMIN override
  const allowed = ['ACTIVE', 'ASSIGNED', 'ARRIVED', 'RESOLVED', 'COMPLETED', 'CANCELLED'];
  if (!allowed.includes(status)) {
    throw new Error(`Invalid status. Allowed: ${allowed.join(', ')}`);
  }

  const updated = status === 'CANCELLED'
    ? await emergencyRepository.cancel(emergencyId)
    : await emergencyRepository.updateStatus(emergencyId, status);

  // Closing an emergency releases the assigned responder
  if (['CANCELLED', 'RESOLVED', 'COMPLETED'].includes(status)) {
    clearDispatchState(emergencyId);
    const accepted = await prisma.emergencyRequest.findMany({
      where: { emergencyId, status: 'ACCEPTED' },
      select: { responderId: true },
    });
    await prisma.emergencyRequest.updateMany({
      where: { emergencyId, status: 'ACCEPTED' },
      data: { status: status === 'CANCELLED' ? 'REJECTED' : 'COMPLETED' },
    });
    if (accepted.length) {
      await prisma.responder.updateMany({
        where: { userId: { in: accepted.map(a => a.responderId) } },
        data: { isAvailable: true },
      });
    }
  }

  const statusPayload = {
    type: 'EMERGENCY_STATUS_CHANGE',
    data: { emergencyId, newStatus: status, updatedBy: 'ADMIN', timestamp: new Date().toISOString() },
  };
  getIo().to(`emergency:${emergencyId}`).emit('EMERGENCY_STATUS_CHANGE', statusPayload);
  getIo().to('admin_notifications').emit('EMERGENCY_STATUS_CHANGE', statusPayload);

  return updated;
};

/**
 * Emergency history visible to a patient (own) or caregiver (linked patients).
 */
export const getEmergencyHistoryForUser = async (userId: string, role: string, limit = 50) => {
  let patientIds: string[] = [];
  if (role === 'PATIENT') {
    patientIds = [userId];
  } else if (role === 'CAREGIVER') {
    const links = await caregiverRepository.getPatientsForCaregiver(userId);
    patientIds = links.map((l: any) => l.patientId);
  }
  if (patientIds.length === 0) return [];

  const emergencies = await prisma.emergency.findMany({
    where: { patientId: { in: patientIds } },
    include: {
      patient: { select: { id: true, fullName: true, phoneNumber: true } },
      emergencyRequests: {
        where: { status: { in: ['ACCEPTED', 'COMPLETED'] }, acceptedAt: { not: null } },
        select: {
          responderId: true,
          status: true,
          acceptedAt: true,
          patientRating: true,
          responder: { select: { rating: true, organization: true, user: { select: { fullName: true, phoneNumber: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
  });

  return emergencies.map(({ emergencyRequests, ...e }) => {
    const assigned = emergencyRequests[0];
    return {
      ...e,
      responder: assigned
        ? {
            id: assigned.responderId,
            fullName: assigned.responder.user.fullName,
            // Contact ends with the emergency
            phoneNumber: (OPEN_EMERGENCY_STATUSES as readonly string[]).includes(e.status)
              ? assigned.responder.user.phoneNumber
              : undefined,
            organization: assigned.responder.organization,
            rating: assigned.responder.rating,
            acceptedAt: assigned.acceptedAt,
          }
        : null,
      patientRating: assigned?.patientRating ?? null,
    };
  });
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

  if (nearbyResponders.length === 0 && process.env.NODE_ENV === 'development') {
    // DEVELOPMENT FALLBACK: lets the full flow be demoed with a responder outside the radius
    logger.warn('DEV MODE: No responders found in radius, searching for ANY available responder...');
    const anyAvailable = await prisma.responder.findFirst({
      where: { isAvailable: true, user: { isActive: true } },
      include: { user: { select: { fullName: true, phoneNumber: true, email: true } } },
    });

    if (anyAvailable) {
      (anyAvailable as any).distanceKm = 99.9; // Artificial distance
      nearbyResponders.push(anyAvailable as any);
      logger.info(`DEV MODE: Force-added responder ${anyAvailable.user.email} for verification`);
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

        // Use full notification system (IN_APP + self-hosted PUSH, logged to db)
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
        logger.info(`[Emergency Notification] Responder ${responder.userId} already has a request for this emergency.`);
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
    // Put the caregiver's live sockets into the emergency rooms so they receive
    // status changes and the responder's live location without extra round-trips
    getIo().in(`notifications:${link.caregiverId}`).socketsJoin([
      `emergency:${emergencyData.emergencyId}`,
      `location:${emergencyData.emergencyId}`,
    ]);
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
// When an emergency was last (re-)dispatched; escalation timing is measured from here
const dispatchStartedAt = new Map<string, number>();

const clearDispatchState = (emergencyId: string) => {
  escalatedEmergencyIds.delete(emergencyId);
  dispatchStartedAt.delete(emergencyId);
};

/**
 * Re-dispatch an emergency that is ACTIVE again (e.g. the assigned responder dropped it).
 * Responders who already received a request are skipped; the escalation timer restarts.
 */
export const redispatchEmergency = async (emergencyId: string) => {
  const emergency = await emergencyRepository.findById(emergencyId);
  if (!emergency || emergency.status !== 'ACTIVE') return;

  escalatedEmergencyIds.delete(emergencyId);
  dispatchStartedAt.set(emergencyId, Date.now());

  await notifyNearbyResponders(
    emergency.id,
    emergency.latitude,
    emergency.longitude,
    emergency.patientId,
    emergency.patient?.fullName || 'Patient',
    emergency.voiceSummary || '',
    emergency.emergencyType || 'OTHER',
  );
};

/**
 * Periodically check for active emergencies that haven't been accepted (FR5.8 Escalation).
 * At 60s: AI generates an admin alert and re-dispatches with wider radius.
 * At 120s: emergency is force-cancelled by the system.
 */
export const checkAndEscalate = async () => {
  const activeEmergencies = await emergencyRepository.findAllActive();
  const now = new Date();

  for (const emergency of activeEmergencies) {
    const startedAt = dispatchStartedAt.get(emergency.id) ?? new Date(emergency.createdAt).getTime();
    const ageSeconds = (now.getTime() - startedAt) / 1000;

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
        clearDispatchState(emergency.id);

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
