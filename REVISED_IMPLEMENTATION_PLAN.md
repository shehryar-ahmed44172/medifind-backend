# MediFind Backend - Revised Implementation Plan
## Based on Backend Engineers Guide (Detailed Specifications)

**Document Version:** 2.0  
**Date:** March 10, 2026  
**Status:** Aligned with Backend Engineers Guide  
**Realistic Timeline:** 5-6 weeks for production-ready MVP

---

## 📊 KEY FINDINGS FROM BACKEND ENGINEERS GUIDE

### What Changed from Initial Plan

| Aspect | Initial Plan | Backend Guide | Updated Plan |
|--------|--------------|--------------|-------------|
| Tech Stack | Node.js + Express | Node.js/Express (alternative), recommended ASP.NET | Keeping Node.js/Express |
| Tables | 9 tables | 8 core tables + emergency_requests + emergency_tracking | 10 tables |
| API Endpoints | 26 endpoints | 17+ endpoints | 20+ endpoints (reconciled) |
| Token Strategy | Access only | Access + Refresh tokens | Must implement both |
| Cancellation Window | Not specified | 10 seconds (CRITICAL) | Add to emergency system |
| External Services | Basic | Twilio SMS, SendGrid Email, Azure Blob | Must integrate |
| WebSocket Messages | Generic | Specific types (9 types defined) | Must follow format |
| Geographic Queries | PostGIS mentioned | Detailed PostGIS queries | Must use PostGIS |

---

## 🗄️ CORRECTED DATABASE SCHEMA (10 Tables)

### Table 1: Users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,  -- 'PATIENT', 'RESPONDER', 'CAREGIVER', 'ADMIN'
    profile_image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);
```

### Table 2: Medical Profiles
```sql
CREATE TABLE medical_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    blood_group VARCHAR(5),  -- 'O+', 'A-', 'B+', 'AB-', etc.
    allergies TEXT[],  -- Array: ['Penicillin', 'Lactose']
    chronic_diseases TEXT[],  -- Array: ['Diabetes', 'Asthma']
    medications TEXT[],  -- Array: ['Metformin 500mg', 'Adrenaline Pen']
    disabilities TEXT[],  -- Array: ['Wheelchair-bound']
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    medical_history TEXT,
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_medical_profiles_user ON medical_profiles(user_id);
```

### Table 3: Emergencies (Modified)
```sql
CREATE TABLE emergencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emergency_type VARCHAR(50) NOT NULL,  -- 'CARDIAC', 'RESPIRATORY', 'TRAUMA', etc.
    status VARCHAR(50) DEFAULT 'ACTIVE',  -- 'ACTIVE', 'RESOLVED', 'CANCELLED'
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    additional_info TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    cancellation_deadline TIMESTAMP  -- created_at + 10 seconds
);

CREATE INDEX idx_emergencies_patient ON emergencies(patient_id);
CREATE INDEX idx_emergencies_status ON emergencies(status);
CREATE INDEX idx_emergencies_created ON emergencies(created_at DESC);
```

### Table 4: Responders (New)
```sql
CREATE TABLE responders (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    specialization TEXT[],  -- ['EMT', 'Paramedic']
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    is_available BOOLEAN DEFAULT true,
    average_response_time INTEGER,  -- seconds
    total_responses_handled INTEGER DEFAULT 0,
    rating DECIMAL(3, 2),  -- 0.00 to 5.00
    last_location_update TIMESTAMP
);

CREATE INDEX idx_responders_available ON responders(is_available);
```

### Table 5: Emergency Requests (CRITICAL - NEW)
```sql
CREATE TABLE emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES responders(id),
    request_status VARCHAR(50) DEFAULT 'PENDING',  -- 'PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED'
    distance_km DECIMAL(5, 2),
    estimated_arrival_minutes INTEGER,
    sent_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP,
    completed_at TIMESTAMP,
    rejection_reason TEXT,
    
    UNIQUE(emergency_id, responder_id)
);

