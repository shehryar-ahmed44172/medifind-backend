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
};
