# MediFind Backend — Developer Guide

**Version:** 2.0 | **Date:** May 2026

---

## Project Structure

```
medifind-backend/
├── prisma/
│   └── schema.prisma          # Single source of truth for DB schema
├── src/
│   ├── config/                # Centralised config (port, env reading)
│   ├── controllers/           # HTTP request handlers — thin layer
│   ├── lib/
│   │   └── prisma.ts          # Singleton PrismaClient (one pool)
│   ├── middleware/
│   │   ├── authMiddleware.ts  # JWT verification + role guard
│   │   ├── loginRateLimitMiddleware.ts
│   │   └── uploadMiddleware.ts
│   ├── repositories/          # All raw Prisma queries (data access)
│   ├── routes/                # Express Router definitions
│   ├── services/              # Business logic (no HTTP awareness)
│   ├── types/                 # Shared TypeScript interfaces + enums
│   ├── utils/
│   │   ├── email.ts           # Nodemailer wrapper
│   │   ├── geoValidation.ts   # Haversine + Pakistan bounds check
│   │   ├── jwt.ts             # Token generation + verification
│   │   ├── logger.ts          # Winston logger (singleton)
│   │   ├── password.ts        # bcrypt helpers
│   │   ├── response.ts        # Unified sendSuccess / sendError
│   │   └── resetTokenUtils.ts # Password reset token helpers
│   └── server.ts              # App bootstrap + Socket.io setup
├── tests/
│   ├── helpers/
│   │   ├── factories.ts       # DB fixture factories for tests
│   │   └── testSetup.ts       # Global Jest setup
│   ├── unit/
│   │   ├── utils/             # Utility function tests (no DB)
│   │   └── services/          # Service tests (mocked Prisma)
│   └── integration/           # Full HTTP tests (real DB)
├── docs/                      # All documentation
├── logs/                      # Winston output (git-ignored)
├── uploads/                   # Local file storage (git-ignored)
├── jest.config.js
├── tsconfig.json
└── package.json
```

---

## Architecture Principles

### 1. Layered Architecture
```
HTTP Request
    ↓
Route (express Router — no logic)
    ↓
Controller (parse request, call service, send response)
    ↓
Service (business logic, transactions, events)
    ↓
Repository (Prisma queries — no business logic)
    ↓
Database (PostgreSQL via Prisma)
```

**Rule:** Controllers never import repositories directly. Services never return Express `Response` objects.

### 2. Single Prisma Instance
`src/lib/prisma.ts` exports one `PrismaClient` shared across the entire process. Never instantiate `new PrismaClient()` elsewhere.

```typescript
// ✅ Correct
import prisma from '../lib/prisma';

// ❌ Wrong — creates a new connection pool
const prisma = new PrismaClient();
```

### 3. Unified Response Format
All HTTP responses must go through `sendSuccess` / `sendError`:

```typescript
import { sendSuccess, sendError } from '../utils/response';

// Success
sendSuccess(res, data, 'Optional message', 200);

// Error
sendError(res, 'Error message', 400);
```

Never use `res.json()` or `res.status().send()` directly in controllers.

### 4. Logger, Not Console
```typescript
import logger from '../utils/logger';

// ✅ Correct
logger.info('Emergency created');
logger.error(`Failed: ${err.message}`);
logger.debug('Dev-only detail');  // only shown when LOG_LEVEL=debug

// ❌ Wrong — leaks to production stdout
console.log('Emergency created');
```

Sensitive values (OTPs, tokens) must be wrapped:
```typescript
if (process.env.NODE_ENV !== 'production') {
  logger.debug(`[DEV ONLY] OTP for ${email}: ${otp}`);
}
```

---

## Adding a New Endpoint

Follow this checklist for every new feature:

### Step 1 — Define types (if new)
Add interfaces to `src/types/` if new request/response shapes are needed.

### Step 2 — Repository (if DB access needed)
```typescript
// src/repositories/exampleRepository.ts
import prisma from '../lib/prisma';

export const exampleRepository = {
  findById: async (id: string) => {
    return await prisma.example.findUnique({ where: { id } });
  },
};
```

### Step 3 — Service (business logic)
```typescript
// src/services/exampleService.ts
import { exampleRepository } from '../repositories/exampleRepository';

export const doSomething = async (id: string) => {
  const item = await exampleRepository.findById(id);
  if (!item) throw new Error('Not found');
  return item;
};
```

### Step 4 — Controller (HTTP layer)
```typescript
// src/controllers/exampleController.ts
import { Request, Response } from 'express';
import * as exampleService from '../services/exampleService';
import { sendSuccess, sendError } from '../utils/response';

export const getExample = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const data = await exampleService.doSomething(req.params.id);
    sendSuccess(res, data, 'Example retrieved');
  } catch (error: any) {
    sendError(res, error.message, 404);
  }
};
```

### Step 5 — Route
```typescript
// src/routes/example.ts
import { Router } from 'express';
import { getExample } from '../controllers/exampleController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);
router.get('/:id', roleMiddleware('PATIENT'), getExample);
export default router;
```

