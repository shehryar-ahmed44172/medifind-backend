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
 * Get a patient's medical profile - Responders only
 */
router.get('/:userId', roleMiddleware('RESPONDER', 'ADMIN'), getMedicalProfileByUserId);

export default router;
