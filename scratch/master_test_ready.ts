import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 INITIALIZING MASTER TEST-READY SUITE...');

  // 1. Check and Enable Extensions
  console.log('\n--- Part 1: Database Extensions ---');
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS cube;`;
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS earthdistance;`;
  console.log('✅ cube and earthdistance extensions verified/enabled.');

  // 2. Fix Test Account Flags
  console.log('\n--- Part 2: Account Verification ---');
  const accounts = [
    'test.patient@medifind.com',
    'test.responder@medifind.com',
    'test.caregiver@medifind.com'
  ];
  const verifiedCount = await prisma.user.updateMany({
    where: { email: { in: accounts } },
    data: { isEmailVerified: true, isActive: true }
  });
  console.log(`✅ ${verifiedCount.count} accounts set to Verified and Active.`);

  // 3. Find Latest Emergency Location for Proximity Sync
  console.log('\n--- Part 3: Proximity Synchronization ---');
  const latestEmergency = await prisma.emergency.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  const responderUser = await prisma.user.findUnique({
    where: { email: 'test.responder@medifind.com' },
    include: { responder: true }
  });

  if (responderUser && responderUser.responder) {
    let lat = 33.5879522; // Default Rawalpindi
    let lng = 73.0279169;

    if (latestEmergency) {
      lat = latestEmergency.latitude;
      lng = latestEmergency.longitude;
      console.log(`📍 Syncing to latest SOS location: ${lat}, ${lng}`);
    } else {
      console.log(`📍 No emergencies found. Using default Rawalpindi location: ${lat}, ${lng}`);
    }

    await prisma.responder.update({
      where: { id: responderUser.responder.id },
      data: {
        currentLatitude: lat,
        currentLongitude: lng,
        isAvailable: true,
        isVerified: true,
        verificationStatus: 'VERIFIED'
      }
    });
    console.log(`✅ Responder (${responderUser.email}) is now ONLINE and NEARBY.`);
  }

  console.log('\n--- STATUS CHECK ---');
  console.log('✅ Database: Extensions Enabled');
  console.log('✅ Accounts: Email Verified');
  console.log('✅ Responder: Online & Available');
  console.log('✅ Proximity: Synced to Patient Area');
  
  console.log('\n🔥 YOU ARE READY TO TEST! Please trigger a NEW SOS now.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
