# MediFind — Manual Test Cases

**Version:** 2.0 | **Date:** May 2026  
**Coverage:** 12 Modules · 120 Test Cases

**Legend:**
- ✅ Expected to pass
- ❌ Expected to fail / return error
- 🔐 Requires authenticated token
- 👑 Requires ADMIN token
- 🚑 Requires RESPONDER token
- 🏥 Requires PATIENT token
- 👤 Requires CAREGIVER token

---

## Module 1 — Authentication & Account Management

### TC-AUTH-001 — Successful Patient Registration
- **Preconditions:** Email not already registered
- **Input:** `POST /api/auth/register` `{ fullName, email, password, phoneNumber, role: "PATIENT" }`
- **Expected:** HTTP 201, `data.userId` present, email OTP sent ✅

### TC-AUTH-002 — Successful Responder Registration
- **Input:** Same as above + `licenseNumber, organization, responderType`
- **Expected:** HTTP 201, account status PENDING (awaiting admin verification) ✅

### TC-AUTH-003 — Duplicate Email Registration
- **Preconditions:** Email already registered
- **Input:** Same email address
- **Expected:** HTTP 400, message contains "already registered" or "duplicate" ❌

### TC-AUTH-004 — Duplicate Phone Registration
- **Input:** Same phone number, different email
- **Expected:** HTTP 400, message contains "phone" ❌

### TC-AUTH-005 — Missing Required Fields
- **Input:** Missing `password` field
- **Expected:** HTTP 400, validation error ❌

### TC-AUTH-006 — Email Verification with Valid OTP
- **Preconditions:** User registered, OTP received
- **Input:** `POST /api/auth/verify-email` `{ userId, otp }`
- **Expected:** HTTP 200, `isEmailVerified: true` ✅

### TC-AUTH-007 — Email Verification with Expired OTP
- **Input:** OTP older than 15 minutes
- **Expected:** HTTP 400, "OTP expired" ❌

### TC-AUTH-008 — Email Verification with Wrong OTP
- **Input:** Incorrect 6-digit code
- **Expected:** HTTP 400, "Invalid OTP" ❌

### TC-AUTH-009 — Successful Login
- **Preconditions:** User registered + email verified
- **Input:** `POST /api/auth/login` `{ email, password }`
- **Expected:** HTTP 200, `{ accessToken, refreshToken, user }` ✅

### TC-AUTH-010 — Login with Wrong Password
- **Input:** Correct email, wrong password
- **Expected:** HTTP 401, "Invalid credentials", `failedLoginAttempts` incremented ❌

### TC-AUTH-011 — Account Lockout after 5 Failures
- **Preconditions:** 4 prior failed attempts
- **Input:** Login with wrong password (5th attempt)
- **Expected:** HTTP 403, account locked for 30 minutes, message contains `minutesRemaining` ❌

### TC-AUTH-012 — Login Blocked During Lockout
- **Preconditions:** Account is currently locked
- **Input:** Login with correct password
- **Expected:** HTTP 403, "Account temporarily locked" ❌

### TC-AUTH-013 — Login with Unverified Email
- **Input:** Correct credentials, email not verified
- **Expected:** HTTP 403, "Please verify your email" ❌

### TC-AUTH-014 — Token Refresh with Valid Refresh Token
- **Input:** `POST /api/auth/refresh-token` `{ refreshToken: "<valid>" }`
- **Expected:** HTTP 200, new `{ accessToken, refreshToken }` ✅

### TC-AUTH-015 — Token Refresh with Expired Token
- **Input:** Expired refresh token
- **Expected:** HTTP 401 ❌

### TC-AUTH-016 — Token Refresh after Logout (Revoked)
- **Preconditions:** User logged out
- **Input:** Old refresh token
- **Expected:** HTTP 401, token revoked ❌

### TC-AUTH-017 — Logout Invalidates Session
- **Input:** `POST /api/auth/logout` with valid refresh token
- **Expected:** HTTP 200, subsequent refresh with same token fails ✅

### TC-AUTH-018 — Forgot Password for Registered Email
- **Input:** `POST /api/auth/forgot-password` `{ email: "registered@email.com" }`
- **Expected:** HTTP 200, OTP sent to email ✅

