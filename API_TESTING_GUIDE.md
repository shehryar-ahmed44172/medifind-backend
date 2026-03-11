## 🚀 MEDIFIND BACKEND - COMPLETE API TESTING GUIDE

**Week 1 Implementation: 5 Authentication Endpoints**

All endpoints are now ready for testing!

---

## 📋 Quick Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/register` | POST | ❌ | Create new user account |
| `/api/auth/login` | POST | ❌ | Login and get tokens |
| `/api/auth/refresh-token` | POST | ❌ | Refresh access token (⭐CRITICAL) |
| `/api/auth/logout` | POST | ❌ | Logout and revoke token |
| `/api/auth/me` | GET | ✅ | Get user profile (protected) |
| `/health` | GET | ❌ | Health check |

---

## ✅ START THE SERVER

**Terminal 1 - Start Backend:**
```bash
cd e:\Medifind_FYP_Project\medifind-backend
npm run dev
```

**Expected output:**
```
> nodemon --exec ts-node src/server.ts
[nodemon] starting `ts-node src/server.ts`
✅ Database connected successfully
✅ Server running on port 3000
📡 WebSocket available at ws://localhost:3000
🔧 Environment: development
```

---

## 🧪 API TESTING WORKFLOWS

### **Workflow 1: Complete User Authentication Flow**

#### Step 1️⃣ - Health Check
```bash
curl http://localhost:3000/health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-03-11T10:15:30.123Z",
  "uptime": 45.234,
  "environment": "development"
}
```

---

#### Step 2️⃣ - Register New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john.doe@medifind.com",
    "phoneNumber": "+1-234-567-8900",
    "password": "SecurePassword123!",
    "role": "PATIENT"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@medifind.com",
    "fullName": "John Doe",
    "role": "PATIENT"
  },
  "timestamp": "2026-03-11T10:15:32.456Z"
}
```

**✅ Test Criteria:**
- Status code: 201
- User ID is generated (UUID format)
- Email matches input
- Role is PATIENT
- Success is true

---

#### Step 3️⃣ - Login User (Get Tokens)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@medifind.com",
    "password": "SecurePassword123!"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@medifind.com",
      "fullName": "John Doe",
      "role": "PATIENT"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG4uZG9lQG1lZGlmaW5kLmNvbSIsInJvbGUiOiJQQVRJRU5UIiwiaWF0IjoxNzEwMTI4OTMyLCJleHAiOjE3MTAxMjg5OTJ9.xxxxx",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG4uZG9lQG1lZGlmaW5kLmNvbSIsInJvbGUiOiJQQVRJRU5UIiwiaWF0IjoxNzEwMTI4OTMyLCJleHAiOjE3MzEwMjg5MzJ9.xxxxx",
    "expiresIn": 86400
  },
  "timestamp": "2026-03-11T10:15:35.789Z"
}
```

**✅ Test Criteria:**
- Status code: 200
- accessToken present and starts with `eyJ`
- refreshToken present and starts with `eyJ`
- expiresIn is 86400 (24 hours in seconds)
- User data correct
- Save both tokens for next steps!

**💾 Save for later:**
```bash
ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG4uZG9lQG1lZGlmaW5kLmNvbSIsInJvbGUiOiJQQVRJRU5UIiwiaWF0IjoxNzEwMTI4OTMyLCJleHAiOjE3MTAxMjg5OTJ9.xxxxx"

REFRESH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG4uZG9lQG1lZGlmaW5kLmNvbSIsInJvbGUiOiJQQVRJRU5UIiwiaWF0IjoxNzEwMTI4OTMyLCJleHAiOjE3MzEwMjg5MzJ9.xxxxx"
```

---

