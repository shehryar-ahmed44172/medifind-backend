# 🔗 EXTERNAL APIs & INTEGRATIONS FOR MEDIFIND

**Project:** MediFind Emergency Response System  
**Date:** March 31, 2026  
**Status:** Firebase-Free Edition ✅

---

## ⚠️ **IMPORTANT - Firebase Constraint**

```
❌ Firebase Cloud Messaging (FCM)        → Replaced with OneSignal
❌ Firebase Cloud Storage                 → Replaced with AWS S3
❌ Firebase Authentication                → Already using JWT
❌ Firebase Realtime Database             → Using Socket.io + Redis

✅ All Firebase services removed as requested
✅ Using enterprise-grade alternatives
✅ Same functionality, better control
```

---

## 📋 **EXTERNAL API CHECKLIST**

### **LEGEND:**
- ✅ **INTEGRATED** - Already in project
- � **100% FREE** - No payment ever required
- 🆓 **FREE TIER** - Free for Phase 1, may need payment later
- 🔄 **REQUIRED** - Must have for Phase 1
- ⚠️ **DEFERRED** - Important for Phase 2+ (skip for now)
- ⭐ **CRITICAL** - Cannot work without this
- 🔐 **SENSITIVE** - Requires security/HIPAA compliance

---

## 💡 **FREE API STRATEGY FOR PHASE 1**

**Goal:** Build and launch Phase 1 MVP with **ZERO external payment**

**100% FREE Services:**
```
✅ PostgreSQL (Self-hosted locally)          → Database
✅ PostGIS 3.6 (Built-in)                    → Geolocation
✅ Socket.io (npm package)                   → Real-time updates
✅ JWT Authentication (no service)           → Auth
✅ LocalStorage or local file system         → Medical reports
✅ Web Speech API (browser native)           → Voice alerts
✅ OpenStreetMap + Leaflet                   → Maps (free alternative)
✅ Node.js + Express (npm packages)          → Backend runtime
Total Cost: $0/month ✅
```

**Free Tier Services (for testing/small MVP):**
```
🆓 OneSignal (10,000 notifications/month)    → Push notifications
🆓 Google Maps API (28,000 requests/month)   → Maps & routing (if preferred over OpenStreetMap)
🆓 Mailgun (100 emails/day)                  → Email notifications
Total Cost: $0/month ✅ (until you exceed free tier)
```

**Deferred to Phase 2 (when monetizing):**
```
⏳ AWS S3 ($10-20/month)                     → Professional file storage
⏳ Twilio ($20-50/month)                     → SMS alerts
⏳ Google Cloud TTS ($5-10/month)            → Professional voice
⏳ SendGrid ($20/month)                      → Professional email
⏳ Redis Cloud ($15/month)                   → Advanced caching
Phase 2 Cost: $55-110/month (after monetization)
```

---

## 🎯 **PHASE 1 CRITICAL APIs - FREE EDITION (Week 2-4)**

### **1️⃣ MAPS & GEOLOCATION 🗺️ [⭐ CRITICAL] - 100% FREE**

#### **OPTION A: OpenStreetMap + Leaflet (Recommended for Phase 1 - FREE)**
| Feature | Details |
|---------|----------|
| **Purpose** | Display maps, show responder location, route navigation |
| **Cost** | 💰 100% FREE |
| **Security** | ✅ HTTPS enabled |
| **Library** | Leaflet.js (npm: leaflet) |
| **Geolocation** | PostGIS for SQL queries |

**Why Use This:**
- Zero cost, open source
- Full control, no vendor lock-in
- PostGIS already installed for SQL queries
- Works perfectly for Phase 1 MVP

#### **OPTION B: Google Maps API (Free Tier - up to 28,000 requests/month)**
| Feature | Details |
|---------|----------|
| **Purpose** | Display maps, directions, geocoding |
| **Cost** | 🆓 FREE for first 28,000 requests/month |
| **Security** | ✅ HTTPS |
| **Use Case** | If you prefer Google's UX over OpenStreetMap |

| API | Purpose | Status | Priority | Cost | Security |
|-----|---------|--------|----------|------|----------|
| **PostGIS (PostgreSQL)** | Geospatial queries (nearest responder) | ✅ INTEGRATED | ⭐ CRITICAL | 💰 FREE (Open Source) | ✅ Local DB |
| **OpenStreetMap + Leaflet** | Display maps, route navigation (RECOMMENDED) | 🔄 REQUIRED | ⭐ CRITICAL | 💰 FREE | ✅ HTTPS |
| **Google Maps API** | Alternative if you prefer Google (free tier available) | 🔄 OPTIONAL | 🔶 HIGH | 🆓 FREE (up to 28k/month) | ✅ HTTPS |