CREATE INDEX idx_emergency_requests_emergency ON emergency_requests(emergency_id);
CREATE INDEX idx_emergency_requests_responder ON emergency_requests(responder_id);
CREATE INDEX idx_emergency_requests_status ON emergency_requests(request_status);
```

### Table 6: Emergency Tracking (NEW)
```sql
CREATE TABLE emergency_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    responder_id UUID REFERENCES responders(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(50),  -- 'EN_ROUTE', 'ARRIVED', 'TREATING', 'TRANSPORTED'
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tracking_emergency ON emergency_tracking(emergency_id);
CREATE INDEX idx_tracking_timestamp ON emergency_tracking(timestamp DESC);
```

### Table 7: Caregivers
```sql
CREATE TABLE caregivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship VARCHAR(50),  -- 'PARENT', 'SIBLING', 'SPOUSE', 'FRIEND'
    joined_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(patient_id, caregiver_id)
);

CREATE INDEX idx_caregivers_patient ON caregivers(patient_id);
CREATE INDEX idx_caregivers_caregiver ON caregivers(caregiver_id);
```

### Table 8: Medical Reports
```sql
CREATE TABLE medical_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,  -- Azure Blob Storage URL
    report_type VARCHAR(50),  -- 'LAB', 'IMAGING', 'PRESCRIPTION'
    uploaded_at TIMESTAMP DEFAULT NOW(),
    file_size_bytes INTEGER
);

CREATE INDEX idx_medical_reports_patient ON medical_reports(patient_id);
```

### Table 9: Refresh Tokens (NEW - SECURITY)
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
```

### Table 10: Audit Logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
```

---

## 📋 COMPLETE API ENDPOINT SPECIFICATION (20+ Endpoints)

### Auth Endpoints (4)
```
POST   /api/auth/register              Register new user
POST   /api/auth/login                 Login user
POST   /api/auth/refresh-token         Refresh JWT token
POST   /api/auth/forgot-password       Request password reset
```

### User Endpoints (3)
```
GET    /api/users/{userId}             Get user profile
PUT    /api/users/{userId}             Update user profile
POST   /api/auth/logout                Logout user (revoke tokens)
```

### Medical Profile Endpoints (2)
```
GET    /api/medical-profiles/{userId}  Get medical profile
PUT    /api/medical-profiles/{userId}  Update medical profile
```

### Emergency Endpoints (6)
```
POST   /api/emergencies                Create emergency (SOS)
GET    /api/emergencies/{emergencyId}  Get emergency details
POST   /api/emergencies/{id}/cancel    Cancel emergency (within 10s)
GET    /api/emergencies?status=ACTIVE  List active emergencies
GET    /api/emergencies/history        Get user's emergency history
PATCH  /api/emergencies/{id}/status    Update emergency status
```

### Responder Endpoints (5)
```
GET    /api/responders/nearby-emergencies  Get emergencies within radius
POST   /api/emergency-requests/{id}/accept Accept emergency request
POST   /api/emergency-requests/{id}/reject Reject emergency request
GET    /api/responders/{id}/stats          Get responder statistics
PUT    /api/responders/{id}/availability   Update availability status
```

### Tracking Endpoints (2)
```
PUT    /api/emergency-tracking/{emergencyId}  Update responder location
GET    /api/emergency-tracking/{emergencyId}  Get location history
```

### Medical Reports Endpoints (2)
```
GET    /api/medical-reports/{userId}   Get user's medical reports
POST   /api/medical-reports/upload     Upload medical report
```

### Caregiver Endpoints (2)
```
POST   /api/caregivers                 Link caregiver to patient
GET    /api/caregivers/my-patients     Get caregiver's patients
```

---

## 🔐 AUTHENTICATION STRATEGY (Revised)

### Tokens Required

**1. Access Token (JWT)**
- Duration: 24 hours
- Used for API authentication
- Sent in every request: `Authorization: Bearer <token>`
- Payload: `{ sub, email, role, iat, exp }`

**2. Refresh Token**
- Duration: 30 days (long-lived)
- Stored in database (hashed)
- Used to get new access token
- Stores in device's secure storage

### Refresh Token Flow

```
User Login
  ↓
