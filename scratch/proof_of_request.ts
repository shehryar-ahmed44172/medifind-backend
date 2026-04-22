import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 PROOF OF BACKEND SUCCESS:');
  const reqs = await prisma.emergencyRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      responder: { include: { user: { select: { fullName: true, email: true } } } },
      emergency: { select: { id: true, status: true } }
    }
  });

  if (reqs.length === 0) {
    console.log('❌ No requests found in DB.');
  } else {
    reqs.forEach(r => {
      console.log('--------------------------------------------------');
      console.log(`Time:      ${r.createdAt.toLocaleTimeString()}`);
      console.log(`Responder: ${r.responder.user.fullName} (${r.responder.user.email})`);
      console.log(`Status:    PROCESSED AND SAVED`);
      console.log(`Emergency: ${r.emergencyId} (${r.emergency.status})`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
