import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding admin account...');

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
      isActive: true,
    },
  });

  console.log('✅ Admin seeded — email: admin@medifind.com | password: adminPassword123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
