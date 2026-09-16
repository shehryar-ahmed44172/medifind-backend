import express, { Express, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';
import logger from './utils/logger';
import authRoutes from './routes/auth';
import passwordRoutes from './routes/password';
import userRoutes from './routes/users';
import medicalProfileRoutes from './routes/medicalProfile';
import emergencyRoutes from './routes/emergencies';
import { checkAndEscalate } from './services/emergencyService';
import { submitLocationUpdate } from './services/trackingService';
import { validatePakistanCoordinates } from './utils/geoValidation';
import responderRoutes from './routes/responders';
import trackingRoutes from './routes/tracking';
import reportRoutes from './routes/reports';
import caregiverRoutes from './routes/caregivers';
import chatRoutes from './routes/chat';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notification';
import { initializeNotifications } from './services/notification';
import paymentRoutes from './routes/payments';
import fileRoutes from './routes/files';
import path from 'path';
import { verifyAccessToken } from './utils/jwt';
import prisma from './lib/prisma';
import { TokenPayload } from './types/auth';
import { canAccessEmergency, isAssignedResponder, isChatRoomMember } from './utils/accessControl';

// Initialize Express app
const app: Express = express();
const server = http.createServer(app);

// Environment variables
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const HOST = process.env.HOST || '0.0.0.0';

// Socket.io setup
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: parseInt(process.env.SOCKET_IO_PING_INTERVAL || '25000'),
  pingTimeout: parseInt(process.env.SOCKET_IO_PING_TIMEOUT || '60000'),
});

// Engine-level error logging (Plan v3)
io.engine.on("connection_error", (err) => {
  logger.error(`❌ Socket.io Connection Error: ${err.req ? `[${err.req.connection.remoteAddress}] ` : ''}${err.code} - ${err.message}`);
  if (err.context) logger.error(`   Context: ${JSON.stringify(err.context)}`);
});

// Middleware
app.use(helmet());
// API auth uses Bearer tokens (no cookies), so credentials are not needed cross-origin
app.use(cors({ origin: '*' }));
// Payments — must be mounted BEFORE express.json() so the webhook receives the raw body
app.use('/api/payments', paymentRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Rate limiting: fixed 15-minute window per IP (static uploads are exempt)
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 1000;
const requestCounts = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of requestCounts) if (entry.resetAt <= now) requestCounts.delete(ip);
}, RATE_LIMIT_WINDOW_MS).unref();

app.use((req: Request, res: Response, next: any) => {
  if (req.path.startsWith('/uploads')) return next();

  const ip = req.ip || 'unknown';
  const now = Date.now();
  let entry = requestCounts.get(ip);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    requestCounts.set(ip, entry);
  }
  entry.count += 1;

  if (entry.count > RATE_LIMIT_MAX) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    firebase: process.env.MEDIFIND_FIREBASE_CREDENTIALS ? 'configured' : 'missing',
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'MediFind Backend API',
    version: '1.0.0',
    environment: NODE_ENV,
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      emergencies: '/api/emergencies',
      medical: '/api/medical-profiles',
      users: '/api/users',
    },
    websocket: {
      url: `ws://localhost:${PORT}`,
      rooms: ['emergencies', 'locations', 'notifications', 'chat'],
    },
  });
});

/** Caregivers follow every open emergency of their linked patients live. */
const joinCaregiverToOpenEmergencies = async (socket: any, caregiverId: string) => {
  const links = await prisma.caregiverLink.findMany({
    where: { caregiverId, status: 'ACCEPTED', isActive: true },
    select: { patientId: true },
  });
  if (links.length === 0) return;
  const open = await prisma.emergency.findMany({
    where: { patientId: { in: links.map(l => l.patientId) }, status: { in: ['ACTIVE', 'ASSIGNED', 'ARRIVED'] } },
    select: { id: true },
  });
  for (const e of open) {
    socket.join(`emergency:${e.id}`);
    socket.join(`location:${e.id}`);
  }
};

// Socket.io authentication — identity always comes from a verified JWT,
// never from a client-supplied userId.
io.use((socket, next) => {
  const authHeader = socket.handshake.headers.authorization;
  const token =
    socket.handshake.auth?.token ||
    (typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined);

  const payload = token ? verifyAccessToken(String(token)) : null;
  if (!payload) {
    logger.warn(`🔒 Socket ${socket.id} rejected: missing or invalid token`);
    return next(new Error('Unauthorized'));
  }
  socket.data.user = payload;
  next();
});

