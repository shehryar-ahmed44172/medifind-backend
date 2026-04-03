import { Router } from 'express';
import { submitLocation, getTrackingHistory, getLatestTracking } from '../controllers/trackingController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// POST /api/tracking — Responder submits live location
router.post('/', roleMiddleware('RESPONDER'), submitLocation);

// GET /api/tracking/:emergencyId — Full history (patient, caregiver, admin)
router.get('/:emergencyId', getTrackingHistory);

// GET /api/tracking/:emergencyId/latest — Latest position for live map
router.get('/:emergencyId/latest', getLatestTracking);

export default router;
