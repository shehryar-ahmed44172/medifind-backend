# 📋 MODULE 1 (AUTHENTICATION) - COMPLETE IMPLEMENTATION PLAN

**Status:** Week 1 is 90% done. This plan completes remaining 10% for production-ready authentication.

**Target:** By end of today, Module 1 will be 100% feature-complete with all functional requirements.

---

## ✅ **WHAT'S ALREADY DONE (Week 1)**

```
✅ User registration (FR1.1)
✅ User login (FR1.2)
✅ JWT token generation (24h access, 30d refresh) (FR1.3)
✅ Token refresh (FR1.4)
✅ User logout & token revocation (FR1.5)
✅ Role-based access control (4 roles: PATIENT, RESPONDER, CAREGIVER, ADMIN) (FR1.6)
✅ Database schema (users + refresh_tokens tables)
✅ Password hashing (bcryptjs)
✅ 14 unit tests (all passing)
✅ TypeScript strict mode
✅ GitHub commit done
```

---

## ⏳ **WHAT'S REMAINING (10% - COMPLETION ITEMS)**

### **Missing Functional Requirements:**

#### **1. Password Reset (FR1.7) - IMPORTANT**
```
Current: None
Needed: 
- Generate password reset token (short-lived: 30 minutes)
- Send reset link via email
- Validate token & update password
- Prevent reuse of old passwords
- Audit log for security
```

#### **2. Admin User Management (FR1.8) - OPTIONAL for MVP**
```
Current: None
Needed:
- List all users (admin only)
- View user details (admin only)
- Deactivate/reactivate users
- Reset user's password (admin action)
- View login history
```

#### **3. Security Enhancements (FR1.6 Enhancement)**
```
Current: Basic role checking
Needed:
- Rate limiting on login attempts (prevent brute force)
- Account lockout after 5 failed attempts
- Email verification before activation
- Two-factor authentication setup (OPTIONAL - Phase 2)
```

#### **4. Session Management**
```
Current: Token-based only
Needed:
- Track active sessions per user
- Logout all other sessions (logout from all devices)
- Session timeout on inactivity (optional)
```

#### **5. Comprehensive API Response Standards**
```
Current: Basic success/error
Needed:
- Consistent error codes
- Detailed error messages
- Rate limit info in headers
- Session info in response
```

---

## 🎯 **IMPLEMENTATION ROADMAP - TODAY**

### **PHASE A: Password Reset (MANDATORY - 30 mins)**
```
Files to create:
1. src/types/passwordReset.ts (types for reset flow)
2. src/utils/tokenUtils.ts (generate reset tokens)
3. src/repositories/passwordResetRepository.ts (store reset tokens)
4. src/services/passwordReset.ts (reset logic)
5. src/controllers/password/index.ts (API handlers)
6. src/routes/password.ts (endpoints)
7. tests/unit/auth/password-reset.test.ts (tests)

Endpoints to add:
- POST /api/password/forgot-password → Send reset email
- POST /api/password/reset → Reset password with token
- POST /api/password/change-password → Change password (logged in)

Database changes:
- Add password_reset_tokens table with TTL
```

### **PHASE B: Admin User Management (IMPORTANT - 30 mins)**
```
Files to create:
1. src/controllers/admin/index.ts (admin endpoints)
2. src/services/admin.ts (admin logic)
3. src/routes/admin.ts (admin routes)
4. tests/unit/admin/admin.test.ts (tests)

Endpoints to add:
- GET /api/admin/users → List all users (admin only)
- GET /api/admin/users/:id → User details
- PUT /api/admin/users/:id/status → Deactivate/activate
- POST /api/admin/users/:id/reset-password → Force password reset
- GET /api/admin/users/:id/login-history → View logins
```

### **PHASE C: Security Enhancements (CRITICAL - 20 mins)**
```
Files to modify/create:
1. src/middleware/rateLimitMiddleware.ts (new - login rate limiting)
2. src/repositories/userRepository.ts (add failed attempt tracking)
3. src/services/auth.ts (add login attempt logic)
4. src/types/user.ts (add failed_login_attempts field)

Changes:
- Add failed_login_attempts field to users table
- Add last_failed_login_at field
- Increment on failed login
- Reset on successful login
- Block after 5 failures for 30 minutes
```

### **PHASE D: Session Management (NICE-TO-HAVE - 20 mins)**
```
Files to create:
1. src/repositories/sessionRepository.ts (track active sessions)
2. src/types/session.ts (session types)
3. src/services/session.ts (session logic)

Endpoints to add:
- GET /api/auth/sessions → List user's active sessions
- DELETE /api/auth/sessions/:id → Logout specific session
- DELETE /api/auth/sessions → Logout all sessions
```

