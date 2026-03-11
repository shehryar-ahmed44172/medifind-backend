import { Router } from 'express';
import * as authController from '../controllers/auth';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * Public endpoints
 */
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

/**
 * Protected endpoints
 */
router.get('/me', authMiddleware, authController.getProfile);

export default router;
