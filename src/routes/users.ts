import { Router } from 'express';
import { getProfile, updateProfile, verifyResponder } from '../controllers/userController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get('/profile', getProfile);

/**
 * PUT /api/users/profile
 * Update current user's profile
 */
router.put('/profile', updateProfile);

/**
 * PATCH /api/users/:id/verify
 * Administrator verification for responders (FR5.2)
 */
router.patch('/:id/verify', roleMiddleware('ADMIN'), verifyResponder);

export default router;
