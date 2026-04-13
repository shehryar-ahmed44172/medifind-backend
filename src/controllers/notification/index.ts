import { Request, Response } from 'express';
import { sendNotification, sendToMultiple } from '../../services/notification';
import { NotificationType, NotificationChannel, NotificationPayload } from '../../types/notification';
import { sendSuccess, sendError } from '../../utils/response';
import { notificationRepository } from '../../repositories/notificationRepository';

/**
 * POST /api/notifications/emergency
 * Send emergency alert to multiple responders.
 */
export const sendEmergencyAlert = async (req: Request, res: Response) => {
  try {
    const { emergencyId, emergencyType, patientName, responderIds, distance } = req.body;

    if (!emergencyId || !responderIds || !Array.isArray(responderIds)) {
      return sendError(res, 'emergencyId and responderIds[] are required', 400);
    }

    const payload: NotificationPayload = {
      type: NotificationType.SOS_TRIGGERED,
      title: '🚨 EMERGENCY ALERT',
      body: `Emergency from ${patientName || 'a patient'}. Distance: ${distance || 'unknown'}`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: 'emergency',
      data: {
        emergency_id: emergencyId,
        emergency_type: emergencyType || 'MEDICAL',
        patient_name: patientName || '',
        distance: distance || '',
      },
    };

    const results = await sendToMultiple(responderIds, payload);
    sendSuccess(res, { sent: results.length }, 'Emergency alerts sent', 200);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * POST /api/notifications/silence
 * When a responder accepts, silence other responders' ringing UI.
 */
export const silenceOtherResponders = async (req: Request, res: Response) => {
  try {
    const { emergencyId, responderIds } = req.body;

    if (!emergencyId || !responderIds || !Array.isArray(responderIds)) {
      return sendError(res, 'emergencyId and responderIds[] are required', 400);
    }

    const payload: NotificationPayload = {
      type: NotificationType.EMERGENCY_ACCEPTED_BY_OTHER,
      title: 'Emergency Accepted',
      body: 'Another responder has accepted this emergency.',
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: 'high',
      data: {
        type: 'EMERGENCY_ACCEPTED_BY_OTHER',
        emergency_id: emergencyId,
      },
    };

    const results = await sendToMultiple(responderIds, payload);
    sendSuccess(res, { silenced: results.length }, 'Silence broadcast sent', 200);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * GET /api/notifications/history
 * Get logged notification history for the authenticated user.
 */
export const getNotificationHistory = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401);
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const notifications = await notificationRepository.getUserNotifications(req.user.userId, limit);
    sendSuccess(res, notifications, 'Notification history retrieved', 200);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
