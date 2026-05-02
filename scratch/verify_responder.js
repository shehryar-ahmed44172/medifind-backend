const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyResponder(userId) {
  try {
    console.log(`🛠️ Starting verification for Responder ID: ${userId}...`);
    
    // 1. Update Responder status
    const result = await prisma.responder.update({
      where: { userId: userId },
      data: {
        verificationStatus: 'VERIFIED',
        isVerified: true
      }
    });

    // 2. Also mark the User's email as verified so they can login immediately
    await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true }
    });

    console.log('✅ Responder & Email Verified Successfully!');
    console.log(`   User ID: ${result.userId}`);
    console.log(`   Status: ${result.verificationStatus}`);
    console.log(`   Is Verified: ${result.isVerified}`);
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Get ID from command line or hardcode it
const targetId = 'cmoo6746u00018yr82jyfyp30';
verifyResponder(targetId);
