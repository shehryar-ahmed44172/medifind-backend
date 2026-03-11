# PostgreSQL Database Schema - Visual Reference & Algorithms

**Document Version:** 1.0  
**Database:** PostgreSQL 12+  
**ORM:** Prisma 5.x

---

## DATABASE ENTITY RELATIONSHIP DIAGRAM

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│                          DATABASE SCHEMA OVERVIEW                         │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐         ┌─────────────────────────┐
│      USERS          │◄───────►│   MEDICAL_PROFILES      │
├─────────────────────┤         ├─────────────────────────┤
│ id (PK)             │         │ id (PK)                 │
│ fullName            │         │ userId (FK→USERS)       │
│ email (UNIQUE)      │         │ bloodType               │
│ phoneNumber(UNIQUE) │         │ chronicDiseases (JSON)  │
│ passwordHash        │         │ allergies (JSON)        │
│ role (ENUM)         │         │ medications (JSON)      │
│ profileImageUrl     │         │ emergencyContacts(JSON) │
│ isActive            │         │ medicalHistory          │
│ lastLogin           │         │ createdAt               │
│ createdAt           │         │ updatedAt               │
│ updatedAt           │         └─────────────────────────┘
└──────────┬──────────┘
           │
    ┌──────┴───────┬───────────┬──────────────────┐
    │              │           │                  │
    │              │           │                  │
    ▼              ▼           ▼                  ▼
┌─────────┐  ┌──────────┐  ┌──────────────────┐ ┌────────────────────┐
│EMERGENCIES ASSIGNED  │  │CAREGIVER_LINKS   │ │RESPONDER_TRACKING  │
│(patientId)  RESPONDERS│  ├──────────────────┤ ├────────────────────┤
├─────────┤  (responderId)  │ id (PK)          │ │ id (PK→USERS)      │
│ id      │  │              │ caregiverId (FK) │ │ fullName           │
│ userId  │  │              │ patientId (FK)   │ │ phoneNumber        │
│ status  │  │              │ accessLevel      │ │ latitude           │
│ type    │  │              │ createdAt        │ │ longitude          │
│ lat/lon │  │              └──────────────────┘ │ status             │
│ accuracy│  │                                   │ isActive           │
│ ...     │  └───────────────────────────────────┤ lastUpdated        │
└─────────┘                                      └────────────────────┘
    │
    ├──────────────────┐
    │                  │
    ▼                  ▼
┌─────────────────┐  ┌──────────────────────┐
│LOCATION_UPDATES │  │EMERGENCY_STATUS_HIST │
├─────────────────┤  ├──────────────────────┤
│ id (PK)         │  │ id (PK)              │
│ emergencyId(FK) │  │ emergencyId (FK)     │
│ latitude        │  │ previousStatus       │
│ longitude       │  │ newStatus            │
│ accuracy        │  │ changedBy            │
│ speed           │  │ reason               │
│ timestamp       │  │ timestamp            │
└─────────────────┘  └──────────────────────┘

