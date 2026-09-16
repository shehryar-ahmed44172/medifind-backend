import { Router } from 'express';
import { createEmergency, getEmergency, cancelEmergency, getActiveEmergencies, updateEmergencyStatus, classifyEmergency, getQuickReplies, getEmergencyHistory } from '../controllers/emergencyController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// POST /api/emergencies — Patient triggers SOS
router.post('/', roleMiddleware('PATIENT'), createEmergency);

// GET /api/emergencies — Responder/Admin sees all active emergencies
router.get('/', roleMiddleware('RESPONDER', 'ADMIN'), getActiveEmergencies);

// GET /api/emergencies/:id — Get emergency details
router.get('/history', roleMiddleware('PATIENT', 'CAREGIVER'), getEmergencyHistory);

router.get('/:id', getEmergency);

// PATCH /api/emergencies/:id/status — Update status (Arrived, Resolved, etc.) — Responder or Admin only
router.patch('/:id/status', roleMiddleware('RESPONDER', 'ADMIN'), updateEmergencyStatus);

// POST /api/emergencies/:id/cancel — Patient cancels within 10 seconds
router.post('/:id/cancel', roleMiddleware('PATIENT'), cancelEmergency);

// POST /api/emergencies/classify — AI symptom-to-emergency-type classification
router.post('/classify', roleMiddleware('PATIENT'), classifyEmergency);

// POST /api/emergencies/:id/quick-replies — AI-personalized AAC cards for deaf patients
router.post('/:id/quick-replies', roleMiddleware('PATIENT'), getQuickReplies);

export default router;
