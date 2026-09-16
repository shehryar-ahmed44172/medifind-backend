# MediFind Backend — Deployment Guide

**Version:** 2.0 | **Date:** May 2026

---

## Prerequisites

| Tool | Minimum Version | Purpose |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| npm | 9+ | Package manager |
| PostgreSQL | 15+ | Primary database |
| Redis | 7+ | Session / pub-sub (optional in dev) |
| Firebase project | — | Push notifications (FCM) |
| SMTP access | — | Email delivery |
| Cloudinary account | — | File / image storage |

---

## 1. Local Development Setup

### 1.1 Clone & Install
```bash
git clone <repo-url> medifind-backend
cd medifind-backend
npm install
```

### 1.2 Environment Variables
Copy the example and fill in values:
```bash
cp .env.example .env
```

Minimum required `.env` for local dev:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/medifind_dev

JWT_SECRET=change-this-to-a-long-random-string-in-production
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@medifind.com

EMERGENCY_CANCELLATION_WINDOW_SECONDS=60
EMERGENCY_RESPONDER_RADIUS_KM=5

# Firebase: path to service account JSON
MEDIFIND_FIREBASE_CREDENTIALS=./firebase-service-account.json

# Optional — Gemini AI for admin notification drafts
GEMINI_API_KEY=your-gemini-api-key

LOG_LEVEL=debug
```

### 1.3 Database Setup
```bash
# Create the database
createdb medifind_dev

# Run all migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Optional: seed with demo data
npm run db:seed
```

### 1.4 Firebase Credentials
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key** → download JSON
3. Save as `firebase-service-account.json` in project root
4. Set `MEDIFIND_FIREBASE_CREDENTIALS=./firebase-service-account.json`

### 1.5 Start Dev Server
```bash
npm run dev
# Server starts at http://localhost:3000
# Hot reload via nodemon
```

### 1.6 Verify
```bash
curl http://localhost:3000/health
# Expected: { "status": "ok", "timestamp": "..." }
```

---

## 2. Environment Variable Reference

### Server
| Variable | Default | Required | Description |
|---|---|---|---|
| `NODE_ENV` | `development` | Yes | `development`, `production`, `test` |
| `PORT` | `3000` | No | HTTP listen port |
| `HOST` | `0.0.0.0` | No | HTTP listen host |
| `LOG_LEVEL` | `info` | No | Winston log level |

### Database
| Variable | — | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | — | **Yes** | PostgreSQL connection string |

### JWT
| Variable | Default | Required | Description |
|---|---|---|---|
| `JWT_SECRET` | — | **Yes** | Signing secret (min 32 chars in prod) |
| `JWT_ALGORITHM` | `HS256` | No | Signing algorithm |
| `JWT_EXPIRATION` | `7d` | No | Access token TTL |
| `JWT_REFRESH_EXPIRATION` | `30d` | No | Refresh token TTL |

### SMTP / Email
| Variable | — | Required | Description |
|---|---|---|---|
| `SMTP_HOST` | `smtp.gmail.com` | Yes | SMTP server |
| `SMTP_PORT` | `587` | Yes | SMTP port |
| `SMTP_USER` | — | **Yes** | SMTP username |
| `SMTP_PASSWORD` | — | **Yes** | SMTP password or app password |
| `SMTP_FROM` | — | **Yes** | Sender address |

### Firebase FCM
| Variable | — | Required | Description |
|---|---|---|---|
| `MEDIFIND_FIREBASE_CREDENTIALS` | — | Yes (push) | Path to service account JSON |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Alt | Alternative Firebase credentials |

### Emergency System
| Variable | Default | Required | Description |
|---|---|---|---|
| `EMERGENCY_CANCELLATION_WINDOW_SECONDS` | `60` | No | SOS cancellation grace period |
| `EMERGENCY_RESPONDER_RADIUS_KM` | `5` | No | Nearby responder search radius |
| `EMERGENCY_AUTO_ESCALATE_MINUTES` | `10` | No | Auto-escalate unassigned SOSes |

### AI
| Variable | — | Required | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | — | No | Google Gemini for admin notification drafts |

---

## 3. Production Deployment

### 3.1 Build
```bash
npm run build
# Output: dist/
```

### 3.2 Environment
Set `NODE_ENV=production` and ensure all required variables are set. Never commit `.env` files — use your platform's secret manager.

### 3.3 Database Migrations
Run migrations before starting the server:
```bash
NODE_ENV=production npx prisma migrate deploy
```

### 3.4 Start
```bash
npm start
# Or with PM2:
pm2 start dist/server.js --name medifind-api -i 2
```

### 3.5 Recommended: PM2 Process Manager
```bash
npm install -g pm2

