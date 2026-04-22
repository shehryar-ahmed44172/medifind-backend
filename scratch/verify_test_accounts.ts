import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Test Accounts ---');
    const result = await prisma.user.updateMany({
        where: {
            email: {
                in: [
                    'test.patient@medifind.com',
                    'test.responder@medifind.com',
                    'test.caregiver@medifind.com'
                ]
            }
        },
        data: {
            isEmailVerified: true,
            isActive: true
        }
    });
    
    console.log(`✅ Successfully updated ${result.count} test accounts.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