Issue access_token (24h) + refresh_token (30d)
  ↓
App stores refresh_token in secure storage
  ↓
Access token expires after 24h
  ↓
App calls POST /api/auth/refresh-token with refresh_token
  ↓
Backend validates refresh_token from database
  ↓
Return new access_token + new refresh_token
  ↓
If refresh_token expired → redirect to login
```

### Implementation Requirements

- Use bcryptjs with salt rounds ≥ 10 for passwords
- Hash refresh tokens before storing in DB
- Implement token revocation on logout
- Rate limit login attempts (5 attempts per 15 minutes)

---

## 🚨 CRITICAL FEATURES FROM GUIDE

### 1. 10-Second SOS Cancellation Window

**When emergency is created:**
```
POST /api/emergencies
  ↓
Backend creates Emergency record
  ↓
Sets cancellation_deadline = NOW() + 10 seconds
  ↓
App sends back emergencyId + cancellationDeadline
  ↓
App shows countdown timer (10 seconds)
  ↓
If user taps "Cancel" within 10 seconds:
   → POST /api/emergencies/{id}/cancel (succeeds)
  ↓
If 10 seconds passes:
   → POST /api/emergencies/{id}/cancel (returns 400 - expired)
   → Sends WebSocket notifications to responders
```

**Important:** This is CRITICAL for UX. Don't miss it.

### 2. Responder Assignment Algorithm (PostGIS)

```sql
-- Find responders within 5km, sorted by distance
SELECT 
    r.id, r.full_name, r.specialization,
    earth_distance(
        ll_to_earth(r.current_latitude, r.current_longitude),
        ll_to_earth($1::float8, $2::float8)
    ) / 1000 as distance_km
