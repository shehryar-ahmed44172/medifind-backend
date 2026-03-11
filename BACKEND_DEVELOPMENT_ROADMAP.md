# MediFind Backend Development Complete Roadmap

**Document Version:** 1.0  
**Date:** March 10, 2026  
**Status:** Ready for Implementation  
**Tech Stack:** Node.js + Express + TypeScript + PostgreSQL + Prisma

---

## TABLE OF CONTENTS

1. [Project Architecture Overview](#project-architecture-overview)
2. [Complete Backend Project Hierarchy](#complete-backend-project-hierarchy)
3. [PostgreSQL Database Complete Roadmap](#postgresql-database-complete-roadmap)
4. [API Development Roadmap](#api-development-roadmap)
5. [Implementation Steps & Phases](#implementation-steps--phases)
6. [Environment Setup Guide](#environment-setup-guide)
7. [Development Guidelines](#development-guidelines)

---

## PROJECT ARCHITECTURE OVERVIEW

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Flutter Mobile)                         │
│                          • iOS & Android Apps                            │
│                        • Real-time Location Tracking                     │
│                     • WebSocket & REST API Communication                 │
└────────────────────────────────┬──────────────────────────────────────┬─┘
                                 │                                        │
                    HTTP/REST APIs │                    WebSocket         │
                                 │                      Connections       │
┌────────────────────────────────▼──────────────────────────────────────┐─┘
│                                                                          │
│                     NODE.JS EXPRESS BACKEND SERVER                       │
│                         (TypeScript)                                     │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                   API ROUTES LAYER                             │   │
│  │  • Authentication Routes      • Emergency Routes              │   │
│  │  • User Routes               • Tracking Routes                │   │
│  │  • Medical Profile Routes    • Notification Routes            │   │
│  │  • Responder Routes          • Caregiver Routes               │   │
│  └─────────────────────────────────────────────────────────────┬─┘   │
│                                                                  │      │
│  ┌──────────────────────────────────────────────────────────────▼──┐  │
│  │              MIDDLEWARE LAYER                                     │  │
│  │  • JWT Authentication       • Error Handling                    │  │
│  │  • Request Validation       • Request Logging (Winston)         │  │
│  │  • CORS Configuration       • Rate Limiting                     │  │
│  │  • Request Parsing (body)   • Helmet Security                   │  │
│  └─────────────────────────────────────────────────────────────┬──┘  │
│                                                                  │      │
│  ┌──────────────────────────────────────────────────────────────▼──┐  │
│  │              BUSINESS LOGIC LAYER (Services)                     │  │
│  │  • AuthService              • EmergencyService                  │  │
│  │  • UserService              • NotificationService              │  │
│  │  • MedicalProfileService    • TrackingService                   │  │
│  │  • ResponderService         • CaregiverService                  │  │
│  └─────────────────────────────────────────────────────────────┬──┘  │
│                                                                  │      │
│  ┌──────────────────────────────────────────────────────────────▼──┐  │
│  │              DATA ACCESS LAYER (Repositories)                    │  │
│  │  • UserRepository           • EmergencyRepository               │  │
│  │  • MedicalProfileRepository • LocationUpdateRepository          │  │
│  │  • StatusHistoryRepository  • ResponderTrackingRepository       │  │
│  └─────────────────────────────────────────────────────────────┬──┘  │
│                                                                  │      │
│  ┌──────────────────────────────────────────────────────────────▼──┐  │
│  │              REAL-TIME LAYER (WebSocket - Socket.io)            │  │
│  │  • Connection Manager       • Event Handlers                    │  │
│  │  • Room Management          • Broadcast Handlers                │  │
│  └─────────────────────────────────────────────────────────────┬──┘  │
│                                                                  │      │
│  ┌──────────────────────────────────────────────────────────────▼──┐  │
│  │              UTILITIES & HELPERS                                 │  │
│  │  • Logger (Winston)         • Response Formatters               │  │
│  │  • Validators (Joi/Zod)     • Error Classes                     │  │
│  │  • Helpers                  • Constants                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│         ┌─────────────┬──────────────────────┬────────────────┐      │
│         │             │                      │                │      │
└─────────▼─────────────▼──────────────────────▼────────────────▼──────┘
          │             │                      │                │
     PostgreSQL   Redis (Cache)       Message Queue        External APIs
      Database    Session Storage    (RabbitMQ/Redis)   (Maps, SMS, Email)
```

---

## COMPLETE BACKEND PROJECT HIERARCHY

```
medifind-backend/
│
├── src/
│   ├── server.ts                          # Main Express app initialization
│   │
│   ├── config/
│   │   ├── index.ts                       # Main config file
│   │   ├── database.ts                    # Prisma client setup
│   │   ├── passport.ts                    # Passport authentication strategies
│   │   ├── multer.ts                      # File upload configuration
│   │   └── socket.ts                      # Socket.io configuration
│   │
│   ├── controllers/
│   │   ├── index.ts                       # Controller exports
│   │   ├── authController.ts              # Register, Login, Logout
│   │   ├── userController.ts              # Get, Update user profile
│   │   ├── medicalProfileController.ts    # Medical data operations
│   │   ├── emergencyController.ts         # Emergency CRUD operations
│   │   ├── responderController.ts         # Responder management
│   │   ├── trackingController.ts          # Location tracking
│   │   ├── notificationController.ts      # Notification operations
│   │   └── caregiverController.ts         # Caregiver operations
│   │
│   ├── services/
│   │   ├── index.ts                       # Service exports
│   │   ├── authService.ts                 # Authentication business logic
│   │   ├── userService.ts                 # User operations
│   │   ├── medicalProfileService.ts       # Medical profile operations
│   │   ├── emergencyService.ts            # Emergency logic & matching
│   │   ├── responderService.ts            # Responder logic
│   │   ├── trackingService.ts             # Real-time tracking logic
│   │   ├── notificationService.ts         # Notification dispatch
│   │   ├── locationService.ts             # GPS & geolocation logic
│   │   └── caregiverService.ts            # Caregiver operations
│   │
│   ├── repositories/
│   │   ├── index.ts                       # Repository exports
│   │   ├── userRepository.ts              # User data access
│   │   ├── medicalProfileRepository.ts    # Medical profile data
│   │   ├── emergencyRepository.ts         # Emergency records access
│   │   ├── locationUpdateRepository.ts    # Location history
│   │   ├── statusHistoryRepository.ts     # Emergency status history
│   │   └── responderTrackingRepository.ts # Responder tracking data
│   │
│   ├── routes/
│   │   ├── index.ts                       # Main router setup
│   │   ├── authRoutes.ts                  # /auth endpoints
│   │   ├── userRoutes.ts                  # /users endpoints
│   │   ├── medicalProfileRoutes.ts        # /medical-profiles endpoints
│   │   ├── emergencyRoutes.ts             # /emergencies endpoints
│   │   ├── responderRoutes.ts             # /responders endpoints
│   │   ├── trackingRoutes.ts              # /tracking endpoints
│   │   ├── notificationRoutes.ts          # /notifications endpoints
│   │   └── caregiverRoutes.ts             # /caregivers endpoints
│   │
│   ├── middleware/
│   │   ├── index.ts                       # Middleware exports
│   │   ├── authMiddleware.ts              # JWT verification
│   │   ├── errorHandler.ts                # Global error handling
│   │   ├── validateRequest.ts             # Request validation (Joi/Zod)
│   │   ├── roleCheck.ts                   # Role-based access control
│   │   ├── requestLogger.ts               # Winston logging middleware
│   │   └── rateLimiter.ts                 # Rate limiting
│   │
│   ├── websocket/
│   │   ├── index.ts                       # Socket.io initialization
│   │   ├── handlers/
│   │   │   ├── connectionHandler.ts       # User connect/disconnect
│   │   │   ├── emergencyHandler.ts        # Emergency WebSocket events
│   │   │   ├── trackingHandler.ts         # Location updates via WS
│   │   │   ├── notificationHandler.ts     # Notification events
│   │   │   └── responderHandler.ts        # Responder status updates
│   │   └── events.ts                      # WebSocket event constants
│   │
│   ├── types/
│   │   ├── index.ts                       # Type exports
│   │   ├── common.types.ts                # Common interfaces
│   │   ├── user.types.ts                  # User-related types
│   │   ├── emergency.types.ts             # Emergency-related types
│   │   ├── tracking.types.ts              # Tracking types
│   │   └── request.types.ts               # Request/Response types
│   │
│   ├── utils/
│   │   ├── index.ts                       # Utility exports
│   │   ├── logger.ts                      # Winston logger setup
│   │   ├── responseFormatter.ts           # Standard API response format
│   │   ├── errorHandler.ts                # Custom error classes
│   │   ├── validators.ts                  # Validation schemas
│   │   ├── hashPassword.ts                # Password hashing utilities
│   │   ├── jwtUtils.ts                    # JWT generation & verification
│   │   ├── geoDistance.ts                 # Geolocation calculations
│   │   └── constants.ts                   # App-wide constants
│   │
│   └── constants/
│       ├── index.ts                       # Constant exports
│       ├── httpStatus.ts                  # HTTP status codes
│       ├── errorMessages.ts               # Error message templates
│       └── emergencyRules.ts              # Business rule constants
│
├── prisma/
│   ├── schema.prisma                      # Database schema definition
│   ├── seed.ts                            # Database seeding script
│   └── migrations/                        # Database migration history
│       └── migration_lock.toml
│
├── tests/
│   ├── unit/                              # Unit tests
│   │   ├── services/
│   │   ├── utils/
│   │   └── helpers/
│   │
│   ├── integration/                       # Integration tests
│   │   ├── auth.test.ts
│   │   ├── emergency.test.ts
│   │   └── tracking.test.ts
│   │
│   └── fixtures/                          # Test data
│       └── mockData.ts
│
├── logs/                                  # Application logs directory
│   └── error.log                          # Error logs
│
├── docs/
│   ├── API_DOCUMENTATION.md               # Complete API reference
│   ├── DATABASE_DESIGN.md                 # Database design details
│   ├── DEPLOYMENT_GUIDE.md                # Deployment instructions
│   ├── TESTING_GUIDE.md                   # Testing procedures
│   └── ARCHITECTURE_DECISIONS.md          # Architecture decisions
│
├── .env.example                           # Environment variables template
├── .env                                   # Environment variables (git ignored)
├── .gitignore                             # Git ignore rules
├── .eslintrc.json                         # ESLint configuration
├── tsconfig.json                          # TypeScript configuration
├── jest.config.js                         # Jest testing configuration
├── docker-compose.yml                     # Docker Compose for PostgreSQL & Redis
├── Dockerfile                             # Docker image for backend
├── package.json                           # Node dependencies
├── package-lock.json                      # Locked dependency versions
├── README.md                               # Project README
└── BACKEND_DEVELOPMENT_ROADMAP.md        # This file
```

---

## PostgreSQL DATABASE COMPLETE ROADMAP

### Phase 1: Core Tables Setup

#### 1.1 Users Table
```sql
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    fullName VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phoneNumber VARCHAR(20) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'PATIENT',
    profileImageUrl TEXT,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    lastLogin TIMESTAMP WITH TIME ZONE,
    createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phoneNumber);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(isActive);
```

**Fields:**
- `id` - Unique identifier (UUID)
- `fullName` - User's complete name
- `email` - Unique email for login
- `phoneNumber` - Contact phone number
- `passwordHash` - Bcrypt hashed password (never store plain text)
- `role` - User type (PATIENT, RESPONDER, CAREGIVER, ADMIN)
- `profileImageUrl` - URL to profile image (stored in cloud storage)
- `isActive` - Account status (soft delete)
- `lastLogin` - Last authentication timestamp
- `createdAt`, `updatedAt` - Timestamps for auditing

**Relationships:**
- 1 → Many: Emergencies (as patient)
- 1 → Many: Emergencies (as assigned responder)
- 1 → 1: MedicalProfile
- 1 → Many: CaregiverLinks

---

#### 1.2 Medical Profiles Table
```sql
CREATE TABLE medical_profiles (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    userId VARCHAR(50) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bloodType VARCHAR(10),
    chronicDiseases JSONB DEFAULT '[]'::jsonb,
    allergies JSONB DEFAULT '[]'::jsonb,
    medications JSONB DEFAULT '[]'::jsonb,
    emergencyContacts JSONB DEFAULT '[]'::jsonb,
    medicalHistory TEXT,
    createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medical_userId ON medical_profiles(userId);
```

**Fields (JSONB for flexible storage):**
- `bloodType` - Blood group (O+, A-, etc.)
- `chronicDiseases` - Array of chronic conditions
- `allergies` - Array of known allergies
- `medications` - Array of current medications
- `emergencyContacts` - Array of contact objects (name, phone, relation)
- `medicalHistory` - Long-form medical history text

**JSONB Structure Examples:**
```json
{
  "chronicDiseases": [
    {"name": "Diabetes", "diagnosedYear": 2015},
    {"name": "Hypertension", "diagnosedYear": 2018}
  ],
  "allergies": [
    {"name": "Penicillin", "severity": "HIGH"},
    {"name": "Peanuts", "severity": "SEVERE"}
  ],
  "medications": [
    {"name": "Metformin", "dosage": "500mg", "frequency": "2x daily"},
    {"name": "Atorvastatin", "dosage": "20mg", "frequency": "Once daily"}
  ],
  "emergencyContacts": [
    {"name": "Sarah Johnson", "phone": "+1234567890", "relation": "Spouse"},
    {"name": "Dr. Michael Chen", "phone": "+0987654321", "relation": "Primary Doctor"}
  ]
}
```

---

#### 1.3 Emergencies Table
```sql
CREATE TABLE emergencies (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    userId VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'TRIGGERED',
    emergencyType VARCHAR(30) NOT NULL DEFAULT 'MEDICAL',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy FLOAT,
    assignedResponderId VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    estimatedArrivalTime INTEGER,
    voiceAlertGenerated BOOLEAN DEFAULT FALSE,
    additionalInfo TEXT,
    createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolvedAt TIMESTAMP WITH TIME ZONE
);

-- Performance indexes
CREATE INDEX idx_emergency_userId ON emergencies(userId);
CREATE INDEX idx_emergency_status ON emergencies(status);
CREATE INDEX idx_emergency_responderId ON emergencies(assignedResponderId);
CREATE INDEX idx_emergency_createdAt ON emergencies(createdAt DESC);
CREATE INDEX idx_emergency_location ON emergencies USING GIST (ll_to_earth(latitude, longitude));
```

**Status Enum Values:**
- `TRIGGERED` - Emergency just created
- `LOCATING` - System acquiring exact location
- `RESPONDER_ASSIGNED` - Responder assigned
- `IN_PROGRESS` - Responder en route
- `ON_SITE` - Responder arrived
- `COMPLETED` - Emergency resolved
- `ESCALATED` - Escalated to higher priority
- `CANCELLED` - Patient cancelled

**Emergency Types:**
- `MEDICAL` - Medical emergency
- `FALL` - Fall detection
- `ACCIDENT` - General accident
- `OTHER` - Other emergency

---

#### 1.4 Location Updates Table
```sql
CREATE TABLE location_updates (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    emergencyId VARCHAR(50) NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy FLOAT,
    speed FLOAT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_location_emergencyId ON location_updates(emergencyId);
CREATE INDEX idx_location_timestamp ON location_updates(timestamp DESC);
```

---

#### 1.5 Emergency Status History Table
```sql
CREATE TABLE emergency_status_history (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    emergencyId VARCHAR(50) NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    previousStatus VARCHAR(30),
    newStatus VARCHAR(30) NOT NULL,
    changedBy VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_status_history_emergencyId ON emergency_status_history(emergencyId);
```

---

### Phase 2: Responder & Tracking Tables

#### 2.1 Responder Tracking Table
```sql
CREATE TABLE responders_tracking (
    id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    fullName VARCHAR(100) NOT NULL,
    phoneNumber VARCHAR(20) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status VARCHAR(30) DEFAULT 'AVAILABLE', -- AVAILABLE, BUSY, OFF_DUTY
    isActive BOOLEAN DEFAULT TRUE,
    lastUpdated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_responder_status_active ON responders_tracking(status, isActive);
CREATE INDEX idx_responder_location ON responders_tracking USING GIST (ll_to_earth(latitude, longitude));
```

---

#### 2.2 Caregiver Links Table
```sql
CREATE TABLE caregiver_links (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    caregiverId VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patientId VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accessLevel VARCHAR(30) DEFAULT 'READ_ONLY', -- READ_ONLY, MANAGE
    createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(caregiverId, patientId)
);

CREATE INDEX idx_caregiver_links_caregiver ON caregiver_links(caregiverId);
CREATE INDEX idx_caregiver_links_patient ON caregiver_links(patientId);
```

---

### Phase 3: Notification & Audit Tables

#### 3.1 Notifications Table
```sql
CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    userId VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- EMERGENCY_ALERT, STATUS_UPDATE, REMINDER
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Extra data as JSON
    isRead BOOLEAN DEFAULT FALSE,
    readAt TIMESTAMP WITH TIME ZONE,
    createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_userId_isRead ON notifications(userId, isRead);
CREATE INDEX idx_notifications_createdAt ON notifications(createdAt DESC);
```

---

#### 3.2 Audit Logs Table
```sql
CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    userId VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entityType VARCHAR(50) NOT NULL,
    entityId VARCHAR(50),
    oldValues JSONB,
    newValues JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_userId ON audit_logs(userId);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
```

---

### Complete Database Schema Script

```sql
-- MediFind Complete PostgreSQL Schema
-- PostgreSQL 12+ with pg_earthdistance extension

CREATE EXTENSION IF NOT EXISTS pg_earthdistance;
CREATE EXTENSION IF NOT EXISTS cube;

-- ============= Phase 1: Core Tables =============

CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    fullName VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phoneNumber VARCHAR(20) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'PATIENT',
    profileImageUrl TEXT,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    lastLogin TIMESTAMP WITH TIME ZONE,
    createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phoneNumber);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(isActive);

CREATE TABLE medical_profiles (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    userId VARCHAR(50) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bloodType VARCHAR(10),
    chronicDiseases JSONB DEFAULT '[]'::jsonb,
    allergies JSONB DEFAULT '[]'::jsonb,
    medications JSONB DEFAULT '[]'::jsonb,
    emergencyContacts JSONB DEFAULT '[]'::jsonb,
    medicalHistory TEXT,
    createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medical_userId ON medical_profiles(userId);

CREATE TABLE emergencies (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    userId VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'TRIGGERED',
    emergencyType VARCHAR(30) NOT NULL DEFAULT 'MEDICAL',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy FLOAT,
    assignedResponderId VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    estimatedArrivalTime INTEGER,
    voiceAlertGenerated BOOLEAN DEFAULT FALSE,
    additionalInfo TEXT,
    createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolvedAt TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_emergency_userId ON emergencies(userId);
CREATE INDEX idx_emergency_status ON emergencies(status);
CREATE INDEX idx_emergency_responderId ON emergencies(assignedResponderId);
CREATE INDEX idx_emergency_createdAt ON emergencies(createdAt DESC);

CREATE TABLE location_updates (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    emergencyId VARCHAR(50) NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy FLOAT,
    speed FLOAT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_location_emergencyId ON location_updates(emergencyId);
CREATE INDEX idx_location_timestamp ON location_updates(timestamp DESC);

CREATE TABLE emergency_status_history (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    emergencyId VARCHAR(50) NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    previousStatus VARCHAR(30),
    newStatus VARCHAR(30) NOT NULL,
    changedBy VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_status_history_emergencyId ON emergency_status_history(emergencyId);

-- ============= Phase 2: Responder & Tracking =============

CREATE TABLE responders_tracking (
    id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    fullName VARCHAR(100) NOT NULL,
    phoneNumber VARCHAR(20) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status VARCHAR(30) DEFAULT 'AVAILABLE',
    isActive BOOLEAN DEFAULT TRUE,
    lastUpdated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_responder_status_active ON responders_tracking(status, isActive);

CREATE TABLE caregiver_links (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    caregiverId VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patientId VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accessLevel VARCHAR(30) DEFAULT 'READ_ONLY',
    createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(caregiverId, patientId)
);

CREATE INDEX idx_caregiver_links_caregiver ON caregiver_links(caregiverId);
CREATE INDEX idx_caregiver_links_patient ON caregiver_links(patientId);

-- ============= Phase 3: Audit & Notifications =============

CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    userId VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    isRead BOOLEAN DEFAULT FALSE,
    readAt TIMESTAMP WITH TIME ZONE,
    createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_userId_isRead ON notifications(userId, isRead);
CREATE INDEX idx_notifications_createdAt ON notifications(createdAt DESC);

CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    userId VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entityType VARCHAR(50) NOT NULL,
    entityId VARCHAR(50),
    oldValues JSONB,
    newValues JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_userId ON audit_logs(userId);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
```

---

### Database Queries Reference

#### Authentication Queries
```sql
-- Register new user
INSERT INTO users (id, fullName, email, phoneNumber, passwordHash, role)
VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5);

-- Login query
SELECT * FROM users WHERE email = $1 AND isActive = TRUE;

-- Update last login
UPDATE users SET lastLogin = NOW() WHERE id = $1;
```

#### Emergency Queries
```sql
-- Create emergency
INSERT INTO emergencies (id, userId, latitude, longitude, accuracy)
VALUES (gen_random_uuid()::text, $1, $2, $3, $4) RETURNING *;

-- Find nearest responders (within 5km)
SELECT r.* FROM responders_tracking r
WHERE r.status = 'AVAILABLE' AND r.isActive = TRUE
AND earth_distance(ll_to_earth(r.latitude, r.longitude), 
                   ll_to_earth($1, $2)) < 5000
ORDER BY earth_distance(ll_to_earth(r.latitude, r.longitude), 
                        ll_to_earth($1, $2))
LIMIT 10;

-- Update emergency status
UPDATE emergencies 
SET status = $1, updatedAt = NOW() 
WHERE id = $2 
RETURNING *;
```

#### Location Tracking Queries
```sql
-- Insert location update
INSERT INTO location_updates (id, emergencyId, latitude, longitude, accuracy, speed, timestamp)
VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW());

-- Get latest locations for emergency
SELECT * FROM location_updates 
WHERE emergencyId = $1 
ORDER BY timestamp DESC 
LIMIT 100;
```

---

### Performance Optimization Tips

1. **Use JSONB for flexible data** - Faster than text for structured data
2. **Create composite indexes** - For frequently combined filters
3. **Partial indexes** - For common conditions (e.g., WHERE isActive = TRUE)
4. **VACUUM regularly** - Maintain index performance
5. **Monitor slow queries** - Use pg_stat_statements
6. **Connection pooling** - Use PgBouncer or similar

---

## API DEVELOPMENT ROADMAP

### Phase 1: Authentication APIs

#### 1.1 Register Endpoint
```
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "password": "SecurePass123!",
  "role": "PATIENT"
}

Response (201 Created):
{
  "success": true,
  "data": {
    "id": "user123",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "PATIENT",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 1.2 Login Endpoint
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "user123",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "PATIENT",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

#### 1.3 Logout Endpoint
```
POST /api/auth/logout
Headers: Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Phase 2: User Management APIs

#### 2.1 Get User Profile
```
GET /api/users/{userId}
Headers: Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "user123",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "role": "PATIENT",
    "profileImageUrl": "https://...",
    "isActive": true,
    "createdAt": "2026-03-10T08:00:00Z"
  }
}
```

#### 2.2 Update User Profile
```
PUT /api/users/{userId}
Headers: Authorization: Bearer {token}
Content-Type: application/json

{
  "fullName": "John Updated",
  "phoneNumber": "+0987654321"
}

Response (200 OK):
{
  "success": true,
  "data": { ...updated user... }
}
```

### Phase 3: Medical Profile APIs

#### 3.1 Create/Update Medical Profile
```
POST /api/medical-profiles/{userId}
Headers: Authorization: Bearer {token}
Content-Type: application/json

{
  "bloodType": "O+",
  "chronicDiseases": [
    {"name": "Diabetes", "diagnosedYear": 2015}
  ],
  "allergies": [
    {"name": "Penicillin", "severity": "HIGH"}
  ],
  "medications": [
    {"name": "Metformin", "dosage": "500mg", "frequency": "2x daily"}
  ],
  "emergencyContacts": [
    {"name": "Sarah Johnson", "phone": "+1234567890", "relation": "Spouse"}
  ],
  "medicalHistory": "Long text..."
}

Response (201 Created / 200 OK):
{
  "success": true,
  "data": { ...medical profile... }
}
```

#### 3.2 Get Medical Profile
```
GET /api/medical-profiles/{userId}
Headers: Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "data": { ...medical profile... }
}
```

### Phase 4: Emergency APIs

#### 4.1 Trigger Emergency
```
POST /api/emergencies
Headers: Authorization: Bearer {token}
Content-Type: application/json

{
  "emergencyType": "MEDICAL",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 50
}

Response (201 Created):
{
  "success": true,
  "data": {
    "id": "emergency123",
    "userId": "user123",
    "status": "TRIGGERED",
    "emergencyType": "MEDICAL",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "createdAt": "2026-03-10T08:00:00Z"
  }
}
```

#### 4.2 Get Emergency Details
```
GET /api/emergencies/{emergencyId}
Headers: Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "emergency123",
    "userId": "user123",
    "status": "RESPONDER_ASSIGNED",
    "emergencyType": "MEDICAL",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "assignedResponder": { ...responder details... },
    "locationUpdates": [...],
    "statusHistory": [...]
  }
}
```

#### 4.3 Update Emergency Status
```
PATCH /api/emergencies/{emergencyId}
Headers: Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "ON_SITE"
}

Response (200 OK):
{
  "success": true,
  "data": { ...updated emergency... }
}
```

#### 4.4 Cancel Emergency
```
POST /api/emergencies/{emergencyId}/cancel
Headers: Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "message": "Emergency cancelled successfully"
}
```

### Phase 5: Responder APIs

#### 5.1 Get Available Responders
```
GET /api/responders?latitude=40.7128&longitude=-74.0060&radius=5
Headers: Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "responder123",
      "fullName": "Jane Smith",
      "phoneNumber": "+1234567890",
      "latitude": 40.7150,
      "longitude": -74.0045,
      "distance": 0.35,
      "status": "AVAILABLE"
    }
  ]
}
```

#### 5.2 Accept Emergency Request (Responder)
```
POST /api/responders/emergencies/{emergencyId}/accept
Headers: Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "message": "Emergency accepted"
}
```

#### 5.3 Update Responder Status
```
PATCH /api/responders/{responderId}/status
Headers: Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "BUSY"
}

