import { hashPassword, verifyPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { userRepository } from '../repositories/userRepository';
import { passwordResetRepository } from '../repositories/passwordResetRepository';
import { RegisterRequest, AuthResponse } from '../types/auth';
import { recordFailedLoginAttempt, recordSuccessfulLogin } from '../middleware/loginRateLimitMiddleware';
import { sendEmail } from '../utils/email';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { getIo } from '../server';
import logger from '../utils/logger';

/*
 * Brute-force guard for 6-digit codes: after MAX_OTP_ATTEMPTS wrong guesses the
 * current code is burned and the user must request a new one.
 */
const MAX_OTP_ATTEMPTS = 5;
const otpAttempts = new Map<string, number>();

const registerOtpFailure = (key: string): boolean => {
  const attempts = (otpAttempts.get(key) || 0) + 1;
  otpAttempts.set(key, attempts);
  return attempts >= MAX_OTP_ATTEMPTS;
};

/**
 * Register a new user
 */
export const register = async (data: RegisterRequest) => {
  const existingUser = await userRepository.findByEmail(data.email);
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  const existingPhone = await userRepository.findByPhoneNumber(data.phoneNumber);
  if (existingPhone) {
    throw new Error('User already exists with this phone number');
  }

  const passwordHash = await hashPassword(data.password);

  // Validate RESPONDER has a license number
  if (data.role === 'RESPONDER' && !data.licenseNumber) {
    throw new Error('Responders must provide a license number');
  }

  // Enforce 18+ age for Responders
  if (data.role === 'RESPONDER' && data.dateOfBirth) {
    const dob = new Date(data.dateOfBirth);
    const ageMs = Date.now() - dob.getTime();
    const ageYears = ageMs / (365.25 * 24 * 3600 * 1000);
    if (ageYears < 18) {
      throw new Error('Responders must be at least 18 years old.');
    }
  }

  const user = await userRepository.create({
    fullName: data.fullName,
    email: data.email,
    phoneNumber: data.phoneNumber,
    passwordHash,
    role: data.role,
    isActive: true,
    // Pass all optional role-specific fields
    cnic: data.cnic,
    city: data.city,
    address: data.address,
    patientType: data.patientType,
    organization: data.organization,
    licenseNumber: data.licenseNumber,
    responderType: data.responderType,
    vehicleType: data.vehicleType ?? 'MOTORBIKE_AMBULANCE',
    motorbikeNumber: data.motorbikeNumber,
    specialization: data.specialization ?? [],
    cnicImageUrl: data.cnicImageUrl,
    cnicBackImageUrl: data.cnicBackImageUrl,
    employeeCardImageUrl: data.employeeCardImageUrl,
    employeeCardBackImageUrl: data.employeeCardBackImageUrl,
    drivingLicenseUrl: data.drivingLicenseUrl,
    motorbikeDocUrl: data.motorbikeDocUrl,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
  });

  // Store FCM token immediately if provided during registration.
  // Responders sit on the pending screen and can't log in until approved,
  // so the normal post-login FCM sync never fires for them. Storing the
  // token here ensures approval/rejection push notifications are delivered.
  if (data.fcmToken) {
    try {
      await (prisma as any).user.update({
        where: { id: user.id },
        data: { fcmTokens: [data.fcmToken] },
      });
      logger.info(`[Register] FCM token stored for user ${user.id}`);
    } catch (err: any) {
      logger.warn(`[Register] Failed to store FCM token: ${err.message}`);
    }
  }

  // For PATIENTS and CAREGIVERS, send verification code immediately
  // For RESPONDERS, we wait for admin approval before sending OTP
  if (user.role !== 'RESPONDER') {
    await sendVerificationCode(user.id, user.email, user.fullName);
    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isEmailVerified: false,
      message: 'Verification code sent to your email'
    };
  }

  // For Responders: Notify Admin of new application
  try {
    getIo().to('admin_notifications').emit('admin_notification', {
      id: `reg-${user.id}`,
      type: 'RESPONDER_REGISTRATION',
      title: 'New Responder Application',
      message: `${user.fullName} has applied as a ${
        ({ PARAMEDIC: 'Paramedic', RESCUE_OFFICER: 'Rescue Officer', EMT: 'Emergency Medical Technician', FIRST_RESPONDER: 'First Responder', VOLUNTEER: 'Volunteer' } as Record<string, string>)[data.responderType ?? ''] ?? 'Responder'
      }. Review documents to approve.`,
      timestamp: new Date().toISOString(),
      data: { userId: user.id }
    });
    console.log(`[REAL-TIME] Notified Admin of new responder registration: ${user.fullName}`);
  } catch (err) {
    console.error('Failed to emit admin notification:', err);
  }

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isEmailVerified: false,
    message: 'Registration successful. Please wait for admin approval. You will receive a verification code once approved.'
  };
};

/**
 * Send verification OTP code to user email
 */
