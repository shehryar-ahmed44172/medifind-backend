import { Server as SocketIOServer } from 'socket.io';
import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { NotificationPayload, NotificationChannel, NotificationType } from '../../types/notification';
import { notificationRepository } from '../../repositories/notificationRepository';
import { sendEmail } from '../../utils/email';
import logger from '../../utils/logger';

// ---- Firebase Admin SDK Setup ----
// Initialize only once. Requires GOOGLE_APPLICATION_CREDENTIALS env var
// pointing to your Firebase service account JSON file.
let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return;
  try {
    // 1. Prioritize project-specific MEDIFIND_FIREBASE_CREDENTIALS
    // 2. Fallback to GOOGLE_APPLICATION_CREDENTIALS
    // 3. Last fallback: look for firebase-adminsdk.json in the root
    let credPathRaw = process.env.MEDIFIND_FIREBASE_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    let credPath: string | null = null;
    
    if (credPathRaw) {
      credPath = path.resolve(process.cwd(), credPathRaw.replace(/^"(.*)"$/, '$1'));
    } else {
      const defaultPath = path.resolve(process.cwd(), 'firebase-adminsdk.json');
      if (fs.existsSync(defaultPath)) {
        credPath = defaultPath;
        logger.info('Using default firebase-adminsdk.json from project root');
      }
    }
    
    if (credPath) {
      logger.info(`Attempting Firebase initialization with file: ${credPath}`);
      
      if (!fs.existsSync(credPath)) {
        throw new Error(`Service account file not found at: ${credPath}`);
      }

      admin.initializeApp({
        credential: admin.credential.cert(credPath),
      });
      logger.info('✅ Firebase Admin SDK initialized successfully');
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      logger.info('Firebase Admin SDK initialized using default credentials');
    }
    
    firebaseInitialized = true;
  } catch (error: any) {
    logger.warn(`❌ Firebase Admin SDK not initialized: ${error.message}. Push notifications will be skipped.`);
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
      } else if (channel === NotificationChannel.EMAIL) {
        await sendEmailNotification(userId, payload);
      }
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
      legacy_type: payload.type === 'SOS_TRIGGERED' ? 'EMERGENCY_REQUEST' : payload.type, // Support legacy mobile logic
      click_action: "FLUTTER_NOTIFICATION_CLICK", // Critical for Flutter Android background handling
      channel_id: "medifind_emergency", // Match your app's notification channel
      ...(payload.data || {}),
    },
    notification: {
      title: payload.title,
      body: payload.body,
    },
    android: {
      priority: 'high', // Use literal string 'high' for delivery speed
      notification: {
        channelId: "medifind_emergency",
        priority: "max", // Max priority for system tray visibility
        clickAction: "FLUTTER_NOTIFICATION_CLICK"
      }
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
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${payload.title}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
        .wrapper { padding: 40px 10px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: 800; color: #3b82f6; text-decoration: none; letter-spacing: -0.5px; }
        .content { margin-bottom: 40px; }
        .title { font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 20px; text-align: center; }
        .body-text { font-size: 16px; color: #4b5563; margin-bottom: 30px; line-height: 1.7; text-align: center; }
        .button-container { text-align: center; margin: 40px 0; }
        .button { background-color: #3b82f6; color: #ffffff !important; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; display: inline-block; font-size: 16px; transition: background-color 0.2s; }
        .footer { text-align: center; font-size: 14px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 30px; }
        .fallback-link { font-size: 12px; color: #6b7280; word-break: break-all; margin-top: 25px; background: #f3f4f6; padding: 15px; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <a href="#" class="logo">MediFind</a>
          </div>
          <div class="content">
            <div class="title">${payload.title}</div>
            <p class="body-text">${payload.body}</p>
            
            <div class="button-container">
              <a href="${ctaUrl}" class="button">${ctaText}</a>
              <div class="fallback-link">
                <strong>Having trouble?</strong><br/>
                Copy and paste this link into your browser: <br/> 
                <span style="color: #3b82f6;">${ctaUrl}</span>
              </div>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MediFind. Protecting what matters most.</p>
            <p>You received this because you are a registered user of MediFind.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const success = await sendEmail({
    to: user.email,
    subject: `MediFind: ${payload.title}`,
    text: `${payload.title}\n\n${payload.body}\n\nLink: ${ctaUrl}`,
    html: htmlContent,
  });

  if (!success) {
    throw new Error('Failed to send email via SMTP');
  }
}
