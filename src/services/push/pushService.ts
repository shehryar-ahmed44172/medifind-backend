import { Server as SocketIOServer, Socket } from 'socket.io';
import prisma from '../../lib/prisma';
import logger from '../../utils/logger';
import { NotificationPayload, NotificationType } from '../../types/notification';

/**
 * MediFind Push Service — self-hosted push delivery (no Firebase / FCM).
 *
 * Every push is persisted as a PushMessage (store-and-forward):
 *   QUEUED     → saved, device not connected yet
 *   SENT       → emitted to the user's connected device(s), waiting for ack
 *   DELIVERED  → device acknowledged with `push:ack`
 *   EXPIRED    → not delivered before expiresAt (stale alerts are never shown late)
 *
 * The mobile app keeps a socket open (foreground service on Android), shows a
 * local notification for each `push` event and acks it. Messages missed while
 * offline are replayed on reconnect or fetched via GET /api/notifications/pending.
 */

const RETRY_INTERVAL_MS = 20_000;
const MAX_ATTEMPTS = 6;

// Emergency alerts are useless after a few minutes; everything else keeps for a day
const EMERGENCY_TYPES = new Set<string>([
  NotificationType.SOS_TRIGGERED,
  NotificationType.PATIENT_EMERGENCY,
  NotificationType.RESPONDER_ASSIGNED,
  NotificationType.EMERGENCY_ACCEPTED_BY_OTHER,
]);
const EMERGENCY_TTL_MS = 10 * 60 * 1000;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

let io: SocketIOServer | null = null;
let retryTimer: NodeJS.Timeout | null = null;

const userRoom = (userId: string) => `notifications:${userId}`;

type PushRow = {
  id: string;
  userId: string;
  notificationLogId: string | null;
  type: string;
  title: string;
  body: string;
  data: unknown;
  priority: string;
  createdAt: Date;
  expiresAt: Date;
};

const toEvent = (m: PushRow) => ({
  id: m.id,
  type: m.type,
  title: m.title,
  body: m.body,
  priority: m.priority,
  data: (m.data as Record<string, string>) || {},
  createdAt: m.createdAt.toISOString(),
  expiresAt: m.expiresAt.toISOString(),
});

const isUserOnline = async (userId: string): Promise<boolean> => {
  if (!io) return false;
  const sockets = await io.in(userRoom(userId)).fetchSockets();
  return sockets.length > 0;
};

const emitToUser = async (message: PushRow) => {
  if (!io) return;
  // Mark as SENT before emitting so a fast ack can never be overwritten back to SENT
  const marked = await prisma.pushMessage.updateMany({
    where: { id: message.id, status: { in: ['QUEUED', 'SENT'] } },
    data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } },
  });
  if (marked.count === 0) return;
  io.to(userRoom(message.userId)).emit('push', toEvent(message));
};

/** Queue a push for a user and deliver immediately if the device is connected. */
export async function queuePush(userId: string, payload: NotificationPayload, notificationLogId?: string) {
  const ttl = EMERGENCY_TYPES.has(payload.type) ? EMERGENCY_TTL_MS : DEFAULT_TTL_MS;

  const message = await prisma.pushMessage.create({
    data: {
      userId,
      notificationLogId: notificationLogId ?? null,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      priority: payload.priority,
      expiresAt: new Date(Date.now() + ttl),
    },
  });

  if (await isUserOnline(userId)) {
    await emitToUser(message);
    return { messageId: message.id, status: 'SENT' as const };
  }

  logger.info(`[Push] ${payload.type} queued for offline user ${userId}`);
  return { messageId: message.id, status: 'QUEUED' as const };
}

/** Mark messages as delivered after the device acknowledges them. */
export async function acknowledge(userId: string, messageIds: string[]) {
  const ids = messageIds.filter(id => typeof id === 'string').slice(0, 200);
  if (ids.length === 0) return 0;

  const now = new Date();
  const messages = await prisma.pushMessage.findMany({
    where: { id: { in: ids }, userId, status: { in: ['QUEUED', 'SENT'] } },
    select: { id: true, notificationLogId: true },
  });
  if (messages.length === 0) return 0;

  await prisma.pushMessage.updateMany({
    where: { id: { in: messages.map(m => m.id) } },
    data: { status: 'DELIVERED', deliveredAt: now },
  });

  const logIds = messages.map(m => m.notificationLogId).filter((id): id is string => !!id);
  if (logIds.length > 0) {
    await prisma.notificationLog.updateMany({
      where: { id: { in: logIds }, status: 'pending' },
      data: { status: 'delivered', deliveredAt: now },
    });
  }
  return messages.length;
}

