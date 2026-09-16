import prisma from '../lib/prisma';

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
    responderType?: 'PARAMEDIC' | 'RESCUE_OFFICER' | 'EMT' | 'FIRST_RESPONDER' | 'VOLUNTEER';
    vehicleType?: string;
    motorbikeNumber?: string;
    specialization?: string[];
    cnicImageUrl?: string;
    cnicBackImageUrl?: string;
    employeeCardImageUrl?: string;
    employeeCardBackImageUrl?: string;
    drivingLicenseUrl?: string;
    motorbikeDocUrl?: string;
    city?: string;
    address?: string;
    dateOfBirth?: Date | null;
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
          dateOfBirth: data.dateOfBirth,
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
            responderType: data.responderType ?? 'FIRST_RESPONDER',
            vehicleType: data.vehicleType ?? 'MOTORBIKE_AMBULANCE',
            motorbikeNumber: data.motorbikeNumber,
            specialization: data.specialization ?? [],
            cnicImageUrl: data.cnicImageUrl,
            cnicBackImageUrl: data.cnicBackImageUrl,
            employeeCardImageUrl: data.employeeCardImageUrl,
            employeeCardBackImageUrl: data.employeeCardBackImageUrl,
            drivingLicenseUrl: data.drivingLicenseUrl,
            motorbikeDocUrl: data.motorbikeDocUrl,
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
    return await prisma.refreshToken.updateMany({
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


  updateSubscription: async (userId: string, plan: 'FREE' | 'PROFESSIONAL' | 'EXECUTIVE') => {
    return await prisma.user.update({
      where: { id: userId },
      data: { subscriptionPlan: plan } as any,
    });
  },

  findAll: async () => {
    return await prisma.user.findMany({
      where: { isActive: true }
    });
  },

  findByRole: async (role: 'PATIENT' | 'RESPONDER' | 'CAREGIVER' | 'ADMIN') => {
    return await prisma.user.findMany({
      where: { role, isActive: true }
    });
  },
};
