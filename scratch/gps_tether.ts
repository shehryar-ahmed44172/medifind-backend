import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function tether() {
  console.log('🚀 GPS Tethering Service Started...');
  console.log('Monitoring Patient location and snapping Responder to match...');
  console.log('Press Ctrl+C to stop.');

  while (true) {
    try {
      // 1. Get the latest Patient emergency or location
      const patient = await prisma.user.findFirst({
        where: { email: 'patient@test.com' },
        include: { emergencies: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' }, take: 1 } }
      });

      if (patient) {
        let lat = 33.5879461; // fallback
        let lng = 73.0279218;

        if (patient.emergencies.length > 0) {
          lat = patient.emergencies[0].latitude;
          lng = patient.emergencies[0].longitude;
        }

        // 2. Snap Responder to this location
        await prisma.responder.updateMany({
          where: { user: { email: 'responder@test.com' } },
          data: {
            currentLatitude: lat,
            currentLongitude: lng,
            isAvailable: true,
            isVerified: true
          }
        });

        console.log(`[${new Date().toLocaleTimeString()}] Snapped Responder to Patient at: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (err: any) {
      console.error('Error in tethering loop:', err.message);
    }
    
    // Sleep for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

tether().catch(console.error).finally(() => prisma.$disconnect());
