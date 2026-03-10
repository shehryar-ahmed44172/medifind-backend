# MediFind Backend

Node.js + Express.js backend for MediFind emergency response healthcare application with real-time location tracking, emergency management, and responder matching.

## Tech Stack

- **Runtime:** Node.js 18+ LTS
- **Framework:** Express.js 4.18
- **Language:** TypeScript 5.0
- **Real-Time:** Socket.io 4.6
- **Database:** PostgreSQL 14+ with Prisma 5.0 ORM
- **Cache:** Redis 7.0 with ioredis
- **Authentication:** JWT (HS256)
- **API Documentation:** RESTful JSON API

## Prerequisites

- Node.js 18.0 or higher
- npm 9.0 or higher
- PostgreSQL 14 or higher
- Redis 7.0 or higher
- Docker & Docker Compose (for containerized setup)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd medifind-backend

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate
```

## Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
# Required keys:
# - DATABASE_URL
# - JWT_SECRET
# - PORT
```

## Database Setup

```bash
# Start PostgreSQL and Redis with Docker Compose
docker-compose up -d

# Run migrations
npm run db:migrate

# (Optional) Seed database with sample data
npm run db:seed

# (Optional) Open Prisma Studio
npm run db:studio
```

## Development

```bash
# Start development server with hot reload
npm run dev

# The server runs on http://localhost:3000
# Socket.io is available at ws://localhost:3000
```

## Building & Production

```bash
# Type check
npm run type-check

# Build TypeScript
npm run build

# Start production server
npm start
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## API Endpoints

### Health Check
- `GET /health` - Server health status
- `GET /` - API info and available resources

### Authentication (To be implemented)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token

### Emergencies (To be implemented)
- `POST /api/emergencies` - Create emergency (SOS trigger)
- `GET /api/emergencies/:id` - Get emergency details
- `PUT /api/emergencies/:id/status` - Update emergency status
- `GET /api/emergencies/:id/tracking` - Real-time location updates

### Medical Profiles (To be implemented)
- `GET /api/medical-profiles/me` - Get current user's medical profile
- `PUT /api/medical-profiles/me` - Update medical profile
- `GET /api/medical-profiles/:userId` - Get user's medical profile (authorized)

## WebSocket Events (To be implemented)

### Emergency Channel
- `emergency:created` - New emergency triggered
- `emergency:updated` - Emergency status changed
- `emergency:assigned` - Responder assigned

### Location Channel
- `location:update` - Real-time location tracking
- `location:stream:start` - Start location streaming
- `location:stream:stop` - Stop location streaming

### Notification Channel
- `notification:received` - New notification
- `notification:alert` - Critical alert

## Docker Deployment

```bash
# Build Docker image
docker build -t medifind-backend:latest .

# Run container
docker run -p 3000:3000 \
  --env-file .env.local \
  --network medifind-network \
  medifind-backend:latest
```

## Project Structure

```
src/
├── config/          - Configuration files (DB, Redis, env)
├── middleware/      - Express middleware (auth, error handling)
├── routes/          - API route definitions
├── controllers/     - Request handlers
├── services/        - Business logic
├── websocket/       - Socket.io handlers
├── queues/          - Message queue processors
├── utils/           - Utility functions (logger, helpers)
├── types/           - TypeScript type definitions
└── server.ts        - Express + Socket.io bootstrap

prisma/
├── schema.prisma    - Database schema
└── seed.ts          - Database seeding script

tests/               - Test files
docs/                - Documentation
logs/                - Application logs
```

## Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
docker-compose ps

# Verify connection string in .env.local
# Format: postgresql://user:password@host:port/database
```

### Redis Connection Error
```bash
# Check Redis is running and healthy
docker-compose logs redis

# Verify REDIS_URL in .env.local
```

### Port Already in Use
```bash
# Change PORT in .env.local or
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## Development Guidelines

- Use TypeScript strict mode
- Follow REST API conventions
- Write unit tests for services
- Document complex business logic
- Use environment variables for configuration
- Keep dependencies updated

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please open a GitHub issue or contact the MediFind team.
