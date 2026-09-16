import { Request, Response } from 'express';
import path from 'path';
import * as authService from '../services/auth';
import { sendSuccess, sendError } from '../utils/response';
import { RegisterRequest, LoginRequest, RefreshTokenRequest } from '../types/auth';

/**
 * POST /api/auth/register
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
  console.log(`\n📥 [AUTH] Register Request: ${req.body?.email} (${req.body?.role})`);
  try {
    const {
      fullName, email, phoneNumber, password, role,
      // Personal
      cnic, city, address, patientType, dateOfBirth,
      // Responder credentials
      organization, licenseNumber, responderType, vehicleType, specialization,
      // Responder vehicle info
      motorbikeNumber,
      // Responder document URLs (uploaded separately via /upload-document)
      cnicImageUrl, cnicBackImageUrl, employeeCardImageUrl, employeeCardBackImageUrl,
      drivingLicenseUrl, motorbikeDocUrl,
    } = req.body as RegisterRequest;

    // Basic validation
    if (!fullName || !email || !phoneNumber || !password || !role) {
      return sendError(res, 'Missing required fields: fullName, email, phoneNumber, password, role', 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return sendError(res, 'Please provide a valid email address', 400);
    }

    if (password.length < 8) {
      return sendError(res, 'Password must be at least 8 characters', 400);
    }

    // ADMIN accounts are provisioned by the system owner, never via public sign-up
    const validRoles = ['PATIENT', 'RESPONDER', 'CAREGIVER'];
    if (!validRoles.includes(role)) {
      return sendError(res, `Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
    }

    const result = await authService.register({
      fullName, email, phoneNumber, password, role,
      cnic, city, address, patientType, dateOfBirth,
      organization, licenseNumber, responderType, vehicleType, specialization,
      motorbikeNumber,
      cnicImageUrl, cnicBackImageUrl, employeeCardImageUrl, employeeCardBackImageUrl,
      drivingLicenseUrl, motorbikeDocUrl,
    });

    sendSuccess(res, result, 'Registration successful', 201);
  } catch (error: any) {
    console.error('Registration Error:', error.message);
    sendError(res, error.message, 400);
  }
};

/**
 * POST /api/auth/login
 * Login user and return access & refresh tokens
 */
export const login = async (req: Request, res: Response) => {
  console.log(`\n📥 [AUTH] Login Attempt: ${req.body?.email}`);
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
 * Deprecated: device tokens are not needed by the self-hosted push service
 */
export const updateFcmToken = async (req: Request, res: Response) => {
  // Deprecated: push is delivered by the self-hosted MediFind Push service over the
  // authenticated socket, so device tokens are no longer needed. Kept for old app builds.
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  sendSuccess(res, null, 'Device tokens are no longer required');
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
    console.error('❌ Forgot Password Error:', error.message);
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

/**
 * POST /api/auth/verify-email
 * Verify user email with OTP code
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return sendError(res, 'Email and OTP code are required', 400);
    }

    const result = await authService.verifyEmail(email, otp);
    sendSuccess(res, result, 'Email verified successfully', 200);
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * POST /api/auth/resend-verification
 * Resend email verification code
 */
export const resendVerificationCode = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendError(res, 'Email is required', 400);
    }

    const result = await authService.resendVerificationCode(email);
    sendSuccess(res, result, 'Verification code resent successfully', 200);
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * POST /api/auth/upload-document
 * Public endpoint to upload documents during registration
 */
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    // Store a ROOT-RELATIVE path (e.g. /uploads/documents/file-123.jpg)
    // NOT an absolute URL — the mobile device's host differs from the admin
    // portal host, so storing http://10.0.2.2:3000/... or an ngrok URL would
    // break document viewing in the web portal.
    // The web portal resolveFileUrl() prepends BACKEND_ORIGIN when it needs a
    // full URL, and Vite proxies /uploads → http://localhost:3000.
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const relativePath = path.relative(uploadsRoot, req.file.path).replace(/\\/g, '/');
    const fileUrl = `/uploads/${relativePath}`;   // relative — host-agnostic

    sendSuccess(res, { url: fileUrl }, 'File uploaded successfully', 200);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
