# Backend Engineers Guide: Implementation Update

**Document Purpose:** Show what the Backend Engineers Guide changed from initial plan  
**Date:** March 10, 2026

---

## 📊 COMPARISON: Initial Plan vs Backend Engineers Guide

### Database Tables

**Initial Plan (9 tables):**
```
users
medical_profiles
emergencies
location_updates
emergency_status_history
responders_tracking
caregiver_links
notifications
audit_logs
```

**Backend Engineers Guide (10 tables):**
```
users
medical_profiles
emergencies (MODIFIED - added cancellation_deadline field)
responders (NEW - detailed responder info)
emergency_requests (NEW - CRITICAL for assignment tracking)
emergency_tracking (MODIFIED - different from location_updates)
caregivers (MODIFIED - renamed from caregiver_links)
medical_reports (MODIFIED - more detailed)
refresh_tokens (NEW - for token refresh flow)
audit_logs
```

**Key Changes:**
- ❌ REMOVED: location_updates (replaced by emergency_tracking)
- ❌ REMOVED: emergency_status_history
- ✅ ADDED: responders table (separate from users)
- ✅ ADDED: emergency_requests table (CRITICAL)
- ✅ ADDED: refresh_tokens table (security)
- ✅ MODIFIED: emergencies (added cancellation_deadline field)

---

### API Endpoints

**Initial Plan:** 26 endpoints (too many)

**Backend Engineers Guide Specifies:** 17+ endpoints

**Reconciled List:**
```
Authentication (4):
  POST /api/auth/register
  POST /api/auth/login
  POST /api/auth/refresh-token (⭐ NEW - CRITICAL)
  POST /api/auth/forgot-password

Users (2):
  GET /api/users/{userId}
  PUT /api/users/{userId}

Medical Profiles (2):
  GET /api/medical-profiles/{userId}
  PUT /api/medical-profiles/{userId}

Emergencies (6):
  POST /api/emergencies
  GET /api/emergencies/{emergencyId}
  POST /api/emergencies/{id}/cancel (⭐ 10-second window)
  GET /api/emergencies?status=ACTIVE
  GET /api/emergencies/history
  PATCH /api/emergencies/{id}/status

Responders (5):
  GET /api/responders/nearby-emergencies
  POST /api/emergency-requests/{id}/accept
  POST /api/emergency-requests/{id}/reject
  GET /api/responders/{id}/stats
  PUT /api/responders/{id}/availability

Tracking (2):
  PUT /api/emergency-tracking/{emergencyId}
  GET /api/emergency-tracking/{emergencyId}

Medical Reports (2):
  GET /api/medical-reports/{userId}
  POST /api/medical-reports/upload

Caregivers (2):
  POST /api/caregivers
  GET /api/caregivers/my-patients
```

**Total: 20+ endpoints (down from 26, more focused)**

---

### Authentication Strategy

**Initial Plan:**
- JWT access tokens (24 hours)
- No refresh token strategy
- One-token system

**Backend Engineers Guide:**
```
✅ Access Token (JWT)
   - Duration: 24 hours
   - Sent in every request header

✅ Refresh Token
   - Duration: 30 days
   - Stored in database (hashed)
   - Used to get new access token when expired
   - Mobile app stores in secure storage

⭐ New Endpoint: POST /api/auth/refresh-token
   - Called every 24 hours automatically
   - Returns new access + refresh tokens
   - Without this: users get logged out after 24h
```

**Why this matters:**
- Mobile apps need continuously valid tokens
- Users shouldn't be kicked out after 24 hours
- Requires Refresh Token table in database

---

### Emergency Cancellation

**Initial Plan:** Basic cancellation support

**Backend Engineers Guide:** ⭐ **CRITICAL 10-SECOND WINDOW**

```
When SOS triggered:
  ↓
Emergency created with cancellation_deadline = NOW() + 10 seconds
  ↓
App shows countdown timer (10 → 9 → ... → 0)
  ↓
If user taps "Cancel" within 10 seconds:
   POST /api/emergencies/{id}/cancel (succeeds)
  ↓
If time expires:
   POST /api/emergencies/{id}/cancel (returns 400 - expired)
   Notifies responders automatically
```

**Implementation Detail:**
```sql
CREATE TABLE emergencies (
    ...
    cancellation_deadline TIMESTAMP,  -- THIS IS REQUIRED
    ...
);

-- When created:
INSERT INTO emergencies (cancellation_deadline)
VALUES (NOW() + INTERVAL '10 seconds');

-- When cancel requested:
IF (NOW() > cancellation_deadline) {
    THROW ERROR "Cancellation period expired";
}
```

