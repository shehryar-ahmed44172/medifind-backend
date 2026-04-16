import { medicalProfileRepository } from '../repositories/medicalProfileRepository';
import { userRepository } from '../repositories/userRepository';

export const getMedicalProfile = async (userId: string) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  let profile = await medicalProfileRepository.findByUserId(userId);
  
  // Return empty structure if no profile exists yet
  if (!profile) {
    profile = {
      id: '',
      userId: userId,
      cnic: null,
      patientType: 'NORMAL' as const,
      bloodType: null,
      chronicDiseases: [],
      allergies: [],
      medications: [],
      emergencyContacts: [],
      disabilities: [],
      predefinedMessages: [],
      medicalHistory: null,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;
  }

  return profile;
};

export const updateMedicalProfile = async (userId: string, profileData: any) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Ensure JSON fields are handled correctly
  const dataToUpsert = {
    ...profileData,
    chronicDiseases: profileData.chronicDiseases || [],
    allergies: profileData.allergies || [],
    medications: profileData.medications || [],
    emergencyContacts: profileData.emergencyContacts || [],
    disabilities: profileData.disabilities || [],
    predefinedMessages: profileData.predefinedMessages || []
  };

  return await medicalProfileRepository.upsert(userId, dataToUpsert);
};
