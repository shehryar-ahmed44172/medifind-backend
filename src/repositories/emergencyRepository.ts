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
    voiceSummary?: string;
  }) => {
    return await prisma.emergency.create({ data: data as any });
  },

  findById: async (id: string) => {
    return await prisma.emergency.findUnique({
      where: { id },
      include: {
        patient: { 
          select: { 
            id: true, 
            fullName: true, 
            phoneNumber: true, 
            email: true,
            medicalProfile: true // Include medical profile here
          } 
        },
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
        patient: { 
          select: { 
            id: true, 
            fullName: true, 
            phoneNumber: true,
            medicalProfile: {
              select: {
                bloodType: true,
                allergies: true,
                chronicDiseases: true
              }
            }
          } 
        },
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

  getNotifiedResponderIds: async (emergencyId: string) => {
    const requests = await prisma.emergencyRequest.findMany({
      where: { emergencyId },
      select: { responderId: true },
    });
    return requests.map((r) => r.responderId);
  },
};
