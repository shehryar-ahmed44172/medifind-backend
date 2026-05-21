import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import prisma from '../lib/prisma';

/**
 * Subscription plan hierarchy (higher index = more features)
 */
const PLAN_RANK: Record<string, number> = {
  FREE:         0,
  PROFESSIONAL: 1,
  EXECUTIVE:    2,
};

/**
 * requirePlan(minimumPlan)
 * Gate a route behind a minimum subscription plan.
 * Only applies to PATIENT role — ADMINs and RESPONDERs always pass.
 *
 * Usage:
 *   router.post('/premium-feature', authMiddleware, requirePlan('PROFESSIONAL'), handler);
 */
export const requirePlan = (minimumPlan: 'FREE' | 'PROFESSIONAL' | 'EXECUTIVE') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);

      // Non-patients are never plan-gated
      if (req.user.role !== 'PATIENT') return next();

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { subscriptionPlan: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return sendError(res, 'Account is inactive', 403);
      }

      const userRank = PLAN_RANK[user.subscriptionPlan ?? 'FREE'] ?? 0;
      const requiredRank = PLAN_RANK[minimumPlan] ?? 0;

      if (userRank < requiredRank) {
        return sendError(
          res,
          `This feature requires a ${minimumPlan} subscription. ` +
          `Your current plan is ${user.subscriptionPlan ?? 'FREE'}. ` +
          `Upgrade at Settings → Subscription Plans.`,
          403
        );
      }

      next();
    } catch (err: any) {
      sendError(res, 'Plan check failed', 500);
    }
  };
};

/**
 * Feature limits by plan (used for soft enforcement in services)
 */
export const PLAN_LIMITS = {
  FREE: {
    maxCaregivers:       1,   // Max linked caregivers
    maxMedicalReports:   5,   // Max stored medical reports
    chatEnabled:         true,
    historyDays:         7,   // Emergency history visible for N days
  },
  PROFESSIONAL: {
    maxCaregivers:       5,
    maxMedicalReports:   50,
    chatEnabled:         true,
    historyDays:         90,
  },
  EXECUTIVE: {
    maxCaregivers:       20,
    maxMedicalReports:   -1,  // Unlimited
    chatEnabled:         true,
    historyDays:         -1,  // All time
  },
} as const;
