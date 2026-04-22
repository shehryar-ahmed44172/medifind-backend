import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const email = 'test.responder@medifind.com';
    const user = await prisma.user.findUnique({
        where: { email }
    });
    
    console.log('--- User Account Status ---');
    console.log(JSON.stringify(user, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
