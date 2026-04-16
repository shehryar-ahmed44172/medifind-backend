import { Router } from 'express';
import { updateLocation, setAvailability, acceptEmergency, rejectEmergency, getNearbyResponders, resolveEmergency } from '../controllers/responderController';
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

// GET /api/responders/nearby — Admin sees nearby responders
router.get('/nearby', roleMiddleware('ADMIN', 'RESPONDER'), getNearbyResponders);

export default router;
