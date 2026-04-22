import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Enabling PostgreSQL extensions...');
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS cube;');
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS earthdistance;');
    console.log('✅ cube and earthdistance extensions enabled successfully');
  } catch (err: any) {
    console.error('❌ Failed to enable extensions:', err.message);
    process.exit(1);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
