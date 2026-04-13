export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: 'PATIENT' | 'RESPONDER' | 'CAREGIVER' | 'ADMIN';

  // Common optional field (all roles)
  cnic?: string;

  // PATIENT specific
  patientType?: 'NORMAL' | 'DEAF';

  // RESPONDER specific
  organization?: string;
  licenseNumber?: string;
  responderType?: 'AMBULANCE' | 'PARAMEDIC' | 'DOCTOR' | 'VOLUNTEER' | 'EMERGENCY_RESPONDER';
  vehicleType?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  userId: string;
  token: string;
  refreshToken?: string;
  expiresIn: number;
  email: string;
  fullName: string;
  role: string;
}
