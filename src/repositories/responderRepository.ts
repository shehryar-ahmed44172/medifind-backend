import prisma from '../lib/prisma';

export const responderRepository = {
  findById: async (responderId: string) => {
    return await prisma.responder.findUnique({
      where: { userId: responderId },
      include: { user: { select: { id: true, fullName: true, phoneNumber: true, email: true } } },
    });
  },

  findNearbyAvailable: async (
    latitude: number,
    longitude: number,
    radiusKm = 5,
    responderTypes?: string[]   // optional: filter by specialisation
  ) => {
    const logger = (await import('../utils/logger')).default;
    logger.info(
      `[Geospatial Search] Looking for responders near ${latitude}, ${longitude} ` +
      `within ${radiusKm}km` +
      (responderTypes ? ` (types: ${responderTypes.join(', ')})` : '')
    );

    const isDev = process.env.NODE_ENV === 'development';

    // Build the optional type-filter clause.
    // prisma.$queryRaw does not support dynamic IN lists via template literals,
    // so we convert the array to a SQL string and use Prisma.raw to splice it in.
    const { Prisma } = await import('@prisma/client');
    const typeClause = responderTypes && responderTypes.length > 0
      ? Prisma.sql`AND r."responderType" IN (${Prisma.join(responderTypes)})`
      : Prisma.empty;

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
        ${typeClause}
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

    // ── Diagnostic log (always runs so we can see why nobody was found) ──────
    const allResponders = await prisma.responder.findMany({
      include: { user: { select: { isActive: true, isEmailVerified: true } } }
    });
    logger.info(`[Geospatial Search] Diagnostic: Total Responders=${allResponders.length}`);
    allResponders.forEach(r => {
      logger.info(`  - Responder ${r.userId}: available=${r.isAvailable}, verified=${r.isVerified}, lat=${r.currentLatitude}, lon=${r.currentLongitude}, active=${r.user.isActive}, emailVerified=${r.user.isEmailVerified}`);
    });

    // ── Dev-mode GPS fallback ─────────────────────────────────────────────────
    // The Haversine SQL query requires non-null GPS coords.  In development the
    // isVerified / isEmailVerified checks are already bypassed above, but a
    // responder who has never shared their location still gets filtered out by
    // the IS NOT NULL clauses.  Fix: if dev mode and still no results, return
    // all available responders with a synthetic distanceKm so notifications reach
    // them without needing real GPS data.
    if (results.length === 0 && isDev) {
      logger.info('[Geospatial Search] DEV FALLBACK: no GPS-located responders found — returning all available responders');
      const devResponders = await prisma.responder.findMany({
        where: { isAvailable: true, user: { isActive: true } },
        include: { user: { select: { fullName: true, phoneNumber: true, email: true } } },
        take: 10,
      });
      logger.info(`[Geospatial Search] DEV FALLBACK: found ${devResponders.length} available responders`);
      return devResponders.map(r => ({ ...r, distanceKm: 0.5 }));
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

  getHistory: async (responderId: string, since?: Date) => {
    return await prisma.emergencyRequest.findMany({
      where: {
        responderId,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
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
