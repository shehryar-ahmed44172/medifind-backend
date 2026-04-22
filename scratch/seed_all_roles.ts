import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = 'Test@1234';
  const passwordHash = await bcrypt.hash(password, 10);

  // ── PATIENT ──────────────────────────────────────────────────
  const existingPatient = await prisma.user.findUnique({ where: { email: 'test.patient@medifind.com' } });
  const patient = existingPatient
    ? await prisma.user.update({ where: { email: 'test.patient@medifind.com' }, data: { passwordHash } })
    : await prisma.user.create({
        data: {
          fullName: 'Test Patient',
          email: 'test.patient@medifind.com',
          phoneNumber: '+92300000001',
          passwordHash,
          role: 'PATIENT',
        },
      });

  // ── RESPONDER ─────────────────────────────────────────────────
  const existingResponder = await prisma.user.findUnique({ where: { email: 'test.responder@medifind.com' } });
  let responder;
  if (existingResponder) {
    responder = await prisma.user.update({
      where: { email: 'test.responder@medifind.com' },
      data: {
        passwordHash,
        responder: {
          upsert: {
            create: { licenseNumber: 'LIC-TEST-001', isVerified: true, isAvailable: true, verificationStatus: 'VERIFIED', responderType: 'PARAMEDIC' },
            update: { isVerified: true, isAvailable: true, verificationStatus: 'VERIFIED' },
          },
        },
      },
    });
  } else {
    responder = await prisma.user.create({
      data: {
        fullName: 'Test Responder',
        email: 'test.responder@medifind.com',
        phoneNumber: '+92300000002',
        passwordHash,
        role: 'RESPONDER',
        responder: {
          create: { licenseNumber: 'LIC-TEST-001', isVerified: true, isAvailable: true, verificationStatus: 'VERIFIED', responderType: 'PARAMEDIC' },
        },
      },
    });
  }

  // ── CAREGIVER ─────────────────────────────────────────────────
  const existingCaregiver = await prisma.user.findUnique({ where: { email: 'test.caregiver@medifind.com' } });
  const caregiver = existingCaregiver
    ? await prisma.user.update({ where: { email: 'test.caregiver@medifind.com' }, data: { passwordHash } })
    : await prisma.user.create({
        data: {
          fullName: 'Test Caregiver',
          email: 'test.caregiver@medifind.com',
          phoneNumber: '+92300000003',
          passwordHash,
          role: 'CAREGIVER',
        },
      });

  console.log('\n====================================');
  console.log('  MEDIFIND TEST CREDENTIALS');
  console.log('====================================');
  console.log(`\n🧑‍⚕️  PATIENT`);
  console.log(`   Email    : ${patient.email}`);
  console.log(`   Password : ${password}`);
  console.log(`\n🚑  EMERGENCY RESPONDER`);
  console.log(`   Email    : ${responder.email}`);
  console.log(`   Password : ${password}`);
  console.log(`\n🧑‍🤝‍🧑  CAREGIVER`);
  console.log(`   Email    : ${caregiver.email}`);
  console.log(`   Password : ${password}`);
  console.log('\n====================================\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
