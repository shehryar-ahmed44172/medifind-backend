import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const userRepository = {
  findByEmail: async (email: string) => {
    return await prisma.user.findUnique({
      where: { email },
    });
  },

  findById: async (userId: string) => {
    return await prisma.user.findUnique({
      where: { id: userId },
    });
  },

  create: async (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    passwordHash: string;
    role: 'PATIENT' | 'RESPONDER' | 'CAREGIVER' | 'ADMIN';
    isActive: boolean;
  }) => {
    return await prisma.user.create({
      data,
    });
  },

  createRefreshToken: async (userId: string, tokenHash: string) => {
    return await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  },

  findRefreshToken: async (tokenHash: string) => {
    return await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
  },

  updateLastLogin: async (userId: string) => {
    return await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  },

  revokeRefreshToken: async (tokenHash: string) => {
    return await prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  },
};
