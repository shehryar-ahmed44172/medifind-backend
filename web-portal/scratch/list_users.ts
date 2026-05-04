import { PrismaClient } from '@prisma/client';

// Use the relative path to the backend prisma schema if needed, 
// but usually we can just instantiate PrismaClient if generated.
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        fullName: true,
        role: true,
      }
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
