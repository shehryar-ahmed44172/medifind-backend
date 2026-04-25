# MediFind: Complete Software Requirements Document (SRD)

## Project Overview
MediFind is a specialized emergency response and medical monitoring platform designed for patients with disabilities, their caregivers, and emergency responders. The system provides real-time SOS alerts, accessibility features, live tracking, and secure communication channels.

---

## MODULE 1: Authentication & Account Management
**FR1.1**: The system shall allow users to register accounts using email, full name, phone number, and a specific role selection.
**FR1.2**: The system shall allow secure login using email and password credentials with JWT-based session management.
**FR1.3**: The system shall support three distinct mobile application roles:
- **Patient**: Primary users who trigger SOS and manage medical profiles.
- **Caregiver**: Users who monitor connected patients and receive emergency alerts.
- **Emergency Responder**: Certified individuals who respond to SOS alerts and view patient medical data.
**FR1.4**: The system shall provide an Administrator role accessible via a secure web dashboard for managing users and verifying responders.
**FR1.5**: The system shall support secure password reset functionality via email verification.
**FR1.6**: The system shall implement Role-Based Access Control (RBAC) to ensure users only access features relevant to their assigned role.

---

## MODULE 2: Medical Profile & Report Management
**FR2.1**: The system shall allow patients to create and maintain a digital medical profile.
**FR2.2**: The medical profile shall include Blood Type, Allergies, Chronic Diseases, Current Medications, and Disability Type (e.g., Deaf, Physically Disabled).
**FR2.3**: The system shall provide a Medical Report Upload feature allowing patients to upload images (Camera/Gallery) of clinical records.
**FR2.4**: The system shall securely store medical reports in the cloud and allow users to view, rename, or delete them.
**FR2.5**: The system shall automatically transmit the patient's medical summary and active reports to the assigned responder during an active SOS event.
**FR2.6**: The system shall ensure HIPAA-compliant data isolation, restricting medical report visibility only to the patient and their active responder.

---

## MODULE 3: Accessibility & Inclusive Design
**FR3.1**: The system shall provide specialized UI modes based on the user's disability type (e.g., Visual Accessibility for Deaf users).
**FR3.2**: The system shall support high-contrast themes and dynamic font scaling (up to 150%) via global providers.
**FR3.3**: The system shall implement Haptic Feedback (vibrations) for critical actions such as SOS countdowns and incoming message alerts.
**FR3.4**: The system shall support speech-impaired users by enabling full emergency activation and communication without requiring voice input.
**FR3.5**: The system shall provide large-scale, neumorphic buttons to assist users with motor impairments.

---

## MODULE 4: SOS Emergency & Real-Time Response
**FR4.1**: The system shall provide a one-tap or long-press "Massive SOS" button on the home screen.
**FR4.2**: The system shall automatically capture and transmit high-accuracy GPS coordinates during SOS activation.
**FR4.3**: The system shall provide a 10-second "Accidental Trigger" cancellation window with a countdown timer.
**FR4.4**: The system shall support emergency categorization (e.g., Cardiac, Respiratory, Fall, Trauma).
**FR4.5**: The system shall notify all nearby available responders immediately upon SOS confirmation.
**FR4.6**: The system shall notify all connected caregivers instantly when their patient triggers an SOS.

---

## MODULE 5: Responder Assignment & Voice Alerts
**FR5.1**: The system shall assign the first responder who accepts the request, immediately closing it for others to prevent duplicate response.
**FR5.2**: The system shall provide a Hands-Free Voice Alert service using Text-to-Speech (TTS) to read patient details to the responder while driving.
**FR5.3**: The voice alert shall include the emergency type, patient location, and a summary of critical medical information (e.g., "Patient has cardiac emergency and is allergic to Penicillin").
**FR5.4**: The system shall allow responders to toggle their availability status (Online/Offline) to control alert reception.

---

## MODULE 6: Live Tracking & Map Navigation
**FR6.1**: The system shall track the assigned responder's location in real-time using WebSockets.
**FR6.2**: The system shall display the responder's route and Estimated Time of Arrival (ETA) to both the Patient and the Caregiver.
**FR6.3**: The system shall provide an interactive map interface for caregivers to monitor the safety status and location of their linked patients.
**FR6.4**: The system shall provide turn-by-turn navigation hooks for responders to reach the patient's exact location.

---

## MODULE 7: Chat Communication Module
**FR7.1**: The system shall provide a secure, real-time chat system between Patients and their connected Caregivers using Socket.io.
**FR7.2**: The system shall support many-to-many relationships (One patient to many caregivers; one caregiver to many patients).
**FR7.3**: The system shall maintain private chat silos, ensuring that messages in one caregiver-patient room are never visible to others.
**FR7.4**: The system shall provide instant message notifications with haptic alerts for both parties.
**FR7.5**: The system shall automatically archive chat history for continuity of care.

---

## MODULE 8: Advanced UI & Navigation Architecture
**FR8.1**: The system shall utilize a unified Sidebar (AppDrawer) navigation system to maximize screen real estate for all roles.
**FR8.2**: The system shall implement Stateful Routing (StatefulShellRoute) to preserve navigation history and prevent UI flickering during transitions.
**FR8.3**: The system shall provide role-specific "Quick Action Grids" on dashboards for high-speed navigation to critical features.
**FR8.4**: The system shall ensure 60FPS performance by using optimized rendering techniques (RepaintBoundaries) on list-heavy screens.

---

## MODULE 9: Admin Management & System Oversight
**FR9.1**: The system shall provide a secure Web-based Admin Dashboard for system oversight.
**FR9.2**: The Admin shall be able to list, filter, and search all registered users across all roles (Patient, Caregiver, Responder).
**FR9.3**: The Admin shall have the authority to deactivate or delete user accounts for security or compliance reasons.
**FR9.4**: The system shall implement a Responder Verification Workflow, where the Admin reviews pending responder applications.
**FR9.5**: The Admin shall be able to verify responders (enabling them to receive SOS alerts) or reject them with a provided reason.
**FR9.6**: The system shall provide real-time dashboard statistics, including total user count, total emergencies triggered, currently active emergencies, and the count of verified responders online.
**FR9.7**: The system shall ensure that only users with the 'ADMIN' role can access administrative endpoints and the dashboard.

---

## Technical Stack Summary
- **Mobile**: Flutter (Riverpod for state management, GoRouter for navigation).
- **Backend**: Node.js, Express, TypeScript.
- **Database**: PostgreSQL with PostGIS (for geospatial queries), Prisma ORM.
- **Real-Time**: Socket.io (WebSockets).
- **Security**: JWT Authentication, SSL Encryption, HIPAA-compliant storage logic.
