# MediFind Backend — API Reference

**Base URL:** `http://localhost:3000/api`  
**Version:** 2.0 | **Date:** May 2026

All protected endpoints require:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Standard Response Envelope

### Success
```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { },
  "timestamp": "2026-05-16T10:30:45.123Z"
}
```

### Error
```json
{
  "success": false,
  "message": "Error message",
  "error": "Error message",
  "errors": null,
  "timestamp": "2026-05-16T10:30:45.123Z"
}
```

---

## 1. Authentication (`/api/auth`)

### POST `/api/auth/register`
Register a new user account.

**Access:** Public  
**Body:**
```json
{
  "fullName": "Ahmed Khan",
  "email": "ahmed@example.com",
  "phoneNumber": "+923001234567",
  "password": "SecurePass@123",
  "role": "PATIENT",
  "licenseNumber": "LIC-2024-001",
  "organization": "City Hospital",
  "responderType": "PARAMEDIC",
  "vehicleType": "Ambulance"
}
```
> `licenseNumber`, `organization`, `responderType`, `vehicleType` only required for `RESPONDER` role.

**201 Created:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "userId": "clx...",
    "email": "ahmed@example.com",
    "role": "PATIENT"
  }
}
```
**400** — Validation error (missing fields, duplicate email/phone)

---

### POST `/api/auth/login`
Authenticate and receive tokens. Subject to rate limiting (5 attempts → 30-min lockout).

**Access:** Public  
**Middleware:** `loginRateLimitMiddleware`

**Body:**
```json
{
  "email": "ahmed@example.com",
  "password": "SecurePass@123"
}
```

**200 OK:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "userId": "clx...",
      "email": "ahmed@example.com",
      "fullName": "Ahmed Khan",
      "role": "PATIENT",
      "isEmailVerified": true
    }
  }
}
```
**401** — Invalid credentials  
**403** — Account locked (includes `minutesRemaining` in message)  
**403** — Email not verified

---

### POST `/api/auth/refresh-token`
Obtain a new access token using the refresh token.

**Access:** Public  
**Body:**
```json
{ "refreshToken": "eyJhbGc..." }
```

**200 OK:**
```json
{
  "data": { "accessToken": "eyJhbGc...", "refreshToken": "eyJhbGc..." }
}
```
**401** — Invalid or expired refresh token

---

### POST `/api/auth/logout`
Revoke the current refresh token.

**Access:** Public  
**Body:**
```json
{ "refreshToken": "eyJhbGc..." }
```

**200 OK:** `{ "message": "Logged out successfully" }`

---

### POST `/api/auth/verify-email`
Verify email with 6-digit OTP sent on registration.

**Access:** Public  
**Body:**
```json
{ "userId": "clx...", "otp": "482931" }
```

**200 OK:** `{ "message": "Email verified successfully" }`  
**400** — Invalid or expired OTP

---

### POST `/api/auth/resend-verification`
Resend the email verification OTP.

**Access:** Public  
**Body:**
```json
{ "email": "ahmed@example.com" }
```

**200 OK:** `{ "message": "Verification code resent" }`

---

### POST `/api/auth/forgot-password`
Request a password reset OTP (sent to email).

**Access:** Public  
**Body:**
```json
{ "email": "ahmed@example.com" }
```

**200 OK:** `{ "message": "If the email is registered, a reset code has been sent" }`

---

### POST `/api/auth/reset-password`
Reset password using the OTP received via email.

**Access:** Public  
**Body:**
```json
{
  "email": "ahmed@example.com",
  "otp": "839201",
  "newPassword": "NewSecure@456"
}
```

**200 OK:** `{ "message": "Password has been reset successfully" }`  
**400** — Invalid/expired OTP, password same as previous

---

### PUT `/api/auth/fcm-token`
Register or update the device's Firebase push token.

**Access:** Protected (all roles)  
**Body:**
```json
{ "fcmToken": "fXb9..." }
```

**200 OK:** `{ "message": "FCM token updated successfully" }`

---

### POST `/api/auth/upload-document`
Upload a verification document (CNIC, employee card).

