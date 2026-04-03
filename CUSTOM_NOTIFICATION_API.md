# 🚀 CUSTOM NOTIFICATION SYSTEM FOR MEDIFIND

**Objective:** Build your own notification APIs with 100% control, 100% free infrastructure

---

## 🎯 **WHY BUILD CUSTOM NOTIFICATIONS?**

| Aspect | OneSignal | Custom API |
|--------|-----------|-----------|
| **Cost** | Free tier (10k/mo) | $0 (your server) |
| **Control** | Limited customization | Full control |
| **HIPAA Compliance** | Depends on BAA | 100% in-house |
| **Integration** | API calls required | Direct integration |
| **Multi-Channel** | Separate services | Unified system |
| **Scalability Phase 1** | <10k notifications/mo | Handles millions |
| **Learning** | Black box | Own code, learn fullstack |
| **Migration Later** | Hard lock-in | Easy to switch providers |

**Recommendation:** Build custom notification API ✅

---

## 📋 **CUSTOM NOTIFICATION SYSTEM ARCHITECTURE**

```
┌─────────────────────────────────────────────────────┐
│     Custom Notification System Architecture         │
├─────────────────────────────────────────────────────┤
│                                                       │
│  1. Notification Controller                         │
│     POST /api/notifications/send                    │
│     ├─ Validate request                             │
│     ├─ Create notification record                   │
│     └─ Enqueue for delivery                         │
│                                                       │
│  2. Notification Service Layer                      │
│     ├─ Multi-channel formatter                      │
│     ├─ Template resolver                            │
│     ├─ Recipient resolver                           │
│     └─ Retry logic                                  │
│                                                       │
│  3. Delivery Channels                               │
│     ├─ In-App (Socket.io) - REAL-TIME              │
│     ├─ Email (Mailgun/SendGrid) - RELIABLE         │
│     ├─ SMS (Twilio/Vonage) - OPTIONAL PHASE 2      │
│     └─ Push (OneSignal) - OPTIONAL BACKUP           │
│                                                       │
│  4. Notification Queue (Optional but recommended)   │
│     ├─ SQLite/PostgreSQL Queue                      │
│     ├─ Job processor (Bull, RxQueue)                │
│     ├─ Retry mechanism (exponential backoff)        │
│     └─ Delivery tracking                            │
│                                                       │
│  5. Notification Repository                         │
│     ├─ PostgreSQL audit logs                        │
│     ├─ Notification history                         │
│     ├─ Delivery status tracking                     │
│     └─ User preferences                             │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## 🏗️ **IMPLEMENTATION - 4 COMPONENTS**

### **Component 1: Notification Types & Templates**

**File: `src/types/notification.ts`**

```typescript
// Types for all notification scenarios
export enum NotificationType {
  // Emergency alerts
  SOS_TRIGGERED = 'sos_triggered',
  RESPONDER_ASSIGNED = 'responder_assigned',
  RESPONDER_ARRIVING = 'responder_arriving',
  EMERGENCY_RESOLVED = 'emergency_resolved',
  
  // Account events
  ACCOUNT_CREATED = 'account_created',
  PASSWORD_RESET = 'password_reset',
  PROFILE_UPDATED = 'profile_updated',
  
  // Caregiver notifications
  PATIENT_EMERGENCY = 'patient_emergency',
  PATIENT_SAFE = 'patient_safe',
}

export enum NotificationChannel {
  IN_APP = 'in_app',        // Socket.io real-time
  EMAIL = 'email',          // Mailgun/SendGrid
  SMS = 'sms',              // Twilio (Phase 2)
  PUSH = 'push',            // OneSignal (backup)
}

export interface NotificationPayload {
  type: NotificationType;
  recipientId: string;
  channels: NotificationChannel[];
  data: {
    title: string;
    body: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
  };
  priority: 'low' | 'normal' | 'high' | 'emergency';
  scheduledFor?: Date; // For delayed sends
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  actionLabel?: string;
  actionUrl?: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  createdAt: Date;
}
```

---

### **Component 2: Notification Repository**

**File: `src/repositories/notificationRepository.ts`**

```typescript
import { prisma } from '../config';

