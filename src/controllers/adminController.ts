import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { sendNotification } from '../services/notification/index';
import { NotificationChannel } from '../types/notification';
import { sendEmail } from '../utils/email';

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
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            createdAt: true,
            profileImageUrl: true,
            city: true,
            address: true,
            dateOfBirth: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' }, // oldest first (longest waiting)
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
    const { id } = req.params;           // responder userId
    const { action, reason } = req.body; // action: VERIFY | REJECT

    // ── APPROVE ────────────────────────────────────────────────────────────
    if (action === 'VERIFY') {
      const responder = await prisma.responder.update({
        where: { userId: id },
        data: { verificationStatus: 'VERIFIED' as any, isVerified: true } as any,
        include: { user: true }
      });

      // 1. Send email OTP so responder can activate their account
      const { sendVerificationCode } = await import('../services/auth');
      await sendVerificationCode(responder.userId, responder.user.email, responder.user.fullName);

      // 2. In-app + push notification (works even if app is in background)
      await sendNotification(responder.userId, {
        type: 'VERIFICATION_APPROVED' as any,
        title: '🎉 Application Approved!',
        body: 'Congratulations! Your credentials have been verified by MediFind. Check your email for the 6-digit code to activate your account.',
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        priority: 'high',
      });

      // 3. Confirmation email
      await sendEmail({
        to: responder.user.email,
        subject: 'MediFind — Your Responder Application Has Been Approved ✅',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#03293C,#0C637E);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="color:white;margin:0;font-size:24px;">Application Approved</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">MediFind Emergency Response Network</p>
            </div>
            <div style="background:#f8fafc;padding:30px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
              <p style="font-size:16px;color:#0f172a;">Dear <strong>${responder.user.fullName}</strong>,</p>
              <p style="color:#475569;line-height:1.7;">
                We are pleased to inform you that your application to join the MediFind Emergency Response Network
                has been <strong style="color:#059669;">approved</strong> by our administrative team.
              </p>
              <div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:8px;padding:16px;margin:20px 0;">
                <strong style="color:#065f46;">Next Step:</strong>
                <p style="color:#065f46;margin:6px 0 0;">
                  A 6-digit verification code has been sent to this email address.
                  Open the MediFind app and enter the code to activate your account and start responding to emergencies.
                </p>
              </div>
              <p style="color:#64748b;font-size:13px;">If you did not apply for a MediFind responder account, please ignore this email.</p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
              <p style="color:#94a3b8;font-size:12px;text-align:center;">
                MediFind Healthcare Emergency Network · Pakistan<br/>This is an automated message — do not reply.
              </p>
            </div>
          </div>`,
      });

      sendSuccess(res, null, 'Responder approved — OTP and notification sent');

    // ── REJECT ─────────────────────────────────────────────────────────────
    } else if (action === 'REJECT') {
      const responder = await prisma.responder.update({
        where: { userId: id },
        data: {
          verificationStatus: 'REJECTED' as any,
          isVerified: false,
          rejectionReason: reason
        } as any,
        include: { user: true }
      });

      const rejectionReason = reason || 'Incomplete or unverifiable documents';

      // 1. In-app + push notification (reaches responder even when app is closed)
      await sendNotification(id, {
        type: 'VERIFICATION_REJECTED' as any,
        title: 'Application Update — Action Required',
        body: `Your MediFind application was not approved. Reason: ${rejectionReason}. Please review and resubmit.`,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        priority: 'high',
      });

      // 2. Email — primary channel since push may not be set up yet
      await sendEmail({
        to: responder.user.email,
        subject: 'MediFind — Application Status Update',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#03293C,#0C637E);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="color:white;margin:0;font-size:24px;">Application Status Update</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">MediFind Emergency Response Network</p>
            </div>
            <div style="background:#f8fafc;padding:30px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
              <p style="font-size:16px;color:#0f172a;">Dear <strong>${responder.user.fullName}</strong>,</p>
              <p style="color:#475569;line-height:1.7;">
                Thank you for applying to the MediFind Emergency Response Network. After reviewing your credentials,
                our administrative team was unable to approve your application at this time.
              </p>
              <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:20px 0;">
                <strong style="color:#991b1b;">Reason for Rejection:</strong>
                <p style="color:#7f1d1d;margin:6px 0 0;">${rejectionReason}</p>
              </div>
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;">
                <strong style="color:#1e40af;">What to do next:</strong>
                <ul style="color:#1e3a8a;margin:8px 0 0;padding-left:20px;line-height:2;">
                  <li>Open the MediFind app</li>
                  <li>Go to your Profile and update your documents</li>
                  <li>Submit a new verification request</li>
                </ul>
              </div>
              <p style="color:#64748b;font-size:13px;">
                If you believe this is an error or need assistance, please contact MediFind support.
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
              <p style="color:#94a3b8;font-size:12px;text-align:center;">
                MediFind Healthcare Emergency Network · Pakistan<br/>This is an automated message — do not reply.
              </p>
            </div>
          </div>`,
      });

      sendSuccess(res, null, 'Responder rejected — email and push notification sent');

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
 * Admin: Emergency Trend Analytics (last 14 days)
 * GET /api/admin/analytics/emergencies
 */
export const getEmergencyTrend = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 14;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Fetch all emergencies in range
    const emergencies = await prisma.emergency.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true, emergencyType: true },
      orderBy: { createdAt: 'asc' },
    });

    // Build daily buckets
    const buckets: Record<string, { date: string; total: number; active: number; resolved: number; cancelled: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { date: key, total: 0, active: 0, resolved: 0, cancelled: 0 };
    }

    for (const e of emergencies) {
      const key = new Date(e.createdAt).toISOString().slice(0, 10);
      if (!buckets[key]) continue;
      buckets[key].total++;
      if (e.status === 'ACTIVE' || e.status === 'ASSIGNED' || e.status === 'ARRIVED') buckets[key].active++;
      else if (e.status === 'RESOLVED' || e.status === 'COMPLETED') buckets[key].resolved++;
      else if (e.status === 'CANCELLED') buckets[key].cancelled++;
    }

    // Type breakdown
    const typeCounts: Record<string, number> = {};
    for (const e of emergencies) {
      typeCounts[e.emergencyType] = (typeCounts[e.emergencyType] || 0) + 1;
    }
    const typeBreakdown = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    sendSuccess(res, {
      trend: Object.values(buckets),
      typeBreakdown,
      totalInPeriod: emergencies.length,
      period: `Last ${days} days`,
    }, 'Analytics retrieved');
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

