import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Coordinates from your latest SOS (Rawalpindi area)
  const LAT = 33.5879522;
  const LNG = 73.0279169;

  console.log('--- Syncing Responder to SOS Area (Rawalpindi) ---');

  const responderUser = await prisma.user.findUnique({
    where: { email: 'test.responder@medifind.com' },
    include: { responder: true }
  });

  if (responderUser && responderUser.responder) {
    await prisma.responder.update({
      where: { id: responderUser.responder.id },
      data: {
        currentLatitude: LAT,
        currentLongitude: LNG,
        isAvailable: true,
        isVerified: true,
        verificationStatus: 'VERIFIED'
      }
    });
    console.log(`✅ Responder (${responderUser.email}) moved to: ${LAT}, ${LNG}`);
  } else {
    console.log('❌ Responder not found.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