┌──────────────────────┐  ┌──────────────────┐
│  NOTIFICATIONS       │  │  AUDIT_LOGS      │
├──────────────────────┤  ├──────────────────┤
│ id (PK)              │  │ id (PK)          │
│ userId (FK)          │  │ userId (FK)      │
│ type (ENUM)          │  │ action           │
│ title                │  │ entityType       │
│ message              │  │ entityId         │
│ data (JSON)          │  │ oldValues (JSON) │
│ isRead               │  │ newValues (JSON) │
│ readAt               │  │ timestamp        │
│ createdAt            │  └──────────────────┘
└──────────────────────┘
```

---

## TABLE RELATIONSHIPS IN DETAIL

### 1. USERS Table (Core)

**Purpose:** Stores all user accounts regardless of role

**Fields:**
```
id:              UUID (auto-generated)
fullName:        String, 100 chars
email:           String, auto-indexed, unique
phoneNumber:     String, auto-indexed, unique
passwordHash:    String (bcrypt hashed)
role:            ENUM: PATIENT | RESPONDER | CAREGIVER | ADMIN
profileImageUrl: String or NULL
isActive:        Boolean (default: TRUE)
lastLogin:       DateTime or NULL
createdAt:       DateTime (auto-set)
updatedAt:       DateTime (auto-set)
```

**Indexes:**
- `email` (fast auth lookups)
- `phoneNumber` (duplicate prevention)
- `role` (quick role-based queries)
- `isActive` (exclude inactive users)

**Relationships:**
- 1→Many: Emergencies (as patient)
- 1→Many: Emergencies (as responder)
- 1↔1: MedicalProfile
- 1→Many: CaregiverLinks (as caregiver)
- 1→Many: CaregiverLinks (as patient)
- 1→1: RespondersTracking

---

### 2. MEDICAL_PROFILES Table

**Purpose:** Store sensitive medical data for patients only

**Fields:**
```
id:                VARCHAR(50) PK
userId:            FK→USERS(id), UNIQUE
bloodType:         VARCHAR(10) nullable
chronicDiseases:   JSONB array (flexible structure)
allergies:         JSONB array
medications:       JSONB array
emergencyContacts: JSONB array
medicalHistory:    TEXT nullable (long-form)
createdAt:         DateTime
updatedAt:         DateTime
```

**JSONB Structure Examples:**

```json
// chronicDiseases example
[
  {"id": 1, "name": "Diabetes Type 2", "diagnosedYear": 2015, "status": "ACTIVE"},
  {"id": 2, "name": "Hypertension", "diagnosedYear": 2018, "status": "CONTROLLED"}
]

// allergies example
[
  {"id": 1, "name": "Penicillin", "severity": "HIGH", "reaction": "Anaphylaxis"},
  {"id": 2, "name": "Peanuts", "severity": "SEVERE", "reaction": "Anaphylaxis"}
]

// medications example
[
  {
    "id": 1,
    "name": "Metformin",
    "dosage": 500,
    "unit": "mg",
    "frequency": "2x daily",
    "startDate": "2015-01-01",
    "reason": "Diabetes management"
  },
  {
    "id": 2,
    "name": "Lisinopril",
    "dosage": 10,
    "unit": "mg",
    "frequency": "Once daily",
    "startDate": "2018-06-15",
    "reason": "BP control"
  }
]

// emergencyContacts example
[
  {
    "id": 1,
    "name": "Sarah Johnson",
    "phone": "+1-555-000-1234",
    "relation": "Spouse",
    "priority": 1
  },
  {
    "id": 2,
    "name": "Dr. Michael Chen",
    "phone": "+1-555-000-5678",
    "relation": "Primary Doctor",
    "priority": 2
  }
]
```

**Access Control:**
- Only patient themselves can view
- Responders get limited view during emergency
- Caregivers get view access if linked

---

### 3. EMERGENCIES Table (Critical)

**Purpose:** Track all emergency incidents

**Fields:**
```
id:                     VARCHAR(50) PK
userId:                 FK→USERS (patient who triggered)
status:                 ENUM (see below)
emergencyType:          VARCHAR(30): MEDICAL | FALL | ACCIDENT | OTHER
latitude:               DOUBLE PRECISION (required)
longitude:              DOUBLE PRECISION (required)
accuracy:               FLOAT nullable (GPS accuracy in meters)
assignedResponderId:    FK→USERS nullable (responder assigned)
estimatedArrivalTime:   INTEGER nullable (minutes)
voiceAlertGenerated:    BOOLEAN (default: FALSE)
additionalInfo:         TEXT (patient notes)
createdAt:              DateTime
updatedAt:              DateTime
resolvedAt:             DateTime nullable
```

**Status Flow:**
```
TRIGGERED → LOCATING → RESPONDER_ASSIGNED → IN_PROGRESS → ON_SITE → COMPLETED
   ↓                        ↓                                  ↓
   ESCALATED            (can skip some)                    CANCELLED
```

**Indexes:**
- `userId` (find patient emergencies)
- `status` (filter active emergencies)
- `assignedResponderId` (responder's emergencies)
- `createdAt DESC` (latest emergencies first)

**Critical Queries:**
```sql
-- Get active emergencies
SELECT * FROM emergencies 
WHERE status IN ('TRIGGERED', 'RESPONDER_ASSIGNED', 'IN_PROGRESS')
ORDER BY createdAt DESC;

