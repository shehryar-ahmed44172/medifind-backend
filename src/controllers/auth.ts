import { Request, Response } from 'express';
import * as authService from '../services/auth';
import { sendSuccess, sendError } from '../utils/response';
import { RegisterRequest, LoginRequest, RefreshTokenRequest } from '../types/auth';

/**
 * POST /api/auth/register
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { fullName, email, phoneNumber, password, role } = req.body as RegisterRequest;

    // Validation
    if (!fullName || !email || !phoneNumber || !password || !role) {
      return sendError(res, 'Missing required fields', 400);
    }

    if (password.length < 8) {
      return sendError(res, 'Password must be at least 8 characters', 400);
    }

    const validRoles = ['PATIENT', 'RESPONDER', 'CAREGIVER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return sendError(res, 'Invalid role', 400);
    }

    const result = await authService.register({ fullName, email, phoneNumber, password, role });
    sendSuccess(res, result, 'Registration successful', 201);
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * POST /api/auth/login
 * Login user and return access & refresh tokens
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return sendError(res, 'Email and password required', 400);
    }

    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const result = await authService.login(email, password, ipAddress);
    sendSuccess(res, result, 'Login successful', 200);
  } catch (error: any) {
    sendError(res, error.message, 401);
  }
};

/**
 * POST /api/auth/refresh-token
 * Refresh access token using refresh token (CRITICAL for mobile)
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as RefreshTokenRequest;

    if (!refreshToken) {
      return sendError(res, 'Refresh token required', 400);
    }

    const result = await authService.refreshAccessToken(refreshToken);
    sendSuccess(res, result, 'Token refreshed successfully', 200);
  } catch (error: any) {
    sendError(res, error.message, 401);
  }
};

/**
 * POST /api/auth/logout
 * Logout user and revoke refresh token
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as RefreshTokenRequest;

    if (!refreshToken) {
      return sendError(res, 'Refresh token required', 400);
    }

    await authService.logout(refreshToken);
    sendSuccess(res, null, 'Logout successful', 200);
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * GET /api/auth/me
 * Get current user profile (requires auth)
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'User not authenticated', 401);
    }

    const user = {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
    };

    sendSuccess(res, user, 'User profile retrieved', 200);
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};