### TC-AUTH-019 — Forgot Password for Unknown Email
- **Input:** Email not in system
- **Expected:** HTTP 200, generic message (no email enumeration) ✅

### TC-AUTH-020 — Reset Password with Valid OTP
- **Input:** `POST /api/auth/reset-password` `{ email, otp: "valid", newPassword }`
- **Expected:** HTTP 200, password changed, old password no longer works ✅

### TC-AUTH-021 — Reset with Expired OTP
- **Input:** OTP older than 15 minutes
- **Expected:** HTTP 400, "Invalid or expired code" ❌

### TC-AUTH-022 — Reset with Same Password
- **Input:** New password identical to current password
- **Expected:** HTTP 400, "must be different from current password" ❌

### TC-AUTH-023 — FCM Token Registration
- 🔐 **Input:** `PUT /api/auth/fcm-token` `{ fcmToken: "valid-fcm-token" }`
- **Expected:** HTTP 200, token added to user's fcmTokens array (max 5) ✅

### TC-AUTH-024 — FCM Token Deduplication
- 🔐 **Input:** Register same FCM token twice
- **Expected:** HTTP 200, no duplicate in fcmTokens array ✅

### TC-AUTH-025 — Access Protected Route without Token
- **Input:** `GET /api/users/profile` with no Authorization header
- **Expected:** HTTP 401 ❌

---

## Module 2 — Medical Profile Management

### TC-MED-001 — Create Medical Profile
- 🏥 **Input:** `PUT /api/medical-profile` with full profile data
- **Expected:** HTTP 200, profile created ✅

### TC-MED-002 — Update Medical Profile (Partial)
- 🏥 **Input:** `PUT /api/medical-profile` with only `bloodType` changed
- **Expected:** HTTP 200, only bloodType updated, other fields preserved ✅

### TC-MED-003 — Get Own Medical Profile
- 🏥 **Input:** `GET /api/medical-profile`
- **Expected:** HTTP 200, full profile returned ✅

### TC-MED-004 — Get Profile Before Creation
- 🏥 **Input:** `GET /api/medical-profile` (no profile exists yet)
- **Expected:** HTTP 200, empty default structure returned ✅

### TC-MED-005 — Responder Accesses Patient Profile During Emergency
- 🚑 **Preconditions:** Responder has ACCEPTED request for patient's emergency
- **Input:** `GET /api/medical-profile/:patientId`
- **Expected:** HTTP 200, full profile ✅

### TC-MED-006 — Responder Accesses Profile Without Active Emergency
- 🚑 **Input:** `GET /api/medical-profile/:patientId` (no active emergency)
- **Expected:** HTTP 403, Access denied ❌

### TC-MED-007 — Upload Medical Report
- 🏥 **Input:** `POST /api/reports/profile` multipart PDF file, `reportType: "LAB"`
- **Expected:** HTTP 201, `{ fileUrl, fileName, reportType }` ✅

### TC-MED-008 — Rename Report
- 🏥 **Input:** `PATCH /api/reports/:id` `{ fileName: "Updated Lab 2026" }`
- **Expected:** HTTP 200, fileName updated ✅

### TC-MED-009 — Delete Report
- 🏥 **Input:** `DELETE /api/reports/:id`
- **Expected:** HTTP 200, report gone from profile ✅

### TC-MED-010 — Upload Oversized File
- 🏥 **Input:** File > 10 MB
- **Expected:** HTTP 400, file size error ❌

---

## Module 3 — Accessibility

### TC-ACC-001 — Register as Deaf/Mute Patient
- **Input:** Register with `patientType: "DEAF"` (via medical profile update)
- **Expected:** Profile stores `patientType: "DEAF"` ✅

### TC-ACC-002 — Save Predefined Messages
- 🏥 **Input:** `PUT /api/medical-profile` `{ predefinedMessages: ["I cannot hear", "I need help"] }`
- **Expected:** HTTP 200, messages stored ✅

### TC-ACC-003 — Retrieve Predefined Messages
- 🏥 **Input:** `GET /api/medical-profile`
- **Expected:** `predefinedMessages` array returned with saved phrases ✅

---

## Module 4 — SOS Emergency & Cancellation

