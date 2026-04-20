import { caregiverRepository } from '../repositories/caregiverRepository';
import { userRepository } from '../repositories/userRepository';
import { sendNotification } from './notification';
import { NotificationType, NotificationChannel } from '../types/notification';

export const linkCaregiver = async (requesterId: string, targetEmail: string, relationship: string, requesterRole: string) => {
  // Find the target user by email
  const targetUser = await userRepository.findByEmail(targetEmail);
  if (!targetUser) {
    throw new Error('User with this email not found');
  }

  // Determine who is who
  let patientId: string;
  let caregiverId: string;

  if (requesterRole === 'PATIENT') {
    if (targetUser.role !== 'CAREGIVER') throw new Error('Target user is not a Caregiver');
    patientId = requesterId;
    caregiverId = targetUser.id;
  } else if (requesterRole === 'CAREGIVER') {
    if (targetUser.role !== 'PATIENT') throw new Error('Target user is not a Patient');
    patientId = targetUser.id;
    caregiverId = requesterId;
  } else {
    throw new Error('Unauthorized role to initiate linking');
  }

  // Check subscription limits (only apply if the patient is the one being invited or inviting)
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
    throw new Error(`Patient's ${(patient as any).subscriptionPlan} plan limit reached (${limit} caregivers max).`);
  }

  // Check if link already exists
  const existingLink = await caregiverRepository.findLink(caregiverId, patientId);
  if (existingLink) {
    throw new Error('A link or invitation already exists between these users.');
  }

  const link = await caregiverRepository.createLink(caregiverId, patientId, relationship, requesterId);

  // Notify the target user about the invitation
  const requester = await userRepository.findById(requesterId);
  sendNotification(targetUser.id, {
    type: NotificationType.CAREGIVER_INVITATION,
    title: requesterRole === 'PATIENT' ? "NEW CAREGIVER INVITATION" : "NEW PATIENT CONNECTION REQUEST",
    body: `${requester?.fullName} has invited you to connect on MediFind.`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: 'normal',
    data: { patientId, caregiverId, requesterRole }
  }).catch(err => console.error(`Failed to notify target user: ${err.message}`));

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
      type: NotificationType.CAREGIVER_RESPONSE,
      title: accept ? "INVITATION ACCEPTED" : "INVITATION REJECTED",
      body: `${caregiver.fullName} has ${accept ? 'accepted' : 'rejected'} your caregiver invitation.`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
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

export const getAllLinkedPatients = async (caregiverId: string) => {
  return await caregiverRepository.getAllPatientsForCaregiver(caregiverId);
};

export const resendInvitation = async (caregiverId: string, patientId: string) => {
  const link = await caregiverRepository.findLink(caregiverId, patientId);
  if (!link) throw new Error('Invitation link not found');
  if (link.status === 'ACCEPTED') throw new Error('Invitation already accepted');

  // If rejected, reset to pending
  if (link.status === 'REJECTED') {
    await caregiverRepository.updateStatusToPending(caregiverId, patientId);
  }

  // Notify the patient again
  const caregiver = await userRepository.findById(caregiverId);
  const patient = await userRepository.findById(patientId);

  if (patient && caregiver) {
    await sendNotification(patient.id, {
      type: NotificationType.PATIENT_EMERGENCY,
      title: "PATIENT CONNECTION REQUEST (RESENT)",
      body: `${caregiver.fullName} has resent their invitation to connect on MediFind.`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
      priority: 'normal',
      data: { patientId, caregiverId, requesterRole: 'CAREGIVER' }
    });
  }

  return { success: true };
};

export const unlinkCaregiver = async (patientId: string, caregiverId: string) => {
  const existingLink = await caregiverRepository.findLink(caregiverId, patientId);
  if (!existingLink) throw new Error('Caregiver link not found');

  return await caregiverRepository.removeLink(caregiverId, patientId);
};
