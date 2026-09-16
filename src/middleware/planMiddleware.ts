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
 * Feature limits by role and plan.
 * -1 = unlimited.
 */
export const PLAN_LIMITS = {
  PATIENT: {
    FREE:         { maxCaregivers: 1,  maxMedicalReports: 5,  historyDays: 7  },
    PROFESSIONAL: { maxCaregivers: 5,  maxMedicalReports: 50, historyDays: 90 },
    EXECUTIVE:    { maxCaregivers: 20, maxMedicalReports: -1, historyDays: -1 },
  },
  CAREGIVER: {
    FREE:         { maxPatients: 1,  canViewFullHistory: false },
    PROFESSIONAL: { maxPatients: 5,  canViewFullHistory: true  },
    EXECUTIVE:    { maxPatients: -1, canViewFullHistory: true  },
  },
  RESPONDER: {
    FREE:         { caseHistoryDays: 30  },
    PROFESSIONAL: { caseHistoryDays: 365 },
    EXECUTIVE:    { caseHistoryDays: -1  },
  },
} as const;

/** Helper: get the PATIENT limits for a given plan string */
export const patientLimits = (plan: string) =>
  PLAN_LIMITS.PATIENT[(plan as keyof typeof PLAN_LIMITS.PATIENT)] ?? PLAN_LIMITS.PATIENT.FREE;

/** Helper: get the CAREGIVER limits for a given plan string */
export const caregiverLimits = (plan: string) =>
  PLAN_LIMITS.CAREGIVER[(plan as keyof typeof PLAN_LIMITS.CAREGIVER)] ?? PLAN_LIMITS.CAREGIVER.FREE;

/** Helper: get the RESPONDER limits for a given plan string */
export const responderLimits = (plan: string) =>
  PLAN_LIMITS.RESPONDER[(plan as keyof typeof PLAN_LIMITS.RESPONDER)] ?? PLAN_LIMITS.RESPONDER.FREE;