export class NotificationRepository {
  // Save notification record for audit trail
  async create(data: {
    userId: string;
    type: string;
    channels: string[];
    title: string;
    body: string;
    status: string;
  }) {
    return prisma.notificationLog.create({
      data: {
        userId: data.userId,
        type: data.type,
        channels: data.channels,
        title: data.title,
        body: data.body,
        status: data.status,
        createdAt: new Date(),
      },
    });
  }

  // Get notification history for user
  async getUserNotifications(userId: string, limit = 50) {
    return prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Update delivery status
  async updateStatus(
    notificationId: string,
    status: string,
    deliveredAt?: Date,
    failureReason?: string
  ) {
    return prisma.notificationLog.update({
      where: { id: notificationId },
      data: {
        status,
        deliveredAt: deliveredAt || null,
        failureReason: failureReason || null,
      },
    });
  }

  // Get failed notifications for retry
  async getFailedNotifications(hoursOld = 1) {
    const since = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    return prisma.notificationLog.findMany({
      where: {
        status: 'failed',
        createdAt: { gte: since },
      },
    });
  }

  // User notification preferences
  async getUserPreferences(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        notificationPreferences: true,
        email: true,
        phoneNumber: true,
      },
    });
  }
}

export const notificationRepository = new NotificationRepository();
```

---

### **Component 3: Notification Service (The Core Logic)**

**File: `src/services/notification/index.ts`**

```typescript
import { Socket, Server as SocketServer } from 'socket.io';
import { NotificationPayload, NotificationChannel } from '../../types/notification';
import { notificationRepository } from '../../repositories/notificationRepository';

// Initialize Socket.io (passed from server.ts)
let io: SocketServer | null = null;

export function initializeNotifications(socketServer: SocketServer) {
  io = socketServer;
}

