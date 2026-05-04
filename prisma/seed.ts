/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('adminPassword123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@medifind.com' },
    update: {},
    create: {
      fullName: 'MediFind Administrator',
      email: 'admin@medifind.com',
      phoneNumber: '+920000000000',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isEmailVerified: true,
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
