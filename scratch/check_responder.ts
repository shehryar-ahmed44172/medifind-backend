import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const r = await prisma.responder.findFirst({ 
    where: { user: { email: 'responder@test.com' } }, 
    include: { user: true } 
  });
  console.log('Responder Record:');
  console.log(JSON.stringify(r, null, 2));

  if (r) {
    const patientLat = 33.5879524; // from the emergency record I just checked
    const patientLng = 73.0279225;
    
    // Check if within 5km (default radius)
    // Note: This is an approximation since I don't have the earth_distance function in JS here
    // but I can see the responder coords: 31.5204, 74.3587
    
    console.log('\nGeospatial Check:');
    console.log('Patient Location: ', patientLat, patientLng);
    console.log('Responder Location:', r.currentLatitude, r.currentLongitude);
    
    // Distance calculation (rough estimate)
    const latDiff = Math.abs(patientLat - (r.currentLatitude || 0));
    const lngDiff = Math.abs(patientLng - (r.currentLongitude || 0));
    console.log('Lat Difference:', latDiff);
    console.log('Lng Difference:', lngDiff);
    
    if (latDiff > 0.1 || lngDiff > 0.1) {
      console.log('\nStatus: TOO FAR! They are NOT in the same city/area.');
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
