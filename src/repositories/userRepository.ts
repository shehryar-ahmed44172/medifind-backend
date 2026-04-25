import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const userRepository = {
  findByEmail: async (email: string) => {
    return await prisma.user.findUnique({
      where: { email },
    });
  },

  findByPhoneNumber: async (phoneNumber: string) => {
    return await prisma.user.findUnique({
      where: { phoneNumber },
    });
  },

  findById: async (userId: string) => {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        responder: true,
        medicalProfile: true,
        caregiverProfile: true,
      }
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
    responderType?: 'AMBULANCE' | 'PARAMEDIC' | 'DOCTOR' | 'VOLUNTEER' | 'EMERGENCY_RESPONDER';
    vehicleType?: string;
    cnicImageUrl?: string;
    cnicBackImageUrl?: string;
    employeeCardImageUrl?: string;
    employeeCardBackImageUrl?: string;
    city?: string;
    address?: string;
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
          city: data.city,
          address: data.address,
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
            cnicImageUrl: data.cnicImageUrl,
            cnicBackImageUrl: data.cnicBackImageUrl,
            employeeCardImageUrl: data.employeeCardImageUrl,
            employeeCardBackImageUrl: data.employeeCardBackImageUrl,
          } as any,
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
    // SECURITY: Prevent modification of sensitive fields via general update
    const { email, role, id, ...allowedData } = data;
    return await prisma.user.update({
      where: { id: userId },
      data: allowedData,
    });
  },

  updateFcmToken: async (userId: string, token: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } }) as any;
    if (!user) return null;
    
    // Manage array of tokens (deduplicate and add new)
    let tokens: string[] = [];
    if (user.fcmTokens) {
      tokens = Array.isArray(user.fcmTokens) ? (user.fcmTokens as string[]) : [];
    }
    
    if (!tokens.includes(token)) {
      tokens.push(token);
    }
    
    return await prisma.user.update({
      where: { id: userId },
      data: { fcmTokens: tokens } as any,
    });
  },

  updateSubscription: async (userId: string, plan: 'FREE' | 'PROFESSIONAL' | 'EXECUTIVE') => {
    return await prisma.user.update({
      where: { id: userId },
      data: { subscriptionPlan: plan } as any,
    });
  },
};
