const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getPendingResponders() {
  try {
    const pendingResponders = await prisma.responder.findMany({
      where: {
        verificationStatus: 'PENDING'
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    });

    console.log('--- Pending Responders ---');
    if (pendingResponders.length === 0) {
      console.log('No pending responders found.');
    } else {
      pendingResponders.forEach(r => {
        console.log(`ID: ${r.userId}`);
        console.log(`Name: ${r.user.fullName}`);
        console.log(`Email: ${r.user.email}`);
        console.log('------------------------');
      });
    }
  } catch (error) {
    console.error('Error fetching responders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getPendingResponders();
