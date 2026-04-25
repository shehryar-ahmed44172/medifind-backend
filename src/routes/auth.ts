import { Router } from 'express';
import * as authController from '../controllers/auth';
import { authMiddleware } from '../middleware/authMiddleware';
import { loginRateLimitMiddleware } from '../middleware/loginRateLimitMiddleware';

const router = Router();

/**
 * Public endpoints
 */
router.post('/register', authController.register);
router.post('/login', loginRateLimitMiddleware, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationCode);

/**
 * Protected endpoints
 */
router.get('/me', authMiddleware, authController.getProfile);
router.put('/fcm-token', authMiddleware, authController.updateFcmToken);

export default router;
