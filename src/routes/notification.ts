import { Router } from 'express';
import * as notificationController from '../controllers/notification';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// Send emergency alerts to responders
router.post('/emergency', notificationController.sendEmergencyAlert);

// Silence other responders when one accepts
router.post('/silence', notificationController.silenceOtherResponders);

// Get notification history for current user (inbox)
router.get('/history', notificationController.getNotificationHistory);

// Get broadcast logs sent by the requesting admin
router.get('/admin-history', notificationController.getAdminBroadcastHistory);

// Mark notification as read
router.patch('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

// Broadcast manual notification (Admin only)
router.post('/broadcast', notificationController.broadcastNotification);

export default router;