export const sendVerificationCode = async (userId: string, email: string, fullName: string) => {
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await (prisma as any).emailVerification.upsert({
    where: { userId: userId },
    update: { otp, expiresAt: otpExpires },
    create: { userId: userId, otp, expiresAt: otpExpires },
  });

  if (process.env.NODE_ENV !== 'production') {
    logger.debug(`[DEV ONLY] Verification OTP for ${email}: ${otp}`);
  }
  
  await sendEmail({
    to: email,
    subject: 'Verify your MediFind Account',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0E9AA7;">Welcome to MediFind!</h2>
        <p>Hello ${fullName},</p>
        <p>Your account has been approved by the admin. Please use the following code to verify your email address and activate your account:</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 15 minutes.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">MediFind - Your Health, Our Priority</p>
      </div>
    `
  });
};

/**
 * Verify user email with OTP
 */
export const verifyEmail = async (email: string, otp: string) => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }

  const verification = await (prisma as any).emailVerification.findUnique({
    where: { userId: user.id }
  });

  if (!verification) {
    throw new Error('Invalid verification code');
  }

  if (verification.otp !== String(otp)) {
    if (registerOtpFailure(`verify:${user.id}`)) {
      otpAttempts.delete(`verify:${user.id}`);
      await (prisma as any).emailVerification.delete({ where: { userId: user.id } });
      throw new Error('Too many incorrect attempts. Please request a new verification code.');
    }
    throw new Error('Invalid verification code');
  }
  otpAttempts.delete(`verify:${user.id}`);

  if (new Date() > verification.expiresAt) {
    throw new Error('Verification code has expired');
  }

  // Update user status
  await (prisma as any).user.update({
    where: { id: user.id },
    data: { isEmailVerified: true }
  });

  // Delete verification record
  await (prisma as any).emailVerification.delete({
    where: { userId: user.id }
  });

  // Generate tokens for login after verification
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  // Use deterministic hash for DB lookup (SHA-256)
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await userRepository.createRefreshToken(user.id, refreshTokenHash);

  return {
    userId: user.id,
    token: accessToken,
    refreshToken: refreshToken,
    expiresIn: 86400,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
};

/**
 * Resend verification code
 */
export const resendVerificationCode = async (email: string) => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.isEmailVerified) {
    throw new Error('Email is already verified');
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

  await (prisma as any).emailVerification.upsert({
    where: { userId: user.id },
    update: { otp, expiresAt: otpExpires },
    create: { userId: user.id, otp, expiresAt: otpExpires },
  });

  if (process.env.NODE_ENV !== 'production') {
    logger.debug(`[DEV ONLY] Resent verification OTP for ${user.email}: ${otp}`);
  }

  await sendEmail({
    to: user.email,
    subject: 'Your new MediFind Verification Code',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0E9AA7;">Email Verification Code</h2>
        <p>Hello ${user.fullName},</p>
        <p>You requested a new verification code. Please use the following code to verify your email address:</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 15 minutes.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">MediFind - Your Health, Our Priority</p>
      </div>
    `
  });

  return { success: true, message: 'New verification code sent' };
};

/**
 * Login user and return tokens with rate limiting
 */
