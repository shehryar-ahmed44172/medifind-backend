# MediFind Backend - Quick Start Implementation Guide

**Status:** Ready to Start  
**Estimated Timeline:** 4-5 weeks for MVP  
**Tech Stack:** Node.js + Express + TypeScript + PostgreSQL + Prisma + Socket.io

---

## QUICK START CHECKLIST

### Week 1: Foundation Setup

- [ ] **Day 1: Project Initialization**
  - [ ] Create Node.js project structure
  - [ ] Configure TypeScript
  - [ ] Setup ESLint & Prettier
  - [ ] Initialize Git repository

- [ ] **Day 2: Database Setup**
  - [ ] Install & configure PostgreSQL
  - [ ] Create database and user
  - [ ] Setup Prisma ORM
  - [ ] Create Prisma schema

- [ ] **Day 3: Core Infrastructure**
  - [ ] Setup Express server
  - [ ] Configure middleware (CORS, Helmet, body-parser)
  - [ ] Setup Winston logger
  - [ ] Create error handling

- [ ] **Day 4-5: Authentication System**
  - [ ] Implement user registration endpoint
  - [ ] Implement login endpoint
  - [ ] Setup JWT token system
  - [ ] Create auth middleware
  - [ ] Write auth tests

---

### Week 2: Core Features

- [ ] **Day 6-7: User & Profile Management**
  - [ ] User profile endpoints (GET, POST, PUT)
  - [ ] Role-based access control
  - [ ] Medical profile management
  - [ ] Unit tests

- [ ] **Day 8-9: Emergency Management (Phase 1)**
  - [ ] Emergency creation endpoint
  - [ ] Emergency status tracking
  - [ ] Location capture
  - [ ] Create emergency database tables

- [ ] **Day 10: Real-time Setup**
  - [ ] Setup Socket.io
  - [ ] Connection handlers
  - [ ] Real-time location tracking
  - [ ] Notification system setup

---

### Week 3: Responder & Advanced Features

- [ ] **Day 11-12: Responder Assignment**
  - [ ] Nearest responder algorithm
  - [ ] Responder assignment logic
  - [ ] Responder status management
  - [ ] Emergency acceptance/rejection

- [ ] **Day 13-14: Live Tracking**
  - [ ] Real-time location updates via WebSocket
  - [ ] Location history storage
  - [ ] ETA calculation
  - [ ] Responder presence tracking

- [ ] **Day 15: Caregiver Features**
  - [ ] Caregiver-patient linking
  - [ ] Read-only access implementation
  - [ ] Caregiver monitoring dashboard

---

### Week 4: Testing & Polish

- [ ] **Day 16-17: Testing**
  - [ ] Write unit tests (80% coverage)
  - [ ] Write integration tests
  - [ ] Performance testing
  - [ ] Security testing

- [ ] **Day 18-19: Documentation**
  - [ ] Complete API documentation
  - [ ] Setup guide
  - [ ] Deployment guide
  - [ ] Code review

- [ ] **Day 20: Deployment**
  - [ ] Docker setup
  - [ ] CI/CD pipeline
  - [ ] Production deployment
  - [ ] Monitoring setup

---

## DETAILED IMPLEMENTATION GUIDE

### STEP 1: Set Up Development Environment

**1.1: Install Required Tools**

```bash
# Check Node version (should be 18+)
node --version

# Check npm version
npm --version

# Install PostgreSQL
# macOS:
brew install postgresql

# Ubuntu:
sudo apt-get install postgresql

# Windows:
# Download from https://www.postgresql.org/download/windows/
```

**1.2: Create Project Structure**

```bash
# Navigate to project directory
cd medifind-backend

# Create src structure
mkdir -p src/config
mkdir -p src/controllers
mkdir -p src/services
mkdir -p src/repositories
mkdir -p src/routes
mkdir -p src/middleware
mkdir -p src/websocket/handlers
mkdir -p src/types
mkdir -p src/utils
mkdir -p src/constants
mkdir -p tests/{unit,integration,fixtures}
mkdir -p logs
```

**1.3: Initialize npm and install dependencies**

```bash
# Already exists, but if new:
npm init -y

# Install core dependencies (already in package.json)
npm install

# Verify installation
npm list
```

---

### STEP 2: Configure TypeScript & Environment

**2.1: Update tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**2.2: Create .env file**

```bash
# Copy example
cp .env.example .env

# Edit with your values (see BACKEND_DEVELOPMENT_ROADMAP.md)
```

**Contents of .env:**
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://medifind_user:password@localhost:5432/medifind_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key_here_change_in_production
JWT_EXPIRY=24h
LOG_LEVEL=debug
```

---

### STEP 3: Setup Database

**3.1: Create PostgreSQL Database**

```bash
# Connect to PostgreSQL (on Windows use psql from PGADMIN or command line)
psql -U postgres

# Commands in psql:
CREATE DATABASE medifind_db;
CREATE USER medifind_user WITH PASSWORD 'secure_password_123';
ALTER ROLE medifind_user WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE medifind_db TO medifind_user;
\q
```

**3.2: Setup Prisma**

```bash
# The prisma/schema.prisma exists, update it if needed

