# MediFind Backend Architecture & Requirements Specification

This document provides a comprehensive blueprint for the upcoming **Express.js and PostgreSQL** backend for the MediFind application. It explicitly maps the finalized Frontend UI/UX (Neumorphic "SafeAid" design, dynamic timers, forms) to the corresponding database schemas and API endpoints, guaranteeing compliance with `Complete_Requirements.md`.

---

## 1. Core Technology Stack
- **Framework:** Express.js (Node.js)
- **Database:** PostgreSQL (with PostGIS extension for geo-spatial querying)
- **ORM/Query Builder:** Prisma or Sequelize (Recommended for type safety mapping to Dart models)
- **Authentication:** JWT (JSON Web Tokens)
- **Real-time Notifications:** WebSockets (Socket.io) or OneSignal

---

## 2. Database Schema (PostgreSQL)

> [!NOTE]
> These models strictly match the fields implemented in the finalized `medifind_api_client.dart` and the `medical_profile_screen.dart` UIs.

### 2.1 `Users` Table (FR1.1 - FR1.7)
Handles multi-role authentication (Patient, Responder, Caregiver, Admin).

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | Unique user identifier |
| `email` | VARCHAR | UNIQUE, NOT NULL | Login credential |
| `password_hash` | VARCHAR | NOT NULL | Bcrypt hashed password |
| `role` | ENUM | NOT NULL | 'PATIENT', 'RESPONDER', 'CAREGIVER', 'ADMIN' |
| `full_name` | VARCHAR | NOT NULL | User display name |
| `phone_number`| VARCHAR | UNIQUE | Contact number |
| `is_verified` | BOOLEAN | DEFAULT false | For Responder verification (FR5.2) |

### 2.2 `MedicalProfiles` Table (FR2.1 - FR2.11)
Directly maps to the Neumorphic Medical Profile form UI. Blind accessibility constraints have been globally removed.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `profile_id` | UUID | PRIMARY KEY | Unique profile ID |
| `user_id` | UUID | FOREIGN KEY | Links to `Users` |
| `blood_type` | VARCHAR | | e.g. 'O+', 'A-' |
| `disability_type`| ENUM | | 'NONE', 'DEAF', 'PHYSICAL' (FR3.2) |
| `allergies` | TEXT[] | | Array of allergies |
| `chronic_diseases`| TEXT[] | | Array of chronic conditions |
| `medications` | JSONB | | Active prescriptions and dosages |
| `report_urls` | TEXT[] | | AWS S3 URLs for medical reports (FR2.7) |

### 2.3 `EmergencyRequests` Table (FR4.1 - FR4.6)
Captures the SOS Lifecycle. Designed to support the 10-second cancellation window executed on the mobile UI.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `emergency_id` | UUID | PRIMARY KEY | Unique SOS ID |
| `patient_id` | UUID | FOREIGN KEY | Initiator of the SOS |
| `responder_id`| UUID | FOREIGN KEY | Assigned Responder (nullable until assigned) |
| `type` | ENUM | NOT NULL | 'CARDIAC', 'BREATHING', 'TRAUMA', 'MOBILITY', 'OTHER' |
| `location` | GEOMETRY(Point)| NOT NULL | PostGIS GPS Long/Lat (FR4.3) |
| `status` | ENUM | NOT NULL | 'ACTIVE', 'CANCELLED', 'ASSIGNED', 'RESOLVED' |
| `created_at` | TIMESTAMP | NOT NULL | Trigger timestamp |

---

## 3. RESTful API Endpoints Mapping

The frontend `Dio` interceptor logic is configured to consume these standard REST/JSON routes.

### 3.1 Authentication & Profile
- `POST /api/auth/register` (FR1.1)
- `POST /api/auth/login` (FR1.2)
- `GET /api/users/:userId` 
- `PUT /api/users/:userId/medical-profile` (FR2.2) 
  _Consumes the exact JSON payload built in our Dart `updateMedicalProfile` function._

### 3.2 Emergency SOS & Dispatch
> [!IMPORTANT]
> The mobile frontend now controls the 10-second cancellation window via `sos_countdown_screen.dart`. The `POST` request is ONLY fired to the server when the timer hits zero or is manually confirmed.

- `POST /api/emergencies` (FR4.4)
  _Payload: `{ emergencyType, latitude, longitude, additionalInfo }`_
- `PATCH /api/emergencies/:emergencyId/status` (FR4.5)
  _Allows patients to cancel an active ping before assignment._
- `GET /api/emergencies/nearby` (FR5.3)
  _Returns active emergencies using a PostGIS `ST_DWithin` radius query for nearby Responders._
- `POST /api/emergencies/:emergencyId/accept` (FR5.5, FR5.7)
  _Responder accepts. Backend must lock the record using a transaction to avoid dual assignments._

### 3.3 Tracking & Updates
- `POST /api/tracking/ping` (FR7.1)
  _Responder mobile app pings GPS data here. Backend broadcasts to Patient via WebSockets._

---

## 4. UI/UX & Requirement Reconciliation

This backend design accommodates the latest **Frontend Transformations**:

1. **Accessibility Forms (FR3)**: High contrast, large buttons, and non-verbal commands (text schemas instead of voice requirements for Deaf users) are fully respected. The database `disability_type` directly dictates how the UI renders responder communication menus.
2. **Neumorphic Display Data**: Complex Arrays (`chronic_diseases`, `allergies`) are stored natively in Postgres (`TEXT[]`) which prevents slow SQL JOIN mapping when trying to quickly render the Neumorphic chips on the Home Screen.
3. **Voice Emergency (FR6)**: The backend will fetch the `MedicalProfiles` row and generate a string: _"Emergency Type. Patient has allergies X, Y."_ This string is sent to the Responder app, where Flutter's Text-To-Speech (TTS) plugin will convert it to audio locally, satisfying FR6.3 efficiently.

## 5. Next Steps for Developer
1. Initialize an Node.js/Express repository.
2. Provision a local or managed PostgreSQL database (e.g., Supabase, Neon).
3. Enable **PostGIS** on the database instance.
4. Implement the schemas using an ORM like Prisma.
5. Create the JWT-secured endpoint routes documented above.