-- Get emergency details with related data
SELECT e.*, 
       u.fullName as patientName,
       r.fullName as responderName,
       m.bloodType, m.allergies, m.medications
FROM emergencies e
JOIN users u ON e.userId = u.id
LEFT JOIN users r ON e.assignedResponderId = r.id
LEFT JOIN medical_profiles m ON u.id = m.userId
WHERE e.id = $1;
```

---

### 4. LOCATION_UPDATES Table

**Purpose:** Store history of patient/emergency location during emergency

**Fields:**
```
id:           VARCHAR(50) PK
emergencyId:  FK→EMERGENCIES
latitude:     DOUBLE PRECISION (required)
longitude:    DOUBLE PRECISION (required)
accuracy:     FLOAT nullable
speed:        FLOAT nullable (m/s)
timestamp:    DateTime (auto-set)
```

**Purpose:** 
- Live tracking history
- Route replay/visualization
- Performance analytics

**Queries:**
```sql
-- Get last location
SELECT * FROM location_updates 
WHERE emergencyId = $1 
ORDER BY timestamp DESC LIMIT 1;

-- Get all locations for visualization
SELECT * FROM location_updates 
WHERE emergencyId = $1 
ORDER BY timestamp ASC;

-- Get locations in last 5 minutes
SELECT * FROM location_updates 
WHERE emergencyId = $1 
AND timestamp > NOW() - INTERVAL '5 minutes'
ORDER BY timestamp DESC;
```

---

### 5. EMERGENCY_STATUS_HISTORY Table

**Purpose:** Track all status changes for audit

**Fields:**
```
id:              VARCHAR(50) PK
emergencyId:     FK→EMERGENCIES
previousStatus:  VARCHAR(30) nullable (what it was)
newStatus:       VARCHAR(30) (changed to)
changedBy:       FK→USERS (who made the change)
reason:          TEXT (why changed)
timestamp:       DateTime
```

**Example Flow:**
```
History Entry 1: TRIGGERED → LOCATING (by System)
History Entry 2: LOCATING → RESPONDER_ASSIGNED (by System, reason: "Nearest responder found within 2km")
History Entry 3: RESPONDER_ASSIGNED → IN_PROGRESS (by Responder: "John Smith")
History Entry 4: IN_PROGRESS → ON_SITE (by Responder: "John Smith")
History Entry 5: ON_SITE → COMPLETED (by Responder: "John Smith", reason: "Patient stable, admitted to hospital")
```

---

### 6. RESPONDERS_TRACKING Table

**Purpose:** Real-time location and status of responders

**Fields:**
```
id:           VARCHAR(50) PK, FK→USERS
fullName:     VARCHAR(100)
phoneNumber:  VARCHAR(20)
latitude:     DOUBLE PRECISION
longitude:    DOUBLE PRECISION
status:       ENUM: AVAILABLE | BUSY | OFF_DUTY
isActive:     BOOLEAN (on duty?)
lastUpdated:  DateTime
```

**Status Meanings:**
- `AVAILABLE`: Ready to accept emergencies
- `BUSY`: Currently handling an emergency
- `OFF_DUTY`: Not accepting assignments

**Updates:**
- Updated every time responder sends location
- Should be frequently updated (every 5-10 seconds when active)
- TTL: Marks offline if no update for 5+ minutes

---

### 7. CAREGIVER_LINKS Table

**Purpose:** Define caregiver-patient relationships

**Fields:**
```
id:           VARCHAR(50) PK
caregiverId:  FK→USERS (caregiver)
patientId:    FK→USERS (patient)
accessLevel:  ENUM: READ_ONLY | MANAGE
createdAt:    DateTime
```

**Access Levels:**
- `READ_ONLY`: View emergency status, medical info (passive monitoring)
- `MANAGE`: Can update medical info, manage emergency details

**Use Cases:**
- Family members monitoring elderly patient
- Healthcare providers coordinating care
- Multiple caregivers for one patient

---

## KEY ALGORITHMS FOR BACKEND DEVELOPMENT

### Algorithm 1: Nearest Responder Assignment

**Purpose:** Find closest available responder when emergency triggered

```pseudocode
FUNCTION findAndAssignResponder(emergencyLocation, radius_km=5, retry_attempts=3):
    
    FOR attempt = 1 TO retry_attempts:
        // Query responders within radius, sorted by distance
        responders = QueryDatabase(
            "SELECT * FROM responders_tracking WHERE
             status = 'AVAILABLE' AND isActive = TRUE AND
             distance(location, emergencyLocation) <= radius_km
             ORDER BY distance ASC"
        )
        
        IF responders.length > 0:
            selectedResponder = responders[0]  // Closest one
            
            // Update emergency
            UpdateDatabase(
                UPDATE emergencies 
                SET assignedResponderId = selectedResponder.id,
                    status = 'RESPONDER_ASSIGNED',
                    updatedAt = NOW()
            )
            
            // Update responder to BUSY
            UpdateDatabase(
                UPDATE responders_tracking 
                SET status = 'BUSY',
                    lastUpdated = NOW()
                WHERE id = selectedResponder.id
            )
            
            // Send notification to responder
            SendNotification(
                userId: selectedResponder.id,
                type: 'EMERGENCY_ALERT',
                data: emergencyDetails
            )
            
            // Send WebSocket alert
            BroadcastWebSocket(
                scope: 'responder_' + selectedResponder.id,
                event: 'EMERGENCY_ASSIGNED',
                data: emergencyDetails
            )
            
            RETURN SUCCESS
        
        ELSE IF attempt < retry_attempts:
            // Expand search radius
            radius_km += 2
            WAIT(2 seconds)
        
        ELSE:
            // Last attempt - escalate
            SendNotification(
                type: 'EMERGENCY_ESCALATION',
                severity: 'HIGH'
            )
            RETURN ESCALATION_NEEDED
    
    END FOR
    
