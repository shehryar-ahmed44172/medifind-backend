import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Database Extensions ---');
    try {
        const extensions = await prisma.$queryRaw<any[]>`SELECT extname FROM pg_extension`;
        console.log('Enabled Extensions:', extensions.map(e => e.extname));
        
        const hasCube = extensions.some(e => e.extname === 'cube');
        const hasEarthDistance = extensions.some(e => e.extname === 'earthdistance');
        
        if (!hasCube || !hasEarthDistance) {
            console.log('\n🚨 MISSING REQUIRED EXTENSIONS!');
            if (!hasCube) console.log('- cube is missing');
            if (!hasEarthDistance) console.log('- earthdistance is missing');
            
            console.log('\n--- Attempting to Enable Extensions ---');
            // This requires superuser/extension-create privileges
            await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS cube;`;
            await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS earthdistance;`;
            console.log('✅ Extension enable commands sent.');
        } else {
            console.log('✅ cube and earthdistance extensions are already enabled.');
        }

    } catch (error: any) {
        console.error('❌ Error checking/enabling extensions:', error.message);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
