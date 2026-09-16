import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { TokenPayload } from '../types/auth';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production');
}
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '30d';

export const generateAccessToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRATION as SignOptions['expiresIn'],
    algorithm: 'HS256',
  };
  return jwt.sign({ userId: payload.userId, email: payload.email, role: payload.role }, JWT_SECRET, options);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: JWT_REFRESH_EXPIRATION as SignOptions['expiresIn'],
    algorithm: 'HS256',
  };
  // `type` + `jti` make refresh tokens distinguishable from access tokens and unique per issue
  return jwt.sign(
    { userId: payload.userId, email: payload.email, role: payload.role, type: 'refresh', jti: crypto.randomUUID() },
    JWT_SECRET,
    options,
  );
};

/**
 * Verify an access token. Refresh tokens are rejected so a long-lived
 * refresh token cannot be used to call protected APIs.
 */
export const verifyAccessToken = (token: string): TokenPayload | null => {
  const payload = verifyToken(token);
  if (!payload || payload.type === 'refresh') return null;
  return payload;
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
};

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload | null;
  } catch {
    return null;
  }
};