**What they do:**
- Locate nearest responder using GPS & distance calculation (via PostGIS SQL)
- Show responder route to patient on map (via OpenStreetMap)
- Calculate ETA using haversine formula in PostGIS
- Convert GPS coordinates to readable address (Nominatim service - also free)

---

### **2️⃣ PUSH NOTIFICATIONS (No Firebase) 📱 [⭐ CRITICAL]**

**Choose ONE Service:**

#### **OPTION A: OneSignal (Recommended)**
| Feature | Details |
|---------|---------|
| **Purpose** | Push notifications to mobile app | 
| **Cost** | FREE (10k notifications/month), then $99/month |
| **Security** | ✅ AES-256 encryption |
| **HIPAA** | ✅ Ready |

#### **OPTION B: Pusher**
| Feature | Details |
|---------|---------|
| **Purpose** | Real-time messaging + push | 
| **Cost** | $0-$99/month |
| **Security** | ✅ TLS encryption |
| **HIPAA** | ✅ Ready |

#### **OPTION C: Custom with Twilio**
| Feature | Details |
|---------|---------|
| **Purpose** | SMS + Phone notifications | 
| **Cost** | $0.007/SMS |
| **Security** | ✅ HIPAA ready |
| **HIPAA** | ✅ Ready |

### **2B: SMS Alerts (DEFERRED to Phase 2) 📞**

| API | Purpose | Status | Priority | Cost | Security |
|-----|---------|--------|----------|------|----------|
| **Twilio SMS** | Send SMS alerts to responders (BACKUP) | ⏳ DEFERRED | 🔶 HIGH | $0.0075/SMS | ✅ HIPAA ready |
| **AWS SNS** | SMS alternative (BACKUP) | ⏳ DEFERRED | 🔶 HIGH | $0.50/SMS | ✅ HIPAA ready |
| **Vonage (Nexmo)** | SMS alternative (BACKUP) | ⏳ DEFERRED | 🔶 HIGH | $0.04/SMS | ✅ HIPAA ready |

**Why Skip for Phase 1?**
- Phase 1 focus: Mobile app + web dashboard (no SMS needed)
- Push notifications via OneSignal (free tier) are sufficient
- SMS useful for:
  - Users without smartphones
  - Backup alerts (when app is not running)
- **Decision:** Implement Phase 2 when needed

**When to Add SMS (Phase 2):**
```
Use Case: SMS backup if mobile push fails
Example message:
"🚨 EMERGENCY: John Doe triggered SOS
Location: Hospital St, NYC
ETA: 8 minutes"

Cost: ~$0.01-0.05 per SMS
Estimate: 50-100 SOS emergencies = $0.50-5/month
```

---

### **3️⃣ VOICE & TEXT-TO-SPEECH 🎤 [For Accessibility - Mixed Free/Paid]**

#### **OPTION A: Web Speech API (100% FREE - Recommended for Phase 1)**
| Feature | Details |
|---------|----------|
| **Purpose** | Browser-native text-to-speech (no API key needed) |
| **Cost** | 💰 100% FREE |
| **Security** | ✅ Works entirely in-browser |
| **Device** | Works on most modern devices (Chrome, Safari, Edge) |
| **Voice** | Built-in system voices |

**Perfect for Phase 1!**
```javascript
// Example: Responder hears medical alert
const alert = `Emergency Alert. Patient John Doe.
Cardiac emergency. Age 65, Diabetic, 
Allergic to Penicillin. Distance 2 km, ETA 8 minutes.`;

const speech = new SpeechSynthesisUtterance(alert);
speechSynthesis.speak(speech);
// Zero cost, no API needed ✅
```

#### **OPTION B: Google Cloud TTS (DEFERRED to Phase 2 - Premium quality)**
| Feature | Details |
|---------|----------|
| **Purpose** | Professional-quality voice (better quality than Web Speech API) |
| **Cost** | ⏳ $4-16 per 1M characters |
| **Use Case** | Phase 2+ when you want premium voice quality |

