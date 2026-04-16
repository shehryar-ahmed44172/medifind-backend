import { Server as SocketIOServer } from 'socket.io';
import * as admin from 'firebase-admin';
import { NotificationPayload, NotificationChannel } from '../../types/notification';
import { notificationRepository } from '../../repositories/notificationRepository';
import logger from '../../utils/logger';

// ---- Firebase Admin SDK Setup ----
// Initialize only once. Requires GOOGLE_APPLICATION_CREDENTIALS env var
// pointing to your Firebase service account JSON file.
let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return;
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    firebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized successfully');
  } catch (error: any) {
    logger.warn(`Firebase Admin SDK not initialized: ${error.message}. Push notifications will be skipped.`);
  }
}

// ---- Socket.io reference ----
let io: SocketIOServer | null = null;

/**
 * Call this from server.ts after creating the Socket.io server.
 */
export function initializeNotifications(socketServer: SocketIOServer) {
  io = socketServer;
  initFirebase();
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

  // 2. Dispatch to each requested channel
  for (const channel of payload.channels) {
    try {
      if (channel === NotificationChannel.IN_APP) {
        sendInApp(userId, payload);
      } else if (channel === NotificationChannel.PUSH) {
        await sendPush(userId, payload);
      }
      // EMAIL channel can be added later
    } catch (err: any) {
      success = false;
      failureReason += `${channel}: ${err.message}; `;
      logger.error(`Notification channel ${channel} failed for user ${userId}: ${err.message}`);
    }
  }

  // 3. Update delivery status
  await notificationRepository.updateStatus(
    record.id,
    success ? 'delivered' : 'failed',
    success ? new Date() : undefined,
    failureReason || undefined
  );

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

// ---- Channel Implementations ----

/**
 * In-App: emit via Socket.io to the user's personal room.
 */
function sendInApp(userId: string, payload: NotificationPayload) {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  io.to(`notifications:${userId}`).emit('notification', {
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    timestamp: new Date().toISOString(),
  });
}

/**
 * Push: send via Firebase Cloud Messaging.
 * Requires the user's FCM device token stored somewhere accessible.
 * For now, tokens are passed inside payload.data.deviceTokens (comma-separated).
 */
async function sendPush(userId: string, payload: NotificationPayload) {
  if (!firebaseInitialized) {
    logger.warn('Firebase not initialized, skipping push notification');
    return;
  }

  let tokens = payload.data?.deviceTokens?.split(',').filter(Boolean) || [];
  
  if (tokens.length === 0) {
    const { userRepository } = await import('../../repositories/userRepository');
    const user = await userRepository.findById(userId) as any;
    if (user && user.fcmTokens) {
      const fcmList = Array.isArray(user.fcmTokens) ? (user.fcmTokens as string[]) : [];
      tokens = fcmList.filter(Boolean);
    }
  }

  if (tokens.length === 0) {
    logger.warn(`No device tokens for user ${userId}, skipping push`);
    return;
  }

  const message: admin.messaging.MulticastMessage = {
    tokens,
    data: {
      type: payload.type,
      ...(payload.data || {}),
    },
    notification: {
      title: payload.title,
      body: payload.body,
    },
    android: {
      priority: payload.priority === 'emergency' ? 'high' : 'normal',
    },
  };

  // Remove internal-only field before sending
  delete message.data!.deviceTokens;

  const response = await admin.messaging().sendEachForMulticast(message);
  logger.info(`FCM sent: ${response.successCount} success, ${response.failureCount} failed`);

  if (response.failureCount > 0) {
    const failedTokens = response.responses
      .filter((r) => !r.success)
      .map((r) => r.error?.message)
      .join('; ');
    logger.warn(`FCM failures: ${failedTokens}`);
  }
}
