/**
 * Notification system types for MediFind.
 * Supports multiple channels: In-App (Socket.io), Push (Firebase FCM), Email.
 */

export enum NotificationType {
  // Emergency alerts
  SOS_TRIGGERED = 'SOS_TRIGGERED',
  RESPONDER_ASSIGNED = 'RESPONDER_ASSIGNED',
  RESPONDER_ARRIVING = 'RESPONDER_ARRIVING',
  EMERGENCY_RESOLVED = 'EMERGENCY_RESOLVED',
  EMERGENCY_ACCEPTED_BY_OTHER = 'EMERGENCY_ACCEPTED_BY_OTHER',

  // Account events
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  PASSWORD_RESET = 'PASSWORD_RESET',

  // Caregiver notifications
  PATIENT_EMERGENCY = 'PATIENT_EMERGENCY',
  PATIENT_SAFE = 'PATIENT_SAFE',
  CAREGIVER_INVITATION = 'CAREGIVER_INVITATION',
  CAREGIVER_RESPONSE = 'CAREGIVER_RESPONSE',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',   // Socket.io real-time
  PUSH = 'PUSH',       // Firebase FCM
  EMAIL = 'EMAIL',     // Email (future)
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  channels: NotificationChannel[];
  priority: 'low' | 'normal' | 'high' | 'emergency';
  // Extra data passed to FCM and Socket.io
  data?: Record<string, string>;
}
