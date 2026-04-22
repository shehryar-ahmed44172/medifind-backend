import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function audit() {
  console.log('📊 Notification Audit Tool');
  console.log('Checking recent logs for Responder: responder@test.com\n');

  const responder = await prisma.user.findFirst({
    where: { email: 'responder@test.com' }
  });

  if (!responder) {
    console.error('Responder not found!');
    return;
  }

  const logs = await prisma.notificationLog.findMany({
    where: { userId: responder.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  if (logs.length === 0) {
    console.log('❌ No notification logs found for this responder.');
    console.log('This means the SOS matching failed or the Responder was out of range.');
    return;
  }

  console.log('Recent Notifications:');
  console.log('--------------------------------------------------');
  logs.forEach(log => {
    console.log(`[${log.createdAt.toLocaleTimeString()}] ${log.title}`);
    console.log(`Status:   ${log.status === 'delivered' ? '✅ Delivered' : '❌ ' + (log.failureReason || 'Failed')}`);
    console.log(`Channels: ${JSON.stringify(log.channels)}`);
    console.log(`Body:     ${log.body}`);
    console.log('--------------------------------------------------');
  });
}

audit().catch(console.error).finally(() => prisma.$disconnect());
