import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const id = 'cmo8ir9ut0007dae0jm4g6o7o';
  const em = await prisma.emergency.findUnique({ 
    where: { id } 
  });
  console.log('Emergency Record:');
  console.log(JSON.stringify(em, null, 2));
  
  if (em) {
    const now = new Date();
    console.log('\nTime Check:');
    console.log('Current Time:', now.toISOString());
    console.log('Deadline:    ', em.cancellationDeadline.toISOString());
    console.log('Expired?     ', now > em.cancellationDeadline);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