/** Undelivered, unexpired messages for a user (oldest first). */
export async function getPending(userId: string) {
  const messages = await prisma.pushMessage.findMany({
    where: { userId, status: { in: ['QUEUED', 'SENT'] }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
  return messages.map(toEvent);
}

/** Replay everything the device missed while it was disconnected. */
async function replayPending(socket: Socket, userId: string) {
  const messages = await prisma.pushMessage.findMany({
    where: { userId, status: { in: ['QUEUED', 'SENT'] }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
  if (messages.length === 0) return;
  await prisma.pushMessage.updateMany({
    where: { id: { in: messages.map(m => m.id) }, status: { in: ['QUEUED', 'SENT'] } },
    data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } },
  });
  for (const message of messages) {
    socket.emit('push', toEvent(message));
  }
  logger.info(`[Push] Replayed ${messages.length} pending message(s) to ${userId}`);
}

/** Re-send unacknowledged messages to online users and expire stale ones. */
async function retryUnacknowledged() {
  const now = new Date();

  const expired = await prisma.pushMessage.updateMany({
    where: {
      status: { in: ['QUEUED', 'SENT'] },
      OR: [{ expiresAt: { lte: now } }, { attempts: { gte: MAX_ATTEMPTS } }],
    },
    data: { status: 'EXPIRED' },
  });
  if (expired.count > 0) logger.warn(`[Push] ${expired.count} message(s) expired undelivered`);

  const stale = await prisma.pushMessage.findMany({
    where: { status: 'SENT', sentAt: { lte: new Date(now.getTime() - RETRY_INTERVAL_MS) } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  for (const message of stale) {
    if (await isUserOnline(message.userId)) {
      await emitToUser(message);
    }
  }
}

/** Wire the push service into Socket.io (called once from server startup). */
export function initializePushService(socketServer: SocketIOServer) {
  io = socketServer;

  io.on('connection', (socket) => {
    const userId: string | undefined = socket.data.user?.userId;
    if (!userId) return;

    socket.on('push:ack', (payload: { ids?: string[]; id?: string }) => {
      const ids = payload?.ids ?? (payload?.id ? [payload.id] : []);
      acknowledge(userId, ids).catch(err => logger.error(`[Push] ack failed for ${userId}: ${err.message}`));
    });

    socket.on('push:sync', () => {
      replayPending(socket, userId).catch(err => logger.error(`[Push] sync failed for ${userId}: ${err.message}`));
    });

    replayPending(socket, userId).catch(err => logger.error(`[Push] replay failed for ${userId}: ${err.message}`));
  });

  if (process.env.NODE_ENV !== 'test' && !retryTimer) {
    retryTimer = setInterval(() => {
      retryUnacknowledged().catch(err => logger.error(`[Push] retry loop failed: ${err.message}`));
    }, RETRY_INTERVAL_MS);
    retryTimer.unref();
  }

  logger.info('MediFind Push Service initialized (self-hosted, no Firebase)');
}

/** Delivery statistics for the admin health panel. */
export async function getPushStats() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [connectedSockets, pending, delivered24h, expired24h] = await Promise.all([
    io ? io.fetchSockets().then(s => s.length) : Promise.resolve(0),
    prisma.pushMessage.count({ where: { status: { in: ['QUEUED', 'SENT'] }, expiresAt: { gt: new Date() } } }),
    prisma.pushMessage.count({ where: { status: 'DELIVERED', deliveredAt: { gte: since } } }),
    prisma.pushMessage.count({ where: { status: 'EXPIRED', createdAt: { gte: since } } }),
  ]);
  return { connectedSockets, pending, delivered24h, expired24h };
}
