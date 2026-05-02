import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      medicalProfile: true
    }
  });

  console.log('--- USER PATIENT TYPES ---');
  users.forEach((u, i) => {
    if (u.role === 'PATIENT') {
      console.log(`[${i+1}] ID: ${u.id}`);
      console.log(`    Name: ${u.fullName}`);
      console.log(`    Role: ${u.role}`);
      console.log(`    Medical Profile patientType: ${u.medicalProfile?.patientType}`);
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
