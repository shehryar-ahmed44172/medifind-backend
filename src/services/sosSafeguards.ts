import prisma from '../lib/prisma';
import logger from '../utils/logger';
import { sendNotification } from './notification';
import { NotificationType, NotificationChannel } from '../types/notification';
import { getIo } from '../server';

/**
 * Controls against false / abusive SOS alerts.
 *
 * Genuine emergencies must never be silently blocked: every rejection carries a
 * clear message telling the patient to call Rescue 1122 directly.
 */

/** Max SOS a patient may raise in a rolling hour (create/cancel cycles included). */
export const SOS_HOURLY_LIMIT = parseInt(process.env.SOS_HOURLY_LIMIT || '5', 10);
/** False alarms within FALSE_ALARM_WINDOW_DAYS that trigger an admin review. */
export const FALSE_ALARM_REVIEW_THRESHOLD = parseInt(process.env.FALSE_ALARM_REVIEW_THRESHOLD || '3', 10);
const FALSE_ALARM_WINDOW_DAYS = 30;

export const RESOLUTION_OUTCOMES = ['TREATED', 'TRANSPORTED', 'FALSE_ALARM', 'PATIENT_NOT_FOUND'] as const;
export type ResolutionOutcome = typeof RESOLUTION_OUTCOMES[number];

/** Error carrying an HTTP status so controllers can respond correctly. */
export class SosRejectedError extends Error {
  constructor(message: string, public statusCode: number, public code: string) {
    super(message);
  }
}

const CALL_1122 = 'If this is a real emergency, call Rescue 1122 now.';

/**
 * Checks run before an SOS is created. Throws SosRejectedError when the request
 * must not dispatch responders.
 */
export const assertSosAllowed = async (patientId: string, opts: { locationMocked: boolean }) => {
  // Fake GPS makes responders drive to the wrong place — refuse outside development
  if (opts.locationMocked && process.env.NODE_ENV === 'production') {
    logger.warn(`[SOS guard] Rejected SOS from ${patientId}: mock location provider`);
    throw new SosRejectedError(
      `SOS blocked: your phone is using a fake (mock) GPS location. Turn off mock location apps and try again. ${CALL_1122}`,
      422,
      'MOCK_LOCATION',
    );
  }

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.emergency.count({ where: { patientId, createdAt: { gte: since } } });
  if (recent >= SOS_HOURLY_LIMIT) {
    logger.warn(`[SOS guard] Rate limit hit by ${patientId}: ${recent} SOS in the last hour`);
    await prisma.auditLog.create({
      data: {
        userId: patientId,
        action: 'SOS_RATE_LIMITED',
        entity: 'User',
        entityId: patientId,
        newValues: { recentCount: recent, limit: SOS_HOURLY_LIMIT },
      },
    }).catch(() => undefined);
    throw new SosRejectedError(
      `Too many SOS requests in the last hour. ${CALL_1122}`,
      429,
      'SOS_RATE_LIMIT',
    );
  }
};

/** Number of responder-confirmed false alarms for a patient in the review window. */
export const countRecentFalseAlarms = (patientId: string) =>
  prisma.emergency.count({
    where: {
      patientId,
      resolutionOutcome: 'FALSE_ALARM',
      resolvedAt: { gte: new Date(Date.now() - FALSE_ALARM_WINDOW_DAYS * 24 * 60 * 60 * 1000) },
    },
  });

/**
 * Called after a responder closes an emergency as FALSE_ALARM: warns the patient,
 * and flags the account for admin review once the threshold is reached.
 * Accidental SOS cancelled by the patient are never counted.
 */
export const handleFalseAlarm = async (emergencyId: string, patientId: string, responderId: string, note?: string) => {
  const count = await countRecentFalseAlarms(patientId);

  await prisma.auditLog.create({
    data: {
      userId: responderId,
      action: 'SOS_FALSE_ALARM',
      entity: 'Emergency',
      entityId: emergencyId,
      newValues: { patientId, falseAlarmsLast30Days: count, note: note ?? null },
    },
  });

  sendNotification(patientId, {
    type: NotificationType.SYSTEM_ALERT,
    title: 'SOS marked as false alarm',
    body: count >= FALSE_ALARM_REVIEW_THRESHOLD
      ? 'Your recent SOS alerts were marked as false alarms and your account is under review. Please use SOS only for real medical emergencies.'
      : 'The responder marked your SOS as a false alarm. Please use SOS only for real medical emergencies — every alert sends a responder to you.',
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    priority: 'high',
    data: { emergencyId, falseAlarmsLast30Days: String(count) },
  }).catch(err => logger.error(`[SOS guard] Failed to warn patient ${patientId}: ${err.message}`));

  if (count < FALSE_ALARM_REVIEW_THRESHOLD) return { count, flagged: false };

  const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { fullName: true, email: true } });
  const title = 'Patient flagged for repeated false SOS';
  const body = `${patient?.fullName ?? 'A patient'} (${patient?.email ?? patientId}) has ${count} false alarms in the last ${FALSE_ALARM_WINDOW_DAYS} days. Review the account.`;

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
  for (const admin of admins) {
    sendNotification(admin.id, {
      type: NotificationType.SYSTEM_ALERT,
      title,
      body,
      channels: [NotificationChannel.IN_APP],
      priority: 'high',
      data: { patientId, emergencyId, falseAlarmsLast30Days: String(count) },
    }).catch(err => logger.error(`[SOS guard] Failed to alert admin ${admin.id}: ${err.message}`));
  }
  getIo().to('admin_notifications').emit('admin_notification', {
    id: `false-alarm-${emergencyId}`,
    type: 'FALSE_ALARM_REVIEW',
    title,
    body,
    timestamp: new Date().toISOString(),
    data: { patientId, emergencyId, count },
  });

  logger.warn(`[SOS guard] Patient ${patientId} flagged: ${count} false alarms`);
  return { count, flagged: true };
};