export const login = async (email: string, password: string, ipAddress?: string): Promise<AuthResponse> => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check account lockout
  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    const minutesRemaining = Math.ceil(
      (user.accountLockedUntil.getTime() - new Date().getTime()) / 60000
    );
    throw new Error(`Account is locked. Try again in ${minutesRemaining} minutes.`);
  } else if (user.accountLockedUntil) {
    // Lockout expired, reset counter
    await userRepository.resetFailedLoginAttempts(user.id);
  }

  const passwordMatch = await verifyPassword(password, user.passwordHash);
  if (!passwordMatch) {
    // Track failed login attempt (this may lock the account)
    await recordFailedLoginAttempt(user.id);

    // Re-fetch to get the updated attempt count (recordFailedLoginAttempt mutates DB)
    const updated = await userRepository.findById(user.id);
    const failedAttempts = updated?.failedLoginAttempts ?? 0;
    const MAX_ATTEMPTS = 5;

    if (updated?.accountLockedUntil && updated.accountLockedUntil > new Date()) {
      // Just got locked on this attempt
      throw new Error('Account is temporarily locked. Try again in 30 minutes.');
    }

    const remaining = MAX_ATTEMPTS - failedAttempts;
    if (remaining <= 2 && remaining > 0) {
      throw new Error(
        `Invalid credentials. Warning: ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before your account is locked for 30 minutes.`
      );
    }

    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Your account has been deactivated. Please contact support.');
  }

  // Check if email is verified
  if (!user.isEmailVerified) {
    throw new Error('Please verify your email before logging in');
  }

  // Password is correct - record successful login
  await recordSuccessfulLogin(user.id, ipAddress || 'unknown');

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  // Use deterministic hash for DB lookup (SHA-256)
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await userRepository.createRefreshToken(user.id, refreshTokenHash);
  await userRepository.updateLastLogin(user.id);

  return {
    userId: user.id,
    token: accessToken,
    refreshToken,
    expiresIn: 86400, // 24 hours in seconds
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<AuthResponse> => {
  const decoded = verifyToken(refreshToken);
  if (!decoded) {
    throw new Error('Invalid refresh token');
  }

  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const tokenRecord = await userRepository.findRefreshToken(refreshTokenHash);

  if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.userId !== decoded.userId) {
    throw new Error('Invalid or revoked refresh token');
  }

  if (new Date() > tokenRecord.expiresAt) {
    throw new Error('Refresh token expired');
  }

  // Always rebuild claims from the database so role changes / deactivation take effect
  const user = await userRepository.findById(decoded.userId);
  if (!user || !user.isActive) {
    await userRepository.revokeRefreshToken(refreshTokenHash);
    throw new Error('Account is no longer active');
  }

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  const token = generateAccessToken(payload);

  return {
    userId: user.id,
    token,
    accessToken: token,
    refreshToken,
    expiresIn: 86400,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
};

/**
 * Logout user (revoke refresh token)
 */
export const logout = async (refreshToken: string) => {
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await userRepository.revokeRefreshToken(refreshTokenHash);
  return { success: true };
};

/**
 * Request password reset (Forgot Password)
 * Generates a 6-digit numeric OTP, stores its bcrypt hash, and emails it.
 */
export const requestPasswordReset = async (email: string) => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('Email is not registered');
  }

  // Invalidate any existing unused tokens for this user (one active reset at a time)
  const existing = await passwordResetRepository.getRecentResetRequests(user.id, 24);
  for (const t of existing) {
    if (!t.usedAt) {
      await passwordResetRepository.markTokenAsUsed(t.id);
    }
  }

  // Generate a 6-digit numeric OTP (easy to type on mobile)
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = await hashPassword(otp);

  // OTP expires in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await passwordResetRepository.createResetToken(user.id, otpHash, expiresAt);

  if (process.env.NODE_ENV !== 'production') {
    logger.debug(`[DEV ONLY] Password reset OTP for ${user.email}: ${otp}`);
  }

  await sendEmail({
    to: user.email,
    subject: 'MediFind — Password Reset Code',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 480px; margin: auto;">
        <h2 style="color: #0E9AA7;">Password Reset Request</h2>
        <p>Hello ${user.fullName},</p>
        <p>We received a request to reset your <strong>MediFind</strong> account password. Enter the code below in the app:</p>
        <div style="background: #f4f4f4; padding: 20px; border-radius: 10px; font-size: 36px; font-weight: bold; text-align: center; letter-spacing: 10px; margin: 24px 0; color: #0E9AA7;">
          ${otp}
        </div>
        <p>This code will expire in <strong>15 minutes</strong>.</p>
        <p style="color: #e74c3c;">If you didn't request a password reset, please ignore this email. Your password will not be changed.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">MediFind — Your Health, Our Priority</p>
      </div>
    `
  });

  return { success: true, message: 'A 6-digit reset code has been sent to your email.' };
};

/**
 * Reset user password using the 6-digit OTP from email.
 * The `otp` parameter is the raw 6-digit code the user typed in the app.
 */
export const resetUserPassword = async (email: string, otp: string, newPassword: string) => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }

  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  // Look up active (unused, not expired) tokens for this user created in the last hour
  const tokens = await passwordResetRepository.getRecentResetRequests(user.id, 1);
  let validToken = null;

  for (const t of tokens) {
    if (!t.usedAt && t.expiresAt > new Date()) {
      // The stored tokenHash is the bcrypt hash of the 6-digit OTP
      const match = await verifyPassword(otp, t.tokenHash);
      if (match) {
        validToken = t;
        break;
      }
    }
  }

  if (!validToken) {
    if (registerOtpFailure(`reset:${user.id}`)) {
      otpAttempts.delete(`reset:${user.id}`);
      for (const t of tokens) {
        if (!t.usedAt) await passwordResetRepository.markTokenAsUsed(t.id);
      }
      throw new Error('Too many incorrect attempts. Please request a new reset code.');
    }
    throw new Error('Invalid or expired reset code. Please request a new one.');
  }
  otpAttempts.delete(`reset:${user.id}`);

  // Prevent reusing the same password
  const isSameAsCurrent = await verifyPassword(newPassword, user.passwordHash);
  if (isSameAsCurrent) {
    throw new Error('New password cannot be the same as your current password.');
  }

  // Hash and save new password
  const newPasswordHash = await hashPassword(newPassword);
  await userRepository.updatePassword(user.id, newPasswordHash);

  // Invalidate the used token and sign out every existing session
  await passwordResetRepository.markTokenAsUsed(validToken.id);
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  logger.info(`Password reset successfully for user: ${user.id}`);
  return { success: true, message: 'Password has been reset successfully. Please log in.' };
};
