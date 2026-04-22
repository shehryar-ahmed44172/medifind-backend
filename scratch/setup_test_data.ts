import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Find or update a Patient
  let patient = await prisma.user.findFirst({
    where: { role: 'PATIENT' }
  });

  if (patient) {
    await prisma.user.update({
      where: { id: patient.id },
      data: { passwordHash }
    });
    console.log(`✅ Patient password reset: ${patient.email}`);
  } else {
    patient = await prisma.user.create({
      data: {
        fullName: 'Test Patient',
        email: 'test_patient@medifind.com',
        phoneNumber: '+1000000000',
        passwordHash,
        role: 'PATIENT'
      }
    });
    console.log(`✅ Created test patient: ${patient.email}`);
  }

  // 2. Find or update a Responder
  let responder = await prisma.user.findFirst({
    where: { role: 'RESPONDER' }
  });

  if (responder) {
    await prisma.user.update({
      where: { id: responder.id },
      data: { 
        passwordHash,
        responder: {
          update: {
            isVerified: true,
            isAvailable: true,
            verificationStatus: 'VERIFIED'
          }
        }
      }
    });
    console.log(`✅ Responder password reset & status updated: ${responder.email}`);
  } else {
    responder = await prisma.user.create({
      data: {
        fullName: 'Test Responder',
        email: 'test_responder@medifind.com',
        phoneNumber: '+1000000001',
        passwordHash,
        role: 'RESPONDER',
        responder: {
          create: {
            licenseNumber: 'TEST-LICENSE-123',
            isVerified: true,
            isAvailable: true,
            verificationStatus: 'VERIFIED',
            responderType: 'PARAMEDIC'
          }
        }
      }
    });
    console.log(`✅ Created test responder: ${responder.email}`);
  }

  console.log('-----------------------------------');
  console.log('TEST CREDENTIALS:');
  console.log(`Patient Email: ${patient.email}`);
  console.log(`Responder Email: ${responder.email}`);
  console.log(`Password: ${password}`);
  console.log('-----------------------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
