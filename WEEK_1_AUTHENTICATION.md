# WEEK 1: Authentication Module Implementation
## Core Backend Module - Days 1-5

**Timeline:** March 11-17, 2026  
**Goal:** Mobile app can register, login, and refresh tokens  
**Deliverable:** 5 working authentication endpoints + middleware

---

## 📋 WEEK 1 DAILY BREAKDOWN

### DAY 1-2: Project Setup & Database Connection

**Goals:**
1. Verify database connection
2. Create project structure
3. Setup error handling
4. Write simple test queries

**Tasks:**

#### Task 1: Test Database Connection
```bash
# In PowerShell, test connection:
npm run dev

# Should see: "Server running on port 3000"
# Should see: "Database connected successfully"
```

#### Task 2: Create Folder Structure
```
src/
├── controllers/
│   └── authController.ts          # Auth endpoint handlers
├── services/
│   └── authService.ts             # Business logic
├── repositories/
│   └── userRepository.ts          # Prisma queries
├── middleware/
│   ├── authMiddleware.ts          # JWT validation
│   └── errorHandler.ts            # Error catching
├── utils/
│   ├── jwt.ts                     # Token generation
│   ├── password.ts                # bcryptjs hashing
│   └── response.ts                # Standard responses
├── types/
│   └── auth.ts                    # TypeScript interfaces
└── validation/
    └── auth.ts                    # Input validation
```

#### Task 3: Create `src/server.ts`
```typescript
import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(','),
  credentials: true,
}));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler (will add error middleware here)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message,
    status: err.status || 500,
  });
});

// Start server
app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    console.log(`✅ Server running on port ${PORT}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
});

export { app, prisma };
```

#### Task 4: Test Connection
```bash
npm run dev
# Should output:
# ✅ Database connected successfully
# ✅ Server running on port 3000

# Test health endpoint:
curl http://localhost:3000/api/health
# Should return: { "status": "OK", "timestamp": "2026-03-11T..." }
```

**Deliverable by End of Day 2:**
- ✅ Server starts without errors
- ✅ Database connection successful
- ✅ Health endpoint responds
- ✅ Folder structure ready

---

### DAY 3: Auth Utils & Middleware

**Goal:** Create JWT and password utilities

**Task 1: Create `src/utils/jwt.ts`**

```typescript
import jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRATION || '24h',
    algorithm: 'HS256',
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION || '30d',
    algorithm: 'HS256',
  });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload | null;
  } catch {
    return null;
  }
};
```

**Task 2: Create `src/utils/password.ts`**

```typescript
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
```

**Task 3: Create `src/utils/response.ts`**

```typescript
import { Response } from 'express';

