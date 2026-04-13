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

  /**
   * Create a user AND their role-specific profile in one atomic transaction.
   * If anything fails, both inserts are rolled back automatically.
   */
  create: async (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    passwordHash: string;
    role: 'PATIENT' | 'RESPONDER' | 'CAREGIVER' | 'ADMIN';
    isActive: boolean;
    // role-specific fields
    cnic?: string;
    patientType?: 'NORMAL' | 'DEAF';
    organization?: string;
    licenseNumber?: string;
    responderType?: 'AMBULANCE' | 'PARAMEDIC' | 'DOCTOR' | 'VOLUNTEER';
    vehicleType?: string;
  }) => {
    return await prisma.$transaction(async (tx) => {
      // 1. Create the base User
      const user = await tx.user.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          phoneNumber: data.phoneNumber,
          passwordHash: data.passwordHash,
          role: data.role,
          isActive: data.isActive,
        },
      });

      // 2. Create the role-specific profile linked to the new user
      if (data.role === 'PATIENT') {
        await tx.medicalProfile.create({
          data: {
            userId: user.id,
            cnic: data.cnic,
            patientType: data.patientType ?? 'NORMAL',
          },
        });
      } else if (data.role === 'CAREGIVER') {
        await tx.caregiverProfile.create({
          data: {
            userId: user.id,
            cnic: data.cnic,
          },
        });
      } else if (data.role === 'RESPONDER') {
        await tx.responder.create({
          data: {
            userId: user.id,
            cnic: data.cnic,
            licenseNumber: data.licenseNumber ?? 'PENDING',
            organization: data.organization,
            responderType: data.responderType ?? 'VOLUNTEER',
            vehicleType: data.vehicleType,
          },
        });
      }

      return user;
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

  updatePassword: async (userId: string, hashedPassword: string) => {
    return await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });
  },

  updateLoginAttempts: async (
    userId: string,
    failedAttempts: number,
    lastFailedLoginAt: Date,
    accountLockedUntil: Date | null
  ) => {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: failedAttempts,
        lastFailedLoginAt,
        accountLockedUntil,
      },
    });
  },

  resetFailedLoginAttempts: async (userId: string) => {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      },
    });
  },

  update: async (userId: string, data: any) => {
    return await prisma.user.update({
      where: { id: userId },
      data,
    });
  },
};
