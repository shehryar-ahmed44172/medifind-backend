import { medicalProfileRepository } from '../repositories/medicalProfileRepository';
import { userRepository } from '../repositories/userRepository';
import { encryptJson, decryptJson } from '../utils/encryption';

// Fields that contain patient-sensitive data and must be encrypted at rest
const SENSITIVE_FIELDS = [
  'chronicDiseases',
  'allergies',
  'medications',
  'emergencyContacts',
  'disabilities',
  'predefinedMessages',
] as const;

function encryptSensitiveFields(data: Record<string, any>): Record<string, any> {
  const out = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (field in out && out[field] !== undefined && out[field] !== null) {
      out[field] = encryptJson(out[field]);
    }
  }
  return out;
}

function decryptSensitiveFields(profile: Record<string, any>): Record<string, any> {
  if (!profile) return profile;
  const out = { ...profile };
  for (const field of SENSITIVE_FIELDS) {
    if (field in out && out[field] !== undefined && out[field] !== null) {
      out[field] = decryptJson(out[field]);
    }
  }
  return out;
}

export const getMedicalProfile = async (userId: string) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new Error('User not found');

  let profile = await medicalProfileRepository.findByUserId(userId);

  if (!profile) {
    return {
      id: '',
      userId,
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
      updatedAt: new Date(),
    } as any;
  }

  return decryptSensitiveFields(profile as any);
};

export const updateMedicalProfile = async (userId: string, profileData: any) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new Error('User not found');

  const raw = {
    ...profileData,
    chronicDiseases:   profileData.chronicDiseases   ?? [],
    allergies:         profileData.allergies          ?? [],
    medications:       profileData.medications        ?? [],
    emergencyContacts: profileData.emergencyContacts  ?? [],
    disabilities:      profileData.disabilities       ?? [],
    predefinedMessages: profileData.predefinedMessages ?? [],
  };

  const dataToUpsert = encryptSensitiveFields(raw);
  const saved = await medicalProfileRepository.upsert(userId, dataToUpsert);
  return decryptSensitiveFields(saved as any);
};
