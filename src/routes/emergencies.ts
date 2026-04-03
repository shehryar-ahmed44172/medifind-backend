import { Router } from 'express';
import { createEmergency, getEmergency, cancelEmergency, getActiveEmergencies } from '../controllers/emergencyController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// POST /api/emergencies — Patient triggers SOS
router.post('/', roleMiddleware('PATIENT'), createEmergency);

// GET /api/emergencies — Responder/Admin sees all active emergencies
router.get('/', roleMiddleware('RESPONDER', 'ADMIN'), getActiveEmergencies);

// GET /api/emergencies/:id — Get emergency details
router.get('/:id', getEmergency);

// POST /api/emergencies/:id/cancel — Patient cancels within 10 seconds
router.post('/:id/cancel', roleMiddleware('PATIENT'), cancelEmergency);

export default router;