**Why this matters:** 
- This is how the mobile app expects it to work
- Missing this breaks the UX
- Mobile app displays countdown timer expecting this behavior

---

### Geospatial Queries (PostGIS)

**Initial Plan:** Mentioned PostGIS as optional

**Backend Engineers Guide:** ⭐ **REQUIRED with specific query**

```sql
-- Find nearest responders (PostGIS extension required):
CREATE EXTENSION IF NOT EXISTS postgis;

SELECT id, name, 
    earth_distance(
        ll_to_earth(latitude, longitude),
        ll_to_earth($patient_lat, $patient_lon)
    ) / 1000 as distance_km
FROM responders
WHERE is_available = true
ORDER BY distance_km ASC
LIMIT 10;
```

**Setup Required:**
```sql
-- Enable PostGIS:
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS cube;
```

**Why this matters:**
- This is the actual algorithm for responder assignment
- Mobile app expects responders sorted by distance
- Without PostGIS, geospatial queries are slow

---

### WebSocket Messages (Specific Types)

**Initial Plan:** Generic WebSocket support

**Backend Engineers Guide:** ⭐ **9 specific message types**

```
Type 1: EMERGENCY_ALERT
  From: Backend → Responder
  When: Emergency triggered near responder
  Data: emergencyId, type, patientName, location, distance, ETA

Type 2: LOCATION_UPDATE
  From: Backend → Patient/Caregiver
  When: Responder moves
  Data: responderId, location, status, ETA

Type 3: EMERGENCY_STATUS_CHANGE
  From: Backend → All subscribed
  When: Status changes
  Data: emergencyId, newStatus, timestamp

Type 4: SUBSCRIBE (Client → Server)
  Purpose: Subscribe to emergency updates
  Data: emergencyId

Type 5: UNSUBSCRIBE (Client → Server)
  Purpose: Stop receiving updates
  Data: emergencyId

... and 4 more types for different scenarios
```

**Why this matters:**
- App expects these exact message formats
- Wrong message format breaks mobile app display
- Must follow protocol exactly

---

### External Integrations (NEW)

**Initial Plan:** Mentioned but not detailed

**Backend Engineers Guide:** ⭐ **REQUIRED for production**

```
1. Twilio SMS
   Purpose: Send emergency alerts via SMS (fallback when internet fails)
   Setup: Create account, get SID/Token/Phone
   When: Use if WebSocket notification fails

2. SendGrid Email
   Purpose: Password resets, medical alerts
   Setup: Create account, get API key
   When: User requests password reset

3. Azure Blob Storage
   Purpose: Store medical report files
   Setup: Create storage account, get connection string
   When: User uploads medical report
   Returns: Signed URL for app to download

4. SMS Fallback Strategy:
   - Try push notification via WebSocket
   - If fails, send SMS alert
   - Ensures emergency alert reaches responder
```

**Environment Variables Required:**
```env
# Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# SendGrid
SENDGRID_API_KEY=...

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT_NAME=...
AZURE_STORAGE_ACCOUNT_KEY=...
AZURE_BLOB_CONTAINER=medical-reports
```

---

### Emergency Requests Table (NEW & CRITICAL)

**Initial Plan:** Mentioned but not detailed

**Backend Engineers Guide:** ⭐ **Essential for tracking**

```sql
CREATE TABLE emergency_requests (
    id UUID PRIMARY KEY,
    emergency_id UUID,           -- Which emergency
    responder_id UUID,           -- Which responder
    request_status VARCHAR(50),  -- PENDING, ACCEPTED, REJECTED
    distance_km DECIMAL(5, 2),   -- How far away
    estimated_arrival_minutes INT, -- ETA
    sent_at TIMESTAMP,           -- When sent
    accepted_at TIMESTAMP,       -- When accepted
    rejected_at TIMESTAMP,       -- When rejected
    rejection_reason TEXT,       -- Why rejected
    
    UNIQUE(emergency_id, responder_id)  -- One request per responder
);
```

**Why this matters:**
- Tracks which responders were notified
- Prevents sending duplicate requests
- Needed for analytics (acceptance rate, etc.)
- Enables timeout logic if no response

---

### Response Format

**Initial Plan:** Generic response structure

**Backend Engineers Guide:** Specific HTTP status codes

```
Success Responses:
  200 OK       - Successful GET/PUT
  201 Created  - Successful POST

Error Responses:
  400 Bad Request    - Invalid input
  401 Unauthorized   - Missing/invalid token
  403 Forbidden      - Access denied
  404 Not Found      - Resource doesn't exist
  409 Conflict       - Duplicate record
  500 Server Error   - Backend issue
  503 Unavailable    - Maintenance

Response Body Format:
{
  "success": true/false,
  "data": { ... } OR null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": ["field: error message"]
  }
}
```

