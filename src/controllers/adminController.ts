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
        phoneNumber: true,
        role: true,
        isActive: true,
        subscriptionPlan: true,
        profileImageUrl: true,
        createdAt: true,
        medicalProfile: {
          select: { patientType: true }
        },
        responder: {
          select: { isVerified: true, verificationStatus: true, specialization: true }
        }
      },
      orderBy: { createdAt: 'desc' }
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
 * Admin: Reactivate user
 * PATCH /api/admin/users/:id/activate
 */
export const reactivateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.update({
      where: { id },
      data: { isActive: true }
    });
    sendSuccess(res, null, 'User reactivated');
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
 * Admin: Get full user profile with emergency stats
 * GET /api/admin/users/:id
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        medicalProfile: true,
        responder: true,
        caregiverProfile: true,
      },
    });

    if (!user) return sendError(res, 'User not found', 404);

    // ── Patient: emergency stats + history ──────────────────────────────────
    let emergencyStats: Record<string, number> | null = null;
    let emergencyHistory: any[] = [];

    if (user.role === 'PATIENT') {
      const [total, resolved, cancelled, completed] = await Promise.all([
        prisma.emergency.count({ where: { patientId: id } }),
        prisma.emergency.count({ where: { patientId: id, status: 'RESOLVED' } }),
        prisma.emergency.count({ where: { patientId: id, status: 'CANCELLED' } }),
        prisma.emergency.count({ where: { patientId: id, status: 'COMPLETED' } }),
      ]);

      emergencyStats = {
        total,
        resolved,
        cancelled,
        completed,
        active: total - resolved - cancelled - completed,
      };

      emergencyHistory = await prisma.emergency.findMany({
        where: { patientId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          emergencyRequests: {
            where: { status: 'ACCEPTED' },
            include: {
              responder: {
                include: { user: { select: { fullName: true } } },
              },
            },
          },
        },
      });
    }

    // ── Responder: response history ─────────────────────────────────────────
    let responderHistory: any[] = [];
    if (user.role === 'RESPONDER') {
      responderHistory = await prisma.emergencyRequest.findMany({
        where: { responderId: id },
        orderBy: { sentAt: 'desc' },
        take: 20,
        include: {
          emergency: {
            include: {
              patient: { select: { fullName: true, email: true } },
            },
          },
        },
      });
    }

    // ── Audit log count ─────────────────────────────────────────────────────
    const auditCount = await prisma.auditLog.count({ where: { userId: id } });

    // Strip sensitive fields
    const { passwordHash, refreshTokenHash, fcmTokens, ...safeUser } = user as any;

    sendSuccess(
      res,
      { ...safeUser, emergencyStats, emergencyHistory, responderHistory, auditCount },
      'User profile retrieved'
    );
  } catch (error: any) {
    sendError(res, error.message, 500);
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

      // Notify responder in-app (Plan v4)
      const { getIo } = await import('../server');
      getIo().to(`notifications:${responder.userId}`).emit('notification', {
        type: 'VERIFICATION_APPROVED',
        title: 'Account Verified!',
        body: 'Congratulations! Your professional credentials have been approved. You can now use the verification code sent to your email to activate your account.',
        timestamp: new Date().toISOString()
      });

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

      // Notify responder in-app (Plan v4)
      const { getIo } = await import('../server');
      getIo().to(`notifications:${id}`).emit('notification', {
        type: 'VERIFICATION_REJECTED',
        title: 'Verification Update',
        body: `Your verification request was not approved. Reason: ${reason || 'Incomplete documents'}. Please update your profile and try again.`,
        timestamp: new Date().toISOString()
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
 * Admin: System Health Check
 * GET /api/admin/health
 * Checks DB connectivity, Firebase, uptime, and memory usage.
 */
export const getSystemHealth = async (req: Request, res: Response) => {
  const start = Date.now();

  // 1. Database ping
  let dbStatus: 'healthy' | 'degraded' | 'down' = 'down';
  let dbLatencyMs = 0;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = dbLatencyMs < 200 ? 'healthy' : 'degraded';
  } catch {
    dbStatus = 'down';
  }

  // 2. Firebase / Push service
  let pushStatus: 'healthy' | 'degraded' | 'down' = 'down';
  try {
    const admin = await import('firebase-admin');
    pushStatus = admin.apps && admin.apps.length > 0 ? 'healthy' : 'degraded';
  } catch {
    pushStatus = 'degraded';
  }

  // 3. Socket layer — if this request is being served, the HTTP/WS layer is up
  const socketStatus: 'healthy' | 'degraded' | 'down' = 'healthy';

  // 4. API response time
  const apiLatencyMs = Date.now() - start;
  const apiStatus: 'healthy' | 'degraded' | 'down' =
    apiLatencyMs < 300 ? 'healthy' : apiLatencyMs < 1000 ? 'degraded' : 'down';

  // 5. Memory usage
  const mem = process.memoryUsage();
  const memUsedMB  = Math.round(mem.heapUsed  / 1024 / 1024);
  const memTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const memPct     = Math.round((mem.heapUsed / mem.heapTotal) * 100);

  sendSuccess(res, {
    uptime:   Math.floor(process.uptime()),   // seconds
    services: {
      api:      { status: apiStatus,    latencyMs: apiLatencyMs },
      database: { status: dbStatus,     latencyMs: dbLatencyMs  },
      push:     { status: pushStatus,   latencyMs: null         },
      socket:   { status: socketStatus, latencyMs: null         },
    },
    memory: { usedMB: memUsedMB, totalMB: memTotalMB, usedPct: memPct },
  }, 'System health retrieved');
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

/**
 * Admin: Send Test Email
 */
export const sendTestEmail = async (req: Request, res: Response) => {
  try {
    const { sendEmail } = await import('../utils/email');
    const user = (req as any).user;

    const success = await sendEmail({
      to: user.email,
      subject: 'MediFind: System Email Test',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color: #0C637E;">Email Configuration Verified!</h2>
          <p>Hello <strong>${user.fullName}</strong>,</p>
          <p>This is a test email triggered from the <strong>MediFind Admin Portal</strong>. If you are reading this, your email gateway (SMTP/SendGrid) is correctly configured and active.</p>
          <div style="background: #F0F7FA; padding: 15px; border-radius: 8px; color: #0C637E; margin: 20px 0; font-size: 0.9rem;">
            <strong>System Node:</strong> ${process.env.NODE_ENV || 'development'}<br/>
            <strong>Timestamp:</strong> ${new Date().toLocaleString()}
          </div>
          <p>You can now proceed with configuring system notifications and responder approvals.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
          <p style="font-size: 12px; color: #94A3B8;">Sent via MediFind Platform Settings Infrastructure</p>
        </div>
      `
    });

    if (success) {
      sendSuccess(res, null, `Test email sent to ${user.email}`);
    } else {
      sendError(res, 'Failed to send email. Check server logs for SMTP errors.', 500);
    }
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Admin: Generate AI Notification Draft
 * POST /api/admin/generate-draft
 */
export const generateDraft = async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return sendError(res, 'Prompt is required', 400);
    }

    const { generateNotificationDraft } = await import('../services/aiService');
    const draft = await generateNotificationDraft(prompt);

    sendSuccess(res, draft, 'AI draft generated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