#### Step 4️⃣ - Get User Profile (Protected Endpoint)
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Replace `YOUR_ACCESS_TOKEN` with actual token from Step 3**

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User profile retrieved",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@medifind.com",
    "role": "PATIENT"
  },
  "timestamp": "2026-03-11T10:15:40.123Z"
}
```

**✅ Test Criteria:**
- Status code: 200
- Requires Authorization header with Bearer token
- Returns userId, email, role
- No password in response
- Works with token from login

---

#### Step 5️⃣ - Refresh Access Token ⭐ **CRITICAL for Mobile**
```bash
curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG4uZG9lQG1lZGlmaW5kLmNvbSIsInJvbGUiOiJQQVRJRU5UIiwiaWF0IjoxNzEwMTI4OTMyLCJleHAiOjE3MzEwMjg5MzJ9.xxxxx"
  }'
```

**Replace with actual REFRESH_TOKEN from Step 3**

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@medifind.com",
      "fullName": "John Doe",
      "role": "PATIENT"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG4uZG9lQG1lZGlmaW5kLmNvbSIsInJvbGUiOiJQQVRJRU5UIiwiaWF0IjoxNzEwMTI4OTMyLCJleHAiOjE3MTAxMjg5OTJ9.xxxxx",
    "expiresIn": 86400
  },
  "timestamp": "2026-03-11T10:15:45.456Z"
}
```

**✅ Test Criteria:**
- Status code: 200
- New accessToken generated (different from previous)
- Old refreshToken still valid
- Can repeat this every 24 hours (or before expiry)
- expiresIn is 86400

---

#### Step 6️⃣ - Logout (Revoke Refresh Token)
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG4uZG9lQG1lZGlmaW5kLmNvbSIsInJvbGUiOiJQQVRJRU5UIiwiaWF0IjoxNzEwMTI4OTMyLCJleHAiOjE3MzEwMjg5MzJ9.xxxxx"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": null,
  "timestamp": "2026-03-11T10:15:50.789Z"
}
```

**✅ Test Criteria:**
- Status code: 200
- Message says "Logout successful"
- refreshToken now revoked (stored with revokedAt timestamp)

---

#### Step 7️⃣ - Verify Token Revoked
```bash
# Try to refresh after logout - should fail
curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG4uZG9lQG1lZGlmaW5kLmNvbSIsInJvbGUiOiJQQVRJRU5UIiwiaWF0IjoxNzEwMTI4OTMyLCJleHAiOjE3MzEwMjg5MzJ9.xxxxx"
  }'
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid or revoked refresh token",
  "errors": null,
  "timestamp": "2026-03-11T10:15:55.012Z"
}
```

**✅ Test Criteria:**
- Status code: 401
- Error message indicates token is revoked
- Cannot use revoked token

---

## ❌ ERROR TESTING

### Test 1: Register with Duplicate Email
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Another User",
    "email": "john.doe@medifind.com",
    "phoneNumber": "+9876543210",
    "password": "AnotherPass456!",
    "role": "PATIENT"
  }'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "User already exists",
  "errors": null,
  "timestamp": "2026-03-11T10:20:10.345Z"
}
```

---

### Test 2: Login with Wrong Password
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@medifind.com",
    "password": "WrongPassword123!"
  }'
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid credentials",
  "errors": null,
  "timestamp": "2026-03-11T10:20:15.678Z"
}
```

---

### Test 3: Login with Non-existent Email
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@medifind.com",
    "password": "AnyPassword123!"
  }'
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid credentials",
  "errors": null,
  "timestamp": "2026-03-11T10:20:20.901Z"
}
```

---

### Test 4: Access Protected Endpoint Without Token
```bash
curl -X GET http://localhost:3000/api/auth/me
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Missing or invalid authorization header",
  "errors": null,
  "timestamp": "2026-03-11T10:20:25.234Z"
}
```

---

### Test 5: Access Protected Endpoint with Invalid Token
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer invalid_token_here"
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "errors": null,
  "timestamp": "2026-03-11T10:20:30.567Z"
}
```

---

### Test 6: Register with Short Password
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@medifind.com",
    "phoneNumber": "+1234567890",
    "password": "short",
    "role": "PATIENT"
  }'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Password must be at least 8 characters",
  "errors": null,
  "timestamp": "2026-03-11T10:20:35.890Z"
}
```

