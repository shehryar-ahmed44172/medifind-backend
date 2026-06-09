import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
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

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    logger.info(`[AuthMiddleware] URL: ${req.originalUrl}, Header: ${authHeader ? (authHeader.startsWith('Bearer ') ? 'Bearer [PRESENT]' : 'Malformed') : 'MISSING'}`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Missing or invalid authorization header', 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      logger.warn(`[AuthMiddleware] Invalid or expired token for ${req.originalUrl}`);
      return sendError(res, 'Invalid or expired token', 401);
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
      console.log(`[Role Check] FAILED: User ${req.user?.userId} (Role: ${req.user?.role}) tried to access ${req.originalUrl}. Allowed roles: ${allowedRoles}`);
      return sendError(res, 'Unauthorized', 403);
    }
    console.log(`[Role Check] PASSED: User ${req.user?.userId} (Role: ${req.user?.role}) for ${req.originalUrl}`);
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
