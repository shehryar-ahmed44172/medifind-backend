import { Router } from 'express';
import * as caregiverController from '../controllers/caregiverController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// Link a caregiver (PATIENT only)
router.post('/link', roleMiddleware('PATIENT'), caregiverController.linkCaregiver);

// Get linked caregivers or patients (PATIENT or CAREGIVER)
router.get('/', roleMiddleware('PATIENT', 'CAREGIVER'), caregiverController.getLinks);

// Unlink a caregiver (PATIENT only)
router.delete('/:caregiverId', roleMiddleware('PATIENT'), caregiverController.unlinkCaregiver);

export default router;