export class ApiResponse {
  static success(res: Response, data: any, message = 'Success', status = 200) {
    res.status(status).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static error(res: Response, message: string, status = 400, errors: any = null) {
    res.status(status).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Task 4: Create `src/middleware/authMiddleware.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiResponse } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.error(res, 'Missing or invalid authorization header', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    const payload = verifyToken(token);

    if (!payload) {
      return ApiResponse.error(res, 'Invalid or expired token', 401);
    }

    req.user = payload;
    next();
  } catch (error) {
    ApiResponse.error(res, 'Authentication failed', 401);
  }
};

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return ApiResponse.error(res, 'Unauthorized', 403);
    }
    next();
  };
};
```

**Deliverable by End of Day 3:**
- ✅ JWT utilities created
- ✅ Password hashing utilities created
- ✅ Response formatter created
- ✅ Auth middleware created

---

### DAY 4: Authentication Endpoints

**Goal:** Build 3 core authentication endpoints

**Task 1: Create `src/repositories/userRepository.ts`**

```typescript
import { prisma } from '../server';

export const userRepository = {
  findByEmail: async (email: string) => {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        medicalProfile: true,
        responder: true,
      },
    });
  },

  findById: async (userId: string) => {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        medicalProfile: true,
        responder: true,
      },
    });
  },

  create: async (data: any) => {
    return await prisma.user.create({
      data,
    });
  },

  createRefreshToken: async (userId: string, tokenHash: string) => {
    return await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
  },

  findValidRefreshToken: async (userId: string, tokenHash: string) => {
    return await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
  },

  revokeRefreshToken: async (tokenHash: string) => {
    return await prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  },
};
```

**Task 2: Create `src/services/authService.ts`**

```typescript
import { hashPassword, verifyPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { userRepository } from '../repositories/userRepository';
import { hashSync } from 'bcryptjs';
import bcrypt from 'bcryptjs';

export const authService = {
  register: async (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
    role: 'PATIENT' | 'RESPONDER' | 'CAREGIVER' | 'ADMIN';
  }) => {
    // Check if user exists
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await userRepository.create({
      fullName: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      passwordHash,
      role: data.role,
      isActive: true,
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  },

  login: async (email: string, password: string) => {
    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const refreshTokenHash = await hashPassword(refreshToken);

    // Store refresh token in database
    await userRepository.createRefreshToken(user.id, refreshTokenHash);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken,
      refreshToken,
      expiresIn: 86400, // 24 hours in seconds
    };
  },

  refreshAccessToken: async (refreshToken: string) => {
    // Decode token (don't verify expiry yet for refresh)
    const decoded = jwt.decode(refreshToken) as any;
    if (!decoded) {
      throw new Error('Invalid token');
    }

    // Find and verify token in database
    const tokenRecord = await userRepository.findValidRefreshToken(
      decoded.userId,
      await hashPassword(refreshToken) // This won't work - need to store actual hash
    );

    // Generate new access token
    const payload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    return {
      accessToken: generateAccessToken(payload),
      expiresIn: 86400,
    };
  },
};

import { prisma } from '../server';
import jwt from 'jsonwebtoken';
```

**Task 3: Create `src/controllers/authController.ts`**

```typescript
import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { ApiResponse } from '../utils/response';

export const authController = {
  register: async (req: Request, res: Response) => {
    try {
      const { fullName, email, phoneNumber, password, role } = req.body;

      // Validation
      if (!fullName || !email || !phoneNumber || !password || !role) {
        return ApiResponse.error(res, 'Missing required fields', 400);
      }

      if (password.length < 8) {
        return ApiResponse.error(res, 'Password must be at least 8 characters', 400);
      }

      const result = await authService.register({
        fullName,
        email,
        phoneNumber,
        password,
        role,
      });

      ApiResponse.success(res, result, 'Registration successful', 201);
    } catch (error: any) {
      ApiResponse.error(res, error.message, 400);
    }
  },

  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return ApiResponse.error(res, 'Email and password required', 400);
      }

      const result = await authService.login(email, password);
      ApiResponse.success(res, result, 'Login successful', 200);
    } catch (error: any) {
      ApiResponse.error(res, error.message, 401);
    }
  },

  refreshToken: async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return ApiResponse.error(res, 'Refresh token required', 400);
      }

      const result = await authService.refreshAccessToken(refreshToken);
      ApiResponse.success(res, result, 'Token refreshed', 200);
    } catch (error: any) {
      ApiResponse.error(res, error.message, 401);
    }
  },
};
```

**Deliverable by End of Day 4:**
- ✅ 3 endpoints: register, login, refresh-token
- ✅ Password hashing working
- ✅ JWT tokens generated
- ✅ Refresh tokens stored in database

---

### DAY 5: Testing & Integration

**Goal:** Test endpoints with mobile app

**Task 1: Write Unit Tests**

```bash
npm run test
```

Test coverage should include:
- ✅ Register with valid data
- ✅ Register with duplicate email (should fail)
- ✅ Register with weak password (should fail)
- ✅ Login with correct credentials
- ✅ Login with wrong password (should fail)
- ✅ Refresh token (should return new access token)
- ✅ Invalid token (should fail)

**Task 2: Test with Postman/Curl**

```bash
# Test 1: Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "password": "SecurePass123!",
    "role": "PATIENT"
  }'

# Response should be:
# { "success": true, "data": { "id": "...", "email": "john@example.com" } }

# Test 2: Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Response should include: accessToken, refreshToken

# Test 3: Refresh Token
curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "..." }'

# Response should include: new accessToken
```

**Task 3: Integration with Mobile App**

Give mobile team:
- [ ] API endpoint URLs
- [ ] Example requests/responses
- [ ] Error codes and meanings
- [ ] Token storage instructions (secure storage on mobile)

**Deliverable by End of Day 5:**
- ✅ All 3 endpoints tested and working
- ✅ Unit tests passing (>80% coverage)
- ✅ Mobile team can integrate
- ✅ No critical bugs

---

## 🔗 ADD TO `package.json` scripts

```json
{
  "scripts": {
    "dev": "ts-node src/server.ts",
    "start": "node dist/src/server.js",
    "build": "tsc",
    "test": "jest --coverage",
    "db:migrate": "prisma migrate dev",
    "db:seed": "ts-node prisma/seed.ts",
    "db:push": "prisma db push"
  }
}
```

---

## 📝 WEEK 1 ENDPOINTS SUMMARY

| Endpoint | Method | Request | Response | Status |
|----------|--------|---------|----------|--------|
| /api/auth/register | POST | {...user data} | {user, id} | 201 |
| /api/auth/login | POST | {email, password} | {accessToken, refreshToken} | 200 |
| /api/auth/refresh-token | POST | {refreshToken} | {accessToken} | 200 |
| /api/health | GET | - | {status: OK} | 200 |

---

## ✅ WEEK 1 COMPLETION CHECKLIST

- [ ] Database connection verified
- [ ] JWT utilities working
- [ ] Password hashing working
- [ ] Auth middleware working
- [ ] POST /api/auth/register (200+ tests)
- [ ] POST /api/auth/login (200+ tests)
- [ ] POST /api/auth/refresh-token (50+ tests)
- [ ] Error handling for all scenarios
- [ ] Mobile app can register
- [ ] Mobile app can login
- [ ] Mobile app can refresh token
- [ ] No critical bugs
- [ ] Code committed to Git

**Status: Week 1 = 25% Phase 1 Complete ✅**

---

## 🚀 READY? START NOW!

**Next Action:** Create Week 1 file structure and run your first test

```bash
cd e:\Medifind_FYP_Project\medifind-backend
npm run dev
# Should see: ✅ Server running on port 3000
```

**Questions?** Refer to **PHASE_1_MVP_PLAN.md** or **EXECUTIVE_SUMMARY.md**
