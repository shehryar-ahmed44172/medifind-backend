const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanEmergencyTable() {
  console.log('🧹 Starting database cleanup...');
  try {
    // Delete in order to respect constraints
    const trackingCount = await prisma.emergencyTracking.deleteMany({});
    console.log(`✅ Deleted ${trackingCount.count} tracking records.`);

    const requestCount = await prisma.emergencyRequest.deleteMany({});
    console.log(`✅ Deleted ${requestCount.count} emergency requests.`);

    // Set emergencyId to null in MedicalReports instead of deleting them
    await prisma.medicalReport.updateMany({
      where: { emergencyId: { not: null } },
      data: { emergencyId: null }
    });
    console.log('✅ Unlinked medical reports from emergencies.');

    const emergencyCount = await prisma.emergency.deleteMany({});
    console.log(`✅ Deleted ${emergencyCount.count} emergency incidents.`);

    console.log('✨ Database cleanup completed successfully.');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanEmergencyTable();