FROM responders r
WHERE r.is_available = true
AND earth_distance(
    ll_to_earth(r.current_latitude, r.current_longitude),
    ll_to_earth($1::float8, $2::float8)
) < 5000  -- 5000 meters
ORDER BY distance_km ASC
LIMIT 10;
```

Must enable PostGIS extension on PostgreSQL:
```sql
CREATE EXTENSION postgis;
```

### 3. WebSocket Message Types

**Type 1: Emergency Alert (Server → Responder)**
```json
{
  "type": "EMERGENCY_ALERT",
  "data": {
    "emergencyId": "uuid",
    "emergencyType": "CARDIAC",
    "patientName": "Patient Name",
    "latitude": 33.6844,
    "longitude": 73.0479,
    "distanceKm": 2.5,
    "estimatedArrivalMinutes": 5,
    "messageExpiry": 60
  }
}
```

**Type 2: Location Update (Server → Patient/Caregiver)**
```json
{
  "type": "LOCATION_UPDATE",
  "data": {
    "emergencyId": "uuid",
    "responderId": "uuid",
    "responderName": "Responder Name",
    "latitude": 33.6850,
    "longitude": 73.0485,
    "status": "EN_ROUTE",
    "estimatedArrivalMinutes": 3
  }
}
```

**Type 3: Status Change (Server → All)**
```json
{
  "type": "EMERGENCY_STATUS_CHANGE",
  "data": {
    "emergencyId": "uuid",
    "newStatus": "RESOLVED",
    "timestamp": "2026-03-10T10:45:00Z"
  }
}
```

**Type 4: Subscribe (Client → Server)**
```json
{
  "type": "SUBSCRIBE",
  "data": {
    "emergencyId": "uuid"
  }
}
```

### 4. External Integrations Required

**Twilio SMS (Fallback emergency alerts)**
```
When app notification fails, send SMS
Configuration: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
```

**SendGrid Email (Password resets, alerts)**
```
When user requests password reset, send email
Configuration: SENDGRID_API_KEY
```

**Azure Blob Storage (Medical reports)**
```
Store uploaded medical files
Return signed URLs to app
Configuration: AZURE_STORAGE_CONNECTION_STRING
```

---

## 📅 REVISED 5-WEEK IMPLEMENTATION PLAN

### WEEK 1: Foundation & Authentication (Days 1-5)

**Day 1-2: Setup**
- [ ] PostgreSQL with PostGIS extension
- [ ] Node.js project structure
- [ ] Prisma schema setup
- [ ] Environment configuration

**Day 3-5: Authentication**
- [ ] User registration endpoint with validation
- [ ] User login with access + refresh tokens
- [ ] Token refresh endpoint
- [ ] Password hashing with bcryptjs
- [ ] Auth middleware for protected routes
- [ ] Unit tests for auth service

**Deliverable:** Working auth with JWT + Refresh tokens ✅

---

### WEEK 2: Core APIs & Data Management (Days 6-10)

**Day 6-7: User & Medical Profiles**
- [ ] Get/Update user profile
- [ ] Create/Update medical profile endpoints
- [ ] Role-based access control middleware
- [ ] Medical data validation

**Day 8-10: Emergency Creation**
- [ ] POST /api/emergencies endpoint
- [ ] Cancellation deadline logic (10 second window)
- [ ] POST /api/emergencies/{id}/cancel endpoint
- [ ] Emergency retrieval endpoints
- [ ] Integration tests

**Deliverable:** Emergency creation + 10-second cancellation window ✅

---

### WEEK 3: Responder System & Real-Time (Days 11-15)

**Day 11-12: Responder Assignment**
- [ ] Update responder location endpoint
- [ ] PostGIS geospatial queries
- [ ] Nearest responder algorithm
- [ ] Create emergency_requests table logic
- [ ] Accept/Reject endpoints for responders

**Day 13-15: WebSocket Real-Time**
- [ ] Socket.io setup with 4 message types
- [ ] Emergency alert broadcasting
- [ ] Location update broadcasting
- [ ] Status change broadcasting
- [ ] Connection management & room subscriptions

**Deliverable:** Complete responder assignment + real-time tracking ✅

---

### WEEK 4: Additional Features & Testing (Days 16-19)

**Day 16: External Integrations**
- [ ] Twilio SMS service integration
- [ ] SendGrid email integration
- [ ] Azure Blob Storage for medical reports

**Day 17-18: Testing**
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests for all APIs
- [ ] WebSocket connection tests
- [ ] Load testing (simulate 50+ users)

**Day 19: Documentation & Code Review**
- [ ] Swagger/OpenAPI documentation
- [ ] Code review of all modules
- [ ] Performance tuning

**Deliverable:** Well-tested, documented backend ✅

---

### WEEK 5: Deployment & Team Testing (Days 20-22)

**Day 20-21: Deployment**
- [ ] Docker containerization
- [ ] Environment configuration for production
- [ ] Database setup on server
- [ ] SSL/HTTPS configuration

**Day 22: Team Testing & Handoff**
- [ ] Mobile app team begins testing
- [ ] Bug fixes based on feedback
- [ ] Production monitoring setup

**Deliverable:** Production-ready backend deployed ✅

---

## 🎯 DEVELOPMENT PRIORITY

### Must-Have (Week 1-3, Non-negotiable)
1. ✅ Authentication with JWT + Refresh tokens
2. ✅ Emergency creation with 10-second cancel window
3. ✅ PostGIS responder geospatial queries
4. ✅ WebSocket message broadcasting
5. ✅ Emergency request accept/reject

### Should-Have (Week 4, High Priority)
1. Medical profile CRUD
2. Location tracking storage
3. Caregiver features
4. SMS/Email integrations
5. Comprehensive testing

### Nice-to-Have (Post-MVP)
1. Advanced analytics
2. Admin dashboard
3. Voice notifications
4. Performance optimization
5. Scalability improvements

---

## ⚠️ CRITICAL IMPLEMENTATION NOTES

### 1. Emergency Cancellation (DO NOT MISS)
```javascript
// When emergency created:
const emergency = await Emergency.create({
    patientId,
    status: 'ACTIVE',
    latitude, longitude,
    cancellation_deadline: new Date(Date.now() + 10000)  // 10 seconds!
});

