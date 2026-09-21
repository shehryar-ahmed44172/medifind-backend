import { Router } from 'express';
import {
  getMedicalProfile,
  updateMedicalProfile,
  getMedicalProfileByUserId,
  addEmergencyContact,
  removeEmergencyContact,
  updatePatientType,
} from '../controllers/medicalProfileController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';
import * as caregiverService from '../services/caregiverService';
import prisma from '../lib/prisma';

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
 * PUT /api/medical-profile/patient-type
 * Switch between hearing and deaf mode (PATIENT only)
 */
router.put('/patient-type', roleMiddleware('PATIENT'), updatePatientType);

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
 * Access rules:
 * - Own profile: always allowed
 * - ADMIN: always allowed
 * - RESPONDER: only while they have an ACCEPTED request for this patient's active emergency
 * - CAREGIVER: only if linked to this patient
 */
router.get('/:userId', async (req, res, next) => {
  if (!req.user) return next();

  // 1. Own profile
  if (req.user.userId === req.params.userId) {
    return next();
  }

  // 2. Admin
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // 3. Responder — only if they have an ACCEPTED request for this patient's active (non-resolved) emergency
  if (req.user.role === 'RESPONDER') {
    const activeRequest = await prisma.emergencyRequest.findFirst({
      where: {
        responderId: req.user.userId,
        status: 'ACCEPTED',
        emergency: {
          patientId: req.params.userId,
          status: { notIn: ['RESOLVED', 'COMPLETED', 'CANCELLED'] },
        },
      },
    });

    if (activeRequest) return next();

    return res.status(403).json({
      error: 'Forbidden',
      message: 'You can only view a patient\'s medical profile while actively responding to their emergency.',
    });
  }

  // 4. Caregiver — only if linked to this patient
  if (req.user.role === 'CAREGIVER') {
    const isLinked = await caregiverService.isLinked(req.user.userId, req.params.userId);
    if (isLinked) return next();
  }

  res.status(403).json({
    error: 'Forbidden',
    message: 'You do not have permission to view this medical profile',
  });
}, getMedicalProfileByUserId);

export default router;
