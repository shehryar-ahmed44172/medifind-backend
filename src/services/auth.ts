import { hashPassword, verifyPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, decodeToken } from '../utils/jwt';
import { userRepository } from '../repositories/userRepository';
import { passwordResetRepository } from '../repositories/passwordResetRepository';
import { RegisterRequest, AuthResponse } from '../types/auth';
import { recordFailedLoginAttempt, recordSuccessfulLogin } from '../middleware/loginRateLimitMiddleware';
import { sendEmail } from '../utils/email';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    vehicleType: data.vehicleType,
    cnicImageUrl: data.cnicImageUrl,
    cnicBackImageUrl: data.cnicBackImageUrl,
    employeeCardImageUrl: data.employeeCardImageUrl,
    employeeCardBackImageUrl: data.employeeCardBackImageUrl,
  });

  // Generate OTP for email verification
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await (prisma as any).emailVerification.upsert({
    where: { userId: user.id },
    update: { otp, expiresAt: otpExpires },
    create: { userId: user.id, otp, expiresAt: otpExpires },
  });

  // Send verification email
  console.log(`\n📧 VERIFICATION CODE FOR ${user.email}: [ ${otp} ]\n`);
  
  await sendEmail({
    to: user.email,
    subject: 'Verify your MediFind Account',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0E9AA7;">Welcome to MediFind!</h2>
        <p>Hello ${user.fullName},</p>
        <p>Thank you for registering. Please use the following code to verify your email address:</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">MediFind - Your Health, Our Priority</p>
      </div>
    `
  });

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isEmailVerified: false,
    message: 'Verification code sent to your email'
  };
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

  if (!verification || verification.otp !== otp) {
    throw new Error('Invalid verification code');
  }

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
  const refreshTokenHash = await hashPassword(refreshToken);

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

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

  await (prisma as any).emailVerification.upsert({
    where: { userId: user.id },
    update: { otp, expiresAt: otpExpires },
    create: { userId: user.id, otp, expiresAt: otpExpires },
  });

  console.log(`\n📧 RESENT VERIFICATION CODE FOR ${user.email}: [ ${otp} ]\n`);

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
    // Track failed login attempt
    await recordFailedLoginAttempt(user.id);
    throw new Error('Invalid credentials');
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
  const refreshTokenHash = await hashPassword(refreshToken);

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
  const decoded = decodeToken(refreshToken);
  if (!decoded) {
    throw new Error('Invalid refresh token');
  }

  const tokenRecord = await userRepository.findRefreshToken(
    await hashPassword(refreshToken)
  );

  if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.userId !== decoded.userId) {
    throw new Error('Invalid or revoked refresh token');
  }

  if (new Date() > tokenRecord.expiresAt) {
    throw new Error('Refresh token expired');
  }

  const payload = {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  };

  return {
    userId: decoded.userId,
    token: generateAccessToken(payload),
    refreshToken: refreshToken, // Return the same refresh token or empty string if not rotated
    expiresIn: 86400,
    email: decoded.email,
    fullName: '', // Full name might not be in JWT, could be empty or fetched from DB
    role: decoded.role,
  };
};

/**
 * Logout user (revoke refresh token)
 */
export const logout = async (refreshToken: string) => {
  const refreshTokenHash = await hashPassword(refreshToken);
  await userRepository.revokeRefreshToken(refreshTokenHash);
  return { success: true };
};

/**
 * Request password reset (Forgot Password)
 */
export const requestPasswordReset = async (email: string) => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('Email is not registered');
  }

  // 1. Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await hashPassword(resetToken);
  
  // 2. Set expiration (1 hour)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  // 3. Save to database
  await passwordResetRepository.createResetToken(user.id, tokenHash, expiresAt);

  // 4. Send email
  const resetLink = `medifind://reset-password?token=${resetToken}&email=${email}`;
  const resetCode = resetToken.substring(0, 6).toUpperCase();
  
  console.log(`\n🔑 PASSWORD RESET REQUESTED for ${user.email}`);
  console.log(`🔗 Reset Link: ${resetLink}`);
  console.log(`🔢 Reset Code: ${resetCode}\n`);

  await sendEmail({
    to: user.email,
    subject: 'MediFind Password Reset',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0E9AA7;">Password Reset Request</h2>
        <p>Hello ${user.fullName},</p>
        <p>You requested a password reset for your MediFind account. Use the code below or click the link to reset your password:</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0;">
          ${resetToken.substring(0, 6).toUpperCase()}
        </div>
        <p>This code will expire in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">MediFind - Your Health, Our Priority</p>
      </div>
    `
  });

  return { success: true, message: 'Reset email sent' };
};

/**
 * Reset user password with token
 */
export const resetUserPassword = async (email: string, token: string, newPassword: string) => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }

  // Tokens are hashed in DB, but the one sent is raw. 
  // We need to verify which token matches by iterating or using a more direct lookup if possible.
  // Actually, the findActiveToken logic in repository needs the hash.
  
  // For simplicity and security, we lookup by the raw token provided (verified via hash)
  // But wait, the repository uses findFirst with tokenHash.
  // We should fetch active tokens for this user and verify the hash.
  
  const tokens = await passwordResetRepository.getRecentResetRequests(user.id, 1);
  let validToken = null;
  
  for (const t of tokens) {
    if (!t.usedAt && t.expiresAt > new Date()) {
      const match = await verifyPassword(token, t.tokenHash);
      if (match) {
        validToken = t;
        break;
      }
    }
  }

  if (!validToken) {
    throw new Error('Invalid or expired reset token');
  }

  // 1. Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // 2. Update user
  await userRepository.updatePassword(user.id, newPasswordHash);

  // 3. Mark token as used
  await passwordResetRepository.markTokenAsUsed(validToken.id);

  return { success: true, message: 'Password has been reset successfully' };
};
