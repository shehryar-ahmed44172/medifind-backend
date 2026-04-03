import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';

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

export default router;
