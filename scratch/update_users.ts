import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    data: { isEmailVerified: true }
  });
  console.log('✅ Users updated with isEmailVerified = true');
}

main().catch(console.error).finally(() => prisma.$disconnect());
