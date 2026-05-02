/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning only emergency data...');

  await prisma.emergencyTracking.deleteMany();
  await prisma.emergencyRequest.deleteMany();
  await prisma.emergency.deleteMany();

  console.log('✅ Emergency data cleared successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Failed to clear emergency data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