### TC-SOS-001 — Create SOS Emergency
- 🏥 **Input:** `POST /api/emergencies` `{ emergencyType: "MEDICAL", latitude: 31.52, longitude: 74.36 }`
- **Expected:** HTTP 201, `status: "ACTIVE"`, `cancellationWindowSeconds: 60` ✅

### TC-SOS-002 — Cancel within Window
- 🏥 **Preconditions:** Emergency created < 60 seconds ago
- **Input:** `POST /api/emergencies/:id/cancel`
- **Expected:** HTTP 200, `status: "CANCELLED"` ✅

### TC-SOS-003 — Cancel after Window Expires
- 🏥 **Preconditions:** Emergency created > 60 seconds ago
- **Input:** `POST /api/emergencies/:id/cancel`
- **Expected:** HTTP 400, "Cancellation window has expired" ❌

### TC-SOS-004 — Missing GPS Coordinates
- 🏥 **Input:** `POST /api/emergencies` without `latitude`/`longitude`
- **Expected:** HTTP 400 ❌

### TC-SOS-005 — Patient Alert Summary Generated
- 🏥 **Input:** Create emergency (patient has medical profile set up)
- **Expected:** `voiceSummary` field populated with name, blood type, allergies, conditions ✅

### TC-SOS-006 — Caregiver Notified on SOS
- 🏥 **Preconditions:** Patient has an active caregiver link
- **Input:** Create emergency
- **Expected:** Caregiver receives Socket.io notification event ✅

### TC-SOS-007 — Responder Role Cannot Create Emergency
- 🚑 **Input:** `POST /api/emergencies`
- **Expected:** HTTP 403, "PATIENT role required" ❌

### TC-SOS-008 — View Active Emergencies (Responder)
- 🚑 **Input:** `GET /api/emergencies`
- **Expected:** HTTP 200, list of ACTIVE emergencies ✅

### TC-SOS-009 — Patient Cannot View All Emergencies
- 🏥 **Input:** `GET /api/emergencies`
- **Expected:** HTTP 403 ❌

---

## Module 5 — Responder Management & Assignment

### TC-RESP-001 — Toggle Availability ON
- 🚑 **Input:** `PATCH /api/responders/availability` `{ isAvailable: true }`
- **Expected:** HTTP 200, responder visible in nearby search ✅

### TC-RESP-002 — Toggle Availability OFF
- 🚑 **Input:** `{ isAvailable: false }`
- **Expected:** HTTP 200, responder no longer dispatched ✅

### TC-RESP-003 — Accept Emergency Request
- 🚑 **Preconditions:** Responder is available, emergency is ACTIVE
- **Input:** `POST /api/responders/emergencies/:emergencyId/accept`
- **Expected:** HTTP 200, emergency status → ASSIGNED, responder availability → false ✅

### TC-RESP-004 — Accept Already-Assigned Emergency
- 🚑 **Preconditions:** Another responder accepted first
- **Input:** `POST /api/responders/emergencies/:emergencyId/accept`
- **Expected:** HTTP 400, "already been assigned" ❌

### TC-RESP-005 — Reject Emergency Request
- 🚑 **Input:** `POST /api/responders/emergencies/:emergencyId/reject` `{ reason: "En route elsewhere" }`
- **Expected:** HTTP 200, request marked REJECTED ✅

### TC-RESP-006 — First-Accept Wins Race Condition
- **Preconditions:** 2 responders attempt to accept simultaneously
- **Expected:** Exactly 1 succeeds (ACCEPTED), other gets 400 ✅

### TC-RESP-007 — Resolve Emergency
- 🚑 **Preconditions:** Responder has ACCEPTED request
- **Input:** `POST /api/responders/emergencies/:emergencyId/resolve`
- **Expected:** HTTP 200, emergency → RESOLVED, responder availability → true ✅

### TC-RESP-008 — Cancel Accepted Assignment
- 🚑 **Preconditions:** Responder has ACCEPTED request
- **Input:** `POST /api/responders/emergencies/:emergencyId/cancel`
- **Expected:** HTTP 200, emergency → ACTIVE again, responder availability → true ✅

### TC-RESP-009 — Get Nearby Responders
- 👑 **Input:** `GET /api/responders/nearby?latitude=31.52&longitude=74.36&radius=5`
- **Expected:** HTTP 200, list with `distanceKm` field ✅