Response (200 OK):
{
  "success": true,
  "data": { ...updated responder... }
}
```

### Phase 6: Tracking APIs

#### 6.1 Update Location (Real-time)
```
POST /api/tracking/location
Headers: Authorization: Bearer {token}
Content-Type: application/json

{
  "emergencyId": "emergency123",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 50
}

Response (201 Created):
{
  "success": true,
  "data": {
    "id": "location123",
    "emergencyId": "emergency123",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "timestamp": "2026-03-10T08:00:00Z"
  }
}
```

#### 6.2 Get Location History
```
GET /api/tracking/emergencies/{emergencyId}/locations
Headers: Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "data": [
    { "latitude": 40.7128, "longitude": -74.0060, "timestamp": "..." },
    { "latitude": 40.7130, "longitude": -74.0060, "timestamp": "..." }
  ]
}
```

---

## IMPLEMENTATION STEPS & PHASES

### Phase 0: Project Setup (Days 1-2)

**Tasks:**
1. Initialize Node.js project with TypeScript
2. Setup database credentials and connections
3. Configure environment variables
4. Setup Prisma ORM with PostgreSQL
5. Create folder structure
6. Setup development tools (ESLint, Prettier, Jest)

**Deliverable:** Working development environment

---

### Phase 1: Authentication (Days 3-5)

**Tasks:**
1. Create User model in Prisma
2. Implement user registration endpoint
3. Implement user login endpoint
4. Setup JWT token generation and verification
5. Create authentication middleware
6. Implement logout functionality
7. Write unit tests for auth service

**Files to create:**
- `controllers/authController.ts`
- `services/authService.ts`
- `routes/authRoutes.ts`
- `middleware/authMiddleware.ts`
- `utils/jwtUtils.ts`

**Testing checklist:**
- ✓ Register new user
- ✓ Login with valid credentials
- ✓ Login with invalid credentials
- ✓ JWT token validation
- ✓ Token refresh

---

### Phase 2: User Management (Days 6-7)

**Tasks:**
1. Create repository pattern for users
2. Implement get user profile endpoint
3. Implement update user profile endpoint
4. Implement change password endpoint
5. Add role-based middleware
6. Write integration tests

**Files to create:**
- `controllers/userController.ts`
- `repositories/userRepository.ts`
- `services/userService.ts`
- `routes/userRoutes.ts`
- `middleware/roleCheck.ts`

---

### Phase 3: Medical Profile Management (Days 8-9)

**Tasks:**
1. Create MedicalProfile model in Prisma
2. Implement create medical profile endpoint
3. Implement get medical profile endpoint
4. Implement update medical profile endpoint
5. Add validation for medical data
6. Write tests

**Files to create:**
- `controllers/medicalProfileController.ts`
- `services/medicalProfileService.ts`
- `repositories/medicalProfileRepository.ts`
- `routes/medicalProfileRoutes.ts`

---

### Phase 4: Emergency Management (Days 10-13)

**Tasks:**
1. Create Emergency model in Prisma
2. Implement trigger emergency endpoint
3. Implement emergency status update
4. Create responder assignment logic
5. Implement nearest responder finding algorithm
6. Create emergency tracking tables
7. Add status history tracking
8. Write comprehensive tests

**Files to create:**
- `controllers/emergencyController.ts`
- `services/emergencyService.ts`
- `services/locationService.ts`
- `repositories/emergencyRepository.ts`
- `routes/emergencyRoutes.ts`

**Algorithm for nearest responder:**
```pseudocode
function findNearestResponders(emergencyLocation, radius = 5km):
  1. Query responders within radius using geospatial query
  2. Sort by distance (ascending)
  3. Filter by status = 'AVAILABLE'
  4. Assign to closest available responder
  5. Update emergency status to 'RESPONDER_ASSIGNED'
  6. Generate voice alert for responder
  7. Send real-time notification to responder
