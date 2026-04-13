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

// Get notification history for current user
router.get('/history', notificationController.getNotificationHistory);

export default router;
