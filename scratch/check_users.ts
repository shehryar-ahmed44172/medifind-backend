import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: ['muhammadsabir9167@gmail.com', 'sabir326410@gmail.com']
      }
    },
    select: {
      id: true,
      email: true,
      role: true
    }
  });
  console.log(JSON.stringify(users, null, 2));
  
  const links = await prisma.caregiverLink.findMany({
    include: {
      patient: { select: { email: true } },
      caregiver: { select: { email: true } }
    }
  });
  console.log('\nCaregiver Links:');
  console.log(JSON.stringify(links, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
