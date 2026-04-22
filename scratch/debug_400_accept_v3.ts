import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const emergencyId = 'cmo6yxa2q0005wyir6ijq44xk'; 
    const email = 'test.responder@medifind.com';

    console.log('--- Database Check (NEW Emergency) ---');
    
    const responder = await prisma.user.findUnique({
        where: { email },
        include: { responder: true }
    });
    
    if (responder && responder.responder) {
        console.log(`Responder ID: ${responder.id}`);
        console.log(`Responder Lat: ${responder.responder.currentLatitude}, Lng: ${responder.responder.currentLongitude}`);
        console.log(`Available: ${responder.responder.isAvailable}, Verified: ${responder.responder.isVerified}, Status: ${responder.responder.verificationStatus}`);
    }

    const emergency = await prisma.emergency.findUnique({
        where: { id: emergencyId },
        include: { emergencyRequests: true }
    });

    if (!emergency) {
        console.log(`Emergency NOT FOUND for ID: ${emergencyId}`);
        const latest = await prisma.emergency.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { emergencyRequests: true }
        });
        if (latest) {
             console.log(`Latest Emergency ID: ${latest.id}, Status: ${latest.status}, Lat: ${latest.latitude}, Lng: ${latest.longitude}, Requests: ${latest.emergencyRequests.length}`);
        }
    } else {
        console.log(`Emergency Status: ${emergency.status}`);
        console.log(`Emergency Location: Lat ${emergency.latitude}, Lng ${emergency.longitude}`);
        console.log(`Number of requests: ${emergency.emergencyRequests.length}`);
        
        if (responder) {
            const specificRequest = emergency.emergencyRequests.find(r => r.responderId === responder.id);
            if (specificRequest) {
                console.log(`Specific Request for this responder:`, JSON.stringify(specificRequest, null, 2));
            } else {
                console.log(`❌ No specific request found for this responder for this emergency.`);
            }
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
