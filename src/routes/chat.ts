import { Router } from 'express';
import * as chatController from '../controllers/chatController';
import { authMiddleware } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// All chat routes require authentication
router.use(authMiddleware);

router.get('/rooms', chatController.getRooms);
router.post('/rooms', chatController.createOrGetRoom);
router.get('/messages/:roomId', chatController.getMessages);
router.post('/messages', chatController.sendMessage);
router.post('/upload', upload.single('file'), chatController.uploadFile);

export default router;