### TC-RESP-010 — Nearby Responders — Outside Pakistan
- 👑 **Input:** `latitude=51.5, longitude=-0.1` (London)
- **Expected:** HTTP 422, coordinates outside service area ❌

### TC-RESP-011 — Rate Responder after Resolution
- 🏥 **Preconditions:** Emergency resolved, patient involved
- **Input:** `POST /api/responders/:responderId/rate` `{ emergencyId, stars: 5 }`
- **Expected:** HTTP 200, `newRating` and `totalRatings` updated ✅

### TC-RESP-012 — Rate Same Responder Twice
- 🏥 **Input:** Same emergency + responderId, second rating
- **Expected:** HTTP 400, "already rated" ❌

### TC-RESP-013 — Rate Before Emergency Resolved
- 🏥 **Preconditions:** Emergency still ACTIVE
- **Input:** Submit rating
- **Expected:** HTTP 400, "emergency is not resolved" ❌

### TC-RESP-014 — Rate Another Patient's Responder
- 🏥 **Preconditions:** Different patient's emergency
- **Input:** Submit rating
- **Expected:** HTTP 400, "not your emergency" ❌

### TC-RESP-015 — Invalid Rating Stars
- 🏥 **Input:** `stars: 6`
- **Expected:** HTTP 400, "must be between 1 and 5" ❌

### TC-RESP-016 — Admin Verification Flow
- 👑 **Preconditions:** Responder submitted credentials
- **Input:** `POST /api/admin/responders/:id/verify` `{ action: "APPROVE" }`
- **Expected:** HTTP 200, verification OTP sent to responder email ✅

---

## Module 6 — Patient Alert Summary

### TC-ALERT-001 — Summary Includes Critical Fields
- 🏥 **Preconditions:** Medical profile set with bloodType, allergies, conditions
- **Input:** Create emergency
- **Expected:** `voiceSummary` contains patient name, blood type, allergies, chronic conditions ✅

### TC-ALERT-002 — DEAF Flag in Summary
- 🏥 **Preconditions:** `patientType: "DEAF"` set
- **Input:** Create emergency
- **Expected:** `voiceSummary` contains "DEAF" or "MUTE" flag ✅

### TC-ALERT-003 — Summary with Empty Profile
- 🏥 **Preconditions:** Patient has no medical profile
- **Input:** Create emergency
- **Expected:** Emergency created successfully, `voiceSummary` is basic / empty string ✅

---

## Module 7 — Live Tracking & Navigation

### TC-TRACK-001 — Responder Submits Location Update (HTTP)
- 🚑 **Input:** `POST /api/tracking` `{ emergencyId, latitude: 31.522, longitude: 74.360, status: "EN_ROUTE" }`
- **Expected:** HTTP 200, ETA calculated and returned ✅

### TC-TRACK-002 — Location Update via Socket
- 🚑 **Input:** Socket emit `update_location` `{ emergencyId, latitude, longitude, status: "ARRIVED" }`
- **Expected:** Server emits `LOCATION_UPDATE` to emergency room with `estimatedArrivalMinutes: 0` ✅

### TC-TRACK-003 — Coordinates Outside Pakistan Rejected (HTTP)
- 🚑 **Input:** `POST /api/responders/location` with `latitude: 25.2, longitude: 55.3` (Dubai)
- **Expected:** HTTP 422, bounds error ❌

### TC-TRACK-004 — Coordinates Outside Pakistan Rejected (Socket)
- 🚑 **Input:** Socket `update_location` with Dubai coordinates
- **Expected:** Server logs warning, no DB write, no broadcast ❌

### TC-TRACK-005 — ETA Decreases as Responder Approaches
- 🚑 **Input:** Two sequential location updates moving closer to patient
- **Expected:** Second response has lower `estimatedArrivalMinutes` ✅

### TC-TRACK-006 — Patient Receives LOCATION_UPDATE Event
- 🏥 **Preconditions:** Patient joined `location:{emergencyId}` room
- **Input:** Responder submits location
- **Expected:** Patient socket receives `LOCATION_UPDATE` with coordinates + ETA ✅

### TC-TRACK-007 — Get Tracking History
- 🔐 **Input:** `GET /api/tracking/:emergencyId`
- **Expected:** Ordered array of all tracking points ✅

