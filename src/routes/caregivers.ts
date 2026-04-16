import { Router } from 'express';
import * as caregiverController from '../controllers/caregiverController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// Link a caregiver (PATIENT only)
router.post('/link', roleMiddleware('PATIENT'), caregiverController.linkCaregiver);

// Get all linked caregivers (for patients) or patients (for caregivers)
router.get('/', roleMiddleware('PATIENT', 'CAREGIVER'), caregiverController.getLinks);

// Get pending invitations (CAREGIVER only)
router.get('/invitations', roleMiddleware('CAREGIVER'), caregiverController.getPendingInvitations);

// Respond to an invitation (CAREGIVER only)
router.post('/invitations/:patientId/respond', roleMiddleware('CAREGIVER'), caregiverController.respondToInvitation);

// Unlink a caregiver (PATIENT only)
router.delete('/:caregiverId', roleMiddleware('PATIENT'), caregiverController.unlinkCaregiver);

export default router;
