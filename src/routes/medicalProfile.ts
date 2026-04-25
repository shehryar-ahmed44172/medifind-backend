import { Router } from 'express';
import {
  getMedicalProfile,
  updateMedicalProfile,
  getMedicalProfileByUserId,
} from '../controllers/medicalProfileController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All medical profile routes require authentication
router.use(authMiddleware);

/**
 * GET /api/medical-profile
 * Get current user's medical profile
 */
router.get('/', getMedicalProfile);

/**
 * PUT /api/medical-profile
 * Create or update current user's medical profile
 */
router.put('/', updateMedicalProfile);

/**
 * GET /api/medical-profile/:userId
 * Get a patient's medical profile - Responders, Admins, or the User themselves
 */
router.get('/:userId', (req, res, next) => {
  // Allow if it's the user's own profile
  if (req.user?.userId === req.params.userId) {
    return next();
  }
  // Otherwise, require RESPONDER or ADMIN role
  roleMiddleware('RESPONDER', 'ADMIN')(req, res, next);
}, getMedicalProfileByUserId);

export default router;
