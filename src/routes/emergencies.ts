import { createEmergency, getEmergency, cancelEmergency, getActiveEmergencies, updateEmergencyStatus } from '../controllers/emergencyController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// POST /api/emergencies — Patient triggers SOS
router.post('/', roleMiddleware('PATIENT'), createEmergency);

// GET /api/emergencies — Responder/Admin sees all active emergencies
router.get('/', roleMiddleware('RESPONDER', 'ADMIN'), getActiveEmergencies);

// GET /api/emergencies/:id — Get emergency details
router.get('/:id', getEmergency);

// PATCH /api/emergencies/:id/status — Update status (Arrived, Resolved, etc.)
router.patch('/:id/status', updateEmergencyStatus);

// POST /api/emergencies/:id/cancel — Patient cancels within 10 seconds
router.post('/:id/cancel', roleMiddleware('PATIENT'), cancelEmergency);

export default router;
