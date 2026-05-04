import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function addAdmin() {
  const email = 'admin@medifind.com';
  const password = 'adminPassword123';
  const fullName = 'MediFind Administrator';
  const phoneNumber = '+920000000000';

  console.log(`🚀 Adding admin user: ${email}`);

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('⚠️ Admin user already exists. Updating password...');
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { email },
        data: { passwordHash, role: 'ADMIN' },
      });
      console.log('✅ Admin password updated successfully.');
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: {
          fullName,
          email,
          phoneNumber,
          passwordHash,
          role: 'ADMIN',
          isEmailVerified: true,
        },
      });
      console.log('✅ Admin user created successfully.');
    }
  } catch (error) {
    console.error('❌ Error adding admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAdmin();
