import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Protected admin routes
router.use(authMiddleware);
router.use(roleMiddleware('ADMIN'));

router.get('/users',               adminController.getAllUsers);
router.get('/stats',               adminController.getDashboardStats);
router.get('/health',              adminController.getSystemHealth);
router.get('/logs',                adminController.getAuditLogs);
router.get('/subscriptions',       adminController.getSubscriptions);
router.get('/notifications',       adminController.getCommAudit);          // comm audit
router.get('/responders/pending',  adminController.getPendingResponders);
router.post('/responders/:id/verify', adminController.processVerification);
router.patch('/users/:id/deactivate', adminController.deactivateUser);
router.patch('/users/:id/activate',   adminController.reactivateUser);
router.delete('/users/:id',        adminController.deleteUser);
router.post('/test-email',         adminController.sendTestEmail);
router.post('/generate-draft',     adminController.generateDraft);
export default router;