**Access:** Public  
**Content-Type:** `multipart/form-data`  
**Form Fields:** `file` (binary), `documentType` (string)

**200 OK:**
```json
{
  "data": { "url": "https://cloudinary.com/..." }
}
```

---

## 2. Password Management (`/api/password`)

### POST `/api/password/forgot-password`
Alternative password reset request endpoint.

**Access:** Public — same as `/api/auth/forgot-password`

---

### POST `/api/password/reset`
Reset password with token.

**Access:** Public  
**Body:**
```json
{ "token": "<reset_link_token>", "newPassword": "NewPass@789" }
```

---

### POST `/api/password/change-password`
Change password while logged in.

**Access:** Protected (all roles)  
**Body:**
```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@456"
}
```

**200 OK:** `{ "message": "Password changed successfully" }`  
**400** — Wrong current password, same as old password, too short

---

## 3. Users (`/api/users`)

### GET `/api/users/profile`
Get the authenticated user's full profile.

**Access:** Protected (all roles)  
**200 OK:**
```json
{
  "data": {
    "id": "clx...",
    "fullName": "Ahmed Khan",
    "email": "ahmed@example.com",
    "phoneNumber": "+923001234567",
    "role": "PATIENT",
    "profileImageUrl": "/uploads/profile/img-123.jpg",
    "isActive": true,
    "isEmailVerified": true,
    "subscriptionPlan": "FREE",
    "patientType": "NORMAL",
    "organization": null,
    "responderType": null
  }
}
```

---

### PUT `/api/users/profile`
Update the authenticated user's profile fields.

**Access:** Protected (all roles)  
**Body** (any subset of allowed fields):
```json
{
  "fullName": "Ahmed Ali Khan",
  "phoneNumber": "+923009876543",
  "profileImageUrl": "https://...",
  "organization": "Punjab Rescue",
  "responderType": "PARAMEDIC",
  "vehicleType": "Advanced Life Support"
}
```

**200 OK:** Returns updated profile data.

---

### POST `/api/users/profile/image`
Upload a new profile photo.

**Access:** Protected (all roles)  
**Content-Type:** `multipart/form-data`  
**Form Field:** `image` (binary, max 10 MB, JPEG/PNG)

**200 OK:**
```json
{ "data": { "profileImageUrl": "/uploads/profile/image-1716123456789-abc.jpg" } }
```

---

### GET `/api/users/:id`
Get any user's public profile.

**Access:** Protected (all roles)  
**200 OK:**
```json
{
  "data": {
    "userId": "clx...",
    "fullName": "Dr. Rashid",
    "role": "RESPONDER",
    "responderType": "PARAMEDIC",
    "organization": "City Ambulance",
    "rating": 4.8,
    "isActive": true
  }
}
```

---

### PATCH `/api/users/upgrade`
Upgrade the patient's subscription plan.

**Access:** Protected (PATIENT only)  
**Body:**
```json
{ "plan": "PROFESSIONAL" }
```
> Valid plans: `FREE`, `PROFESSIONAL`, `EXECUTIVE`

**200 OK:** `{ "message": "Subscription upgraded to PROFESSIONAL" }`

---

### PATCH `/api/users/:id/verify`
Admin verifies a responder's credentials.

**Access:** Protected (ADMIN only)  
**200 OK:** `{ "message": "Responder verified successfully" }`

---

### DELETE `/api/users/me`
Permanently delete the authenticated user's account (cascades all data).

**Access:** Protected (PATIENT, RESPONDER, CAREGIVER — not ADMIN)  
**200 OK:** `{ "message": "Account permanently deleted" }`  
**403** — Admin accounts cannot self-delete

---

## 4. Emergencies (`/api/emergencies`)

### POST `/api/emergencies`
Trigger an SOS emergency.

**Access:** Protected (PATIENT only)  
**Body:**
```json
{
  "emergencyType": "MEDICAL",
  "latitude": 31.5204,
  "longitude": 74.3587,
  "accuracy": 12.5,
  "additionalInfo": "Chest pain, difficulty breathing"
}
```