END FUNCTION

// Database Distance Query (using PostGIS extension)
SELECT *
FROM responders_tracking
WHERE 
    status = 'AVAILABLE' 
    AND isActive = TRUE
    AND earth_distance(
        ll_to_earth(latitude, longitude),
        ll_to_earth($emergency_lat, $emergency_lon)
    ) < $radius_meters
ORDER BY earth_distance(
    ll_to_earth(latitude, longitude),
    ll_to_earth($emergency_lat, $emergency_lon)
) ASC
LIMIT 10;
```

**Performance Considerations:**
- Use spatial indexes for location queries
- Cache responder locations (update every 5-10 seconds)
- Consider priority responders (e.g., nearest hospital)

---

### Algorithm 2: Emergency Status State Machine

**Purpose:** Manage emergency status transitions with validation

```pseudocode
FUNCTION updateEmergencyStatus(emergencyId, newStatus, changedBy, reason=""):
    
    // Get current emergency
    emergency = QueryDatabase("SELECT * FROM emergencies WHERE id = ?", emergencyId)
    
    // Define allowed transitions
    allowedTransitions = {
        'TRIGGERED':            ['LOCATING', 'ESCALATED'],
        'LOCATING':             ['RESPONDER_ASSIGNED', 'ESCALATED', 'CANCELLED'],
        'RESPONDER_ASSIGNED':   ['IN_PROGRESS', 'ESCALATED', 'CANCELLED'],
        'IN_PROGRESS':          ['ON_SITE', 'ESCALATED'],
        'ON_SITE':              ['COMPLETED', 'ESCALATED'],
        'ESCALATED':            ['RESPONDER_ASSIGNED', 'ON_SITE', 'COMPLETED'],
        'COMPLETED':            [],  // Terminal state
        'CANCELLED':            []   // Terminal state
    }
    
    // Validate transition
    IF newStatus NOT IN allowedTransitions[emergency.status]:
        THROW InvalidTransitionError(
            "Cannot transition from " + emergency.status + " to " + newStatus
        )
    
    // Store status history
    InsertDatabase(
        INSERT INTO emergency_status_history
        VALUES (generate_uuid(), emergencyId, emergency.status, newStatus, changedBy, reason, NOW())
    )
    
    // Update emergency
    UpdateDatabase(
        UPDATE emergencies 
        SET status = newStatus,
            updatedAt = NOW(),
            resolvedAt = (CASE WHEN newStatus IN ('COMPLETED', 'CANCELLED') THEN NOW() ELSE NULL END)
        WHERE id = emergencyId
    )
    
    // Trigger subsequent actions based on new status
    SWITCH newStatus:
        CASE 'LOCATING':
            // Start location tracking
            InitiateLocationTracking(emergency)
            
        CASE 'RESPONDER_ASSIGNED':
            // Notify responder via WebSocket
            NotifyResponder(
                emergencyId,
                emergency.assignedResponderId,
                'EMERGENCY_ASSIGNED'
            )
            
        CASE 'IN_PROGRESS':
            // Notify patient/caregivers
            NotifyPatient(emergencyId, 'Responder on their way')
            
        CASE 'ON_SITE':
            // Stop escalation timers
            CancelEscalationTimer(emergencyId)
            
        CASE 'COMPLETED':
            // Log success
            UpdateResponderAvailability(emergency.assignedResponderId, 'AVAILABLE')
            LogMetrics(emergencyId)
            
        CASE 'CANCELLED':
            // Clean up
            UpdateResponderAvailability(emergency.assignedResponderId, 'AVAILABLE')
            NotifyStakeholders(emergencyId, 'Emergency cancelled')
    
    END SWITCH
    
    // Broadcast to connected clients
    BroadcastUpdate(
        event: 'EMERGENCY_STATUS_CHANGED',
        emergencyId: emergencyId,
        oldStatus: emergency.status,
        newStatus: newStatus
    )
    
    RETURN SUCCESS
    
