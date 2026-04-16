import { Router } from 'express';
import * as medicalReportController from '../controllers/medicalReportController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();
router.use(authMiddleware);

// Upload a report to patient profile (no emergency)
router.post('/profile', roleMiddleware('PATIENT'), upload.single('report'), medicalReportController.uploadProfileReport);

// Get all reports for a user's profile
router.get('/profile', roleMiddleware('PATIENT'), medicalReportController.getProfileReports);

// Upload a report (PATIENT only)
router.post('/:emergencyId', roleMiddleware('PATIENT'), upload.single('report'), medicalReportController.uploadReport);

// Get reports for an emergency (PATIENT, CAREGIVER, RESPONDER, ADMIN)
router.get('/:emergencyId', medicalReportController.getReports);

// Delete a report (PATIENT only)
router.delete('/:id', roleMiddleware('PATIENT'), medicalReportController.deleteReport);

export default router;
