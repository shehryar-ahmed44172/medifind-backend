import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning database...');

  // Delete all data to ensure a clean state
  await prisma.notificationLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.emailVerification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.medicalReport.deleteMany();
  await prisma.caregiverLink.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.emergencyTracking.deleteMany();
  await prisma.emergencyRequest.deleteMany();
  await prisma.emergency.deleteMany();
  await prisma.medicalProfile.deleteMany();
  await prisma.caregiverProfile.deleteMany();
  await prisma.responder.deleteMany();
  await prisma.user.deleteMany();

  console.log('🌱 Seeding the 3 Core Accounts...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Patient Account
  const patient = await prisma.user.create({
    data: {
      fullName: 'Test Patient',
      email: 'patient@test.com',
      phoneNumber: '+923000000001',
      passwordHash,
      role: 'PATIENT',
      isEmailVerified: true,
      medicalProfile: {
        create: {
          bloodType: 'O+',
          chronicDiseases: ['Asthma'],
          allergies: ['None'],
          medications: ['Inhaler'],
          emergencyContacts: [{ name: 'Test Contact', phone: '12345' }],
        }
      }
    },
  });

  // 2. Emergency Responder Account
  const responder = await prisma.user.create({
    data: {
      fullName: 'Test Responder',
      email: 'responder@test.com',
      phoneNumber: '+923000000002',
      passwordHash,
      role: 'RESPONDER',
      isEmailVerified: true,
      responder: {
        create: {
          licenseNumber: 'RSP-12345',
          isVerified: true,
          isAvailable: true,
          currentLatitude: 31.5204, // Seed with a default location to ensure matching works
          currentLongitude: 74.3587,
          verificationStatus: 'VERIFIED'
        }
      }
    },
  });

  // 3. Caregiver Account
  const caregiver = await prisma.user.create({
    data: {
      fullName: 'Test Caregiver',
      email: 'caregiver@test.com',
      phoneNumber: '+923000000003',
      passwordHash,
      role: 'CAREGIVER',
      isEmailVerified: true,
      caregiverProfile: {
        create: {
          cnic: '12345-1234567-1'
        }
      }
    },
  });

  console.log('✅ Accounts created successfully!');
  console.log('--------------------------------------------------');
  console.log('Login credentials for testing:');
  console.log('Role       | Email              | Password');
  console.log('-----------|--------------------|----------');
  console.log('Patient    | patient@test.com   | password123');
  console.log('Responder  | responder@test.com | password123');
  console.log('Caregiver  | caregiver@test.com | password123');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
