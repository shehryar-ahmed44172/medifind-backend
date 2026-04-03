// Password reset flow types and interfaces

export enum PasswordResetStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetTokenPayload {
  userId: string;
  tokenId: string; // Reference to database record
  createdAt: number;
  expiresAt: number;
}

export interface PasswordResetPayload {
  token: string;
  newPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  resetTokenId?: string; // For verification purposes
}

export interface PasswordHistoryEntry {
  password: string; // hashed
  changedAt: Date;
}