### TC-TRACK-008 — Get Latest Tracking
- 🔐 **Input:** `GET /api/tracking/:emergencyId/latest`
- **Expected:** Single most-recent tracking record ✅

---

## Module 8 — Caregiver Monitoring & Linking

### TC-CG-001 — Send Caregiver Invitation
- 🏥 **Input:** `POST /api/caregivers/link` `{ targetEmail: "carer@example.com", relationship: "Spouse" }`
- **Expected:** HTTP 200, invitation created with PENDING status ✅

### TC-CG-002 — Invitation to Non-Existent Email
- 🏥 **Input:** Email not in system
- **Expected:** HTTP 404, "User not found" ❌

### TC-CG-003 — Duplicate Link Attempt
- 🏥 **Input:** Same caregiver-patient pair, link already exists
- **Expected:** HTTP 409, "Link already exists" ❌

### TC-CG-004 — Caregiver Accepts Invitation
- 👤 **Input:** `POST /api/caregivers/invitations/:targetId/respond` `{ accepted: true }`
- **Expected:** HTTP 200, link status → ACCEPTED ✅

### TC-CG-005 — Caregiver Rejects Invitation
- 👤 **Input:** Same as above `{ accepted: false }`
- **Expected:** HTTP 200, link status → REJECTED ✅

### TC-CG-006 — View Pending Invitations
- 👤 **Input:** `GET /api/caregivers/invitations`
- **Expected:** HTTP 200, array of PENDING links ✅

### TC-CG-007 — Caregiver Notified when Patient Triggers SOS
- 👤 **Preconditions:** Active caregiver link
- **Input:** Patient creates emergency
- **Expected:** Caregiver receives Socket.io `notification` event with emergency details ✅

### TC-CG-008 — Unlink Caregiver
- 🏥 **Input:** `DELETE /api/caregivers/:caregiverId`
- **Expected:** HTTP 200, link removed ✅

### TC-CG-009 — Resend Invitation
- 👤 **Input:** `POST /api/caregivers/links/:patientId/resend`
- **Expected:** HTTP 200, invitation resent ✅

---

## Module 9 — Admin Dashboard & Control

### TC-ADMIN-001 — Get Dashboard Statistics
- 👑 **Input:** `GET /api/admin/stats`
- **Expected:** HTTP 200, counts for all user roles + emergency summary ✅

### TC-ADMIN-002 — Non-Admin Cannot Access Admin Routes
- 🏥 **Input:** `GET /api/admin/stats`
- **Expected:** HTTP 403 ❌

### TC-ADMIN-003 — List All Users with Role Filter
- 👑 **Input:** `GET /api/admin/users?role=RESPONDER`
- **Expected:** HTTP 200, only responders returned ✅

### TC-ADMIN-004 — Deactivate User
- 👑 **Input:** `PATCH /api/admin/users/:id/deactivate`
- **Expected:** HTTP 200, user `isActive: false`, cannot login ✅

### TC-ADMIN-005 — Reactivate User
- 👑 **Input:** `PATCH /api/admin/users/:id/activate`
- **Expected:** HTTP 200, user `isActive: true`, can login ✅

### TC-ADMIN-006 — Permanently Delete User
- 👑 **Input:** `DELETE /api/admin/users/:id`
- **Expected:** HTTP 200, user and all related data deleted ✅

### TC-ADMIN-007 — View Audit Logs
- 👑 **Input:** `GET /api/admin/logs`
- **Expected:** HTTP 200, array of `AuditLog` records ✅

### TC-ADMIN-008 — View Pending Responders
- 👑 **Input:** `GET /api/admin/responders/pending`
- **Expected:** HTTP 200, responders with `verificationStatus: "PENDING"` ✅

### TC-ADMIN-009 — Generate AI Notification Draft
- 👑 **Input:** `POST /api/admin/generate-draft` `{ prompt: "System downtime Sunday" }`
- **Expected:** HTTP 200, `{ title, body }` from Gemini AI ✅

### TC-ADMIN-010 — Broadcast Notification to All Patients
- 👑 **Input:** `POST /api/notifications/broadcast` `{ targetGroup: "ALL_PATIENTS", title, body }`
- **Expected:** HTTP 200, notification sent to all active patients ✅

