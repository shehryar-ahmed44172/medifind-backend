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
import responderRoutes from './routes/responders';
import trackingRoutes from './routes/tracking';
import reportRoutes from './routes/reports';
import caregiverRoutes from './routes/caregivers';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notification';
import { initializeNotifications } from './services/notification';
import path from 'path';

// Initialize Express app
const app: Express = express();
const server = http.createServer(app);

// Socket.io setup
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3100',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: parseInt(process.env.SOCKET_IO_PING_INTERVAL || '25000'),
  pingTimeout: parseInt(process.env.SOCKET_IO_PING_TIMEOUT || '60000'),
});

// Environment variables
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3100',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Rate limiting middleware (basic)
const requestCounts = new Map<string, number>();
app.use((req: Request, res: Response, next: any) => {
  const ip = req.ip || 'unknown';
  const count = (requestCounts.get(ip) || 0) + 1;
  requestCounts.set(ip, count);

  if (count > 100) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  setTimeout(() => {
    requestCounts.delete(ip);
  }, 15 * 60 * 1000); // 15 minutes

  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
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

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Join room events
  socket.on('join:emergency', (emergencyId: string) => {
    socket.join(`emergency:${emergencyId}`);
    logger.info(`Client ${socket.id} joined emergency ${emergencyId}`);
  });

  socket.on('join:location', (emergencyId: string) => {
    socket.join(`location:${emergencyId}`);
    logger.info(`Client ${socket.id} started tracking location ${emergencyId}`);
  });

  socket.on('join:notifications', (userId: string) => {
    socket.join(`notifications:${userId}`);
    logger.info(`Client ${socket.id} joined notifications for user ${userId}`);
  });

  // Leave room events
  socket.on('leave:emergency', (emergencyId: string) => {
    socket.leave(`emergency:${emergencyId}`);
    logger.info(`Client ${socket.id} left emergency ${emergencyId}`);
  });

  socket.on('leave:location', (emergencyId: string) => {
    socket.leave(`location:${emergencyId}`);
    logger.info(`Client ${socket.id} stopped tracking location ${emergencyId}`);
  });

  // Error handling
  socket.on('error', (error: Error) => {
    logger.error(`Socket error: ${error.message}`);
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
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
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Static route for serving uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing gracefully...');
  server.close(async () => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start server
server.listen(PORT, HOST, () => {
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