```

---

### Phase 5: Real-time Features (Days 14-16)

**Tasks:**
1. Setup Socket.io for WebSocket connections
2. Implement real-time location updates
3. Implement real-time notifications
4. Create connection/disconnection handling
5. Implement room-based broadcasting
6. Add user presence tracking
7. Write integration tests

**Files to create:**
- `websocket/handlers/connectionHandler.ts`
- `websocket/handlers/trackingHandler.ts`
- `websocket/handlers/notificationHandler.ts`
- `websocket/events.ts`

---

### Phase 6: Responder Features (Days 17-19)

**Tasks:**
1. Create responder assignment endpoints
2. Implement emergency acceptance/rejection
3. Implement responder status management
4. Create responder presence tracking
5. Implement escalation logic
6. Add responder history

**Files to create:**
- `controllers/responderController.ts`
- `services/responderService.ts`
- `repositories/responderTrackingRepository.ts`
- `routes/responderRoutes.ts`

---

### Phase 7: Caregiver Features (Days 20-21)

**Tasks:**
1. Create caregiver-patient linking
2. Implement caregiver read-only access
3. Implement caregiver monitoring dashboard
4. Add permission checks

**Files to create:**
- `controllers/caregiverController.ts`
- `services/caregiverService.ts`
- `routes/caregiverRoutes.ts`

---

### Phase 8: Testing & Documentation (Days 22-24)

**Tasks:**
1. Write comprehensive unit tests
2. Write integration tests
3. Performance testing
4. Security testing
5. Create API documentation
6. Create deployment guide
7. Code review and optimization

---

### Phase 9: Deployment & DevOps (Days 25-26)

**Tasks:**
1. Setup Docker containerization
2. Configure CI/CD pipeline
3. Deploy to staging
4. Deploy to production
5. Setup monitoring and logging
6. Setup backup and recovery

---

## ENVIRONMENT SETUP GUIDE

### Prerequisites
- **Node.js** 18+ (LTS)
- **PostgreSQL** 12+
- **Redis** (for caching and message queue)
- **npm** or **yarn**

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <repo-url>
cd medifind-backend

# Install dependencies
npm install

# Install development dependencies
npm install --save-dev @types/node @types/express typescript ts-node
```