### **PHASE E: API Response Standards (DOCUMENTATION - 10 mins)**
```
Files to modify:
1. src/utils/response.ts (enhance response format)
2. src/types/response.ts (define response types)

Changes:
- Add error code system
- Add request ID tracking
- Add rate limit headers
- Add pagination support
```

---

## 📊 **COMPLETION CHECKLIST**

### **Critical (Must Have)**
- [ ] Password reset (forgot password, reset, change)
- [ ] Rate limiting (prevent brute force)
- [ ] Account lockout (after 5 failed attempts)
- [ ] Email verification (optional: can skip initial)
- [ ] Error codes and standardized responses

### **Important (Should Have)**
- [ ] Admin user management
- [ ] Session tracking
- [ ] Login history
- [ ] Account status (active/inactive)

### **Nice-to-Have (Can Wait for Phase 2)**
- [ ] Two-factor authentication
- [ ] Biometric login
- [ ] OAuth integration
- [ ] API key auth for apps

---

## 🔐 **DATA SCHEMA UPDATES NEEDED**

### **Add to `prisma/schema.prisma`:**

```prisma
model PasswordReset {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash     String    @unique  // Hashed for security
  expiresAt     DateTime
  usedAt        DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId])
  @@index([expiresAt])
}

model Session {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userAgent     String?   // Browser/device info
  ipAddress     String?
  lastActivityAt DateTime @default(now())
  expiresAt     DateTime
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId])
  @@index([expiresAt])
}

// Update User model to add:
model User {
  // ... existing fields ...
  
  isActive              Boolean   @default(true)       // For account deactivation
  isEmailVerified       Boolean   @default(false)      // Email verification
  failedLoginAttempts   Int       @default(0)
  lastFailedLoginAt     DateTime?
  accountLockedUntil    DateTime? // Lockout time
  lastLoginAt           DateTime?
  lastLoginIp           String?
  
  // Relations
  passwordResets        PasswordReset[]
  sessions              Session[]
}
```

---

## 🚀 **ESTIMATED TIME BREAKDOWN**

| Phase | Task | Time | Priority |
|-------|------|------|----------|
| A | Password Reset | 30 mins | 🔴 CRITICAL |
| B | Admin Management | 30 mins | 🟠 IMPORTANT |
| C | Security Enhancements | 20 mins | 🔴 CRITICAL |
| D | Session Management | 20 mins | 🟡 NICE-TO-HAVE |
| E | Response Standards | 10 mins | 🟡 NICE-TO-HAVE |
| | **DATABASE MIGRATION** | 10 mins | 🔴 REQUIRED |
| | **TESTING** | 30 mins | 🟠 IMPORTANT |
| | **DOCUMENTATION** | 15 mins | 🟡 NICE-TO-HAVE |
| | **COMMIT** | 5 mins | 🔴 REQUIRED |
| | | | |
| | **TOTAL: SUCCESS CRITERIA** | **~3 hours** | ✅ |

---

## ✨ **SUCCESS CRITERIA - Module 1 COMPLETE**

```
✅ All 5 endpoints working (Register, Login, Refresh, Logout, Profile)
✅ Password reset flow (3 new endpoints)
✅ Admin endpoints (5 new endpoints)
✅ Rate limiting (prevent brute force)
✅ Account lockout (after 5 failed attempts)
✅ Session management (3 new endpoints)
✅ Error codes + standardized responses
✅ Database migrations applied
✅ 30+ unit tests (all passing)
✅ TypeScript strict mode
✅ GitHub commit with all changes

TOTAL NEW ENDPOINTS: 16 (was 5, now 21)
TOTAL TABLES: 12 (was 10, add password_reset + session)
TOTAL MODULE 1 FILES: 25+ TypeScript files
```

---

## 🎯 **SHOULD WE PROCEED?**

**Option 1: QUICK (2 hours) - Critical Only**
```
✅ Password Reset (FR1.7)
✅ Rate Limiting & Account Lockout
✅ Standardized Error Responses
⏳ Skip: Admin Management, Session Tracking (Phase 2)
Result: Module 1 = 95% complete
```

**Option 2: COMPLETE (3+ hours) - Full Module 1**
```
✅ Password Reset (FR1.7)
✅ Admin User Management (FR1.8)
✅ Rate Limiting & Account Lockout
✅ Session Management
✅ Standardized Error Responses
✅ Comprehensive Testing
Result: Module 1 = 100% complete, production-ready
```

**Which option do you prefer?**

Or should I ask clarification:
- Do you want QUICK (password reset only)?
- Do you want COMPLETE (everything)?
- Or do you want to move to MODULE 2 (Medical Profile) instead?

Let me know and I'll execute immediately! 🚀