END FUNCTION
```

---

### Algorithm 3: Real-Time Location Tracking

**Purpose:** Update and broadcast responder/patient location

```pseudocode
FUNCTION updateLocation(userId, emergencyId, latitude, longitude, accuracy, speed):
    
    // Validate coordinates
    IF latitude < -90 OR latitude > 90 OR longitude < -180 OR longitude > 180:
        THROW InvalidCoordinatesError("Invalid latitude/longitude")
    
    // Create location record
    locationRecord = InsertDatabase(
        INSERT INTO location_updates (
            id, emergencyId, latitude, longitude, accuracy, speed, timestamp
        ) VALUES (
            generate_uuid(), emergencyId, latitude, longitude, accuracy, speed, NOW()
        )
    )
    
    // Update responder tracking if responder
    IF UserRole == 'RESPONDER':
        UpdateDatabase(
            UPDATE responders_tracking 
            SET latitude = latitude,
                longitude = longitude,
                lastUpdated = NOW()
            WHERE id = userId
        )
    
    // Get emergency details
    emergency = QueryDatabase("SELECT * FROM emergencies WHERE id = ?", emergencyId)
    
    // Calculate distance to patient
    patientLocation = GetLastEmergencyLocation(emergencyId)
    distance = CalculateDistance(latitude, longitude, patientLocation)
    
    // Estimate ETA to patient (simplified: distance / avg_speed)
    avgResponderSpeed = 60  // km/h average
    etaMinutes = (distance / avgResponderSpeed) * 60
    
    // Update ETA in emergency record
    UpdateDatabase(
        UPDATE emergencies 
        SET estimatedArrivalTime = ROUND(etaMinutes)
        WHERE id = emergencyId
    )
    
    // Broadcast location update via WebSocket
    BroadcastWebSocket(
        scope: 'emergency_' + emergencyId,
        event: 'LOCATION_UPDATE',
        data: {
            userId: userId,
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy,
            speed: speed,
            estimatedArrivalTime: etaMinutes,
            timestamp: NOW()
        }
    )
    
    // Check if responder reached patient (within 50 meters)
    IF distance < 0.05:  // km
        // Update emergency status
        UpdateEmergencyStatus(emergencyId, 'ON_SITE', userId)
    
    RETURN locationRecord

END FUNCTION

// Haversine formula for distance calculation
FUNCTION CalculateDistance(lat1, lon1, lat2, lon2):
    
    R = 6371  // Earth radius in km
    
    dLat = (lat2 - lat1) * PI / 180
    dLon = (lon2 - lon1) * PI / 180
    
    a = sin(dLat/2)² + cos(lat1 * PI/180) * cos(lat2 * PI/180) * sin(dLon/2)²
    
    c = 2 * asin(sqrt(a))
    
    distance = R * c
    
    RETURN distance
    
