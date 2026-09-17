import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getIceServers } from '../services/callService';
import { sendSuccess } from '../utils/response';

const router = Router();
router.use(authMiddleware);

// GET /api/calls/ice-servers — STUN/TURN servers for WebRTC calls
router.get('/ice-servers', (_req, res) => {
  sendSuccess(res, { iceServers: getIceServers() }, 'ICE servers');
});

export default router;
