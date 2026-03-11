import { hashPassword, verifyPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, decodeToken } from '../utils/jwt';
import { userRepository } from '../repositories/userRepository';
import { RegisterRequest, AuthResponse } from '../types/auth';

/**
 * Register a new user
 */
export const register = async (data: RegisterRequest) => {
  const existingUser = await userRepository.findByEmail(data.email);
  if (existingUser) {
    throw new Error('User already exists');
  }

  const passwordHash = await hashPassword(data.password);

  const user = await userRepository.create({
    fullName: data.fullName,
    email: data.email,
    phoneNumber: data.phoneNumber,
    passwordHash,
    role: data.role,
    isActive: true,
  });

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
};

/**
 * Login user and return tokens
 */
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const passwordMatch = await verifyPassword(password, user.passwordHash);
  if (!passwordMatch) {
    throw new Error('Invalid credentials');
  }

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
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    accessToken,
    refreshToken,
    expiresIn: 86400, // 24 hours in seconds
  };
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<Omit<AuthResponse, 'refreshToken'>> => {
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
    user: {
      id: decoded.userId,
      email: decoded.email,
      fullName: '',
      role: decoded.role,
    },
    accessToken: generateAccessToken(payload),
    expiresIn: 86400,
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