END FUNCTION
```

---

### Algorithm 4: Emergency Escalation

**Purpose:** Auto-escalate if responder doesn't arrive within timeout

```pseudocode
FUNCTION startEscalationTimer(emergencyId, responseTimeLimit_minutes=10):
    
    // Create escalation task
    escalationTask = ScheduleTask(
        delay: responseTimeLimit_minutes * 60 seconds,
        callback: checkAndEscalate,
        parameters: [emergencyId]
    )
    
    // Store task ID
    UpdateDatabase(
        UPDATE emergencies 
        SET escalationTaskId = escalationTask.id
        WHERE id = emergencyId
    )
    
END FUNCTION

FUNCTION checkAndEscalate(emergencyId):
    
    emergency = QueryDatabase("SELECT * FROM emergencies WHERE id = ?", emergencyId)
    
    // Check if still needs escalation
    IF emergency.status NOT IN ('COMPLETED', 'CANCELLED', 'ON_SITE'):
        
        // Get current responder
        responder = QueryDatabase(
            "SELECT * FROM users WHERE id = ?", 
            emergency.assignedResponderId
        )
        
        // Get patient location
        patientLocation = GetLastEmergencyLocation(emergencyId)
        
        // Log escalation
        InsertDatabase(
            INSERT INTO emergency_status_history 
            VALUES (generate_uuid(), emergencyId, emergency.status, 'ESCALATED', 
                    'SYSTEM', 'No response within ' + timeLimit + ' minutes', NOW())
        )
        
        // Update status
        UpdateDatabase(
            UPDATE emergencies 
            SET status = 'ESCALATED'
            WHERE id = emergencyId
        )
        
        // Send alerts
        SendNotification(
            type: 'ESCALATION_ALERT',
            recipients: ['ADMIN', 'SUPERVISOR'],
            emergencyDetails: emergency
        )
        
        // Try to assign additional responders
        FindAndAssignResponder(emergencyId, patientLocation, radius=10)  // Larger radius
    
    END IF
    
END FUNCTION
```

---

## USEFUL SQL QUERY TEMPLATES

### Real-time Emergency Dashboard

```sql
-- Get all active emergencies with full details
SELECT 
    e.id as emergencyId,
    e.status,
    e.emergencyType,
    e.latitude,
    e.longitude,
    u_patient.fullName as patientName,
    u_patient.phoneNumber as patientPhone,
    u_responder.fullName as responderName,
    u_responder.phoneNumber as responderPhone,
    mp.bloodType,
    mp.allergies,
    e.estimatedArrivalTime,
    e.createdAt,
    EXTRACT(EPOCH FROM (NOW() - e.createdAt))/60 as minutesElapsed
FROM emergencies e
JOIN users u_patient ON e.userId = u_patient.id
LEFT JOIN users u_responder ON e.assignedResponderId = u_responder.id
LEFT JOIN medical_profiles mp ON u_patient.id = mp.userId
WHERE e.status IN ('TRIGGERED', 'RESPONDER_ASSIGNED', 'IN_PROGRESS', 'ON_SITE')
ORDER BY e.createdAt DESC;
```

### Find Responders Performance Metrics

```sql
-- Responder efficiency report
SELECT 
    r.id,
    r.fullName,
    COUNT(e.id) as total_emergencies,
    COUNT(CASE WHEN e.status = 'COMPLETED' THEN 1 END) as completed,
    AVG(EXTRACT(EPOCH FROM (e.resolvedAt - e.createdAt))/60) as avg_response_time_minutes,
    MIN(EXTRACT(EPOCH FROM (e.createdAt - 
        LAG(e.resolvedAt) OVER (PARTITION BY e.assignedResponderId ORDER BY e.createdAt)
    ))/60) as min_turnaround_time
FROM responders_tracking r
LEFT JOIN emergencies e ON r.id = e.assignedResponderId
WHERE e.resolvedAt IS NOT NULL
    AND e.resolvedAt >= NOW() - INTERVAL '30 days'
GROUP BY r.id, r.fullName
ORDER BY completed DESC;
```

---

**This document should guide your backend development. Refer back to it when building each module.**
