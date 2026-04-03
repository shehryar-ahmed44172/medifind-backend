import { Router } from 'express';
import { passwordResetController } from '../controllers/password';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/password/forgot-password
 * Request password reset - sends email with reset link
 * No authentication required (user is not logged in yet)
 */
router.post('/forgot-password', (req, res) =>
	passwordResetController.forgotPassword(req, res)
);

/**
 * POST /api/password/reset
 * Reset password with token from email
 * No authentication required
 */
router.post('/reset', (req, res) =>
	passwordResetController.resetPassword(req, res)
);

/**
 * POST /api/password/change-password
 * Change password for logged-in user
 * Requires: Authorization header with valid JWT
 */
router.post('/change-password', authMiddleware, (req, res) =>
	passwordResetController.changePassword(req, res)
);

export default router;