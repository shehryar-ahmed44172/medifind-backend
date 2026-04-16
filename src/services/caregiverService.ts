import { caregiverRepository } from '../repositories/caregiverRepository';
import { userRepository } from '../repositories/userRepository';
import { sendNotification } from './notification';
import { NotificationType, NotificationChannel } from '../types/notification';

export const linkCaregiver = async (patientId: string, caregiverEmail: string, relationship: string) => {
  // Find the caregiver by email
  const caregiver = await userRepository.findByEmail(caregiverEmail);
  if (!caregiver) {
    throw new Error('User with this email not found');
  }

  if (caregiver.role !== 'CAREGIVER') {
    throw new Error('User is not registered as a Caregiver');
  }

  // Check subscription limits (NEW REQUIREMENT)
  const patient = await userRepository.findById(patientId);
  if (!patient) throw new Error('Patient not found');

  const currentCount = await caregiverRepository.countTotalLinks(patientId);
  const planLimits: Record<string, number> = {
    'FREE': 1,
    'PROFESSIONAL': 3,
    'EXECUTIVE': 6
  };

  const limit = planLimits[(patient as any).subscriptionPlan as string] || 1;
  if (currentCount >= limit) {
    throw new Error(`Your ${(patient as any).subscriptionPlan} plan limit reached (${limit} caregivers max). Please upgrade your plan.`);
  }

  // Check if link already exists
  const existingLink = await caregiverRepository.findLink(caregiver.id, patientId);
  if (existingLink) {
    throw new Error('You have already sent an invitation to this user or they are already linked.');
  }

  const link = await caregiverRepository.createLink(caregiver.id, patientId, relationship);

  // Notify the Caregiver about the invitation
  sendNotification(caregiver.id, {
    type: NotificationType.PATIENT_EMERGENCY,
    title: "NEW CAREGIVER INVITATION",
    body: `${patient.fullName} has invited you to be their caregiver.`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    priority: 'normal',
    data: { patientId, patientName: patient.fullName }
  }).catch(err => console.error(`Failed to notify caregiver: ${err.message}`));

  return link;
};

export const getPendingInvitations = async (caregiverId: string) => {
  return await caregiverRepository.getPendingInvitations(caregiverId);
};

export const respondToInvitation = async (caregiverId: string, patientId: string, accept: boolean) => {
  const status = accept ? 'ACCEPTED' : 'REJECTED';
  const result = await caregiverRepository.updateLinkStatus(caregiverId, patientId, status as any);

  // Notify the Patient about the response
  const caregiver = await userRepository.findById(caregiverId);
  if (caregiver) {
    sendNotification(patientId, {
      type: NotificationType.PATIENT_EMERGENCY,
      title: accept ? "INVITATION ACCEPTED" : "INVITATION REJECTED",
      body: `${caregiver.fullName} has ${accept ? 'accepted' : 'rejected'} your caregiver invitation.`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: 'normal',
      data: { caregiverId, status }
    }).catch(err => console.error(`Failed to notify patient: ${err.message}`));
  }

  return result;
};

export const getLinkedCaregivers = async (patientId: string) => {
  return await caregiverRepository.getCaregiversForPatient(patientId);
};

export const getLinkedPatients = async (caregiverId: string) => {
  return await caregiverRepository.getPatientsForCaregiver(caregiverId);
};

export const unlinkCaregiver = async (patientId: string, caregiverId: string) => {
  const existingLink = await caregiverRepository.findLink(caregiverId, patientId);
  if (!existingLink) throw new Error('Caregiver link not found');

  return await caregiverRepository.removeLink(caregiverId, patientId);
};
