import { Router } from 'express';
import {
  getMedicalProfile,
  updateMedicalProfile,
  getMedicalProfileByUserId,
  addEmergencyContact,
  removeEmergencyContact,
} from '../controllers/medicalProfileController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';
import * as caregiverService from '../services/caregiverService';

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
 * POST /api/medical-profile/emergency-contacts
 * Add a single emergency contact (PATIENT only)
 */
router.post('/emergency-contacts', addEmergencyContact);

/**
 * DELETE /api/medical-profile/emergency-contacts/:phone
 * Remove an emergency contact by phone number (PATIENT only)
 */
router.delete('/emergency-contacts/:phone', removeEmergencyContact);

/**
 * GET /api/medical-profile/:userId
 * Get a patient's medical profile - Responders, Admins, Linked Caregivers, or the User themselves
 */
router.get('/:userId', async (req, res, next) => {
  if (!req.user) return next();

  // 1. Allow if it's the user's own profile
  if (req.user.userId === req.params.userId) {
    return next();
  }

  // 2. Allow if RESPONDER or ADMIN
  if (['RESPONDER', 'ADMIN'].includes(req.user.role)) {
    return next();
  }

  // 3. Allow if CAREGIVER and linked to this patient
  if (req.user.role === 'CAREGIVER') {
    const isLinked = await caregiverService.isLinked(req.user.userId, req.params.userId);
    if (isLinked) {
      return next();
    }
  }

  // Otherwise, block
  res.status(403).json({ 
    error: 'Forbidden', 
    message: 'You do not have permission to view this medical profile' 
  });
}, getMedicalProfileByUserId);

export default router;
