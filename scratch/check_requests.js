const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const requests = await prisma.emergencyRequest.findMany({
    where: { emergencyId: 'cmoberm82002610d7bec3dd06' },
    select: { id: true, responderId: true, status: true }
  });
  console.log(JSON.stringify(requests, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