# Create ecosystem.config.js:
module.exports = {
  apps: [{
    name: 'medifind-api',
    script: './dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 3.6 Nginx Reverse Proxy (recommended)
```nginx
server {
    listen 80;
    server_name api.medifind.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';  # Required for Socket.IO
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;  # Long timeout for WebSocket
    }
}
```

---

## 4. Database Management

### Migrations
```bash
# Create a new migration
npx prisma migrate dev --name add_patient_rating_field

# Apply migrations to production
npx prisma migrate deploy

# Reset database (DESTRUCTIVE — dev only)
npx prisma migrate reset
```

### Backup (PostgreSQL)
```bash
# Backup
pg_dump -U postgres medifind_prod > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres medifind_prod < backup_20260516.sql
```

### Prisma Studio (visual DB browser)
```bash
npm run db:studio
# Opens at http://localhost:5555
```

---

## 5. Static File Serving

The server serves uploaded files from the `uploads/` directory:

| Path | Directory | Contents |
|---|---|---|
| `/uploads/profile/*` | `uploads/profile/` | Profile images |
| `/uploads/reports/*` | `uploads/reports/` | Medical reports |
| `/uploads/chat/*` | `uploads/chat/` | Chat attachments |
| `/uploads/documents/*` | `uploads/documents/` | Verification docs |

Ensure this directory exists and is writable:
```bash
mkdir -p uploads/{profile,reports,chat,documents}
chmod 755 uploads
```

For production, offload to Cloudinary (already integrated) and disable local static serving.

---

## 6. Logs

Winston writes to:
- `logs/error.log` — errors only
- `logs/combined.log` — all levels

Ensure `logs/` directory exists:
```bash
mkdir -p logs
```

For production log management, forward to a centralized service (e.g., Datadog, Loggly, Papertrail).

---

## 7. Health Check

```
GET /health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2026-05-16T10:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

Use this endpoint for load balancer / container health probes.

---

## 8. Docker (Optional)

### Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json .
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### docker-compose.yml
```yaml
version: '3.9'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/medifind
      NODE_ENV: production
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: medifind
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

```bash
docker-compose up -d
docker-compose exec api npx prisma migrate deploy
```

---

## 9. Security Checklist (Production)

- [ ] `JWT_SECRET` is at least 64 random characters
- [ ] `NODE_ENV=production` is set
- [ ] HTTPS is enforced (SSL/TLS via Nginx or load balancer)
- [ ] Database is not exposed to the public internet
- [ ] Firebase credentials file has restricted IAM permissions
- [ ] `uploads/` directory is outside the web root or served via CDN
- [ ] Rate limiting is active on `/api/auth/login`
- [ ] CORS `origin` is set to specific allowed domains
- [ ] Helmet security headers are active (already configured)
- [ ] `.env` is in `.gitignore`
- [ ] Audit logs are reviewed regularly
- [ ] Prisma connection pool is sized appropriately for load

---

## 10. Common Issues

### `Can't reach database`
- Check `DATABASE_URL` format: `postgresql://user:pass@host:5432/dbname`
- Ensure PostgreSQL is running and the database exists

### `Firebase not initialized`
- Ensure the service account JSON path in `MEDIFIND_FIREBASE_CREDENTIALS` is correct
- Check file permissions

### `Socket.io CORS error`
- Add your Flutter app's origin to `CORS_ORIGIN` in `.env`
- For mobile apps using WebSocket, set `CORS_ORIGIN=*` in development

### `Prisma: migration failed`
- Run `npx prisma migrate status` to see migration state
- If database is ahead of migrations: `npx prisma migrate resolve --applied <migration_name>`

### `OTP not arriving`
- Check SMTP credentials with `npm run admin:test-email`
- Check spam folder
- Ensure `SMTP_FROM` matches an authorized sender in your email provider
