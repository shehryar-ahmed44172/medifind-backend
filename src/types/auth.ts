export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  type?: 'refresh';
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: 'PATIENT' | 'RESPONDER' | 'CAREGIVER';

  // Common optional fields (all roles)
  cnic?: string;
  city?: string;
  address?: string;
  dateOfBirth?: string;

  // PATIENT specific
  patientType?: 'NORMAL' | 'DEAF';

  // RESPONDER specific
  organization?: string;
  licenseNumber?: string;
  responderType?: 'PARAMEDIC' | 'RESCUE_OFFICER' | 'EMT' | 'FIRST_RESPONDER' | 'VOLUNTEER';
  vehicleType?: string;
  motorbikeNumber?: string;
  specialization?: string[];
  cnicImageUrl?: string;
  cnicBackImageUrl?: string;
  employeeCardImageUrl?: string;
  employeeCardBackImageUrl?: string;
  drivingLicenseUrl?: string;
  motorbikeDocUrl?: string;
  // FCM token sent at registration time so push works before first login
  fcmToken?: string;
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
  accessToken?: string;
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