### Step 6 — Register route in `server.ts`
```typescript
import exampleRoutes from './routes/example';
app.use('/api/examples', exampleRoutes);
```

### Step 7 — Write tests
- Unit test in `tests/unit/services/example.service.test.ts` (mocked Prisma)
- Integration test in `tests/integration/example.test.ts` (real DB)

---

## Database Migrations

### Create a new migration
```bash
npx prisma migrate dev --name descriptive_name
```
> Always name migrations descriptively: `add_patient_rating`, `add_voice_summary_to_emergency`

### Apply to production
```bash
npx prisma migrate deploy
```

### After schema changes, always run
```bash
npm run db:generate  # regenerates the Prisma client
```

### Prisma Schema Conventions
- All models use CUID (`@default(cuid())`) for IDs
- All models have `createdAt DateTime @default(now())`
- Mutable models have `updatedAt DateTime @updatedAt`
- Foreign keys are indexed: `@@index([fieldName])`
- JSON fields use `Json @default("[]")` for arrays

---

## Running Tests

### All tests
```bash
npm test
```

### Unit tests only (fast, no DB required)
```bash
npm test -- --testPathPattern=unit
```

### Integration tests (requires DATABASE_URL)
```bash
DATABASE_URL=postgresql://... npm test -- --testPathPattern=integration
```

### Single test file
```bash
npm test -- tests/unit/utils/geoValidation.test.ts
```

### With coverage report
```bash
npm run test:coverage
```

### Writing tests — guidelines
- Unit tests in `tests/unit/` must mock Prisma and external services
- Integration tests in `tests/integration/` must clean up their test data
- Use factories from `tests/helpers/factories.ts` — never hardcode IDs
- `afterAll` must call `cleanupTestUsers()` and `prisma.$disconnect()`
- Test file names: `<module>.test.ts` or `<module>.service.test.ts`

---

## Environment-Specific Behaviour

| Behaviour | development | production | test |
|---|---|---|---|
| OTP logs | `logger.debug` (visible) | Suppressed | Silent |
| Prisma log level | `warn`, `error` | `error` only | `error` only |
| Dev GPS fallback | Enabled (no GPS needed) | Disabled | N/A |
| Winston logger | Active (debug level) | Active (info level) | Silent |

---

## Socket.IO Development Notes

### Joining rooms from the Flutter app
The client must authenticate the socket connection with a Bearer token:
```javascript
const socket = io('http://host:3000', {
  auth: { token: 'Bearer <access_token>' }
});
```

### Room naming convention
| Room | Purpose |
|---|---|
| `notifications:<userId>` | Per-user in-app notifications |
| `emergency:<emergencyId>` | Emergency status events |
| `location:<emergencyId>` | Live responder GPS stream |
| `chat:<roomId>` | Chat messages |
| `responders` | Broadcast to all responders |
| `admin_notifications` | Admin broadcasts |

### Emitting events from services
Always use `getIo()` — never import the socket server directly:
```typescript
import { getIo } from '../server';

getIo().to(`emergency:${emergencyId}`).emit('EMERGENCY_STATUS_CHANGE', payload);
```

---

## Security Guidelines

### Never do this
```typescript
// ❌ Exposes sensitive data
console.log(`OTP: ${otp}`);

// ❌ Creates a new connection pool
const prisma = new PrismaClient();

// ❌ Raw SQL with interpolation (SQL injection risk)
await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`;
```

### Always do this
```typescript
// ✅ Dev-only sensitive log
if (process.env.NODE_ENV !== 'production') {
  logger.debug(`[DEV] OTP: ${otp}`);
}

// ✅ Use the singleton
import prisma from '../lib/prisma';

// ✅ Use parameterised raw SQL (Prisma template literals are safe)
await prisma.$queryRaw`SELECT * FROM users WHERE id = ${Prisma.sql`${id}`}`;
```

### Password hashing
Always use `hashPassword` / `verifyPassword` from `src/utils/password.ts`. Never use `bcryptjs` directly.

### JWT
Always use `generateAccessToken` / `generateRefreshToken` / `decodeToken` from `src/utils/jwt.ts`. Never sign tokens manually.

---

## Common Development Tasks

### Add a new notification type
1. Add to `NotificationType` enum in `src/types/notification.ts`
2. Handle in the notification service if special delivery is needed
3. Handle in the Flutter app's notification handler

### Add a new user role
1. Add to `UserRole` enum in `prisma/schema.prisma`
2. Run `npx prisma migrate dev`
3. Update `roleMiddleware` calls on relevant routes
4. Update `hasRoomAccess` in `chatController.ts` if chat access needed
5. Handle in auth service registration

### Change cancellation window
Set `EMERGENCY_CANCELLATION_WINDOW_SECONDS` in `.env`. Default is 60 seconds.

### Change responder search radius
Set `EMERGENCY_RESPONDER_RADIUS_KM` in `.env`. Default is 5 km.
