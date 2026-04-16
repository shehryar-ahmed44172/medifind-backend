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
    const {
      fullName, email, phoneNumber, password, role,
      // Optional role-specific fields
      cnic, patientType,
      organization, licenseNumber, responderType, vehicleType,
    } = req.body as RegisterRequest;

    // Basic validation
    if (!fullName || !email || !phoneNumber || !password || !role) {
      return sendError(res, 'Missing required fields: fullName, email, phoneNumber, password, role', 400);
    }

    if (password.length < 8) {
      return sendError(res, 'Password must be at least 8 characters', 400);
    }

    const validRoles = ['PATIENT', 'RESPONDER', 'CAREGIVER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return sendError(res, `Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
    }

    const result = await authService.register({
      fullName, email, phoneNumber, password, role,
      cnic, patientType,
      organization, licenseNumber, responderType, vehicleType,
    });

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

    const { userRepository } = await import('../repositories/userRepository');
    const user = await userRepository.findById(req.user.userId);
    
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Remove sensitive data
    const { passwordHash, failedLoginAttempts, accountLockedUntil, ...safeUser } = user;

    sendSuccess(res, safeUser, 'User profile retrieved', 200);
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * PUT /api/auth/fcm-token
 * Update FCM device token for push notifications
 */
export const updateFcmToken = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'User not authenticated', 401);
    }

    const { fcmToken } = req.body;
    if (!fcmToken) {
      return sendError(res, 'FCM token required', 400);
    }

    const { userRepository } = await import('../repositories/userRepository');
    await userRepository.updateFcmToken(req.user.userId, fcmToken);
    
    sendSuccess(res, null, 'FCM token updated successfully', 200);
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * POST /api/auth/forgot-password
 * Initiate password reset flow
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendError(res, 'Email is required', 400);
    }

    const result = await authService.requestPasswordReset(email);
    sendSuccess(res, result, 'Reset email sent successfully', 200);
  } catch (error: any) {
    // If user not found, we still return 404 so frontend can show specific alert
    const statusCode = error.message === 'Email is not registered' ? 404 : 400;
    sendError(res, error.message, statusCode);
  }
};

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return sendError(res, 'Missing required fields: email, token, newPassword', 400);
    }

    const result = await authService.resetUserPassword(email, token, newPassword);
    sendSuccess(res, result, 'Password reset successfully', 200);
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};