### Step 2: Setup PostgreSQL

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or install PostgreSQL locally
# macOS:
brew install postgresql
brew services start postgresql

# Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start

# Windows:
# Download and install from https://www.postgresql.org/download/windows/
```

### Step 3: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE medifind_db;

# Create user
CREATE USER medifind_user WITH PASSWORD 'secure_password_123';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE medifind_db TO medifind_user;

# Exit psql
\q
```

### Step 4: Configure Environment Variables

```bash
# Copy example to actual file
cp .env.example .env

# Edit .env with your values
nano .env
```

**.env file template:**
```env
# Server
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000

# Database
DATABASE_URL=postgresql://medifind_user:secure_password_123@localhost:5432/medifind_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRY=24h

# Logging
LOG_LEVEL=debug

# Email (optional for production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# AWS S3 (optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET=medifind-uploads

# Google Maps
GOOGLE_MAPS_API_KEY=

# External APIs
SMS_API_KEY=
EMAIL_API_KEY=
```

### Step 5: Setup Prisma

```bash
# Generate Prisma client
npm run db:generate

# Create migration
npm run db:migrate

# Seed initial data
npm run db:seed

# Open Prisma Studio (visual database browser)
npm run db:studio
```

### Step 6: Start Development Server

```bash
# Start with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Step 7: Verify Setup

```bash
# Test API health check
curl http://localhost:5000/api/health