---

### Performance & Monitoring

**Initial Plan:** Basic performance tips

**Backend Engineers Guide:** Specific targets

```
Target Metrics:
  ✓ API response time: <200ms (99th percentile)
  ✓ Database query time: <100ms
  ✓ WebSocket latency: <50ms
  ✓ Error rate: <0.1%
  ✓ System uptime: 99.9%

Monitoring Requirements:
  - API response time per endpoint
  - Database query performance
  - WebSocket connection count
  - Active emergencies
  - Error rate by type
  - System uptime percentage
```

---

### Testing Requirements

**Initial Plan:** Basic testing

**Backend Engineers Guide:** Comprehensive checklist

**Manual Testing (Pre-Deployment):**
```
✓ User registration (all roles)
✓ Login with valid/invalid credentials
✓ Token refresh mechanics
✓ Medical profile CRUD
✓ Emergency creation (exactly 10-second cancellation window)
✓ Responder nearby emergencies query
✓ Emergency request accept/reject
✓ Location tracking updates
✓ WebSocket notifications
✓ Caregiver view of patient emergencies
✓ File upload (medical reports)
```

**Automated Testing:**
```
✓ Unit tests for business logic
✓ Integration tests for API endpoints (all 20+)
✓ Load testing (simulate 100+ concurrent users)
✓ Geo-query performance tests
✓ WebSocket connection tests
✓ Token refresh tests
```

---

## 🎯 WHAT CHANGED IN TIMELINE

| Component | Previous | Updated | Add'l Time |
|-----------|----------|---------|-----------|
| Tables | 9 | 10 | +1 day |
| Token System | 1 token | 2 tokens (access+refresh) | +2 days |
| Emergency Cancel | Generic | 10-second window | +1 day |
| PostGIS | Optional | REQUIRED | +0.5 day |
| WebSocket Types | Generic | 9 specific types | +1 day |
| External Integration | Mentioned | AWS/SendGrid/Azure | +2 days |
| Emergency Requests | Not detailed | CRITICAL table | +1 day |
| Testing Checklist | Basic | Comprehensive | +1 day |

**Total Additional Time:** ~8-10 days (1.5 weeks)

**Original Timeline:** 4 weeks  
**Revised Timeline:** 5-6 weeks ✅

---

## ✅ WHAT'S CONSISTENT

- ✅ PostgreSQL database (confirmed)
- ✅ Node.js/Express alternative (accepted)
- ✅ Socket.io for WebSocket (confirmed)
- ✅ JWT authentication (confirmed)
- ✅ Geospatial queries (confirmed)
- ✅ Real-time tracking (confirmed)
- ✅ Medical report storage (confirmed)
- ✅ Responsive API design (confirmed)

---

## 📋 IMMEDIATE ACTION ITEMS

Before starting Week 1:

1. **Setup PostgreSQL PostGIS:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

2. **Create External Service Accounts:**
   - Twilio account (SMS)
   - SendGrid account (Email)
   - Azure Storage account (Blob storage)

3. **Update Prisma Schema:**
   - Add `refreshTokens` table
   - Add `emergencyRequests` table
   - Add `cancellation_deadline` to emergencies
   - Add `responders` table

4. **Coordinate with Mobile Team:**
   - Confirm API base URL
   - Confirm WebSocket URL
   - Share this document with them

5. **Prepare Environment Variables:**
   - Create `.env.example` with all required variables
   - Document what each one does

---

## 🎓 KEY TAKEAWAY

The **Backend Engineers Guide** is much more detailed and production-focused than the initial plan. It specifies:

1. ⭐ Exact database schema with field names
2. ⭐ Exact API endpoint specifications with examples
3. ⭐ Exact WebSocket message types
4. ⭐ 10-second cancellation window (critical UX requirement)
5. ⭐ Token refresh flow (required for mobile apps)
6. ⭐ External integrations (production requirement)
7. ⭐ PostGIS geospatial queries (required algorithm)
8. ⭐ Performance targets (<200ms responses)
9. ⭐ Comprehensive testing checklist
10. ⭐ Response format standards

**Following this guide instead of guessing = 80% more likely to integrate successfully with mobile app**.

---

**Status:** Backend Engineers Guide integrated into Revised Implementation Plan ✅  
**Next Step:** Start Day 1 of Week 1 with confidence! 🚀
