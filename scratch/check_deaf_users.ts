/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      medicalProfile: {
        patientType: 'DEAF'
      }
    },
    include: {
      medicalProfile: true
    }
  });

  console.log('--- DEAF USERS ---');
  users.forEach((u, i) => {
    console.log(`[${i+1}] ID: ${u.id}`);
    console.log(`    Name: ${u.fullName}`);
    console.log(`    Email: ${u.email}`);
    console.log(`    Type: ${u.medicalProfile?.patientType || 'N/A'}`);
    console.log(`    Role: ${u.role}`);
  });
  
  if (users.length === 0) {
    console.log('No users found with patientType: DEAF');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
