import { hashPassword, verifyPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, decodeToken } from '../utils/jwt';
import { userRepository } from '../repositories/userRepository';
import { passwordResetRepository } from '../repositories/passwordResetRepository';
import { RegisterRequest, AuthResponse } from '../types/auth';
import { recordFailedLoginAttempt, recordSuccessfulLogin } from '../middleware/loginRateLimitMiddleware';
import { sendEmail } from '../utils/email';
import crypto from 'crypto';

/**
 * Register a new user
 */
export const register = async (data: RegisterRequest) => {
  const existingUser = await userRepository.findByEmail(data.email);
  if (existingUser) {
    throw new Error('User already exists');
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
    patientType: data.patientType,
    organization: data.organization,
    licenseNumber: data.licenseNumber,
    responderType: data.responderType,
    vehicleType: data.vehicleType,
    cnicImageUrl: data.cnicImageUrl,
    employeeCardImageUrl: data.employeeCardImageUrl,
  });

  // Generate tokens for automatic login after registration
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  const refreshTokenHash = await hashPassword(refreshToken);

  // Store refresh token
  await userRepository.createRefreshToken(user.id, refreshTokenHash);

  return {
    userId: user.id,
    token: accessToken,
    refreshToken: refreshToken,
    expiresIn: 86400, // 24 hours
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
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
