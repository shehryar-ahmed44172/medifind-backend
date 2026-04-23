import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Enabling PostgreSQL Extensions ---');
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS cube;');
    console.log('✅ cube extension enabled');
    
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS earthdistance;');
    console.log('✅ earthdistance extension enabled');
    
    console.log('--- All extensions ready ---');
  } catch (error) {
    console.error('❌ Failed to enable extensions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
