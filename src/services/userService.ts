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