**201 Created:**
```json
{
  "data": {
    "id": "clx...",
    "patientId": "clx...",
    "emergencyType": "MEDICAL",
    "latitude": 31.5204,
    "longitude": 74.3587,
    "status": "ACTIVE",
    "cancellationWindowSeconds": 60,
    "voiceSummary": "Ahmed Khan | Blood: B+ | Allergies: Penicillin | Conditions: Asthma | NORMAL mode",
    "createdAt": "2026-05-16T10:00:00.000Z"
  },
  "message": "Emergency created — you have 60 seconds to cancel"
}
```
**400** — Missing latitude/longitude  
**403** — Unauthorized

---

### GET `/api/emergencies`
Get all active emergencies (for responder dashboard / admin).

**Access:** Protected (RESPONDER, ADMIN)  
**200 OK:**
```json
{
  "data": [
    {
      "id": "clx...",
      "emergencyType": "MEDICAL",
      "latitude": 31.5204,
      "longitude": 74.3587,
      "status": "ACTIVE",
      "patient": { "fullName": "Ahmed Khan", "phoneNumber": "+923001234567" },
      "createdAt": "2026-05-16T10:00:00.000Z"
    }
  ]
}
```

---

### GET `/api/emergencies/:id`
Get full emergency details including patient medical profile.

**Access:** Protected (all roles with involvement)  
**Note:** Accesses HIPAA-classified PHI — triggers audit log for ADMIN/RESPONDER

**200 OK:**
```json
{
  "data": {
    "id": "clx...",
    "patientId": "clx...",
    "emergencyType": "MEDICAL",
    "latitude": 31.5204,
    "longitude": 74.3587,
    "status": "ASSIGNED",
    "voiceSummary": "Ahmed Khan | Blood: B+ | Allergies: Penicillin",
    "patient": {
      "fullName": "Ahmed Khan",
      "medicalProfile": {
        "bloodType": "B+",
        "allergies": ["Penicillin"],
        "chronicDiseases": ["Asthma"],
        "patientType": "NORMAL"
      }
    },
    "emergencyRequests": [...],
    "medicalReports": [...]
  }
}
```

---

### POST `/api/emergencies/:id/cancel`
Cancel an active emergency within the cancellation window.

**Access:** Protected (PATIENT only)  
**200 OK:** `{ "data": { "id": "...", "status": "CANCELLED" } }`  
**400** — Cancellation window has expired

---

### PATCH `/api/emergencies/:id/status`
Update emergency status (arrived, resolved, etc.).

**Access:** Protected (RESPONDER, ADMIN)  
**Body:**
```json
{ "status": "ARRIVED" }
```
> Valid: `ACTIVE`, `ASSIGNED`, `ARRIVED`, `COMPLETED`, `RESOLVED`, `CANCELLED`

---

## 5. Responders (`/api/responders`)

### POST `/api/responders/location`
Broadcast live GPS location during an active emergency.

**Access:** Protected (RESPONDER only)  
**Body:**
```json
{
  "latitude": 31.5210,
  "longitude": 74.3591,
  "emergencyId": "clx..."
}
```

**200 OK:** Returns updated responder record.  
**422** — Coordinates outside Pakistan bounds (lat 23–37, lon 60–77)

---

### PATCH `/api/responders/availability`
Toggle availability (available/unavailable for dispatch).

**Access:** Protected (RESPONDER only)  
**Body:**
```json
{ "isAvailable": true }
```

**200 OK:** `{ "message": "Availability set to true" }`

---

### POST `/api/responders/emergencies/:emergencyId/accept`
Accept an incoming emergency request.

**Access:** Protected (RESPONDER only)  
**200 OK:**
```json
{
  "data": {
    "status": "ACCEPTED",
    "acceptedAt": "2026-05-16T10:01:30.000Z",
    "emergency": {
      "id": "clx...",
      "latitude": 31.5204,
      "longitude": 74.3587,
      "emergencyType": "MEDICAL",
      "voiceSummary": "Ahmed Khan | Blood: B+ | Allergies: Penicillin",
      "additionalInfo": "Chest pain"
    }
  }
}
```
**400** — Already assigned / request no longer valid

---

### POST `/api/responders/emergencies/:emergencyId/reject`
Reject an emergency request.