export class NotificationService {
  /**
   * Main method to send notifications across all channels
   */
  async sendNotification(
    userId: string,
    payload: NotificationPayload
  ) {
    try {
      // 1. Validate user exists
      const user = await notificationRepository.getUserPreferences(userId);
      if (!user) throw new Error('User not found');

      // 2. Create notification record
      const notification = await notificationRepository.create({
        userId,
        type: payload.type,
        channels: payload.channels,
        title: payload.data.title,
        body: payload.data.body,
        status: 'pending',
      });

      // 3. Send across requested channels
      const results = await Promise.allSettled(
        payload.channels.map(channel =>
          this.sendViaChannel(userId, channel, payload, user)
        )
      );

      // 4. Determine overall status
      const allSucceeded = results.every(r => r.status === 'fulfilled');
      const failureReason = results
        .filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason?.message)
        .join('; ');

      // 5. Update notification status
      await notificationRepository.updateStatus(
        notification.id,
        allSucceeded ? 'delivered' : 'failed',
        allSucceeded ? new Date() : undefined,
        failureReason || undefined
      );

      return {
        success: allSucceeded,
        notificationId: notification.id,
        results,
      };
    } catch (error) {
      console.error('Notification send error:', error);
      throw error;
    }
  }

  /**
   * Send via specific channel
   */
  private async sendViaChannel(
    userId: string,
    channel: NotificationChannel,
    payload: NotificationPayload,
    user: any
  ) {
    switch (channel) {
      case NotificationChannel.IN_APP:
        return this.sendInApp(userId, payload);

      case NotificationChannel.EMAIL:
        return this.sendEmail(user.email, payload);

      case NotificationChannel.SMS:
        return this.sendSMS(user.phoneNumber, payload);

      case NotificationChannel.PUSH:
        return this.sendPush(userId, payload);

      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * In-app notification via Socket.io (REAL-TIME, 100% FREE)
   */
  private async sendInApp(
    userId: string,
    payload: NotificationPayload
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!io) {
        reject(new Error('Socket.io not initialized'));
        return;
      }

      // Send to user's room (defined by userId)
      io!.to(`user:${userId}`).emit('notification', {
        id: Math.random().toString(36).substring(7),
        type: payload.type,
        title: payload.data.title,
        body: payload.data.body,
        priority: payload.priority,
        timestamp: new Date(),
        actionUrl: payload.data.actionUrl,
      });

      // Resolve after short delay (assume delivery)
      setTimeout(resolve, 100);
    });
  }

  /**
   * Email notification via Mailgun (FREE TIER: 100/day)
   */
  private async sendEmail(
    email: string,
    payload: NotificationPayload
  ): Promise<void> {
    // Simple implementation - can use mailgun, sendgrid, etc.
    const mailgunKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    if (!mailgunKey || !mailgunDomain) {
      console.warn('Mailgun not configured, skipping email');
      return;
    }

    try {
      const response = await fetch(
        `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`api:${mailgunKey}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            from: `MediFind <noreply@${mailgunDomain}>`,
            to: email,
            subject: payload.data.title,
            text: payload.data.body,
            html: this.emailHTML(payload),
          }).toString(),
        }
      );

      if (!response.ok) {
        throw new Error(`Email send failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  /**
   * SMS notification via Twilio (DEFERRED: $0.01/SMS in Phase 2)
   */
  private async sendSMS(
    phoneNumber: string,
    payload: NotificationPayload
  ): Promise<void> {
    // For Phase 1, we skip SMS - can add in Phase 2
    console.log('SMS deferred to Phase 2');
    return;

    // Phase 2 implementation:
    // const accountSid = process.env.TWILIO_ACCOUNT_SID;
    // const authToken = process.env.TWILIO_AUTH_TOKEN;
    // const fromPhone = process.env.TWILIO_PHONE_NUMBER;
    // Use twilio SDK to send...
  }

  /**
   * Push notification via OneSignal (OPTIONAL BACKUP)
   */
  private async sendPush(
    userId: string,
    payload: NotificationPayload
  ): Promise<void> {
    // For Phase 1, we use OneSignal only as backup if Socket.io fails
    // Can implement in Phase 2 if needed
    console.log('Push deferred to Phase 2 backup');
    return;
  }

  /**
   * Helper: Format email HTML
   */
  private emailHTML(payload: NotificationPayload): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${payload.data.title}</h2>
            <p style="color: #666; line-height: 1.6;">${payload.data.body}</p>
            ${payload.data.actionUrl ? `
              <a href="${payload.data.actionUrl}" 
                 style="display: inline-block; margin-top: 20px; padding: 10px 20px; 
                        background-color: #007bff; color: white; text-decoration: none; 
                        border-radius: 5px;">
                View Details
              </a>
            ` : ''}
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">
              MediFind Emergency Response System<br>
              © 2026. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
  }
}

export const notificationService = new NotificationService();
```

---

### **Component 4: Notification Controller & Routes**

**File: `src/controllers/notification/index.ts`**

```typescript
import { Request, Response } from 'express';
import { notificationService } from '../../services/notification';
import { NotificationPayload, NotificationChannel, NotificationType } from '../../types/notification';
import { authMiddleware } from '../../middleware/authMiddleware';

export class NotificationController {
  /**
   * Send emergency alert (called from SOS trigger)
   * POST /api/notifications/emergency
   */
  async sendEmergencyAlert(req: Request, res: Response) {
    try {
      const { emergencyId, patientId, responderIds } = req.body;

      // Send to each responder via all channels
      const results = await Promise.all(
        responderIds.map(responderId =>
          notificationService.sendNotification(responderId, {
            type: NotificationType.SOS_TRIGGERED,
            recipientId: responderId,
            channels: [
              NotificationChannel.IN_APP,      // Real-time dashboard
              NotificationChannel.EMAIL,       // Backup alert
            ],
            data: {
              title: '🚨 EMERGENCY ALERT',
              body: `New SOS emergency from patient ${patientId}. Immediate action required!`,
              actionUrl: `/dashboard/emergency/${emergencyId}`,
              metadata: { emergencyId, patientId },
            },
            priority: 'emergency',
          })
        )
      );

      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  /**
   * Send responder assigned notification
   * POST /api/notifications/responder-assigned
   */
  async sendResponderAssigned(req: Request, res: Response) {
    try {
      const { emergencyId, patientId, responderId } = req.body;

      await notificationService.sendNotification(patientId, {
        type: NotificationType.RESPONDER_ASSIGNED,
        recipientId: patientId,
        channels: [
          NotificationChannel.IN_APP,
          NotificationChannel.EMAIL,
        ],
        data: {
          title: '✅ Responder Assigned',
          body: `A responder has been assigned to your emergency. ETA: 8 minutes.`,
          actionUrl: `/track-responder/${emergencyId}`,
        },
        priority: 'high',
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  /**
   * Account notification (e.g., password reset)
   * POST /api/notifications/account
   */
  async sendAccountNotification(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { type, title, body } = req.body;

      await notificationService.sendNotification(userId, {
        type: type as NotificationType,
        recipientId: userId,
        channels: [NotificationChannel.EMAIL],
        data: { title, body },
        priority: 'normal',
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  /**
   * Get user notification history
   * GET /api/notifications/history
   */
  async getNotificationHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const limit = parseInt(req.query.limit as string) || 50;

      // Implementation using repository
      res.json({ notifications: [] });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}

export const notificationController = new NotificationController();
```

**File: `src/routes/notification.ts`**

```typescript
import { Router } from 'express';
import { notificationController } from '../controllers/notification';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Emergency alerts (called from SOS/Emergency module)
router.post(
  '/api/notifications/emergency',
  authMiddleware(['RESPONDER']),
  (req, res) => notificationController.sendEmergencyAlert(req, res)
);

// Responder assigned (called from Responder Assignment module)
router.post(
  '/api/notifications/responder-assigned',
  authMiddleware(['SYSTEM']),
  (req, res) => notificationController.sendResponderAssigned(req, res)
);

// Account events (password reset, etc.)
router.post(
  '/api/notifications/account',
  authMiddleware(),
  (req, res) => notificationController.sendAccountNotification(req, res)
);

// Get notification history
router.get(
  '/api/notifications/history',
  authMiddleware(),
  (req, res) => notificationController.getNotificationHistory(req, res)
);

export default router;
```

---

## 🔗 **INTEGRATION POINTS (How to Use Custom Notifications)**

### **1. When Patient Triggers SOS (Week 3)**

```typescript
// In Emergency Controller (src/controllers/emergency/index.ts)

async triggerSOS(req: Request, res: Response) {
  const patientId = req.user.id;
  
  // 1. Create emergency record
  const emergency = await emergencyRepository.create({
    patientId,
    location: req.body.location,
    medicalProfile: req.body.medicalProfile,
  });

  // 2. Find nearest responders
  const responders = await responderRepository.getNearestResponders(
    req.body.location,
    radius: 5000 // 5km
  );

  // 3. SEND ALERTS using custom notification API
  await notificationService.sendNotification(null, {
    type: NotificationType.SOS_TRIGGERED,
    recipientIds: responders.map(r => r.id),
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    data: {
      title: '🚨 EMERGENCY ALERT',
      body: `SOS Emergency - Patient location: ${req.body.location}`,
      actionUrl: `/emergency/${emergency.id}`,
    },
    priority: 'emergency',
  });

  res.json({ success: true, emergencyId: emergency.id });
}
```

### **2. When Responder Accepts & Arrives (Week 3)**

```typescript
// In Responder Controller

async responderAccepted(req: Request, res: Response) {
  const responderId = req.user.id;
  const { emergencyId } = req.body;

  // 1. Update emergency status
  const emergency = await emergencyRepository.update(emergencyId, {
    assignedResponderId: responderId,
    status: 'responder_assigned',
  });

  // 2. NOTIFY PATIENT using custom notification API
  await notificationService.sendNotification(emergency.patientId, {
    type: NotificationType.RESPONDER_ASSIGNED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    data: {
      title: '✅ Responder On The Way',
      body: `Responder assigned. ETA: 8 minutes`,
      actionUrl: `/track/${emergencyId}`,
    },
    priority: 'high',
  });

  res.json({ success: true });
}
```

### **3. In Socket.io to Show Real-Time Updates (Week 4)**

```typescript
// In src/websocket/handlers/emergencyHandler.ts

export class EmergencyHandler {
  constructor(private io: Server) {}

  // User joins emergency room
  subscribeToEmergency(socket: Socket, emergencyId: string) {
    socket.join(`emergency:${emergencyId}`);
    
    // When responder location updates, broadcast to patient
    socket.on('location-update', (data) => {
      // Broadcast SIMULTANEOUSLY via:
      // 1. Socket.io (real-time)
      this.io.to(`emergency:${emergencyId}`).emit('responder-location', data);
      
      // 2. Custom notification (for notifications panel)
      notificationService.sendInAppNotification(...);
    });
  }
}
```

---

## 📊 **COST COMPARISON: BUILD vs BUY**

| Metric | OneSignal | Custom API |
|--------|-----------|-----------|
| **Infrastructure** | OneSignal server | Your PostgreSQL + Node.js |
| **Phase 1 Cost** | $0 (free tier) | $0 (your server) |
| **Notifications/month** | 10,000 limit | Unlimited |
| **Channels** | Their selection | Your full control |
| **HIPAA Compliance** | BAA needed | Built-in |
| **Data Privacy** | Third-party | Your database |
| **Customization** | Limited | Complete |
| **Learning Value** | Zero | High (fullstack) |
| **Phase 2+ Cost** | $99/month | Based on email provider ($20) |

---

## 🚀 **WEEK 2-4 NOTIFICATION TIMELINE**

### **Week 2: Medical Profile Setup**
```
- Create notification system foundation
- Implement NotificationService ✅
- Integrate Mailgun for email (free tier)
- Test account notifications (password reset, profile update)
```

### **Week 3: Emergency + Responder**
```
- Implement emergency alert notifications
- Send to nearest responders (via Socket.io + email)
- Track responder assignment notifications
- Show notifications in dashboard (Socket.io)
```

### **Week 4: Live Tracking**
```
- Real-time location updates via Socket.io
- Notification status tracking
- Delivery confirmations
```

### **Phase 2+: Upgrades (Optional)**
```
- Add Twilio SMS as backup channel
- Add OneSignal push as secondary fallback
- Implement notification preferences UI
- Analytics dashboard
```

---

## ✨ **WHY CUSTOM SYSTEM IS BRILLIANT FOR YOU**

✅ **Zero Cost** - Everything on your server  
✅ **Full Control** - Customize every notification  
✅ **HIPAA Ready** - Data stays in-house  
✅ **Scalable** - From 10 to 1 million notifications  
✅ **Learning** - Understand fullstack architecture  
✅ **Integration** - Ties directly to your emergency workflow  
✅ **Testing** - Easy to test without external APIs  
✅ **Privacy** - No third-party access to user data  

---

## 🎯 **READY TO BUILD CUSTOM NOTIFICATIONS?**

**Option A: Recommended**
1. Use Socket.io for in-app real-time notifications (100% free)
2. Use Mailgun free tier for email (100 emails/day)
3. Build custom NotificationService to tie everything together
4. Add SMS in Phase 2 when needed

**Option B: Hybrid** 
1. More complex setup, not recommended for MVP

**Which approach shall we take?** And ready to start Week 2 Medical Profile with integrated custom notification system? 🚀
