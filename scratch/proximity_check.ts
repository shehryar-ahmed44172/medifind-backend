import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Proximity Debug ---');
    
    const emergency = await prisma.emergency.findFirst({
        orderBy: { createdAt: 'desc' }
    });
    
    if (!emergency) {
        console.log('No emergencies found.');
    } else {
        console.log(`Latest SOS [${emergency.id}]: Lat ${emergency.latitude}, Lng ${emergency.longitude}`);
    }
    
    const responder = await prisma.user.findFirst({
        where: { email: 'test.responder@medifind.com' },
        include: { responder: true }
    });
    
    if (!responder || !responder.responder) {
        console.log('Responder not found.');
    } else {
        const r = responder.responder;
        console.log(`Responder [${responder.email}]: Lat ${r.currentLatitude}, Lng ${r.currentLongitude}`);
        console.log(`Available: ${r.isAvailable}, Verified: ${r.isVerified}`);
        
        if (emergency) {
           // Basic distance calculation in JS as a sanity check
           const lat1 = emergency.latitude;
           const lon1 = emergency.longitude;
           const lat2 = r.currentLatitude || 0;
           const lon2 = r.currentLongitude || 0;
           
           const R = 6371; // Radius of the earth in km
           const dLat = (lat2 - lat1) * Math.PI / 180;
           const dLon = (lon2 - lon1) * Math.PI / 180;
           const a = 
               Math.sin(dLat / 2) * Math.sin(dLat / 2) +
               Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
               Math.sin(dLon / 2) * Math.sin(dLon / 2);
           const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
           const d = R * c; // Distance in km
           
           console.log(`\n📏 Calculated Distance: ${d.toFixed(3)} km`);
           if (d > 5) {
               console.log('🚨 CAUTION: Responder is OUTSIDE 5km radius!');
           } else {
               console.log('✅ Responder is WITHIN 5km radius.');
           }
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
