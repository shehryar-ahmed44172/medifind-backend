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
    const logger = (await import('../utils/logger')).default;
    logger.info(`[Geospatial Search] Looking for responders near ${latitude}, ${longitude} within ${radiusKm}km`);
    
    const isDev = process.env.NODE_ENV === 'development';
    
    const results = await prisma.$queryRaw<any[]>`
      SELECT r.*, u."fullName", u."phoneNumber", u."email",
        (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0, 
              cos(radians(${latitude}::double precision)) *
              cos(radians(r."currentLatitude"::double precision)) *
              cos(radians(r."currentLongitude"::double precision) - radians(${longitude}::double precision)) +
              sin(radians(${latitude}::double precision)) *
              sin(radians(r."currentLatitude"::double precision))
            ))
          )
        ) AS "distanceKm"
      FROM "Responder" r
      JOIN "User" u ON u.id = r."userId"
      WHERE r."isAvailable" = true
        AND (r."isVerified" = true OR ${isDev}::boolean)
        AND u."isActive" = true
        AND (u."isEmailVerified" = true OR ${isDev}::boolean)
        AND r."currentLatitude" IS NOT NULL
        AND r."currentLongitude" IS NOT NULL
        AND (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${latitude}::double precision)) *
              cos(radians(r."currentLatitude"::double precision)) *
              cos(radians(r."currentLongitude"::double precision) - radians(${longitude}::double precision)) +
              sin(radians(${latitude}::double precision)) *
              sin(radians(r."currentLatitude"::double precision))
            ))
          )
        ) <= ${radiusKm}::double precision
      ORDER BY "distanceKm" ASC
      LIMIT 10
    `;

    logger.info(`[Geospatial Search] Found ${results.length} eligible responders`);
    
    if (results.length === 0) {
      // Diagnostic: Check why no one was found
      const allResponders = await prisma.responder.findMany({
        include: { user: { select: { isActive: true, isEmailVerified: true } } }
      });
      
      logger.info(`[Geospatial Search] Diagnostic: Total Responders=${allResponders.length}`);
      allResponders.forEach(r => {
        logger.info(`  - Responder ${r.userId}: available=${r.isAvailable}, verified=${r.isVerified}, active=${r.user.isActive}, emailVerified=${r.user.isEmailVerified}, location=(${r.currentLatitude}, ${r.currentLongitude})`);
      });
    }

    return results;
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

  updateResponderStats: async (userId: string, responseTimeSeconds: number) => {
    const responder = await prisma.responder.findUnique({ where: { userId } });
    if (!responder) return;

    const totalHandled = responder.totalResponsesHandled + 1;
    let newAverage = responseTimeSeconds;

    if (responder.averageResponseTime) {
      newAverage = Math.round(
        (responder.averageResponseTime * responder.totalResponsesHandled + responseTimeSeconds) /
          totalHandled
      );
    }

    return await prisma.responder.update({
      where: { userId },
      data: {
        totalResponsesHandled: totalHandled,
        averageResponseTime: newAverage,
      },
    });
  },

  markAsVerified: async (userId: string) => {
    return await prisma.responder.update({
      where: { userId },
      data: { isVerified: true },
    });
  },

  getHistory: async (responderId: string) => {
    return await prisma.emergencyRequest.findMany({
      where: { responderId },
      include: {
        emergency: {
          include: {
            patient: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },
};
