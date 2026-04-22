import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const emergencyId = 'cmo6xidqp00055njskxu7uj91';
    const email = 'test.responder@medifind.com';

    console.log('--- Database Check ---');
    
    const responder = await prisma.user.findUnique({
        where: { email },
        include: { responder: true }
    });
    
    if (!responder) {
        console.log(`Responder not found for email: ${email}`);
    } else {
        console.log(`Responder ID: ${responder.id}`);
        console.log(`Responder details:`, JSON.stringify(responder.responder, null, 2));
    }

    const emergency = await prisma.emergency.findUnique({
        where: { id: emergencyId },
        include: { emergencyRequests: true }
    });

    if (!emergency) {
        console.log(`Emergency NOT FOUND for ID: ${emergencyId}`);
    } else {
        console.log(`Emergency Status: ${emergency.status}`);
        console.log(`Number of requests: ${emergency.emergencyRequests.length}`);
        
        if (responder) {
            const specificRequest = emergency.emergencyRequests.find(r => r.responderId === responder.id);
            if (specificRequest) {
                console.log(`Specific Request for this responder:`, JSON.stringify(specificRequest, null, 2));
            } else {
                console.log(`No specific request found for this responder for this emergency.`);
            }
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
