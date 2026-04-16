import { Router } from 'express';
import * as caregiverController from '../controllers/caregiverController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// Link a caregiver (PATIENT only)
router.post('/link', roleMiddleware('PATIENT', 'CAREGIVER'), caregiverController.linkCaregiver);

// Get all linked caregivers (for patients) or patients (for caregivers)
router.get('/', roleMiddleware('PATIENT', 'CAREGIVER'), caregiverController.getLinks);

// Get pending invitations (CAREGIVER only)
router.get('/invitations', roleMiddleware('CAREGIVER'), caregiverController.getPendingInvitations);

// Respond to an invitation (CAREGIVER only)
router.post('/invitations/:patientId/respond', roleMiddleware('CAREGIVER'), caregiverController.respondToInvitation);

// Get all linked patients with any status (CAREGIVER only)
router.get('/links/all', roleMiddleware('CAREGIVER'), caregiverController.getAllLinks);

// Resend an invitation (CAREGIVER only)
router.post('/links/:patientId/resend', roleMiddleware('CAREGIVER'), caregiverController.resendInvitation);

// Unlink a caregiver (PATIENT only)
router.delete('/:caregiverId', roleMiddleware('PATIENT'), caregiverController.unlinkCaregiver);

export default router;
