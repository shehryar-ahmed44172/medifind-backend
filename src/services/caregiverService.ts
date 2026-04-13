import { caregiverRepository } from '../repositories/caregiverRepository';
import { userRepository } from '../repositories/userRepository';

export const linkCaregiver = async (patientId: string, caregiverEmail: string, relationship: string) => {
  // Find the caregiver by email
  const caregiver = await userRepository.findByEmail(caregiverEmail);
  if (!caregiver) {
    throw new Error('User with this email not found');
  }

  if (caregiver.role !== 'CAREGIVER') {
    throw new Error('User is not registered as a Caregiver');
  }

  // Check if link already exists
  const existingLink = await caregiverRepository.findLink(caregiver.id, patientId);
  if (existingLink) {
    throw new Error('Caregiver is already linked to this patient');
  }

  return await caregiverRepository.createLink(caregiver.id, patientId, relationship);
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
