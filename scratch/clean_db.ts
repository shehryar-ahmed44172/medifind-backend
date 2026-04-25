import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning database...');

  // Order matters due to foreign key constraints
  const tables = [
    'TrackingData',
    'EmergencyRequest',
    'Emergency',
    'MedicalReport',
    'CaregiverLink',
    'MedicalProfile',
    'Responder',
    'RefreshToken',
    'PasswordReset',
    'EmailVerification',
    'User',
  ];

  for (const table of tables) {
    try {
      await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].deleteMany();
      console.log(`✅ Cleaned ${table}`);
    } catch (e) {
      console.log(`⚠️ Skip ${table} (might not exist or already clean)`);
    }
  }

  console.log('✨ Database is now clean!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
