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

  // Common optional fields (all roles)
  cnic?: string;
  city?: string;
  address?: string;

  // PATIENT specific
  patientType?: 'NORMAL' | 'DEAF';

  // RESPONDER specific
  organization?: string;
  licenseNumber?: string;
  responderType?: 'AMBULANCE' | 'PARAMEDIC' | 'DOCTOR' | 'VOLUNTEER' | 'EMERGENCY_RESPONDER';
  vehicleType?: string;
  cnicImageUrl?: string;
  cnicBackImageUrl?: string;
  employeeCardImageUrl?: string;
  employeeCardBackImageUrl?: string;
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
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  email: string;
  fullName: string;
  role: string;
  isEmailVerified?: boolean;
  message?: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  isEmailVerified: boolean;
  message: string;
}