#### **OPTION C: Google Speech-to-Text (100% FREE - for voice commands)**
| Feature | Details |
|---------|----------|
| **Purpose** | Allow users to speak commands ("SOS", medical info) |
| **Cost** | 💰 100% FREE (30 minutes/month quota for testing) |
| **Web API** | Use browser Web Speech API (free) |

| API | Purpose | Status | Priority | Cost | Security |
|-----|---------|--------|----------|------|----------|
| **Web Speech API** | Browser native TTS & STT (RECOMMENDED) | 🔄 REQUIRED | ⭐ CRITICAL | 💰 FREE | ✅ In-browser |
| **Google Cloud TTS** | Premium voice quality (optional upgrade) | ⏳ DEFERRED | 🔶 HIGH | $4-16/1M chars | ✅ HIPAA ready |

**What they do (Phase 1):**
- ✅ Convert patient's medical info → voice alert using Web Speech API
- ✅ Allow deaf users to control app with visual cues
- ✅ Generate TTS alerts (completely free, no API key)
- ⏳ Professional quality voice (defer to Phase 2 if needed)

---

### **4️⃣ FILE STORAGE (Medical Reports - No Firebase) 🗂️ [🔐 SENSITIVE]**

**Choose ONE Service:**

#### **OPTION A: AWS S3 (Recommended for Healthcare)**
| Feature | Details |
|---------|---------|
| **Compliance** | HIPAA BAA available |
| **Encryption** | AES-256 (at rest + in transit) |
| **Cost** | $0.023/GB storage |
| **Industry** | Healthcare standard |

#### **OPTION B: Azure Blob Storage**
| Feature | Details |
|---------|---------|
| **Compliance** | HIPAA BAA available |
| **Encryption** | AES-256 |
| **Cost** | $0.0184/GB |
| **Integration** | Microsoft stack |

#### **OPTION C: DigitalOcean Spaces**
| Feature | Details |
|---------|---------|
| **Compliance** | Encryption enabled |
| **Cost** | $5/month (250GB) |
| **S3 Compatible** | Yes |
| **Simplicity** | Easy to use |

| API | Purpose | Status | Priority | Cost | Security |
|-----|---------|--------|----------|------|----------|
| **AWS S3 + Encryption** | Store medical reports (HIPAA compliant) | 🔄 REQUIRED | ⭐ CRITICAL | $0.023/GB | ✅ AES-256 encryption |
| **Azure Blob Storage** | Alternative cloud storage | 🔄 REQUIRED | 🔶 HIGH | $0.0184/GB | ✅ Encrypted |
| **DigitalOcean Spaces** | Simpler S3 alternative | 🔄 REQUIRED | 🔶 HIGH | $5/month | ✅ Encrypted |

**What they do:**
- Securely store patient medical report images (X-rays, prescriptions)
- Encryption at rest + in transit
- Only responder can access during emergency
- HIPAA compliance required
- NO Firebase Cloud Storage: ✅ Removed as requested

**Security Requirements:**
```
✅ Encryption at rest (AES-256)
✅ Encryption in transit (TLS 1.2+)
✅ Access control (Only responder during emergency)
✅ Audit logging (Who accessed what, when)
✅ Data retention policy (Delete after X days)
✅ HIPAA BAA (Business Associate Agreement)
```

---

## 🔄 **PHASE 2 RECOMMENDED APIs (Week 5+)**

### **5️⃣ EMAIL SERVICE ✉️**

| API | Purpose | Status | Priority | Cost | Security |
|-----|---------|--------|----------|------|----------|
| **SendGrid** | Send registration confirmation, password reset | ⚠️ NEEDED | 🟡 MEDIUM | $20-100/month | ✅ HIPAA ready |
| **AWS SES** | Alternative email service | ⚠️ NEEDED | 🟡 MEDIUM | $0.10/1000 | ✅ HIPAA ready |
| **Mailgun** | Another alternative | ⚠️ NEEDED | 🟡 MEDIUM | $35/month | ✅ HIPAA ready |

**What they do:**
- Send account verification emails
- Send password reset links
- Send emergency reports via email
- Send medical summary to doctors

---

### **6️⃣ CACHING & REAL-TIME DATABASE 🚀**

| API | Purpose | Status | Priority | Cost | Security |
|-----|---------|--------|----------|------|----------|
| **Redis Cloud** | Cache responder locations, emergency data | ⚠️ OPTIONAL | 🟡 MEDIUM | FREE-$15/month | ✅ TLS encryption |
| **Socket.io (WebSocket)** | Real-time live tracking | ✅ PREPARED | ⭐ CRITICAL | FREE (open source) | ✅ Built-in |

