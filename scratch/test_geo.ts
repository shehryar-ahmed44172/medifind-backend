import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const latitude = 33.5879524;
  const longitude = 73.0279225;
  const radiusKm = 5;

  console.log('Running Raw Geospatial Query...');
  
  const nearbyResponders = await prisma.$queryRaw<any[]>`
    SELECT r.*, u."fullName", u."phoneNumber", u."email",
      earth_distance(
        ll_to_earth(r."currentLatitude"::double precision, r."currentLongitude"::double precision),
        ll_to_earth(${latitude}::double precision, ${longitude}::double precision)
      ) / 1000 AS "distanceKm"
    FROM "Responder" r
    JOIN "User" u ON u.id = r."userId"
    WHERE r."isAvailable" = true
      AND r."isVerified" = true
      AND u."isActive" = true
      AND u."isEmailVerified" = true
      AND r."currentLatitude" IS NOT NULL
      AND r."currentLongitude" IS NOT NULL
    ORDER BY "distanceKm" ASC
    LIMIT 10
  `;

  console.log('Query result count:', nearbyResponders.length);
  if (nearbyResponders.length > 0) {
    console.log('Top match distance:', nearbyResponders[0].distanceKm, 'km');
    console.log('Responder Email:', nearbyResponders[0].email);
  } else {
    // Debug: Why no results?
    const countResponders = await prisma.responder.count();
    const countVerified = await prisma.responder.count({ where: { isVerified: true } });
    const countAvailable = await prisma.responder.count({ where: { isAvailable: true } });
    console.log('\nStats:');
    console.log('Total Responders:', countResponders);
    console.log('Verified:', countVerified);
    console.log('Available:', countAvailable);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