# Should return:
# {"success": true, "message": "API is running"}
```

---

## DEVELOPMENT GUIDELINES

### Code Structure

All code should follow these principles:

1. **MVC Pattern** - Separate controllers, services, and repositories
2. **SOLID Principles** - Single Responsibility, Open/Closed, etc.
3. **Type Safety** - Use TypeScript strictly
4. **Error Handling** - Custom error classes and consistent error responses
5. **Logging** - Use Winston for all logs
6. **Testing** - Unit and integration tests for all services

### Naming Conventions

```typescript
// Files
- user.controller.ts (CamelCase)
- user.service.ts
- user.repository.ts
- authMiddleware.ts

// Variables
const user = "John"; // camelCase
let isActive = true;

// Constants
const MAX_ATTEMPTS = 5; // UPPER_SNAKE_CASE
const API_ENDPOINT = "https://...";

// Functions/Methods
function getUserById(id: string) { }
async function createUser(data: CreateUserDto) { }

// Classes
class UserService { }
class AuthMiddleware { }
```

### TypeScript Best Practices

```typescript
// Use interfaces for external contracts
interface IUserRepository {
  findById(id: string): Promise<User>;
  create(data: CreateUserDto): Promise<User>;
}

// Use types for internal data structures
type UserRole = 'PATIENT' | 'RESPONDER' | 'CAREGIVER' | 'ADMIN';

