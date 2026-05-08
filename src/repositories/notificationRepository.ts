import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Simple repository for saving and querying notification logs.
 */
export const notificationRepository = {
  /**
   * Save a notification record for audit trail.
   */
  create: async (data: {
    userId: string;
    type: string;
    channels: string[];
    title: string;
    body: string;
    status: string;
  }) => {
    return await prisma.notificationLog.create({
      data: {
        userId: data.userId,
        type: data.type,
        channels: data.channels,
        title: data.title,
        body: data.body,
        status: data.status,
      },
    });
  },

  /**
   * Create a single admin-level audit log for a broadcast action.
   * Stored under the admin's userId so it appears in their history view.
   */
  createBroadcastLog: async (data: {
    sentByAdminId: string;
    recipientGroup: string;
    type: string;
    channels: string[];
    title: string;
    body: string;
    status: string;
  }) => {
    return await prisma.notificationLog.create({
      data: {
        userId: data.sentByAdminId,        // stored under the admin — makes it queryable
        sentByAdminId: data.sentByAdminId,
        recipientGroup: data.recipientGroup,
        type: data.type,
        channels: data.channels,
        title: data.title,
        body: data.body,
        status: data.status,
        deliveredAt: new Date(),
      },
    });
  },

  /**
   * Get all broadcast logs created by a specific admin, newest first.
   */
  getAdminBroadcastHistory: async (adminId: string, limit = 100) => {
    return await prisma.notificationLog.findMany({
      where: { sentByAdminId: adminId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Get notification history for a user.
   */
  getUserNotifications: async (userId: string, limit = 50) => {
    return await prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Update notification delivery status.
   */
  updateStatus: async (
    notificationId: string,
    status: string,
    deliveredAt?: Date,
    failureReason?: string
  ) => {
    return await prisma.notificationLog.update({
      where: { id: notificationId },
      data: {
        status,
        deliveredAt: deliveredAt || null,
        failureReason: failureReason || null,
      },
    });
  },

  /**
   * Mark a notification as read.
   */
  markAsRead: async (notificationId: string) => {
    return await prisma.notificationLog.update({
      where: { id: notificationId } as any,
      data: { isRead: true } as any,
    });
  },

  /**
   * Mark all notifications for a user as read.
   */
  markAllAsRead: async (userId: string) => {
    return await prisma.notificationLog.updateMany({
      where: { userId, isRead: false } as any,
      data: { isRead: true } as any,
    });
  },
};
