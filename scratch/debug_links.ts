import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Debugging Caregiver Links...');
  
  const links = await prisma.caregiverLink.findMany({
    include: {
      caregiver: { select: { fullName: true, email: true, id: true } },
      patient: { select: { fullName: true, email: true, id: true } }
    }
  });

  console.log(`Found ${links.length} total links.`);
  links.forEach(l => {
    console.log(`--- Link ID: ${l.id} ---`);
    console.log(`Caregiver: ${l.caregiver.fullName} (${l.caregiverId})`);
    console.log(`Patient: ${l.patient.fullName} (${l.patientId})`);
    console.log(`Status: ${l.status}`);
    console.log(`Requester: ${l.requesterId}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
