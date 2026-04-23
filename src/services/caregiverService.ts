import * as caregiverRepository from '../repositories/caregiverRepository';
import { userRepository } from '../repositories/userRepository';
import { sendNotification } from './notification';
import { NotificationChannel, NotificationType } from '../types/notification';

export const linkCaregiver = async (requesterId: string, targetEmail: string, relationship: string, requesterRole: string) => {
  const targetUser = await userRepository.findByEmail(targetEmail);
  if (!targetUser) throw new Error('User with this email not found');

  const requester = await userRepository.findById(requesterId);

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
    throw new Error('Invalid requester role');
  }

  // Check if link already exists
  const existingLink = await caregiverRepository.findLink(caregiverId, patientId);
  if (existingLink) {
    if (existingLink.status === 'ACCEPTED') throw new Error('Users are already linked');
    // If pending/rejected, we can update it
    return await caregiverRepository.updateLinkStatus(caregiverId, patientId, 'PENDING');
  }

  const result = await caregiverRepository.createLink({
    caregiverId,
    patientId,
    relationship,
    requesterId,
  });

  // Notify the target user
  await sendNotification(targetUser.id, {
    type: NotificationType.CAREGIVER_INVITATION,
    title: requesterRole === 'PATIENT' ? "NEW CAREGIVER INVITATION" : "NEW PATIENT CONNECTION REQUEST",
    body: `${requester?.fullName} has invited you to connect on MediFind.`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: 'normal',
    data: { requesterId, relationship }
  });

  // Also notify the requester (sender) for their notification history
  await sendNotification(requesterId, {
    type: NotificationType.CAREGIVER_INVITATION_SENT,
    title: "Invitation Sent",
    body: `You sent a connection request to ${targetUser.fullName} (${targetUser.email}).`,
    channels: [NotificationChannel.IN_APP],
    priority: 'low',
    data: { targetId: targetUser.id }
  });

  return result;
};

export const getPendingInvitations = async (caregiverId: string) => {
  return await caregiverRepository.getPendingInvitations(caregiverId);
};

export const respondToInvitation = async (caregiverId: string, patientId: string, accept: boolean, responderId: string) => {
  const status = accept ? 'ACCEPTED' : 'REJECTED';
  const result = await caregiverRepository.updateLinkStatus(caregiverId, patientId, status as any);

  // Determine who to notify (the one who DID NOT respond)
  const targetId = result.requesterId === responderId 
    ? (responderId === caregiverId ? patientId : caregiverId)
    : result.requesterId!;
    
  const responder = await userRepository.findById(responderId);

  if (targetId) {
    await sendNotification(targetId, {
      type: NotificationType.CAREGIVER_RESPONSE,
      title: accept ? "INVITATION ACCEPTED" : "INVITATION REJECTED",
      body: `${responder?.fullName} has ${accept ? 'accepted' : 'rejected'} your connection invitation.`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
      priority: 'normal',
      data: { caregiverId, patientId, status }
    }).catch(err => console.error(`Failed to notify user ${targetId}: ${err.message}`));
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

export const getAllLinkedCaregivers = async (patientId: string) => {
  return await caregiverRepository.getAllCaregiversForPatient(patientId);
};

export const resendInvitation = async (caregiverId: string, patientId: string) => {
  const link = await caregiverRepository.findLink(caregiverId, patientId);
  if (!link) throw new Error('Invitation link not found');
  if (link.status === 'ACCEPTED') throw new Error('Already accepted');

  return await caregiverRepository.updateLinkStatus(caregiverId, patientId, 'PENDING');
};

export const unlinkCaregiver = async (userId: string, caregiverId: string) => {
  // Only the patient can unlink currently, or both? 
  // The controller checks if it's a PATIENT.
  return await caregiverRepository.removeLink(caregiverId, userId);
};
