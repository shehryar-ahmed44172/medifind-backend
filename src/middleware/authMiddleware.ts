import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { TokenPayload } from '../types/auth';

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

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Missing or invalid authorization header', 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
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
