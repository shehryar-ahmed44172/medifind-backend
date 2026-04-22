import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.responder.updateMany({
    data: { 
      currentLatitude: 31.5204, // Default to a realistic coordinate
      currentLongitude: 74.3587 
    }
  });
  console.log('✅ Responder locations seeded');
}

main().catch(console.error).finally(() => prisma.$disconnect());
