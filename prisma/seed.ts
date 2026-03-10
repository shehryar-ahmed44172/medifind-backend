import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample users
  const patient = await prisma.user.create({
    data: {
      fullName: 'John Doe',
      email: 'patient@example.com',
      phoneNumber: '+1234567890',
      passwordHash: 'hashed_password_here',
      role: 'PATIENT',
    },
  });

  const responder = await prisma.user.create({
    data: {
      fullName: 'Jane Smith',
      email: 'responder@example.com',
      phoneNumber: '+0987654321',
      passwordHash: 'hashed_password_here',
      role: 'RESPONDER',
    },
  });

  // Create medical profile
  await prisma.medicalProfile.create({
    data: {
      userId: patient.id,
      bloodType: 'O+',
      chronicDiseases: ['diabetes'],
      allergies: ['penicillin'],
      medications: ['metformin'],
      emergencyContacts: ['Emergency Contact Name'],
    },
  });

  console.log('✅ Seeding completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