### TC-ADMIN-011 — View System Health
- 👑 **Input:** `GET /api/admin/health`
- **Expected:** HTTP 200, DB status, socket connections, uptime, memory ✅

### TC-ADMIN-012 — HIPAA Audit Log on PHI Access
- 👑 **Preconditions:** Admin accesses emergency detail
- **Input:** `GET /api/emergencies/:id`
- **Expected:** `AuditLog` record created with `action: "ACCESS_PHI"` ✅

---

## Module 10 — Multi-User Chat

### TC-CHAT-001 — Create Caregiver-Patient Room
- 🔐 **Input:** `POST /api/chat/rooms` `{ targetUserId: "<patientId>" }`
- **Expected:** HTTP 200, room with `roomType: "CAREGIVER_PATIENT"` ✅

### TC-CHAT-002 — Idempotent Room Creation
- 🔐 **Input:** Same room creation request twice
- **Expected:** Same room ID returned both times ✅

### TC-CHAT-003 — Create Emergency Chat Room
- 🔐 **Input:** `POST /api/chat/rooms` `{ targetUserId, emergencyId }`
- **Expected:** HTTP 200, room with `roomType: "EMERGENCY_RESPONDER"` ✅

### TC-CHAT-004 — Send Text Message
- 🔐 **Input:** `POST /api/chat/messages` `{ roomId, content: "Hello", messageType: "TEXT" }`
- **Expected:** HTTP 201, message created, Socket.io `message:new` emitted ✅

### TC-CHAT-005 — Recipient Receives Push Notification (not email)
- 🔐 **Preconditions:** Recipient has valid FCM token
- **Input:** Send message
- **Expected:** Recipient receives PUSH + IN_APP notification; NO email notification ✅

### TC-CHAT-006 — Access Denied to Non-Member Room
- 🔐 **Input:** `GET /api/chat/messages/:roomId` (user not a member)
- **Expected:** HTTP 403, "Access denied to this chat room" ❌

### TC-CHAT-007 — Get All User Rooms
- 🔐 **Input:** `GET /api/chat/rooms`
- **Expected:** HTTP 200, rooms where user is patient/caregiver/responder, each with last message ✅

### TC-CHAT-008 — Upload Chat File
- 🔐 **Input:** `POST /api/chat/upload` multipart image file
- **Expected:** HTTP 200, `{ url, filename, mimetype, size }` ✅

### TC-CHAT-009 — Get Room Messages
- 🔐 **Input:** `GET /api/chat/messages/:roomId`
- **Expected:** HTTP 200, up to 100 messages ordered by createdAt ASC ✅

---

## Module 11 — Notification System

### TC-NOTIF-001 — Get Notification History
- 🔐 **Input:** `GET /api/notifications/history`
- **Expected:** HTTP 200, array of past notifications ✅

### TC-NOTIF-002 — Mark Single Notification as Read
- 🔐 **Input:** `PATCH /api/notifications/:id/read`
- **Expected:** HTTP 200, `isRead: true` ✅

### TC-NOTIF-003 — Mark All Notifications as Read
- 🔐 **Input:** `PATCH /api/notifications/read-all`
- **Expected:** HTTP 200, all `isRead: true`, `count` returned ✅

### TC-NOTIF-004 — Stale FCM Token Auto-Cleanup
- **Preconditions:** User has an expired FCM token in their array
- **Input:** Send any notification to that user
- **Expected:** Stale token removed from DB after send attempt, log shows cleanup ✅

### TC-NOTIF-005 — Max 5 FCM Tokens per User
- **Input:** Register 6 different FCM tokens for same user
- **Expected:** Only most recent 5 kept ✅

### TC-NOTIF-006 — Admin Broadcast History
- 👑 **Input:** `GET /api/notifications/admin-history`
- **Expected:** HTTP 200, array of broadcasts sent by admins ✅

---

## Module 12 — Subscription Management

### TC-SUB-001 — Upgrade to PROFESSIONAL
- 🏥 **Input:** `PATCH /api/users/upgrade` `{ plan: "PROFESSIONAL" }`
- **Expected:** HTTP 200, `subscriptionPlan: "PROFESSIONAL"` ✅

