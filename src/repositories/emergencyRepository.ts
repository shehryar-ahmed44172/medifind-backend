import prisma from '../lib/prisma';

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
    locationMocked?: boolean;
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
        patient: { select: { id: true, fullName: true, phoneNumber: true } },
        emergencyRequests: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Admin-only: returns ALL emergencies across all statuses for the dashboard */
  findAllForAdmin: async () => {
    return await prisma.emergency.findMany({
      include: {
        patient: { select: { id: true, fullName: true, phoneNumber: true } },
        emergencyRequests: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  updateStatus: async (id: string, status: any) => {
    return await prisma.emergency.update({
      where: { id },
      data: {
        status,
        resolvedAt: (status === 'RESOLVED' || status === 'COMPLETED') ? new Date() : undefined,
      },
    });
  },

  cancel: async (id: string) => {
    // Cancel the emergency itself, then flip all still-pending dispatch
    // requests to REJECTED so the responder history screen shows the correct
    // status instead of displaying them as PENDING forever.
    await prisma.emergencyRequest.updateMany({
      where: { emergencyId: id, status: 'PENDING' },
      data: { status: 'REJECTED' },
    });
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