**Access:** Protected (RESPONDER only)  
**Body:**
```json
{ "reason": "En route to another emergency" }
```

**200 OK:** `{ "data": { "status": "REJECTED" } }`

---

### POST `/api/responders/emergencies/:emergencyId/resolve`
Mark the assigned emergency as resolved/completed.

**Access:** Protected (RESPONDER only)  
**200 OK:**
```json
{ "message": "Emergency resolved and closed successfully" }
```

---

### POST `/api/responders/emergencies/:emergencyId/cancel`
Cancel an already-accepted assignment (re-opens emergency for re-dispatch).

**Access:** Protected (RESPONDER only)  
**200 OK:** `{ "data": { "success": true } }`

---

### GET `/api/responders/nearby`
Find available responders near given coordinates.

**Access:** Protected (ADMIN, RESPONDER)  
**Query Params:** `latitude`, `longitude`, `radius` (km, default 5)

**200 OK:**
```json
{
  "data": [
    {
      "userId": "clx...",
      "distanceKm": 1.2,
      "user": { "fullName": "Dr. Rashid", "phoneNumber": "+923001234567" },
      "isAvailable": true,
      "responderType": "PARAMEDIC"
    }
  ]
}
```
**422** — Coordinates outside Pakistan

---

### GET `/api/responders/history`
Get the responder's full past emergency response history.

**Access:** Protected (RESPONDER only)  
**200 OK:** Array of past `EmergencyRequest` records with linked emergency details.

---

### GET `/api/responders/emergencies`
Get current active (PENDING or ACCEPTED) emergency requests.

**Access:** Protected (RESPONDER only)  
**200 OK:** Array of emergencies with patient medical profile and request status.

---

### POST `/api/responders/:responderId/rate`
Patient rates a responder after emergency resolution (1–5 stars).

**Access:** Protected (PATIENT only)  
**Body:**
```json
{
  "emergencyId": "clx...",
  "stars": 5
}
```

**200 OK:**
```json
{
  "data": {
    "newRating": 4.85,
    "totalRatings": 14
  }
}
```
**400** — Already rated, emergency not resolved, not patient's emergency, invalid stars

---

## 6. Live Tracking (`/api/tracking`)

### POST `/api/tracking`
Submit a live location update (alternative HTTP endpoint to socket).

**Access:** Protected (RESPONDER only)  
**Body:**
```json
{
  "emergencyId": "clx...",
  "latitude": 31.5212,
  "longitude": 74.3595,
  "accuracy": 8.0,
  "status": "EN_ROUTE"
}
```
> Valid statuses: `EN_ROUTE`, `ARRIVED`, `TREATING`, `TRANSPORTED`

**200 OK:**
```json
{
  "data": {
    "id": "clx...",
    "estimatedArrivalMinutes": 4,
    "status": "EN_ROUTE"
  }
}
```

---

### GET `/api/tracking/:emergencyId`
Get the full tracking history for an emergency.

**Access:** Protected (all roles with involvement)  
**200 OK:** Array of `EmergencyTracking` records ordered by timestamp.

---

### GET `/api/tracking/:emergencyId/latest`
Get the responder's most recent position for live map display.

**Access:** Protected (all roles)  
**200 OK:**
```json
{
  "data": {
    "latitude": 31.5212,
    "longitude": 74.3595,
    "status": "EN_ROUTE",
    "estimatedArrivalMinutes": 4,
    "timestamp": "2026-05-16T10:05:30.000Z"
  }
}
```

---

## 7. Medical Profiles (`/api/medical-profile`)

### GET `/api/medical-profile`
Get the authenticated user's medical profile.

**Access:** Protected (PATIENT)  
**200 OK:**
```json
{
  "data": {
    "id": "clx...",
    "bloodType": "B+",
    "chronicDiseases": ["Asthma", "Hypertension"],
    "allergies": ["Penicillin", "Aspirin"],
    "medications": ["Salbutamol 100mcg"],
    "disabilities": [],
    "emergencyContacts": [
      { "name": "Fatima Khan", "phone": "+923009876543", "relationship": "Wife" }
    ],
    "patientType": "NORMAL",
    "predefinedMessages": []
  }
}
```