### TC-SUB-002 — Upgrade to EXECUTIVE
- 🏥 **Input:** `{ plan: "EXECUTIVE" }`
- **Expected:** HTTP 200, plan updated ✅

### TC-SUB-003 — Downgrade to FREE
- 🏥 **Input:** `{ plan: "FREE" }`
- **Expected:** HTTP 200, plan downgraded ✅

### TC-SUB-004 — Responder Cannot Upgrade Plan
- 🚑 **Input:** `PATCH /api/users/upgrade` `{ plan: "PROFESSIONAL" }`
- **Expected:** HTTP 403, "Only Patients can upgrade plans" ❌

### TC-SUB-005 — Invalid Plan Name
- 🏥 **Input:** `{ plan: "GOLD" }`
- **Expected:** HTTP 400, "Invalid plan name" ❌

---

## Security & Cross-Cutting Test Cases

### TC-SEC-001 — SQL Injection Attempt
- **Input:** `email: "' OR 1=1 --"` in login
- **Expected:** HTTP 401 (Prisma parameterises queries) ✅

### TC-SEC-002 — XSS Payload in Profile
- **Input:** `fullName: "<script>alert(1)</script>"`
- **Expected:** Data stored as raw string; API returns escaped in JSON ✅

### TC-SEC-003 — Expired Access Token Rejected
- **Input:** Access token with `exp` in the past
- **Expected:** HTTP 401, "Token expired" ❌

### TC-SEC-004 — Token for Wrong Environment
- **Input:** Token signed with different JWT_SECRET
- **Expected:** HTTP 401 ❌

### TC-SEC-005 — Role Escalation Attempt
- 🏥 **Input:** Manually craft JWT with `role: "ADMIN"`
- **Expected:** HTTP 401 (signature invalid) ❌

### TC-SEC-006 — Patient Self-Delete
- 🏥 **Input:** `DELETE /api/users/me`
- **Expected:** HTTP 200, account deleted, subsequent login fails ✅

### TC-SEC-007 — Admin Cannot Self-Delete
- 👑 **Input:** `DELETE /api/users/me`
- **Expected:** HTTP 403, "Admin accounts cannot be self-deleted" ❌

### TC-SEC-008 — Audit Log Created for PHI Access
- 👑 **Preconditions:** RESPONDER or ADMIN accesses emergency with PHI
- **Input:** `GET /api/emergencies/:id`
- **Expected:** `AuditLog` record in DB with `action: ACCESS_PHI` ✅

---

## End-to-End Flow Test Cases

### TC-E2E-001 — Full Emergency Lifecycle
1. Patient registers + verifies email ✅
2. Patient creates medical profile ✅
3. Patient triggers SOS (`POST /api/emergencies`) ✅
4. System notifies nearby responders ✅
5. Responder accepts (`POST /responders/emergencies/:id/accept`) ✅
6. All other responders notified — assigned to another (`EMERGENCY_ASSIGNED` event) ✅
7. Responder broadcasts location updates, patient sees ETA ✅
8. Responder marks as ARRIVED, then RESOLVED ✅
9. Patient rates responder ✅
10. Caregiver received all status updates in real-time ✅

### TC-E2E-002 — False Alarm (Cancel within Window)
1. Patient triggers SOS ✅
2. Patient cancels within 60 seconds ✅
3. No responders dispatched, or those notified are silenced ✅
4. Emergency status → CANCELLED ✅

### TC-E2E-003 — Responder Verification Flow
1. Responder registers ✅
2. Admin views pending responders ✅
3. Admin approves → OTP sent to responder email ✅
4. Responder enters OTP → account activated ✅
5. Responder toggles availability ON ✅
6. Responder starts receiving nearby emergencies ✅

### TC-E2E-004 — Caregiver Monitoring Flow
1. Patient registers and links caregiver ✅
2. Caregiver accepts invitation ✅
3. Patient triggers SOS ✅
4. Caregiver receives real-time notification ✅
5. Caregiver monitors live responder location via chat room ✅

### TC-E2E-005 — Forgot Password Recovery Flow
1. Patient initiates forgot password ✅
2. OTP received via email ✅
3. Patient enters OTP on reset screen ✅
4. Patient sets new password ✅
5. Patient logs in with new password ✅
6. Old password no longer works ✅
