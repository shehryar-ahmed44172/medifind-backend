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

export const respondToInvitation = async (linkId: string, accept: boolean, responderId: string, responderRole: string) => {
  // PRIMARY: look up by the CaregiverLink's own ID (what the Flutter app sends)
  let link = await caregiverRepository.findLinkById(linkId);

  // FALLBACK: treat linkId as a user ID (old behaviour) for backwards compatibility
  if (!link) {
    const caregiverId = responderRole === 'CAREGIVER' ? responderId : linkId;
    const patientId   = responderRole === 'CAREGIVER' ? linkId    : responderId;
    link = await caregiverRepository.findLink(caregiverId, patientId);
    if (!link) link = await caregiverRepository.findLink(patientId, caregiverId);
  }

  if (!link) throw new Error('Invitation record not found in the system');

  const status = accept ? 'ACCEPTED' : 'REJECTED';
  const result = await caregiverRepository.updateLinkStatus(link.caregiverId, link.patientId, status as any);

  // Notify the original requester about the response
  const targetId = link.requesterId && link.requesterId !== responderId
    ? link.requesterId
    : (responderId === link.caregiverId ? link.patientId : link.caregiverId);

  const responder = await userRepository.findById(responderId);

  if (targetId) {
    sendNotification(targetId, {
      type: NotificationType.CAREGIVER_RESPONSE,
      title: accept ? 'INVITATION ACCEPTED ✅' : 'INVITATION REJECTED',
      body: `${responder?.fullName} has ${accept ? 'accepted' : 'rejected'} your connection invitation.`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
      priority: 'normal',
      data: { caregiverId: link.caregiverId, patientId: link.patientId, status },
    }).catch(err => console.error(`Failed to notify requester ${targetId}: ${err.message}`));
  }

  // Also notify the responder for their own history
  sendNotification(responderId, {
    type: NotificationType.CAREGIVER_RESPONSE,
    title: accept ? 'You Accepted the Invitation' : 'You Rejected the Invitation',
    body: accept ? 'You are now connected on MediFind.' : 'You declined the connection request.',
    channels: [NotificationChannel.IN_APP],
    priority: 'low',
  }).catch(() => {});

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

  const result = await caregiverRepository.updateLinkStatus(caregiverId, patientId, 'PENDING');

  // Determine target of resend (the one who ISN'T the requester/sender)
  // Usually the Caregiver resends to Patient or vice versa.
  const caregiver = await userRepository.findById(caregiverId);
  const patient = await userRepository.findById(patientId);

  // If requester was caregiver, notify patient. If requester was patient, notify caregiver.
  const targetId = link.requesterId === caregiverId ? patientId : caregiverId;
  const sender = link.requesterId === caregiverId ? caregiver : patient;
  const receiver = link.requesterId === caregiverId ? patient : caregiver;

  if (targetId && sender) {
    await sendNotification(targetId, {
      type: NotificationType.CAREGIVER_INVITATION,
      title: "INVITATION REMINDER",
      body: `${sender.fullName} has resent their connection request to you.`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
      priority: 'normal',
      data: { caregiverId, patientId }
    }).catch(err => console.error(`Failed to notify target user on resend: ${err.message}`));

    // Notify the sender that it was successful
    await sendNotification(sender.id, {
      type: NotificationType.CAREGIVER_INVITATION_SENT,
      title: "Reminder Sent",
      body: `You resent the connection request to ${receiver?.fullName}.`,
      channels: [NotificationChannel.IN_APP],
      priority: 'low',
    }).catch(err => console.error(`Failed to notify sender on resend: ${err.message}`));
  }

  return result;
};

export const unlinkCaregiver = async (userId: string, caregiverId: string) => {
  // Only the patient can unlink currently, or both? 
  // The controller checks if it's a PATIENT.
  return await caregiverRepository.removeLink(caregiverId, userId);
};
export const isLinked = async (caregiverId: string, patientId: string): Promise<boolean> => {
  const link = await caregiverRepository.findLink(caregiverId, patientId);
  return link?.status === 'ACCEPTED';
};