**What they do:**
- Cache responder locations for fast querying
- Real-time position updates
- Real-time emergency status updates

---

### **7️⃣ ANALYTICS & MONITORING 📊**

| API | Purpose | Status | Priority | Cost | Security |
|-----|---------|--------|----------|------|----------|
| **Sentry** | Error tracking & monitoring | ⚠️ NICE-TO-HAVE | 🟢 LOW | FREE-$29/month | ✅ End-to-end encryption |
| **DataDog** | Performance monitoring | ⚠️ NICE-TO-HAVE | 🟢 LOW | $15-50/month | ✅ Encrypted |
| **LogRocket** | Session replay & debugging | ⚠️ NICE-TO-HAVE | 🟢 LOW | $99/month | ✅ Encrypted |

**What they do:**
- Track errors & crashes
- Monitor API performance
- Track response times
- Debug issues in mobile app

---

### **8️⃣ PAYMENT & BILLING 💳 [Optional]**

| API | Purpose | Status | Priority | Cost | Security |
|-----|---------|--------|----------|------|----------|
| **Stripe** | Payment processing for premium features | ⚠️ OPTIONAL | 🟢 LOW | 2.9% + $0.30 | ✅ PCI DSS Level 1 |
| **Razorpay** | Alternative payment (India) | ⚠️ OPTIONAL | 🟢 LOW | 2% | ✅ PCI DSS |

**What they do:**
- Accept payments for premium responder subscriptions
- Handle refunds
- Invoice generation

---

## 📊 **INTEGRATION MATRIX - UPDATED (No Firebase)**

```
┌──────────────────────────────────────────────────────┐
│ PHASE 1 (Week 2-4): MVP = 70-75% of requirements    │
├──────────────────────────────────────────────────────┤
│ STATUS    │ SERVICE            │ WHEN NEEDED  │ COST  │
├───────────┼────────────────────┼──────────────┼───────┤
│ ✅ HAVE   │ PostgreSQL         │ ALWAYS       │ FREE  │
│ ✅ HAVE   │ PostGIS            │ ALWAYS       │ FREE  │
│ ✅ HAVE   │ Socket.io          │ Week 3+      │ FREE  │
│ ✅ HAVE   │ JWT Auth           │ ALWAYS       │ FREE  │
│           │                    │              │       │
│ 🔄 NEEDED │ Google Maps API    │ Week 3-4     │ $20-50│
│ 🔄 NEEDED │ OneSignal Push     │ Week 2       │ FREE  │
│ 🔄 NEEDED │ AWS S3 Storage     │ Week 2       │ $10-20│
│ 🔄 NEEDED │ Twilio SMS         │ Week 3-4     │ $20-50│
│ 🔄 NEEDED │ Google TTS         │ Week 4       │ $5-10 │
│           │                    │              │       │
│ ⚠️ PHASE2 │ SendGrid Email     │ Week 5       │ $20   │
│ ⚠️ PHASE2 │ Redis Cloud        │ Week 5       │ $15   │
│ ⚠️ PHASE2 │ Sentry Monitor     │ Week 5       │ $29   │
│           │                    │              │       │
│ ❌ REMOVED│ Firebase FCM       │ -            │ N/A   │
│ ❌ REMOVED│ Firebase Storage   │ -            │ N/A   │
└──────────────────────────────────────────────────────┘
```

---

## 💰 **ESTIMATED COSTS (Monthly - No Firebase)**

### **Phase 1 MVP (Minimum Viable Product)**

```
FREE Services:
  ✅ PostgreSQL (Self-hosted)         $0
  ✅ PostGIS (Built-in)               $0
  ✅ OneSignal (Free tier)            $0  (10k notifications/month)
  ✅ Socket.io                        $0
  ✅ All open-source libraries        $0
                                      ───
  Subtotal (FREE)               $0-50

Paid Services (Minimal):
  🔄 Google Maps (100 calls/day)      $20-30/month
  🔄 Twilio SMS (Emergency only)      $20-50/month
  🔄 AWS S3 (Hospital grade)          $10-20/month
  🔄 Google TTS (Minimal)             $5-10/month
                                      ────────
  Subtotal (PAID)               $55-110/month

TOTAL PHASE 1:              $55-110/month
```

### **Phase 2 with Monitoring**