---

### Test 7: Register with Missing Fields
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John",
    "email": "john@test.com"
  }'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Missing required fields",
  "errors": null,
  "timestamp": "2026-03-11T10:20:40.123Z"
}
```

---

### Test 8: Register with Invalid Role
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@test.com",
    "phoneNumber": "+1234567890",
    "password": "SecurePass123!",
    "role": "INVALID_ROLE"
  }'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid role",
  "errors": null,
  "timestamp": "2026-03-11T10:20:45.456Z"
}
```

---

## 🎯 All Valid User Roles

```json
{
  "roles": [
    "PATIENT",     // Patient/User
    "RESPONDER",   // Emergency Responder
    "CAREGIVER",   // Caregiver
    "ADMIN"        // Administrator (web only)
  ]
}
```

---

## 📊 Testing Checklist

### Happy Path (Success Cases) ✅
- [ ] Health endpoint responds
- [ ] Register new user (201)
- [ ] Login with credentials (200)
- [ ] Get profile with token (200)
- [ ] Refresh access token (200)
- [ ] Logout (200)
- [ ] Verify token revoked (401)

### Error Cases ✅
- [ ] Duplicate email registration (400)
- [ ] Wrong password login (401)
- [ ] Non-existent user login (401)
- [ ] Access protected endpoint without token (401)
- [ ] Access with invalid token (401)
- [ ] Short password registration (400)
- [ ] Missing fields registration (400)
- [ ] Invalid role (400)

### Database Verification ✅
- [ ] Users created in database
- [ ] Refresh tokens stored as hashes
- [ ] Last login updated
- [ ] Token revocation tracked

---

## 🔗 Response Headers

All responses include:
```
Content-Type: application/json
X-Powered-By: Express
```

---

## ⏱️ Performance Targets

| Operation | Target |
|-----------|--------|
| Register | <200ms |
| Login | <300ms |
| Refresh token | <100ms |
| Get profile | <100ms |
| Logout | <100ms |
| Database query | <50ms |

---

## 🧠 Token Details

### Access Token
- **Type:** JWT (HS256)
- **Expiry:** 24 hours (86400 seconds)
- **Payload:** { userId, email, role }
- **Use:** API requests authorization

### Refresh Token
- **Type:** JWT (HS256)
- **Expiry:** 30 days (2592000 seconds)
- **Storage:** Hashed in database
- **Use:** Get new access tokens

---

## 📱 Mobile Integration Example (Swift/Flutter)

### Login and Store Tokens
```swift
// 1. Register/Login
let loginResponse = await api.post("/api/auth/login", body: credentials)
let accessToken = loginResponse.data.accessToken
let refreshToken = loginResponse.data.refreshToken

// 2. Store in secure storage
await secureStorage.save("accessToken", accessToken)
await secureStorage.save("refreshToken", refreshToken)

// 3. Use in requests
var request = URLRequest(url: url)
request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

// 4. Handle 401 - refresh token
if response.statusCode == 401 {
  let newTokens = await api.post("/api/auth/refresh-token", 
    body: ["refreshToken": refreshToken])
  // Save and retry
}
```

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `npm run dev` or kill node process |
| Database connection failed | Check PostgreSQL is running, verify .env |
| Token expired | Use refresh-token endpoint to get new one |
| "User already exists" | Use different email or delete from DB |
| Invalid token | Copy full token without spaces |

---

## 📝 Next Steps

After Week 1 testing:
1. **Week 2:** Medical Profile Module (FR2.1-2.11)
2. **Week 3:** Emergency SOS & Responder Assignment (FR4.1-5.8)
3. **Week 4:** Real-time Tracking (FR7.1-8.5)

---

**All APIs Ready for Testing! 🚀**