---

### PUT `/api/medical-profile`
Create or update the medical profile (upsert).

**Access:** Protected (PATIENT)  
**Body:**
```json
{
  "bloodType": "B+",
  "chronicDiseases": ["Asthma"],
  "allergies": ["Penicillin"],
  "medications": ["Salbutamol 100mcg"],
  "emergencyContacts": [
    { "name": "Fatima Khan", "phone": "+923009876543", "relationship": "Wife" }
  ],
  "disabilities": [],
  "patientType": "NORMAL",
  "predefinedMessages": ["I cannot hear", "I need help"]
}
```

**200 OK:** Returns full updated profile.

---

### GET `/api/medical-profile/:userId`
Get a patient's medical profile (with RBAC — responders only during active emergency, caregivers with active link, admin always).

**Access:** Protected (RESPONDER during emergency, CAREGIVER with link, ADMIN)  
**200 OK:** Same structure as above + patient demographics.

---

## 8. Medical Reports (`/api/reports`)

### POST `/api/reports/profile`
Upload a medical document to the patient's profile.

**Access:** Protected (PATIENT only)  
**Content-Type:** `multipart/form-data`  
**Form Fields:** `report` (binary), `reportType` (enum string)

> Valid report types: `LAB`, `IMAGING`, `PRESCRIPTION`, `DISCHARGE_SUMMARY`, `VITAL_SIGNS`, `OTHER`

**201 Created:**
```json
{
  "data": {
    "id": "clx...",
    "fileName": "bloodwork-2026.pdf",
    "fileUrl": "https://cloudinary.com/...",
    "reportType": "LAB",
    "fileSizeBytes": 204800
  }
}
```

---

### GET `/api/reports/profile`
Get all medical reports in the patient's profile.

**Access:** Protected (PATIENT only)  
**200 OK:** Array of `MedicalReport` objects.

---

### POST `/api/reports/:emergencyId`
Upload a report specifically linked to an emergency record.

**Access:** Protected (PATIENT only)  
**Content-Type:** `multipart/form-data`

**201 Created:** Same as profile report upload.

---

### GET `/api/reports/:emergencyId`
Get all reports linked to an emergency.

**Access:** Protected (PATIENT, RESPONDER assigned to emergency, ADMIN)

---

### PATCH `/api/reports/:id`
Rename a report.

**Access:** Protected (PATIENT only)  
**Body:**
```json
{ "fileName": "Updated Lab Report 2026" }
```

---

### DELETE `/api/reports/:id`
Delete a report.

**Access:** Protected (PATIENT only)  
**200 OK:** `{ "message": "Report deleted" }`

---

## 9. Caregivers (`/api/caregivers`)

### POST `/api/caregivers/link`
Invite a caregiver or send a link request.

**Access:** Protected (PATIENT, CAREGIVER)  
**Body:**
```json
{
  "targetEmail": "caregiver@example.com",
  "relationship": "Spouse"
}
```

**200 OK:** `{ "message": "Invitation sent to caregiver@example.com" }`  
**404** — Target user not found  
**409** — Link already exists

---

### GET `/api/caregivers`
Get all linked caregivers (if patient) or linked patients (if caregiver).

**Access:** Protected (PATIENT, CAREGIVER)  
**200 OK:** Array of active `CaregiverLink` records with user details.

---

### GET `/api/caregivers/invitations`
Get all pending invitations.

**Access:** Protected (CAREGIVER, PATIENT)  
**200 OK:** Array of pending `CaregiverLink` records.

---

### POST `/api/caregivers/invitations/:targetId/respond`
Accept or reject an invitation.

**Access:** Protected (CAREGIVER, PATIENT)  
**Body:**
```json
{ "accepted": true }
```

**200 OK:** `{ "message": "Invitation accepted" }`

---

### GET `/api/caregivers/links/all`
Get all caregiver links regardless of status.

**Access:** Protected (CAREGIVER, PATIENT)

---

### POST `/api/caregivers/links/:patientId/resend`
Resend a pending invitation.

