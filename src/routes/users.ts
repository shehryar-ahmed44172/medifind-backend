import { Router } from 'express';
import { getProfile, updateProfile, verifyResponder, upgradePlan, getUserById, uploadProfileImage, getDebugInfo, deleteMyAccount } from '../controllers/userController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get('/profile', getProfile);

/**
 * GET /api/users/:id
 * Get specific user's public profile
 */
router.get('/:id', getUserById);

/**
 * PUT /api/users/profile
 * Update current user's profile
 */
router.put('/profile', updateProfile);

/**
 * POST /api/users/profile/image
 * Upload current user's profile image
 */
router.post('/profile/image', upload.single('image'), uploadProfileImage);

/**
 * PATCH /api/users/upgrade
 * Self-service plan upgrade — available to all authenticated users (PATIENT, CAREGIVER, RESPONDER)
 */
router.patch('/upgrade', upgradePlan);

/**
 * PATCH /api/users/:id/verify
 * Administrator verification for responders (FR5.2)
 */
router.patch('/:id/verify', roleMiddleware('ADMIN'), verifyResponder);

/**
 * GET /api/users/debug/:userId
 * Diagnostic endpoint
 */
router.get('/debug/:userId', roleMiddleware('ADMIN'), getDebugInfo);

/**
 * DELETE /api/users/me
 * Permanently delete the authenticated user's own account
 */
router.delete('/me', deleteMyAccount);

export default router;
