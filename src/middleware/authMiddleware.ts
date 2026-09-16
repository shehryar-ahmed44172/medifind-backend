import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../lib/prisma';
import { sendError } from '../utils/response';
import { TokenPayload } from '../types/auth';
import logger from '../utils/logger';
import { readSettings } from '../controllers/adminController';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/*
 * Short-lived cache of account status so every request doesn't hit the DB,
 * while deactivated/deleted accounts still lose access within seconds.
 */
const ACCOUNT_STATUS_TTL_MS = 15_000;
const accountStatusCache = new Map<string, { isActive: boolean; expires: number }>();

export const invalidateAccountStatus = (userId: string) => {
  accountStatusCache.delete(userId);
};

const isAccountActive = async (userId: string): Promise<boolean> => {
  const cached = accountStatusCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached.isActive;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
  const isActive = !!user?.isActive;
  accountStatusCache.set(userId, { isActive, expires: Date.now() + ACCOUNT_STATUS_TTL_MS });
  return isActive;
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Missing or invalid authorization header', 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    if (!payload) {
      logger.warn(`[AuthMiddleware] Invalid or expired token for ${req.originalUrl}`);
      return sendError(res, 'Invalid or expired token', 401);
    }

    if (!(await isAccountActive(payload.userId))) {
      return sendError(res, 'Your account has been deactivated. Please contact support.', 401);
    }

    // Maintenance mode: only administrators may use the API
    if (payload.role !== 'ADMIN' && readSettings().maintenanceMode) {
      return sendError(res, 'MediFind is under maintenance. Please try again shortly. For emergencies call 1122.', 503);
    }

    req.user = payload;
    next();
  } catch {
    sendError(res, 'Authentication failed', 401);
  }
};

export const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      logger.warn(`[Role Check] User ${req.user?.userId} (${req.user?.role}) denied ${req.originalUrl}; allowed: ${allowedRoles}`);
      return sendError(res, 'Unauthorized', 403);
    }
    next();
  };
};

/* ── IP Whitelist middleware — only enforced for ADMIN routes ─────────────── */
export const ipWhitelistMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = readSettings();
    if (!settings.ipWhitelisting) return next();                   // feature off
    const allowedIps: string[] = settings.allowedIps || [];
    if (allowedIps.length === 0) return next();                    // no list = allow all

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '';

    // Normalize IPv6 loopback to IPv4
    const normalised = clientIp === '::1' ? '127.0.0.1' : clientIp.replace(/^::ffff:/, '');

    if (allowedIps.includes(normalised)) return next();

    logger.warn(`[IPWhitelist] Blocked ${normalised} — not in allowlist`);
    return sendError(res, `Access denied: your IP (${normalised}) is not whitelisted.`, 403);
  } catch {
    next(); // fail-open so a settings read error never locks everyone out
  }
};
