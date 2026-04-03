import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export const medicalProfileRepository = {
  findByUserId: async (userId: string) => {
    return await prisma.medicalProfile.findUnique({
      where: { userId },
    });
  },

  upsert: async (userId: string, data: Omit<Prisma.MedicalProfileCreateInput, 'user'>) => {
    return await prisma.medicalProfile.upsert({
      where: { userId },
      update: data,
      create: {
        ...data,
        user: {
          connect: { id: userId }
        }
      },
    });
  },
};
