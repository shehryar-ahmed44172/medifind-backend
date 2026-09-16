import { Request, Response } from 'express';
import { sendNotification, sendToMultiple, broadcastToGroup } from '../../services/notification';
import { NotificationType, NotificationChannel, NotificationPayload } from '../../types/notification';
import { sendSuccess, sendError } from '../../utils/response';
import { notificationRepository } from '../../repositories/notificationRepository';
import { userRepository } from '../../repositories/userRepository';

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

/**
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Not authenticated', 401);
    const { id } = req.params;
    await notificationRepository.markAsRead(id, req.user.userId);
    sendSuccess(res, null, 'Notification marked as read');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * POST /api/notifications/broadcast
 * Admin-initiated manual broadcast.
 */
export const broadcastNotification = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return sendError(res, 'Unauthorized - Admin only', 403);
    }

    const { recipientType, targetId, title, body, priority, channels } = req.body;

    if (!title || !body || !recipientType) {
      return sendError(res, 'title, body, and recipientType are required', 400);
    }

    const payload: NotificationPayload = {
      type: NotificationType.SYSTEM_ALERT,
      title,
      body,
      channels: channels || [NotificationChannel.IN_APP],
      priority: priority === 'CRITICAL' ? 'high' : 'normal',
      data: {
        admin_id: req.user.userId,
        sent_at: new Date().toISOString()
      },
    };

    if (recipientType === 'INDIVIDUAL') {
      if (!targetId) return sendError(res, 'targetId is required for individual messages', 400);

      // Resolve email → userId: the admin may type an email address instead of a cuid.
      // Passing an email directly as userId would violate the FK constraint on NotificationLog.
      let resolvedUserId = targetId.trim();
      let recipientLabel = targetId.trim();
      if (resolvedUserId.includes('@')) {
        const user = await userRepository.findByEmail(resolvedUserId);
        if (!user) {
          return sendError(res, `No registered user found with email: ${resolvedUserId}`, 404);
        }
        resolvedUserId = user.id;
        recipientLabel = `individual:${targetId.trim()}`; // keep email for display
      } else {
        // Validate that the cuid actually exists before trying to notify
        const user = await userRepository.findById(resolvedUserId);
        if (!user) {
          return sendError(res, `No registered user found with ID: ${resolvedUserId}`, 404);
        }
        recipientLabel = `individual:${resolvedUserId}`;
      }

      const result = await sendNotification(resolvedUserId, payload);

      // ── Admin audit log: one entry per broadcast so the admin can see what they sent ──
      await notificationRepository.createBroadcastLog({
        sentByAdminId: req.user.userId,
        recipientGroup: recipientLabel,
        type: payload.type,
        channels: payload.channels as string[],
        title: payload.title,
        body: payload.body,
        status: 'delivered',
      });

      return sendSuccess(res, result, 'Notification sent to individual', 200);
    } else {
      // Map frontend types to backend roles
      const roleMap: any = {
        'PATIENTS': 'PATIENT',
        'RESPONDERS': 'RESPONDER',
        'CAREGIVERS': 'CAREGIVER',
        'ALL': 'ALL'
      };

      const group = roleMap[recipientType] || recipientType;
      const result = await broadcastToGroup(group, payload);

      // ── Admin audit log: one entry per broadcast so the admin can see what they sent ──
      await notificationRepository.createBroadcastLog({
        sentByAdminId: req.user.userId,
        recipientGroup: group,
        type: payload.type,
        channels: payload.channels as string[],
        title: payload.title,
        body: payload.body,
        status: 'delivered',
      });

      return sendSuccess(res, result, `Broadcast sent to ${group}`, 200);
    }
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * GET /api/notifications/admin-history
 * Returns all broadcast logs created by the requesting admin.
 * Only accessible by ADMIN role.
 */
export const getAdminBroadcastHistory = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return sendError(res, 'Unauthorized - Admin only', 403);
    }
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await notificationRepository.getAdminBroadcastHistory(req.user.userId, limit);

    // Shape each log for the frontend table
    const shaped = logs.map((log) => ({
      id: log.id,
      title: log.title,
      body: log.body,
      recipientGroup: log.recipientGroup ?? 'ALL',
      channels: log.channels,
      status: log.status === 'delivered' ? 'SENT' : 'PENDING',
      priority: 'NORMAL',           // priority isn't stored on the log; default to NORMAL
      createdAt: log.createdAt,
      deliveredAt: log.deliveredAt,
    }));

    return sendSuccess(res, shaped, 'Admin broadcast history retrieved', 200);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * PATCH /api/notifications/read-all
 */
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    await notificationRepository.markAllAsRead(req.user.userId);
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
