import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const em = await prisma.emergency.findFirst({ 
    orderBy: { createdAt: 'desc' },
    include: { patient: { select: { fullName: true } } }
  });
  console.log('Latest Emergency:');
  console.log(JSON.stringify(em, null, 2));

  if (em) {
    const responder = await prisma.responder.findFirst({
        where: { user: { email: 'responder@test.com' } }
    });
    console.log('\nResponder at that time:');
    console.log(JSON.stringify(responder, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
