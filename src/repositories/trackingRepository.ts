import prisma from '../lib/prisma';

export const trackingRepository = {
  addTrackingUpdate: async (data: {
    emergencyId: string;
    responderId: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    status: 'EN_ROUTE' | 'ARRIVED' | 'TREATING' | 'TRANSPORTED';
  }) => {
    return await prisma.emergencyTracking.create({ data });
  },

  getTrackingHistory: async (emergencyId: string) => {
    return await prisma.emergencyTracking.findMany({
      where: { emergencyId },
      orderBy: { timestamp: 'desc' },
    });
  },

  getLatestTracking: async (emergencyId: string) => {
    return await prisma.emergencyTracking.findFirst({
      where: { emergencyId },
      orderBy: { timestamp: 'desc' },
    });
  },
};
