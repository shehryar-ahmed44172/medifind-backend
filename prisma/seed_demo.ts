/**
 * Demo data for walkthroughs and screenshots.
 *
 *   npm run db:seed-demo            create / refresh demo accounts
 *   npm run db:seed-demo -- --clean remove every demo account and its data
 *
 * All demo accounts use the reserved `@medifind.test` domain, so no real inbox
 * ever receives mail. Password for every demo account: DEMO_PASSWORD env var,
 * default "DemoPass#2026".
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encrypt, encryptJson } from '../src/utils/encryption';

const prisma = new PrismaClient();
const DEMO_DOMAIN = '@medifind.test';
const PASSWORD = process.env.DEMO_PASSWORD || 'DemoPass#2026';

// Lahore (Gulberg) — inside the Pakistan coordinate bounds used by dispatch
const PATIENT_LOCATION = { lat: 31.5204, lng: 74.3587 };
const RESPONDER_LOCATION = { lat: 31.5262, lng: 74.3460 };

const clean = async () => {
  const users = await prisma.user.findMany({ where: { email: { endsWith: DEMO_DOMAIN } }, select: { id: true } });
  const ids = users.map(u => u.id);
  if (ids.length === 0) {
    console.log('No demo accounts found.');
    return;
  }
  // Emergencies cascade to requests and tracking; chat rooms cascade to messages
  await prisma.chatRoom.deleteMany({ where: { OR: [{ patientId: { in: ids } }, { caregiverId: { in: ids } }, { responderId: { in: ids } }] } });
  await prisma.emergency.deleteMany({ where: { patientId: { in: ids } } });
  await prisma.medicalReport.deleteMany({ where: { userId: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`Removed ${ids.length} demo accounts and their data.`);
};

const upsertUser = async (data: {
  email: string; fullName: string; phoneNumber: string; role: 'PATIENT' | 'RESPONDER' | 'CAREGIVER';
  city?: string; subscriptionPlan?: 'FREE' | 'PROFESSIONAL' | 'EXECUTIVE';
}) => {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  return prisma.user.upsert({
    where: { email: data.email },
    update: { isActive: true, isEmailVerified: true, passwordHash },
    create: {
      ...data,
      passwordHash,
      isActive: true,
      isEmailVerified: true,
      city: data.city ?? 'Lahore',
      address: 'Gulberg III, Lahore',
    },
  });
};

const medicalProfile = (patientType: 'NORMAL' | 'DEAF', extra: Record<string, unknown>) => ({
  patientType,
  bloodType: extra.bloodType as string,
  allergies: encryptJson(extra.allergies),
  chronicDiseases: encryptJson(extra.chronicDiseases),
  medications: encryptJson(extra.medications),
  emergencyContacts: encryptJson(extra.emergencyContacts),
  disabilities: encryptJson(extra.disabilities ?? []),
  predefinedMessages: encryptJson(extra.predefinedMessages ?? []),
  medicalHistory: extra.medicalHistory as string,
});

const seed = async () => {
  const patient = await upsertUser({ email: `ayesha.patient${DEMO_DOMAIN}`, fullName: 'Ayesha Khan', phoneNumber: '+923001110001', role: 'PATIENT', subscriptionPlan: 'PROFESSIONAL' });
  const deaf = await upsertUser({ email: `bilal.deaf${DEMO_DOMAIN}`, fullName: 'Bilal Ahmed', phoneNumber: '+923001110002', role: 'PATIENT' });
  const responderUser = await upsertUser({ email: `hamza.responder${DEMO_DOMAIN}`, fullName: 'Hamza Raza', phoneNumber: '+923001110003', role: 'RESPONDER' });
  const caregiver = await upsertUser({ email: `sara.caregiver${DEMO_DOMAIN}`, fullName: 'Sara Malik', phoneNumber: '+923001110004', role: 'CAREGIVER' });

  const patientProfile = medicalProfile('NORMAL', {
    bloodType: 'B+',
    allergies: ['Penicillin'],
    chronicDiseases: ['Asthma'],
    medications: ['Salbutamol inhaler'],
    emergencyContacts: [{ name: 'Usman Khan', phoneNumber: '+923001119991', relationship: 'Brother' }],
    medicalHistory: 'Mild persistent asthma since childhood.',
  });
  await prisma.medicalProfile.upsert({ where: { userId: patient.id }, update: patientProfile, create: { userId: patient.id, ...patientProfile } });

  const deafProfile = medicalProfile('DEAF', {
    bloodType: 'O+',
    allergies: ['Peanuts'],
    chronicDiseases: ['Type 2 diabetes'],
    medications: ['Metformin 500 mg'],
    emergencyContacts: [{ name: 'Sara Malik', phoneNumber: '+923001110004', relationship: 'Sister' }],
    disabilities: ['Profound hearing loss'],
    predefinedMessages: ['I am deaf. Please write or type.', 'I have chest pain.', 'I am diabetic.', 'I am allergic to peanuts.'],
    medicalHistory: 'Deaf since birth. Communicates in text and Pakistan Sign Language.',
  });
  await prisma.medicalProfile.upsert({ where: { userId: deaf.id }, update: deafProfile, create: { userId: deaf.id, ...deafProfile } });

  await prisma.caregiverProfile.upsert({ where: { userId: caregiver.id }, update: {}, create: { userId: caregiver.id } });

  const responderData = {
    licenseNumber: 'DEMO-RSP-1122',
    organization: 'Rescue 1122 Lahore',
    responderType: 'PARAMEDIC' as const,
    specialization: ['Cardiac care', 'Trauma'],
    vehicleType: 'MOTORBIKE_AMBULANCE',
    motorbikeNumber: 'LEA-2847',
    isVerified: true,
    verificationStatus: 'VERIFIED' as const,
    isAvailable: true,
    currentLatitude: RESPONDER_LOCATION.lat,
    currentLongitude: RESPONDER_LOCATION.lng,
    rating: 4.8,
    totalRatings: 23,
    totalResponsesHandled: 41,
    averageResponseTime: 420,
  };
  await prisma.responder.upsert({ where: { userId: responderUser.id }, update: responderData, create: { userId: responderUser.id, ...responderData } });

  for (const p of [patient, deaf]) {
    await prisma.caregiverLink.upsert({
      where: { caregiverId_patientId: { caregiverId: caregiver.id, patientId: p.id } },
      update: { status: 'ACCEPTED', isActive: true },
      create: { caregiverId: caregiver.id, patientId: p.id, relationship: p.id === deaf.id ? 'Sister' : 'Friend', status: 'ACCEPTED', isActive: true, requesterId: caregiver.id },
    });
  }

  // Caregiver ↔ patient chat
  const room = await prisma.chatRoom.upsert({
    where: { patientId_caregiverId: { patientId: deaf.id, caregiverId: caregiver.id } },
    update: {},
    create: { roomType: 'CAREGIVER_PATIENT', patientId: deaf.id, caregiverId: caregiver.id },
  });
  if ((await prisma.chatMessage.count({ where: { roomId: room.id } })) === 0) {
    const messages: [string, string][] = [
      [caregiver.id, 'Assalam-o-Alaikum Bilal, did you take your medicine today?'],
      [deaf.id, 'Walaikum Assalam. Yes, after breakfast.'],
      [caregiver.id, 'Good. Keep your phone charged, the emergency alerts need it.'],
      [deaf.id, 'OK. I will. Thank you.'],
    ];
    for (const [senderId, content] of messages) {
      await prisma.chatMessage.create({ data: { roomId: room.id, senderId, content: encrypt(content), messageType: 'TEXT' } });
    }
  }

  // One resolved emergency so history, ratings and records are not empty
  if ((await prisma.emergency.count({ where: { patientId: patient.id } })) === 0) {
    const createdAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await prisma.emergency.create({
      data: {
        patientId: patient.id,
        emergencyType: 'SHORTNESS_OF_BREATH',
        latitude: PATIENT_LOCATION.lat,
        longitude: PATIENT_LOCATION.lng,
        status: 'RESOLVED',
        additionalInfo: 'Asthma attack at home',
        cancellationDeadline: new Date(createdAt.getTime() + 60_000),
        createdAt,
        resolvedAt: new Date(createdAt.getTime() + 18 * 60_000),
        resolutionOutcome: 'TREATED',
        voiceSummary: 'Breathing emergency. Patient has asthma and is allergic to penicillin. Blood type B positive.',
        emergencyRequests: {
          create: {
            responderId: responderUser.id,
            status: 'COMPLETED',
            distanceKm: 1.4,
            estimatedArrivalMinutes: 3,
            sentAt: createdAt,
            acceptedAt: new Date(createdAt.getTime() + 25_000),
            patientRating: 5,
            ratedAt: new Date(createdAt.getTime() + 20 * 60_000),
          },
        },
      },
    });
  }

  console.log('Demo accounts ready (password: ' + PASSWORD + '):');
  for (const u of [patient, deaf, responderUser, caregiver]) {
    console.log(`  ${u.role.padEnd(9)} ${u.fullName.padEnd(12)} ${u.email}`);
  }
};

(process.argv.includes('--clean') ? clean() : seed())
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