// ─── Platform Settings (persisted to settings.json in project root) ───────────
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'platform-settings.json');

const DEFAULT_SETTINGS = {
  orgName: 'MediFind Emergency Response Network',
  supportEmail: 'support@medifind.pk',
  maintenanceMode: false,
  debugLogging: false,
  alertEmail: 'ops@medifind.pk',
  alertWebhook: '',
  twoFactorRequired: false,
  sessionTimeoutMinutes: 30,
  ipWhitelisting: false,
  allowedIps: [] as string[],
  // Email gateway (overrides .env when emailGateway !== 'env')
  emailGateway:   'env',   // 'env' | 'gmail' | 'mailtrap' | 'outlook' | 'custom'
  smtpHost:       '',
  smtpPort:       '587',
  smtpEncryption: 'tls',   // 'tls' | 'ssl' | 'none'
  smtpUser:       '',
  smtpPass:       '',
  smtpFromName:   'MediFind Emergency Network',
};

export function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

/* ── Return the admin's real IP so they can whitelist it in the UI ─────────── */
export const getMyIp = async (req: Request, res: Response) => {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
  sendSuccess(res, { ip }, 'Your IP address');
};

/* ── Public endpoint: session timeout + 2FA flag for client-side use ─────── */
export const getClientSettings = async (_req: Request, res: Response) => {
  try {
    const s = readSettings();
    sendSuccess(res, {
      sessionTimeoutMinutes: s.sessionTimeoutMinutes,
      twoFactorRequired:     s.twoFactorRequired,
    }, 'Client settings');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getPlatformSettings = async (req: Request, res: Response) => {
  try {
    const settings = readSettings();
    // Env-based read-only info (for display when gateway = 'env')
    const envInfo = {
      smtpHost:    process.env.SMTP_HOST    || 'smtp.gmail.com',
      smtpPort:    process.env.SMTP_PORT    || '465',
      smtpUser:    process.env.SMTP_USER    ? `${process.env.SMTP_USER.slice(0, 4)}****` : '(not set)',
      stripeMode:  process.env.STRIPE_SECRET_KEY ? (process.env.STRIPE_SECRET_KEY.startsWith('sk_live') ? 'LIVE' : 'TEST') : 'NOT CONFIGURED',
      nodeEnv:     process.env.NODE_ENV     || 'development',
    };
    // Never send the raw SMTP password to the frontend — mask it
    const safeSettings = {
      ...settings,
      smtpPass: settings.smtpPass ? '••••••••' : '',
    };
    sendSuccess(res, { ...safeSettings, envInfo }, 'Platform settings retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const savePlatformSettings = async (req: Request, res: Response) => {
  try {
    const allowed = [
      'orgName', 'supportEmail', 'maintenanceMode', 'debugLogging',
      'alertEmail', 'alertWebhook', 'twoFactorRequired',
      'sessionTimeoutMinutes', 'ipWhitelisting', 'allowedIps',
      // Email gateway fields
      'emailGateway', 'smtpHost', 'smtpPort', 'smtpEncryption',
      'smtpUser', 'smtpPass', 'smtpFromName',
    ];
    const current = readSettings();
    const update: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const merged = { ...current, ...update };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    // Invalidate cached nodemailer transporter so next email uses the new config
    const { invalidateTransporter } = await import('../utils/email');
    invalidateTransporter();
    sendSuccess(res, merged, 'Platform settings saved successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/* ── Test SMTP config directly from the admin UI ──────────────────────────── */
export const testSmtpConfig = async (req: Request, res: Response) => {
  try {
    const { host, port, encryption, user, pass, fromName } = req.body;
    if (!host || !user || !pass) {
      return sendError(res, 'host, user, and pass are required to test the connection', 400);
    }

    const { buildTransporter } = await import('../utils/email');
    const transporter = buildTransporter({
      host,
      port:   Number(port) || 587,
      secure: encryption === 'ssl',
      user,
      pass,
    });

    // 1. Verify the connection
    await transporter.verify();

    // 2. Send a test email to the admin who triggered it
    const adminUser = await prisma.user.findUnique({ where: { id: (req as any).user.userId } });
    if (adminUser?.email) {
      await transporter.sendMail({
        from:    `"${fromName || 'MediFind'}" <${user}>`,
        to:      adminUser.email,
        subject: '✅ MediFind SMTP Test — Connection Successful',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
            <h2 style="color:#0C637E;margin-top:0">✅ SMTP Connection Verified</h2>
            <p>Your email gateway is correctly configured and active.</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#64748b;font-weight:600">Host</td><td>${host}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-weight:600">Port</td><td>${port}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-weight:600">Encryption</td><td>${encryption?.toUpperCase() || 'TLS'}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-weight:600">User</td><td>${user}</td></tr>
            </table>
            <p style="margin-top:20px;color:#64748b;font-size:12px">Sent from MediFind Admin Portal</p>
          </div>`,
      });
    }

    sendSuccess(res, { verified: true }, `Connection verified — test email sent to ${adminUser?.email}`);
  } catch (error: any) {
    sendError(res, `SMTP test failed: ${error.message}`, 400);
  }
};

/**
 * Admin: Get all online (available + GPS-located) responders for the live map.
 * GET /api/admin/responders/online
 * Returns responders who are available, verified, active, and have shared their GPS.
 * In development mode the isVerified / isEmailVerified checks are relaxed so the
 * map works without going through the full approval flow during testing.
 */
export const getOnlineResponders = async (_req: Request, res: Response) => {
  try {
    const isDev = process.env.NODE_ENV === 'development';

    const responders = await prisma.responder.findMany({
      where: {
        isAvailable: true,
        ...(isDev ? {} : { isVerified: true }),
        currentLatitude:  { not: null },
        currentLongitude: { not: null },
        user: {
          isActive: true,
          ...(isDev ? {} : { isEmailVerified: true }),
        },
      },
      select: {
        userId:           true,
        responderType:    true,
        organization:     true,
        rating:           true,
        currentLatitude:  true,
        currentLongitude: true,
        user: {
          select: {
            fullName:        true,
            phoneNumber:     true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, responders, 'Online responders retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
