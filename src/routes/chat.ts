import { Router } from 'express';
import * as chatController from '../controllers/chatController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All chat routes require authentication
router.use(authMiddleware);

router.get('/rooms', chatController.getRooms);
router.post('/rooms', chatController.createOrGetRoom);
router.get('/messages/:roomId', chatController.getMessages);
router.post('/messages', chatController.sendMessage);

export default router;
