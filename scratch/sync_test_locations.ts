import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Coordinates for a test location (e.g., near IBA Karachi)
  const LAT = 24.9317;
  const LNG = 67.1139;

  console.log('--- Syncing Test Locations ---');

  // 1. Update Responder Location and Status
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
        verificationStatus: 'VERIFIED',
        isVerified: true
      }
    });
    console.log(`✅ Responder (${responderUser.email}) location updated to: ${LAT}, ${LNG}`);
    console.log(`✅ Responder status set to Available and Verified.`);
  } else {
    console.log('❌ Responder account not found. Please run seed script first.');
  }

  // 2. Update Patient Profile (optional, but good for consistency)
  const patientUser = await prisma.user.findUnique({
    where: { email: 'test.patient@medifind.com' },
    include: { medicalProfile: true }
  });

  if (patientUser) {
     // Patient location isn't usually stored in the profile, it transitions with the SOS 
     // but we can log that we are ready.
     console.log(`✅ Patient (${patientUser.email}) is ready for testing.`);
  }

  console.log('\nTesting Tip: When you trigger SOS from the mobile app,');
  console.log('make sure your phone/emulator is also simulating a location');
  console.log(`near Latitude: ${LAT}, Longitude: ${LNG}`);
  console.log('====================================');
}

main().catch(console.error).finally(() => prisma.$disconnect());
