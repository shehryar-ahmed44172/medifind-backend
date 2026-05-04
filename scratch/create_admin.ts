
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@medifind.com';
  const password = 'adminPassword123';
  const fullName = 'System Administrator';
  const phoneNumber = '+0000000000';

  console.log(`Checking if admin ${email} already exists...`);
  
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    console.log('Admin already exists. Updating role to ADMIN just in case...');
    await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN', isActive: true, isEmailVerified: true }
    });
    console.log('Admin updated.');
  } else {
    console.log('Creating new admin user...');
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phoneNumber,
        role: 'ADMIN',
        isActive: true,
        isEmailVerified: true
      }
    });
    console.log('Admin created successfully.');
  }

  console.log('---------------------------------');
  console.log('Admin Credentials:');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log('---------------------------------');

  await prisma.$disconnect();
}

createAdmin().catch(err => {
  console.error('Error creating admin:', err);
  process.exit(1);
});
