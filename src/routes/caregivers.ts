import { Router } from 'express';
import * as caregiverController from '../controllers/caregiverController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// Link a caregiver (PATIENT only)
router.post('/link', roleMiddleware('PATIENT', 'CAREGIVER'), caregiverController.linkCaregiver);

// Get all linked caregivers (for patients) or patients (for caregivers)
router.get('/', roleMiddleware('PATIENT', 'CAREGIVER'), caregiverController.getLinks);

// Get pending invitations (Both can be targets)
router.get('/invitations', roleMiddleware('CAREGIVER', 'PATIENT'), caregiverController.getPendingInvitations);

// Respond to an invitation (Both can respond if they are the target)
router.post('/invitations/:targetId/respond', roleMiddleware('CAREGIVER', 'PATIENT'), caregiverController.respondToInvitation);

// Get all linked patients/caregivers with any status (Both can access their respective lists)
router.get('/links/all', roleMiddleware('CAREGIVER', 'PATIENT'), caregiverController.getAllLinks);

// Resend an invitation (CAREGIVER only)
router.post('/links/:patientId/resend', roleMiddleware('CAREGIVER'), caregiverController.resendInvitation);

// Unlink a caregiver (PATIENT only)
router.delete('/:caregiverId', roleMiddleware('PATIENT'), caregiverController.unlinkCaregiver);

export default router;