```
Additional:
  ⚠️ Email Service (SendGrid)         $20/month
  ⚠️ Redis Cloud                      $15/month
  ⚠️ Sentry Monitoring                $29/month
                                      ────────
  Phase 2 Total:         $119-174/month
```

---

## 🏗️ **ARCHITECTURE: API INTEGRATION POINTS**

```
MEDIFIND BACKEND
│
├─► google-maps-api
│   ├── Find nearest responder (distance)
│   ├── Calculate ETA
│   └── Show route navigation
│
├─► firebase-fcm (Push Notifications)
│   ├── Send to responder app
│   ├── Send to patient app
│   └── Send to caregiver app
│
├─► twilio-sms
│   ├── Backup alert if app fails
│   ├── SMS to registered number
│   └── 2FA (optional)
│
├─► aws-s3 (File Storage)
│   ├── Upload medical reports
│   ├── Store with encryption
│   └── Generate download links
│
├─► google-tts (Text-to-Speech)
│   ├── Medical profile → voice
│   └── Alert → voice message
│
├─► sendgrid (Email)
│   ├── Account signup confirmation
│   ├── Password reset
│   └── Emergency summary report
│
└─► redis (Caching)
    ├── Cache responder locations
    ├── Cache emergency data
    └── Session management
```

---

## 🚀 **IMPLEMENTATION ORDER (Week by Week)**

### **Week 1 (DONE) ✅**
```
✅ PostgreSQL + PostGIS
✅ Authentication (JWT)
✅ Database schema (10 tables)
✅ TypeScript setup
```

### **Week 2 - Medical Profile**
```
✅ Medical profile CRUD
🔄 Firebase Cloud Storage (start)
🔄 File upload integration
```

### **Week 3 - SOS Emergency**
```
✅ Emergency endpoints
🔄 Google Maps API (nearest responder)
🔄 Firebase FCM (push notifications)
🔄 Twilio SMS (backup alerts)
🔄 Socket.io (real-time updates)
```

### **Week 4 - Live Tracking**
```
✅ Tracking endpoints
🔄 Google Maps Distance/Directions
🔄 ETA calculation
🔄 Real-time responder location
🔄 Google TTS (voice alerts)
```

### **Week 5+ - Polish**
```
🔄 SendGrid (email)
🔄 Redis (caching)
🔄 Sentry (monitoring)
🔄 Analytics
```

---

## 🔑 **UPDATED .env FILE (No Firebase)**

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/medifind_db

# Maps & Geolocation
GOOGLE_MAPS_API_KEY=your_key_here

# Push Notifications (OneSignal - Replaces Firebase FCM)
ONESIGNAL_APP_ID=your_app_id
ONESIGNAL_API_KEY=your_api_key

# File Storage (AWS S3 - Replaces Firebase Storage)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=medifind-medical-reports

# SMS Alerts (Twilio)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# Text-to-Speech
GOOGLE_TTS_API_KEY=your_key

# Email (Optional - Phase 2)
SENDGRID_API_KEY=optional

# Caching (Optional - Phase 2)
REDIS_URL=redis://localhost:6379

# Monitoring (Optional - Phase 2)
SENTRY_DSN=optional
```

---

## ✅ **SECURITY CHECKLIST FOR APIs**

```
☑ All credentials in .env (never hardcoded)
☑ HTTPS only (SSL/TLS 1.2+)
☑ API rate limiting enabled
☑ HIPAA complaints checked
☑ Data encryption (at rest + in transit)
☑ Access control (tokens, keys, permissions)
☑ Audit logging (who accessed what, when)
☑ Regular security patches
☑ API key rotation (quarterly)
☑ Fallback services (if API fails)
```

---

## 🎯 **QUESTIONS FOR YOU**

1. **Should we integrate all APIs or prioritize?**
   - Recommended: Start with Maps + FCM + S3 for Week 3-4

2. **Which cloud provider preferred?**
   - Google Cloud (Maps + TTS)
   - AWS (S3, SES)
   - Firebase (FCM, Storage)
   - Azure (Storage)

3. **Budget constraints?**
   - Minimal: $50-100/month
   - Optimal: $150-200/month
   - Premium: $300+/month

4. **HIPAA compliance requirement?**
   - Medical data is sensitive
   - All storage must be HIPAA-compliant
   - Recommend AWS S3 + encryption

5. **Ready to create detailed integration plan for Week 2-3?**

