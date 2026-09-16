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

// Initialize Express app
const app: Express = express();
const server = http.createServer(app);

// Environment variables
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const HOST = process.env.HOST || '0.0.0.0';
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3100').split(',');

// Socket.io setup
const io = new SocketIOServer(server, {
  cors: {
    origin: '*', // Relaxed for development debugging
    methods: ['GET', 'POST'],
    credentials: true,
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
app.use(cors({
  origin: '*', // Relaxed for development debugging
  credentials: true,
}));
// Payments — must be mounted BEFORE express.json() so the webhook receives the raw body
app.use('/api/payments', paymentRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Rate limiting middleware (relaxed for development and media loading)
const requestCounts = new Map<string, number>();
app.use((req: Request, res: Response, next: any) => {
  // Don't rate limit static files (images, reports, etc)
  if (req.path.startsWith('/uploads')) {
    return next();
  }

  const ip = req.ip || 'unknown';
  const count = (requestCounts.get(ip) || 0) + 1;
  requestCounts.set(ip, count);

  // Increased limit for development/testing
  if (count > 1000) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  // Clear count after 15 minutes
  setTimeout(() => {
    const current = requestCounts.get(ip) || 0;
    if (current > 1) {
      requestCounts.set(ip, current - 1);
    } else {
      requestCounts.delete(ip);
    }
  }, 15 * 60 * 1000);

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

// Test Socket Broadcast (Plan v2)
app.get('/api/notifications/test-socket/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  io.to(`notifications:${userId}`).emit('notification', {
    type: 'TEST_ALERT',
    title: 'In-App Test',
    body: `Direct broadcast to user ${userId} successful.`,
    timestamp: new Date().toISOString()
  });
  res.json({ message: `Broadcast sent to notifications:${userId}` });
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

// Socket.io connection handling
io.on('connection', (socket) => {
  const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
  const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
  
  logger.info(`🔌 Client Connected: ${socket.id}`);
  logger.info(`   - UserID: ${userId || 'GUEST'}`);
  logger.info(`   - Device: ${userAgent}`);
  logger.info(`   - Auth Data: ${JSON.stringify(socket.handshake.auth || {})}`);
  logger.info(`   - Query Data: ${JSON.stringify(socket.handshake.query || {})}`);

  // Auto-join notification room
  if (userId) {
    socket.join(`notifications:${userId}`);
    logger.info(`📢 Socket ${socket.id} auto-joined notifications:${userId}`);
  }

  // Diagnostic Ping
  socket.on('ping', (data: any) => {
    logger.info(`📡 Ping received from ${socket.id}: ${JSON.stringify(data || {})}`);
    socket.emit('pong', { 
      received: data, 
      rooms: Array.from(socket.rooms),
      timestamp: new Date().toISOString() 
    });
  });

  // Join room events
  socket.on('join:emergency', (emergencyId: string) => {
    socket.join(`emergency:${emergencyId}`);
    logger.info(`🟢 Socket ${socket.id} joined emergency:${emergencyId}`);
  });

  socket.on('join:location', (emergencyId: string) => {
    socket.join(`location:${emergencyId}`);
    logger.info(`📍 Socket ${socket.id} tracking location:${emergencyId}`);
  });

  socket.on('join', (data: any) => {
    const { userId: targetId, role, room } = data || {};
    
    // Join user-specific notification room
    if (targetId || userId) {
      socket.join(`notifications:${targetId || userId}`);
      logger.info(`🔔 Socket ${socket.id} joined notifications:${targetId || userId}`);
    }

    // Join role-based rooms
    if (role === 'ADMIN') {
      socket.join('admin_notifications');
      socket.join('system_logs');
      logger.info(`🛡️ Socket ${socket.id} joined admin channels`);
    }

    // Join specific arbitrary room
    if (room) {
      socket.join(room);
      logger.info(`📦 Socket ${socket.id} joined room: ${room}`);
    }
  });

  socket.on('join:chat', (roomId: string) => {
    socket.join(`chat:${roomId}`);
    logger.info(`💬 Socket ${socket.id} joined chat:${roomId}`);
  });

  // Live location update from responder during active emergency (FR7.4)
  socket.on('update_location', async (data: any) => {
    const responderId = userId as string;
    if (!responderId) {
      logger.warn(`⚠️ update_location from unauthenticated socket ${socket.id} — ignored`);
      return;
    }

    const { emergencyId, latitude, longitude, status } = data || {};
    if (!emergencyId || latitude === undefined || longitude === undefined) {
      logger.warn(`⚠️ update_location missing fields from ${socket.id}: ${JSON.stringify(data)}`);
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
    const trackingStatus = statusMap[(status || '').toUpperCase()] ?? 'EN_ROUTE';

    const parsedLat = parseFloat(latitude);
    const parsedLon = parseFloat(longitude);
    const coordError = validatePakistanCoordinates(parsedLat, parsedLon);
    if (coordError) {
      logger.warn(`⚠️ update_location rejected — ${coordError} (socket ${socket.id})`);
      return;
    }

    try {
      await submitLocationUpdate({
        emergencyId,
        responderId,
        latitude: parsedLat,
        longitude: parsedLon,
        status: trackingStatus,
      });
      logger.info(`📍 Location update: responder ${responderId} → [${parsedLat}, ${parsedLon}] (${trackingStatus}) for emergency ${emergencyId}`);
    } catch (err: any) {
      logger.error(`❌ Failed to process location update: ${err.message}`);
    }
  });

  // Test Broadcast Event (Internal use)
  socket.on('test:broadcast', (data: any) => {
    const targetRoom = `notifications:${data.userId || userId}`;
    logger.info(`🧪 Test broadcast requested for room ${targetRoom}`);
    io.to(targetRoom).emit('notification', {
      type: 'TEST_ALERT',
      title: 'Socket Test',
      body: 'This is a test notification from the server.',
      timestamp: new Date().toISOString()
    });
  });

  // Disconnect handling
  socket.on('disconnect', (reason) => {
    logger.info(`🔌 Client Disconnected: ${socket.id} (${reason})`);
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