**Access:** Protected (CAREGIVER only)  
**200 OK:** `{ "message": "Invitation resent" }`

---

### DELETE `/api/caregivers/:caregiverId`
Remove a caregiver link.

**Access:** Protected (PATIENT only)  
**200 OK:** `{ "message": "Caregiver unlinked" }`

---

## 10. Chat (`/api/chat`)

### GET `/api/chat/rooms`
List all chat rooms the user is part of (with last message).

**Access:** Protected (all roles)  
**200 OK:**
```json
[
  {
    "id": "clx...",
    "roomType": "CAREGIVER_PATIENT",
    "patient": { "id": "...", "fullName": "Ahmed Khan", "profileImageUrl": null },
    "caregiver": { "id": "...", "fullName": "Fatima", "profileImageUrl": null },
    "messages": [{ "content": "How are you feeling?", "createdAt": "..." }],
    "updatedAt": "2026-05-16T09:00:00.000Z"
  }
]
```

---

### POST `/api/chat/rooms`
Create or retrieve a chat room.

**Access:** Protected (all roles)  
**Body — Caregiver↔Patient room:**
```json
{ "targetUserId": "clx..." }
```
**Body — Emergency room:**
```json
{
  "emergencyId": "clx...",
  "targetUserId": "clx..."
}
```

**200 OK:** Returns the room object.

---

### GET `/api/chat/messages/:roomId`
Get the last 100 messages in a room.

**Access:** Protected (room members only)  
**200 OK:** Array of `ChatMessage` objects ordered by `createdAt ASC`.

**403** — User not a member of this room

---

### POST `/api/chat/messages`
Send a message.

**Access:** Protected (room members only)  
**Body:**
```json
{
  "roomId": "clx...",
  "content": "I am feeling much better now, thank you.",
  "messageType": "TEXT"
}
```
> Valid messageTypes: `TEXT`, `IMAGE`, `AUDIO`, `VOICE_ALERT`, `DOCUMENT`

**201 Created:** Returns the created `ChatMessage`.  
**Side effects:** Emits `message:new` via Socket.io, sends IN_APP + PUSH notification to recipients.

---

### POST `/api/chat/upload`
Upload a chat attachment (image, audio, document).

**Access:** Protected (all roles)  
**Content-Type:** `multipart/form-data`  
**Form Field:** `file` (binary, max 10 MB)

**200 OK:**
```json
{
  "url": "http://host/uploads/chat/file-1716123456789.jpg",
  "filename": "file-1716123456789.jpg",
  "mimetype": "image/jpeg",
  "size": 102400
}
```

---

## 11. Notifications (`/api/notifications`)

### GET `/api/notifications/history`
Get the authenticated user's notification history.

**Access:** Protected (all roles)  
**200 OK:** Array of `NotificationLog` records.

---

### PATCH `/api/notifications/:id/read`
Mark a single notification as read.

**Access:** Protected (all roles)  
**200 OK:** `{ "message": "Marked as read" }`

---

### PATCH `/api/notifications/read-all`
Mark all unread notifications as read.

**Access:** Protected (all roles)  
**200 OK:** `{ "data": { "count": 5 } }`

---

### POST `/api/notifications/emergency`
Manually send an emergency alert to a responder.

**Access:** Protected  
**Body:**
```json
{ "emergencyId": "clx...", "responderId": "clx..." }
```

---

### POST `/api/notifications/broadcast`
Admin broadcasts a notification to a user group.

**Access:** Protected  
**Body:**
```json
{
  "targetGroup": "ALL_PATIENTS",
  "title": "System Maintenance",
  "body": "MediFind will be down for maintenance on Sunday 2–4 AM."
}
```
> Valid groups: `ALL_PATIENTS`, `ALL_RESPONDERS`, `ALL_CAREGIVERS`, `ALL_USERS`

---

### GET `/api/notifications/history`
Notification history for the current user.

---

### GET `/api/notifications/admin-history`
Admin broadcast history (sent by admins).

**Access:** Protected

---

## 12. Admin (`/api/admin`)

### GET `/api/admin/users`
List all users with filters.

**Access:** Protected (ADMIN only)  
**Query Params:** `role`, `isActive`, `page`, `limit`

