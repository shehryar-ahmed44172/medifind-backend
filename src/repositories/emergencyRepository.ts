import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const emergencyRepository = {
  create: async (data: {
    patientId: string;
    emergencyType: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    additionalInfo?: string;
    cancellationDeadline: Date;
  }) => {
    return await prisma.emergency.create({ data });
  },

  findById: async (id: string) => {
    return await prisma.emergency.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
        emergencyRequests: { include: { responder: { include: { user: { select: { fullName: true } } } } } },
        medicalReports: true,
      },
    });
  },

  findActiveByPatientId: async (patientId: string) => {
    return await prisma.emergency.findFirst({
      where: { patientId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  },

  findAllActive: async () => {
    return await prisma.emergency.findMany({
      where: { status: 'ACTIVE' },
      include: {
        patient: { select: { id: true, fullName: true, phoneNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  updateStatus: async (id: string, status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED') => {
    return await prisma.emergency.update({
      where: { id },
      data: {
        status,
        resolvedAt: status !== 'ACTIVE' ? new Date() : null,
      },
    });
  },

  cancel: async (id: string) => {
    return await prisma.emergency.update({
      where: { id },
      data: { status: 'CANCELLED', resolvedAt: new Date() },
    });
  },
};
