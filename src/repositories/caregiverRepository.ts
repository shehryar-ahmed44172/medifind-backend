import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const caregiverRepository = {
  createLink: async (caregiverId: string, patientId: string, relationship: string) => {
    return await prisma.caregiverLink.create({
      data: { caregiverId, patientId, relationship },
    });
  },

  findLink: async (caregiverId: string, patientId: string) => {
    return await prisma.caregiverLink.findUnique({
      where: {
        caregiverId_patientId: { caregiverId, patientId },
      },
    });
  },

  getCaregiversForPatient: async (patientId: string) => {
    return await prisma.caregiverLink.findMany({
      where: { patientId, isActive: true },
      include: {
        caregiver: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  getPatientsForCaregiver: async (caregiverId: string) => {
    return await prisma.caregiverLink.findMany({
      where: { caregiverId, isActive: true },
      include: {
        patient: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  removeLink: async (caregiverId: string, patientId: string) => {
    return await prisma.caregiverLink.delete({
      where: {
        caregiverId_patientId: { caregiverId, patientId },
      },
    });
  },
};