io.on('connection', (socket) => {
  const user = socket.data.user as TokenPayload;
  const userId = user.userId;

  logger.info(`🔌 Client connected: ${socket.id} (user ${userId}, ${user.role})`);

  socket.join(`notifications:${userId}`);
  if (user.role === 'ADMIN') {
    socket.join('admin_notifications');
    socket.join('system_logs');
  }
  if (user.role === 'RESPONDER') {
    socket.join('responders');
  }
  if (user.role === 'CAREGIVER') {
    joinCaregiverToOpenEmergencies(socket, userId).catch(err =>
      logger.error(`Caregiver room auto-join failed for ${userId}: ${err.message}`));
  }

  // Diagnostic Ping
  socket.on('ping', (data: any) => {
    socket.emit('pong', {
      received: data,
      rooms: Array.from(socket.rooms),
      timestamp: new Date().toISOString()
    });
  });

  // Join room events (authorised per emergency / chat room)
  const joinEmergencyRoom = async (prefix: 'emergency' | 'location', emergencyId: string) => {
    try {
      if (await canAccessEmergency(user, emergencyId)) {
        socket.join(`${prefix}:${emergencyId}`);
      } else {
        logger.warn(`🔒 Socket ${socket.id} denied ${prefix}:${emergencyId}`);
      }
    } catch (err: any) {
      logger.error(`Failed to join ${prefix}:${emergencyId}: ${err.message}`);
    }
  };

  socket.on('join:emergency', (emergencyId: string) => joinEmergencyRoom('emergency', emergencyId));
  socket.on('join:location', (emergencyId: string) => joinEmergencyRoom('location', emergencyId));

  // Legacy generic join — rooms are derived from the verified token only
  socket.on('join', () => {
    socket.join(`notifications:${userId}`);
    if (user.role === 'ADMIN') {
      socket.join('admin_notifications');
      socket.join('system_logs');
    }
  });

  socket.on('join:responders', () => {
    if (user.role === 'RESPONDER') socket.join('responders');
  });

  socket.on('join:chat', async (roomId: string) => {
    try {
      if (await isChatRoomMember(userId, roomId)) {
        socket.join(`chat:${roomId}`);
      } else {
        logger.warn(`🔒 Socket ${socket.id} denied chat:${roomId}`);
      }
    } catch (err: any) {
      logger.error(`Failed to join chat:${roomId}: ${err.message}`);
    }
  });

  socket.on('leave:chat', (roomId: string) => {
    socket.leave(`chat:${roomId}`);
  });

  // Live location update from the assigned responder during an emergency
  socket.on('update_location', async (data: any) => {
    if (user.role !== 'RESPONDER') return;

    const { emergencyId, latitude, longitude, status } = data || {};
    if (!emergencyId || latitude === undefined || longitude === undefined) {
      return;
    }

    // Map mobile/emergency status values to tracking status enum
    const statusMap: Record<string, 'EN_ROUTE' | 'ARRIVED' | 'TREATING' | 'TRANSPORTED'> = {
      ACCEPTED:    'EN_ROUTE',
      EN_ROUTE:    'EN_ROUTE',
      ARRIVED:     'ARRIVED',
      TREATING:    'TREATING',
      TRANSPORTED: 'TRANSPORTED',
      RESOLVED:    'ARRIVED',
    };
    const trackingStatus = statusMap[String(status || '').toUpperCase()] ?? 'EN_ROUTE';

    const parsedLat = parseFloat(latitude);
    const parsedLon = parseFloat(longitude);
    const coordError = validatePakistanCoordinates(parsedLat, parsedLon);
    if (coordError) {
      logger.warn(`⚠️ update_location rejected — ${coordError} (socket ${socket.id})`);
      return;
    }

    try {
      if (!(await isAssignedResponder(userId, emergencyId))) {
        logger.warn(`🔒 update_location from ${userId} for unassigned emergency ${emergencyId}`);
        return;
      }
      await submitLocationUpdate({
        emergencyId,
        responderId: userId,
        latitude: parsedLat,
        longitude: parsedLon,
        status: trackingStatus,
      });
    } catch (err: any) {
      logger.error(`❌ Failed to process location update: ${err.message}`);
    }
  });

  // Disconnect handling
  socket.on('disconnect', (reason) => {
    logger.info(`🔌 Client disconnected: ${socket.id} (${reason})`);
  });
});

// Initialize notification service with Socket.io
initializeNotifications(io);
// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/users', userRoutes);
app.use('/api/medical-profile', medicalProfileRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/responders', responderRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/caregivers', caregiverRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Profile images and registration docs are non-sensitive — serve publicly
app.use('/uploads/profile',   express.static(path.join(process.cwd(), 'uploads', 'profile')));
app.use('/uploads/documents', express.static(path.join(process.cwd(), 'uploads', 'documents')));
app.use('/uploads/chat',      express.static(path.join(process.cwd(), 'uploads', 'chat')));
// Chat files uploaded before the chat folder existed were stored under documents
app.use('/uploads/chat',      express.static(path.join(process.cwd(), 'uploads', 'documents')));

// Medical reports require authentication — served through access-controlled route
app.use('/api/files', fileRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  logger.error(`Error: ${err.message}`);
  // Multer upload errors (size / type) are client errors
  if (err.name === 'MulterError' || /Unsupported file type/.test(err.message)) {
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, closing server immediately...`);
  
  // Force close the server and its connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // On Windows, CTRL+C needs an immediate exit to release the port
  setTimeout(() => {
    process.exit(0);
  }, 100);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server (skip in test environment — supertest manages the port)
if (NODE_ENV !== 'test') server.listen(PORT, HOST, () => {
  logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
  logger.info(`📡 WebSocket available at ws://${HOST}:${PORT}`);
  logger.info(`🔧 Environment: ${NODE_ENV}`);

  // Start the background escalation checker (Module 5 - FR5.8)
  setInterval(() => {
    checkAndEscalate().catch(err => logger.error(`Escalation check failed: ${err.message}`));
  }, 60000); // Check every minute
});

// Export for testing
export { app, io, server };
export const getIo = () => io;
