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

export function decryptSensitiveFields(profile: Record<string, any>): Record<string, any> {
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

  // Row metadata must never be written back through the upsert
  const { id: _id, userId: _userId, createdAt: _c, updatedAt: _u, user: _user, ...fields } = profileData || {};

  // Fields the client didn't send keep their current value (e.g. saving the
  // profile form must not wipe emergency contacts or quick phrases)
  const existing = await medicalProfileRepository.findByUserId(userId);
  const current: Record<string, any> = existing ? decryptSensitiveFields(existing as any) : {};

  const raw = {
    ...fields,
    chronicDiseases:    fields.chronicDiseases    ?? current.chronicDiseases    ?? [],
    allergies:          fields.allergies          ?? current.allergies          ?? [],
    medications:        fields.medications        ?? current.medications        ?? [],
    emergencyContacts:  fields.emergencyContacts  ?? current.emergencyContacts  ?? [],
    disabilities:       fields.disabilities       ?? current.disabilities       ?? [],
    predefinedMessages: fields.predefinedMessages ?? current.predefinedMessages ?? [],
  };

  const dataToUpsert = encryptSensitiveFields(raw);
  const saved = await medicalProfileRepository.upsert(userId, dataToUpsert);
  return decryptSensitiveFields(saved as any);
};
