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
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}
