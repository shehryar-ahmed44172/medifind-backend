import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkRequests() {
    console.log('--- Recent Emergency Requests ---');
    const requests = await prisma.emergencyRequest.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            emergency: true,
            responder: { include: { user: true } }
        }
    });

    requests.forEach(r => {
        console.log(`[${r.createdAt.toISOString()}] Request for ${r.responder.user.fullName} (${r.responder.user.email}) - Status: ${r.status} - Distance: ${r.distanceKm}km`);
        console.log(`   Emergency ID: ${r.emergencyId} - Emergency Status: ${r.emergency.status}`);
    });

    if (requests.length === 0) {
        console.log('No emergency requests found.');
    }
}

checkRequests().catch(console.error).finally(() => prisma.$disconnect());
