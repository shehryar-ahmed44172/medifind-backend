import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@medifind.com';
  console.log(`Checking for user: ${email}`);
  
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Full Name: ${user.fullName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Is Active: ${user.isActive}`);
    console.log(`   Is Email Verified: ${user.isEmailVerified}`);
  } else {
    console.log('❌ User not found in database.');
  }
}

main()
  .catch((e) => {
    console.error('Error checking user:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
