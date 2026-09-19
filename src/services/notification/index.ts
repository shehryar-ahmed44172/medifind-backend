import { Server as SocketIOServer } from 'socket.io';
import { renderEmail } from '../../utils/emailTemplate';
import { NotificationPayload, NotificationChannel, NotificationType } from '../../types/notification';
import { notificationRepository } from '../../repositories/notificationRepository';
import { sendEmail } from '../../utils/email';
import logger from '../../utils/logger';
import { queuePush, initializePushService } from '../push/pushService';

// ---- Socket.io reference ----
let io: SocketIOServer | null = null;

/**
 * Call this from server.ts after creating the Socket.io server.
 */
export function initializeNotifications(socketServer: SocketIOServer) {
  io = socketServer;
  initializePushService(socketServer);
  logger.info('Notification service initialized');
}

/**
 * Send a notification to a single user across the requested channels.
 */
export async function sendNotification(userId: string, payload: NotificationPayload) {
  // 1. Log the notification
  const record = await notificationRepository.create({
    userId,
    type: payload.type,
    channels: payload.channels,
    title: payload.title,
    body: payload.body,
    status: 'pending',
  });

  let success = true;
  let failureReason = '';
  let awaitingDeviceAck = false;

  // 2. Dispatch to each requested channel
  for (const channel of payload.channels) {
    try {
      if (channel === NotificationChannel.IN_APP) {
        sendInApp(userId, payload);
      } else if (channel === NotificationChannel.PUSH) {
        await queuePush(userId, payload, record.id);
        awaitingDeviceAck = true;
      } else if (channel === NotificationChannel.EMAIL) {
        await sendEmailNotification(userId, payload);
      }
    } catch (err: any) {
      success = false;
      failureReason += `${channel}: ${err.message}; `;
      logger.error(`Notification channel ${channel} failed for user ${userId}: ${err.message}`);
    }
  }

  // 3. Update delivery status — push stays 'pending' until the device acknowledges it
  if (!success) {
    await notificationRepository.updateStatus(record.id, 'failed', undefined, failureReason);
  } else if (!awaitingDeviceAck) {
    await notificationRepository.updateStatus(record.id, 'delivered', new Date());
  }

  return { success, notificationId: record.id };
}

/**
 * Send to multiple users (e.g. notify all nearby responders).
 */
export async function sendToMultiple(userIds: string[], payload: NotificationPayload) {
  const results = await Promise.allSettled(
    userIds.map((uid) => sendNotification(uid, payload))
  );
  return results;
}

/**
 * Broadcast to a group of users by role.
 */
export async function broadcastToGroup(group: string, payload: NotificationPayload) {
  const { userRepository } = await import('../../repositories/userRepository');
  let users: any[] = [];
  
  if (group === 'ALL') {
    users = await userRepository.findAll();
  } else {
    // group matches role enum: PATIENT, RESPONDER, CAREGIVER
    users = await userRepository.findByRole(group as any);
  }

  logger.info(`📢 Broadcasting notification to group ${group} (${users.length} users)`);
  
  const results = await sendToMultiple(users.map(u => u.id), payload);
  return { 
    total: users.length, 
    success: results.filter(r => r.status === 'fulfilled').length 
  };
}

// ---- Channel Implementations ----

/**
 * In-App: emit via Socket.io to the user's personal room.
 */
function sendInApp(userId: string, payload: NotificationPayload) {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  
  const room = `notifications:${userId}`;
  logger.info(`📡 Emitting in-app notification to room ${room}: ${payload.type}`);
  
  const eventData = {
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    recipientId: userId,
    timestamp: new Date().toISOString(),
  };

  io.to(room).emit('notification', eventData);

  // Mirror to admin room for system-wide awareness (SOS, Critical Alerts)
  if (payload.type === NotificationType.SOS_TRIGGERED || 
      payload.type === NotificationType.SYSTEM_ESCALATION ||
      payload.type === NotificationType.PATIENT_EMERGENCY) {
    logger.info(`📢 Mirroring critical event ${payload.type} to admin room`);
    io.to('admin_notifications').emit('admin_notification', eventData);
  }
}

/**
 * Email: send via SMTP with premium HTML template.
 */
async function sendEmailNotification(userId: string, payload: NotificationPayload) {
  const { userRepository } = await import('../../repositories/userRepository');
  const user = await userRepository.findById(userId);
  
  if (!user || !user.email) {
    logger.warn(`No email found for user ${userId}, skipping email notification`);
    return;
  }

  // Determine App URL and CTA text based on notification type
  const appOrigin = process.env.MOBILE_APP_ORIGIN || 'medifind-app://';
  let ctaUrl = appOrigin;
  let ctaText = 'Open MediFind';

  if (payload.type === NotificationType.CAREGIVER_INVITATION) {
    ctaText = 'View Invitation';
    ctaUrl = user.role === 'CAREGIVER' 
      ? `${appOrigin}caregiver/my-patients` // Point to the new patients management screen
      : `${appOrigin}home/caregivers`;
  } else if (payload.type === NotificationType.CAREGIVER_RESPONSE) {
    ctaText = 'View Response';
    ctaUrl = user.role === 'PATIENT' 
      ? `${appOrigin}home/caregivers`
      : `${appOrigin}caregiver`;
  } else if (payload.type === NotificationType.PATIENT_EMERGENCY) {
    ctaText = 'View Alert';
    ctaUrl = `${appOrigin}caregiver/maps`;
  } else if (payload.type === NotificationType.CHAT_MESSAGE) {
    ctaText = 'Reply Now';
    ctaUrl = user.role === 'CAREGIVER' 
      ? `${appOrigin}caregiver/chats`
      : `${appOrigin}chats`;
  }

  // The app's deep links (medifind-app://) do not open from email and look like
  // phishing to spam filters, so only a public https link becomes a button.
  const email = renderEmail({
    title: payload.title,
    name: user.fullName,
    paragraphs: [payload.body, 'Open the MediFind app to see the details.'],
    action: { label: ctaText, url: ctaUrl },
  });

  const success = await sendEmail({
    to: user.email,
    subject: `MediFind: ${payload.title}`,
    ...email,
  });

  if (!success) {
    throw new Error('Failed to send email via SMTP');
  }
}