// Use enums for values
enum EmergencyStatus {
  TRIGGERED = 'TRIGGERED',
  ASSIGNED = 'ASSIGNED',
  COMPLETED = 'COMPLETED'
}

// Use async/await
async function getUser(userId: string): Promise<User> {
  return await userRepository.findById(userId);
}

// Proper error handling
try {
  const user = await userService.getUser(userId);
} catch (error) {
  if (error instanceof UserNotFoundError) {
    // Handle specific error
  } else {
    // Handle generic error
  }
}
```

### API Response Format

All API responses must follow this format:

```typescript
// Success response
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}

// Error response
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  }
}

// Paginated response
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### Error Handling

```typescript
// Custom error class
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

// Usage
throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

// In error middleware
catch ((err: AppError) => {
  res.status(err.statusCode).json({
    success: false,
    error: {
      code: err.code,
      message: err.message
    }
  });
}
```

### Logging

```typescript
import logger from './utils/logger';

logger.info('User created', { userId: '123' });
logger.error('Database error', { error: err });
logger.warn('Slow query', { duration: 5000 });
```

### Testing

```typescript
// Unit test example
describe('UserService', () => {
  let userService: UserService;
  
  beforeEach(() => {
    userService = new UserService(mockRepository);
  });
  
  it('should create a new user', async () => {
    const user = await userService.create(mockUserData);
    expect(user.email).toBe(mockUserData.email);
  });
});

// Run tests
npm test
npm run test:watch
npm run test:coverage
```

---

## NEXT STEPS

1. **Start Phase 0** - Setup development environment
2. **Complete authentication** - Build the foundation
3. **Setup database** - Ensure all tables are created
4. **Implement core APIs** - One phase at a time
5. **Test thoroughly** - Use provided test checklist
6. **Deploy** - Follow deployment guide

---

## QUICK REFERENCE

### Important Ports
- Backend API: 3000
- PostgreSQL: 5432
- Redis: 6379

### Important Commands
```bash
npm run dev           # Start development
npm run build         # Build for production
npm test              # Run tests
npm run lint          # Check code style
npm run type-check    # TypeScript validation
npm run db:studio     # Open database GUI
```

### File Locations Reference
- **Controllers** - Handle HTTP requests
- **Services** - Business logic
- **Repositories** - Database queries
- **Routes** - Endpoint definitions
- **Middleware** - Request processing
- **Utils** - Helper functions

---

**Good luck with your MediFind backend development! 🚀**

For questions or clarifications, refer back to the use case documents in the `docs/usecases/` folder.