# Generate Prisma client
npm run db:generate

# Create initial migration
npm run db:migrate

# Seed database (optional)
npm run db:seed

# Open Prisma Studio to view database
npm run db:studio
```

---

### STEP 4: Create Main Server File

**4.1: Create src/server.ts**

```typescript
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import medicalProfileRoutes from './routes/medicalProfileRoutes';

// Load environment variables
dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: logger }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/medical-profiles', medicalProfileRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// WebSocket connection
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

export { app, io };
```

---

### STEP 5: Create Configuration Files

**5.1: Create src/config/index.ts**

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  database_url: process.env.DATABASE_URL,
  redis_url: process.env.REDIS_URL,
  jwt_secret: process.env.JWT_SECRET || 'your_secret_key',
  jwt_expiry: process.env.JWT_EXPIRY || '24h',
  log_level: process.env.LOG_LEVEL || 'info',
};

export default config;
```

**5.2: Create src/config/database.ts**

```typescript
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn']
    : ['error']
});

prisma.$on('query', (event) => {
  logger.debug(`Query: ${event.query}`);
});

export default prisma;
```

---

### STEP 6: Create Utility Files

**6.1: Create src/utils/logger.ts**

```typescript
import winston from 'winston';
import path from 'path';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'medifind-backend' },
  transports: [
    new winston.transports.File({ 
      filename: path.join('./logs', 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join('./logs', 'combined.log') 
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;
```

**6.2: Create src/utils/jwtUtils.ts**

```typescript
import jwt from 'jsonwebtoken';
import config from '../config';

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwt_secret, {
    expiresIn: config.jwt_expiry
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt_secret) as TokenPayload;
};

export const decodeToken = (token: string): TokenPayload | null => {
  return jwt.decode(token) as TokenPayload | null;
};
```

---

### STEP 7: Start with Authentication

**7.1: Create src/controllers/authController.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import bcryptjs from 'bcryptjs';
import prisma from '../config/database';
import { generateToken } from '../utils/jwtUtils';
import logger from '../utils/logger';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fullName, email, phoneNumber, password, role } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { phoneNumber: phoneNumber }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User already exists with this email or phone'
        }
      });
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phoneNumber,
        passwordHash,
        role: role || 'PATIENT'
      }
    });

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    logger.info(`User registered: ${user.id}`);

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    logger.info(`User logged in: ${user.id}`);

    res.json({
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        token,
        expiresIn: 86400
      }
    });
  } catch (error) {
    next(error);
  }
};
```

**7.2: Create src/routes/authRoutes.ts**

```typescript
import express from 'express';
import { register, login } from '../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

export default router;
```

---

### STEP 8: Test Your Setup

**8.1: Run the server**

```bash
# Start development server
npm run dev

# Should output:
# 🚀 Server is running at http://localhost:3000
```

**8.2: Test the API**

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "password": "SecurePass123!",
    "role": "PATIENT"
  }'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

---

## BUILD PHASE BY PHASE

### Phase Checklist Template

**Phase X: [Feature Name]**

```markdown
- [ ] Design database schema
- [ ] Create Prisma models
- [ ] Create controllers
- [ ] Create services
- [ ] Create repositories
- [ ] Create routes
- [ ] Add middleware if needed
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test with API client
- [ ] Document endpoints
- [ ] Code review
```

---

## USEFUL COMMANDS REFERENCE

```bash
# Development
npm run dev              # Start with hot reload
npm run build            # Build TypeScript
npm start                # Start production server

# Database
npm run db:migrate       # Run migrations
npm run db:generate      # Generate Prisma client
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript check
```

---

## TROUBLESHOOTING COMMON ISSUES

### Issue: "Cannot find module 'prisma'"
**Solution:**
```bash
npm install @prisma/client
npm run db:generate
```

### Issue: "Database connection refused"
**Solution:**
```bash
# Check PostgreSQL is running
# macOS: brew services list
# Ubuntu: sudo service postgresql status
# Windows: Check Services for PostgreSQL

# Verify DATABASE_URL in .env
psql -U medifind_user -d medifind_db -c "SELECT version();"
```

### Issue: "Port 3000 already in use"
**Solution:**
```bash
# Change PORT in .env or kill process
# Kill on macOS/Linux:
lsof -i :3000
kill -9 <PID>

# Or use different port:
PORT=3001 npm run dev
```

### Issue: "JWT secret not defined"
**Solution:**
```bash
# Make sure JWT_SECRET is in .env
echo "JWT_SECRET=your_random_secret_key_here" >> .env
```

---

## NEXT IMMEDIATE ACTIONS

1. **Setup environment** (30 mins)
   - Install PostgreSQL
   - Create database
   - Configure .env

2. **Clone/start project** (15 mins)
   - Navigate to project
   - Install npm package
   - Run migrations

3. **Test basic setup** (15 mins)
   - Start server
   - Test health endpoint

4. **Begin Phase 1** (Days 1-5)
   - Complete authentication
   - Write tests
   - Document APIs

---

**You're all set! Begin with Phase 1: Authentication setup. Good luck! 🎉**

For comprehensive details, refer to `BACKEND_DEVELOPMENT_ROADMAP.md`