**200 OK:** Paginated user list (without sensitive fields).

---

### GET `/api/admin/users/:id`
Get any user's full profile.

**Access:** Protected (ADMIN only)

---

### GET `/api/admin/stats`
Dashboard statistics.

**Access:** Protected (ADMIN only)  
**200 OK:**
```json
{
  "data": {
    "totalUsers": 1240,
    "totalPatients": 900,
    "totalResponders": 280,
    "totalCaregivers": 60,
    "activeEmergencies": 3,
    "resolvedToday": 12,
    "pendingVerifications": 7
  }
}
```

---

### GET `/api/admin/health`
System health metrics.

**Access:** Protected (ADMIN only)  
**200 OK:** DB connection status, active socket connections, memory usage, uptime.

---

### GET `/api/admin/logs`
Audit log for HIPAA compliance.

**Access:** Protected (ADMIN only)  
**Query Params:** `userId`, `entity`, `action`, `from`, `to`

---

### GET `/api/admin/responders/pending`
Responders awaiting credential verification.

**Access:** Protected (ADMIN only)

---

### POST `/api/admin/responders/:id/verify`
Approve or reject a responder's credentials.

**Access:** Protected (ADMIN only)  
**Body:**
```json
{ "action": "APPROVE", "rejectionReason": null }
```

---

### PATCH `/api/admin/users/:id/deactivate`
Soft-deactivate a user account.

**Access:** Protected (ADMIN only)

---

### PATCH `/api/admin/users/:id/activate`
Reactivate a deactivated user.

**Access:** Protected (ADMIN only)

---

### DELETE `/api/admin/users/:id`
Permanently delete a user and all their data.

**Access:** Protected (ADMIN only)

---

### POST `/api/admin/generate-draft`
Generate a notification title and body using the Gemini AI model.

**Access:** Protected (ADMIN only)  
**Body:**
```json
{ "prompt": "Write a maintenance notification for Sunday night downtime" }
```

**200 OK:**
```json
{
  "data": { "title": "Scheduled Maintenance", "body": "..." }
}
```

---

## Socket.IO Events

**Connection:** `ws://host` with `Authorization: Bearer <token>` in handshake auth.

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join:emergency` | `emergencyId: string` | Subscribe to emergency updates |
| `join:location` | `emergencyId: string` | Subscribe to live location stream |
| `join:chat` | `roomId: string` | Join a chat room |
| `join` | `{ userId?, role?, room? }` | Join notification / role room |
| `update_location` | `{ emergencyId, latitude, longitude, status }` | Responder broadcasts live GPS |
| `ping` | — | Connection health check |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `notification` | `{ type, title, body, timestamp, data }` | In-app notification |
| `message:new` | `ChatMessage` object | New chat message |
| `EMERGENCY_ASSIGNED` | `{ emergencyId, assignedTo }` | Another responder was assigned |
| `EMERGENCY_STATUS_CHANGE` | `{ emergencyId, newStatus, responderId?, responderName? }` | Status transition |
| `LOCATION_UPDATE` | `{ emergencyId, latitude, longitude, status, estimatedArrivalMinutes }` | Live responder GPS |
| `RESPONDER_EN_ROUTE` | `{ emergencyId, responderId, status, timestamp }` | Responder accepted and moving |
| `RESPONDER_ARRIVED` | Same as above | Responder at scene |
| `RESPONDER_TREATING` | Same as above | Responder treating patient |
| `pong` | `{ rooms: string[] }` | Response to ping |

---

## HTTP Status Code Reference

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (wrong role or locked account) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 422 | Unprocessable Entity (e.g., invalid coordinates) |
| 500 | Internal Server Error |

---

## Authentication Flow Summary

```
Register → verify email (OTP) → Login → receive { accessToken, refreshToken }
         ↓                              ↓
  (Responder: admin verifies)    attach to every request
  → OTP email → verify in app    Authorization: Bearer <accessToken>
                                          ↓
                               Access token expires (7d default)
                                          ↓
                               POST /auth/refresh-token with refreshToken
                               → new { accessToken, refreshToken }
```
