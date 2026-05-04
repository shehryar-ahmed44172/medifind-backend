import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response';

const prisma = new PrismaClient();

/**
 * Admin: List all users
 * GET /api/admin/users
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    const users = await prisma.user.findMany({
      where: role ? { role: role as any } : {},
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    sendSuccess(res, users, 'Users retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Admin: Deactivate user
 * PATCH /api/admin/users/:id/deactivate
 */
export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });
    sendSuccess(res, null, 'User deactivated');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * Admin: Delete user (Hard delete)
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    sendSuccess(res, null, 'User deleted');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * Admin: Get responders pending verification
 */
export const getPendingResponders = async (req: Request, res: Response) => {
  try {
    const pending = await prisma.responder.findMany({
      where: { verificationStatus: 'PENDING' } as any,
      include: {
        user: { select: { fullName: true, email: true, phoneNumber: true } }
      }
    });
    sendSuccess(res, pending, 'Pending responders retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Admin: Verify or Reject a responder
 */
export const processVerification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // responder userId
    const { action, reason } = req.body; // action: VERIFY | REJECT

    if (action === 'VERIFY') {
      const responder = await prisma.responder.update({
        where: { userId: id },
        data: {
          verificationStatus: 'VERIFIED' as any,
          isVerified: true
        } as any,
        include: { user: true }
      });

      // Send OTP after admin verification
      const { sendVerificationCode } = await import('../services/auth');
      await sendVerificationCode(responder.userId, responder.user.email, responder.user.fullName);

      sendSuccess(res, null, 'Responder verified and code sent');
    } else if (action === 'REJECT') {
      await prisma.responder.update({
        where: { userId: id },
        data: {
          verificationStatus: 'REJECTED' as any,
          isVerified: false,
          rejectionReason: reason
        } as any
      });
      sendSuccess(res, null, 'Responder rejected');
    } else {
      sendError(res, 'Invalid action. Use VERIFY or REJECT', 400);
    }
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * Admin: Audit Logs  — GET /api/admin/logs
 */
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { level, search, limit = '100' } = req.query;
    const take = Math.min(parseInt(limit as string, 10) || 100, 500);

    const where: any = {};
    if (search) {
      where.OR = [
        { action:   { contains: search as string, mode: 'insensitive' } },
        { entity:   { contains: search as string, mode: 'insensitive' } },
        { entityId: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: { select: { fullName: true, email: true, role: true } },
      },
    });

    // Shape into the format the web portal expects
    const shaped = logs.map(log => ({
      id:        log.id,
      level:     log.action.includes('DELETE') || log.action.includes('FAIL') ? 'ERROR'
                 : log.action.includes('UPDATE') ? 'WARNING'
                 : 'INFO',
      action:    log.action,
      entity:    log.entity,
      entityId:  log.entityId,
      user:      log.user ? `${log.user.fullName} (${log.user.role})` : 'System',
      ipAddress: log.ipAddress ?? '—',
      timestamp: log.createdAt,
      details:   log.newValues ?? log.oldValues ?? {},
    }));

    sendSuccess(res, shaped, 'Audit logs retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Admin: Subscription overview — GET /api/admin/subscriptions
 */
export const getSubscriptions = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { subscriptionPlan: { not: 'FREE' } },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        subscriptionPlan: true,
        createdAt: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const planCounts = await prisma.user.groupBy({
      by: ['subscriptionPlan'],
      _count: true,
    });

    const planPrices: Record<string, number> = {
      FREE:         0,
      PROFESSIONAL: 499,
      EXECUTIVE:    2499,
    };

    const mrr = planCounts.reduce((sum, p) => {
      return sum + (planPrices[p.subscriptionPlan] || 0) * p._count;
    }, 0);

    sendSuccess(res, {
      subscribers: users,
      stats: {
        mrr,
        totalPaid: users.length,
        planBreakdown: planCounts.map(p => ({ plan: p.subscriptionPlan, count: p._count })),
      },
    }, 'Subscriptions retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Admin: Communication / Notification Audit — GET /api/admin/notifications
 * Queries the NotificationLog table across all users (admin view).
 */
export const getCommAudit = async (req: Request, res: Response) => {
  try {
    const { limit = '200', type, status, search } = req.query;
    const take = Math.min(parseInt(limit as string, 10) || 200, 1000);

    const where: any = {};
    if (type && type !== 'ALL')   where.type   = type as string;
    if (status && status !== 'ALL') where.status = status as string;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { body:  { contains: search as string, mode: 'insensitive' } },
        { user:  { fullName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [notifications, total, summary] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          user: { select: { fullName: true, email: true, role: true } },
        },
      }),
      prisma.notificationLog.count({ where }),
      prisma.notificationLog.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const shaped = notifications.map((n: any) => ({
      id:            n.id,
      type:          n.type,
      channels:      Array.isArray(n.channels) ? n.channels : [n.channels],
      title:         n.title,
      body:          n.body,
      status:        n.status,
      recipient:     n.user?.fullName ?? 'Unknown',
      recipientEmail: n.user?.email ?? '',
      recipientRole: n.user?.role ?? '',
      isRead:        n.isRead,
      deliveredAt:   n.deliveredAt,
      failureReason: n.failureReason ?? null,
      sentAt:        n.createdAt,
    }));

    const summaryMap: Record<string, number> = {};
    summary.forEach((s: any) => { summaryMap[s.status] = s._count; });

    sendSuccess(res, {
      notifications: shaped,
      total,
      summary: {
        delivered: summaryMap['DELIVERED'] ?? 0,
        failed:    summaryMap['FAILED']    ?? 0,
        pending:   summaryMap['PENDING']   ?? 0,
      },
    }, 'Communication audit retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Admin: Dashboard Stats
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [userCount, emergencyCount, activeEmergencies, verifiedResponders] = await Promise.all([
      prisma.user.count(),
      prisma.emergency.count(),
      prisma.emergency.count({ where: { status: 'ACTIVE' } }),
      prisma.responder.count({ where: { isVerified: true } })
    ]);

    sendSuccess(res, {
      totalUsers: userCount,
      totalEmergencies: emergencyCount,
      activeEmergencies,
      onlineResponders: verifiedResponders
    }, 'Stats retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