// When cancel requested:
if (new Date() > emergency.cancellation_deadline) {
    throw new Error('Cancellation period expired');
}
```

### 2. PostGIS Setup (REQUIRED for geo-queries)
```bash
# In PostgreSQL:
CREATE EXTENSION IF NOT EXISTS postgis;

# Test geospatial query:
SELECT earth_distance(
    ll_to_earth(33.6844, 73.0479),
    ll_to_earth(33.6850, 73.0485)
) / 1000;  -- Returns distance in km
```

### 3. Token Refresh Flow (REQUIRED for mobile)
```javascript
// Every 24 hours, app must call refresh-token endpoint
// Without this, users get logged out

POST /api/auth/refresh-token
{
  "refreshToken": "stored-in-secure-storage"
}
// Return new access_token + new refresh_token
```

### 4. WebSocket Rooms (For targeting)
```javascript
// Subscribe patient to emergency room:
socket.join(`emergency:${emergencyId}`);

// Broadcast location updates only to subscribed users:
io.to(`emergency:${emergencyId}`).emit('LOCATION_UPDATE', {...});
```

### 5. External Services Configuration
```env
# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# SendGrid
SENDGRID_API_KEY=

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT_NAME=
AZURE_STORAGE_ACCOUNT_KEY=
AZURE_BLOB_CONTAINER=medical-reports
```

---

## 📊 FEASIBILITY CHECKLIST

- [ ] PostgreSQL installed with PostGIS enabled?
- [ ] Node.js 18+ available?
- [ ] Socket.io configured for WebSocket?
- [ ] External service accounts ready (Twilio, SendGrid, Azure)?
- [ ] Team coordination with mobile developers?
- [ ] Database backup strategy defined?
- [ ] Can dedicate 40+ hours/week?

**If YES to all:** Proceed with 5-week plan ✅
**If NO to any:** Add 1-2 week buffer ⚠️

---

## 🚀 IMMEDIATE NEXT STEPS

1. **Enable PostGIS on Your Database**
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS cube;
   ```

2. **Update Prisma Schema** with 10 tables (not my 9)
   - Add emergency_requests table
   - Add emergency_tracking table
   - Add refresh_tokens table
   - Modify emergencies with cancellation_deadline

3. **Setup External Services**
   - Create Twilio account
   - Create SendGrid account
   - Setup Azure Blob Storage

4. **Begin Week 1: Authentication**
   - Start with JWT+Refresh tokens
   - Don't skip refresh token flow

---

## 📞 KEY DIFFERENCES FROM PREVIOUS PLAN

| Item | Previous | Revised | Impact |
|------|----------|---------|--------|
| Tables | 9 | 10 (added refresh_tokens) | +2 hours |
| Emergency cancellation | Generic | 10-second window (CRITICAL) | +4 hours |
| Token flow | Access only | Access + Refresh | +3 hours |
| PostGIS required | Optional | REQUIRED | +2 hours |
| External integrations | Basic | Twilio, SendGrid, Azure | +4 hours |
| WebSocket types | Generic | 9 specific types | +3 hours |

**Total Additional Time:** ~18 hours (~1 week more)

**Revised Timeline:** 5 weeks (instead of 4) ✅

---

**Status:** Ready to implement. Begin with Week 1 on Day 1! 🚀

