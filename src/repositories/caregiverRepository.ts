import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const caregiverRepository = {
  createLink: async (caregiverId: string, patientId: string, relationship: string) => {
    return await prisma.caregiverLink.create({
      data: { caregiverId, patientId, relationship, status: 'PENDING' } as any,
    });
  },

  countActiveLinks: async (patientId: string) => {
    return await prisma.caregiverLink.count({
      where: { patientId, status: 'ACCEPTED', isActive: true } as any,
    });
  },

  countTotalLinks: async (patientId: string) => {
    // Counts both Pending and Accepted
    return await prisma.caregiverLink.count({
      where: { patientId, status: { in: ['PENDING', 'ACCEPTED'] }, isActive: true } as any,
    });
  },

  updateLinkStatus: async (caregiverId: string, patientId: string, status: 'ACCEPTED' | 'REJECTED') => {
    return await prisma.caregiverLink.update({
      where: { caregiverId_patientId: { caregiverId, patientId } },
      data: { status, isActive: status === 'ACCEPTED' } as any,
    });
  },

  getPendingInvitations: async (caregiverId: string) => {
    return await prisma.caregiverLink.findMany({
      where: { caregiverId, status: 'PENDING' } as any,
      include: {
        patient: { select: { id: true, fullName: true, email: true } },
      },
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
      where: { patientId, status: 'ACCEPTED', isActive: true } as any,
      include: {
        caregiver: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  getPatientsForCaregiver: async (caregiverId: string) => {
    return await prisma.caregiverLink.findMany({
      where: { caregiverId, status: 'ACCEPTED', isActive: true } as any,
      include: {
        patient: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  getAllPatientsForCaregiver: async (caregiverId: string) => {
    return await prisma.caregiverLink.findMany({
      where: { caregiverId } as any,
      include: {
        patient: { select: { id: true, fullName: true, email: true, phoneNumber: true, profileImageUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  updateStatusToPending: async (caregiverId: string, patientId: string) => {
    return await prisma.caregiverLink.update({
      where: { caregiverId_patientId: { caregiverId, patientId } },
      data: { status: 'PENDING' } as any,
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
