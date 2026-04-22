import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const password = 'SecurePassword123!';
  const users = await prisma.user.findMany({
    where: {
      role: 'RESPONDER'
    },
    select: {
      email: true,
      passwordHash: true
    }
  });

  console.log('--- Responders in Database ---');
  for (const user of users) {
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log(`Email: ${user.email}`);
    console.log(`Password "${password}" matches: ${isMatch}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
