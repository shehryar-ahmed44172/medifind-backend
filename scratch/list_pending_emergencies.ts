import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listPendingEmergencies() {
  try {
    const pendingEmergencies = await prisma.emergency.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'ASSIGNED']
        }
      },
      include: {
        patient: {
          select: {
            fullName: true,
            email: true,
            phoneNumber: true
          }
        },
        emergencyRequests: {
          include: {
            responder: {
              include: {
                user: {
                  select: {
                    fullName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('--- PENDING EMERGENCIES ---');
    if (pendingEmergencies.length === 0) {
      console.log('No pending emergencies found.');
    } else {
      pendingEmergencies.forEach((emergency, index) => {
        console.log(`\n[${index + 1}] ID: ${emergency.id}`);
        console.log(`Status: ${emergency.status}`);
        console.log(`Patient: ${emergency.patient.fullName} (${emergency.patient.phoneNumber})`);
        console.log(`Type: ${emergency.emergencyType}`);
        console.log(`Location: ${emergency.latitude}, ${emergency.longitude}`);
        console.log(`Created At: ${emergency.createdAt}`);
        
        if (emergency.status === 'ASSIGNED') {
          const acceptedRequest = emergency.emergencyRequests.find(r => r.status === 'ACCEPTED');
          if (acceptedRequest) {
            console.log(`Assigned Responder: ${acceptedRequest.responder.user.fullName}`);
          }
        }
      });
    }
  } catch (error) {
    console.error('Error fetching emergencies:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listPendingEmergencies();
