import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const responderRepository = {
  findById: async (responderId: string) => {
    return await prisma.responder.findUnique({
      where: { userId: responderId },
      include: { user: { select: { id: true, fullName: true, phoneNumber: true, email: true } } },
    });
  },

  findNearbyAvailable: async (latitude: number, longitude: number, radiusKm = 5) => {
    // Use raw SQL for PostGIS earth_distance calculation
    return await prisma.$queryRaw<any[]>`
      SELECT r.*, u."fullName", u."phoneNumber", u."email",
        earth_distance(
          ll_to_earth(r."currentLatitude", r."currentLongitude"),
          ll_to_earth(${latitude}, ${longitude})
        ) / 1000 AS "distanceKm"
      FROM "Responder" r
      JOIN "User" u ON u.id = r."userId"
      WHERE r."isAvailable" = true
        AND r."currentLatitude" IS NOT NULL
        AND r."currentLongitude" IS NOT NULL
        AND earth_distance(
              ll_to_earth(r."currentLatitude", r."currentLongitude"),
              ll_to_earth(${latitude}, ${longitude})
            ) <= ${radiusKm * 1000}
      ORDER BY "distanceKm" ASC
      LIMIT 10
    `;
  },

  updateLocation: async (userId: string, latitude: number, longitude: number) => {
    return await prisma.responder.update({
      where: { userId },
      data: { currentLatitude: latitude, currentLongitude: longitude },
    });
  },

  setAvailability: async (userId: string, isAvailable: boolean) => {
    return await prisma.responder.update({
      where: { userId },
      data: { isAvailable },
    });
  },

  createEmergencyRequest: async (data: {
    emergencyId: string;
    responderId: string;
    distanceKm?: number;
    estimatedArrivalMinutes?: number;
  }) => {
    return await prisma.emergencyRequest.create({ data });
  },

  findEmergencyRequest: async (emergencyId: string, responderId: string) => {
    return await prisma.emergencyRequest.findUnique({
      where: { emergencyId_responderId: { emergencyId, responderId } },
    });
  },

  updateEmergencyRequest: async (
    emergencyId: string,
    responderId: string,
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED',
    extra?: { rejectionReason?: string }
  ) => {
    return await prisma.emergencyRequest.update({
      where: { emergencyId_responderId: { emergencyId, responderId } },
      data: {
        status,
        acceptedAt: status === 'ACCEPTED' ? new Date() : undefined,
        rejectedAt: status === 'REJECTED' ? new Date() : undefined,
        rejectionReason: extra?.rejectionReason,
      },
    });
  },
};
