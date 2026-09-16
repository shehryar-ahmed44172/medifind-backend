import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authMiddleware, roleMiddleware, ipWhitelistMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public: client needs session timeout before login completes
router.get('/client-settings', adminController.getClientSettings);

// Protected admin routes
router.use(authMiddleware);
router.use(roleMiddleware('ADMIN'));
router.use(ipWhitelistMiddleware);   // enforces IP whitelist when enabled

router.get('/users',                   adminController.getAllUsers);
router.get('/users/:id',               adminController.getUserProfile);
router.get('/stats',                   adminController.getDashboardStats);
router.get('/health',                  adminController.getSystemHealth);
router.get('/logs',                    adminController.getAuditLogs);
router.get('/subscriptions',           adminController.getSubscriptions);
router.get('/subscriptions/all',       adminController.getAllSubscriptions);
router.get('/notifications',           adminController.getCommAudit);
router.get('/analytics/emergencies',   adminController.getEmergencyTrend);   // NEW: analytics
router.get('/responders/pending',      adminController.getPendingResponders);
router.post('/responders/:id/verify',  adminController.processVerification);
router.patch('/users/:id/deactivate',  adminController.deactivateUser);
router.patch('/users/:id/activate',    adminController.reactivateUser);
router.delete('/users/:id',            adminController.deleteUser);
router.post('/test-email',             adminController.sendTestEmail);
router.post('/generate-draft',         adminController.generateDraft);
router.get('/platform-settings',       adminController.getPlatformSettings);
router.put('/platform-settings',       adminController.savePlatformSettings);
router.post('/test-smtp',              adminController.testSmtpConfig);
router.get('/my-ip',                   adminController.getMyIp);
router.get('/responders/online',       adminController.getOnlineResponders);
router.get('/responders/verified',     adminController.getVerifiedResponders);
export default router;
