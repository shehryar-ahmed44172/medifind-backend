import { userRepository } from '../repositories/userRepository';

export const getUserProfile = async (userId: string) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Remove sensitive data
  const { passwordHash, failedLoginAttempts, accountLockedUntil, ...safeUser } = user;
  return safeUser;
};

export const updateUserProfile = async (userId: string, data: any) => {
  // Prevent updating sensitive fields via this endpoint
  const { id, email, passwordHash, role, createdAt, updatedAt, ...updateData } = data;
  
  const updatedUser = await userRepository.update(userId, updateData);
  const { passwordHash: _hash, failedLoginAttempts: _fail, accountLockedUntil: _locked, ...safeUser } = updatedUser;
  
  return safeUser;
};

export const verifyResponder = async (userId: string) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.role !== 'RESPONDER') throw new Error('User is not a RESPONDER');

  // Using isEmailVerified as the verified flag according to backend specs FR5.2
  const updatedUser = await userRepository.update(userId, { isEmailVerified: true, isActive: true });
  return updatedUser;
};

export const upgradeSubscription = async (userId: string, plan: 'FREE' | 'PROFESSIONAL' | 'EXECUTIVE') => {
  return await userRepository.updateSubscription(userId, plan);
};
