import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Protected admin routes
router.use(authMiddleware);
router.use(roleMiddleware('ADMIN'));

router.get('/users', adminController.getAllUsers);
router.get('/stats', adminController.getDashboardStats);
router.get('/responders/pending', adminController.getPendingResponders);
router.post('/responders/:id/verify', adminController.processVerification);
router.patch('/users/:id/deactivate', adminController.deactivateUser);
router.delete('/users/:id', adminController.deleteUser);

export default router;
