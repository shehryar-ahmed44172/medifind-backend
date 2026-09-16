import { Router } from 'express';
import { updateLocation, setAvailability, acceptEmergency, rejectEmergency, getNearbyResponders, resolveEmergency, getHistory, cancelAssignment, getActiveRequests, rateResponder } from '../controllers/responderController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

// POST /api/responders/location — Responder broadcasts their live location
router.post('/location', roleMiddleware('RESPONDER'), updateLocation);

// PATCH /api/responders/availability — Responder sets active/inactive
router.patch('/availability', roleMiddleware('RESPONDER'), setAvailability);

// POST /api/responders/emergencies/:emergencyId/accept
router.post('/emergencies/:emergencyId/accept', roleMiddleware('RESPONDER'), acceptEmergency);

// POST /api/responders/emergencies/:emergencyId/reject
router.post('/emergencies/:emergencyId/reject', roleMiddleware('RESPONDER'), rejectEmergency);

// POST /api/responders/emergencies/:emergencyId/resolve
router.post('/emergencies/:emergencyId/resolve', roleMiddleware('RESPONDER'), resolveEmergency);

// POST /api/responders/emergencies/:emergencyId/cancel
router.post('/emergencies/:emergencyId/cancel', roleMiddleware('RESPONDER'), cancelAssignment);

// GET /api/responders/nearby — Admin sees nearby responders
router.get('/nearby', roleMiddleware('ADMIN', 'RESPONDER'), getNearbyResponders);

// GET /api/responders/history — Responder sees their past requests
router.get('/history', roleMiddleware('RESPONDER'), getHistory);

// GET /api/responders/emergencies — Responder sees their current pending/accepted requests
router.get('/emergencies', roleMiddleware('RESPONDER'), getActiveRequests);

// POST /api/responders/:responderId/rate — Patient rates a responder (1–5 stars) after resolution
router.post('/:responderId/rate', roleMiddleware('PATIENT'), rateResponder);

export default router;
