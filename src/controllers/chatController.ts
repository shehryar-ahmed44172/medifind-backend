import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import logger from '../utils/logger';
import { getIo } from '../server';
import { sendNotification } from '../services/notification';
import { NotificationChannel, NotificationType } from '../types/notification';
import { encrypt, decrypt } from '../utils/encryption';

// ── Helper: check if user has access to a room ───────────────────────────────
function hasRoomAccess(room: any, userId: string): boolean {
  return (
    room.patientId    === userId ||
    room.caregiverId  === userId ||
    room.responderId  === userId
  );
}

export const getRooms = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const rooms = await prisma.chatRoom.findMany({
      where: {
        OR: [
          { patientId:   userId },
          { caregiverId: userId },
          { responderId: userId },
        ],
      },
      include: {
        patient: {
          select: { id: true, fullName: true, profileImageUrl: true },
        },
        caregiver: {
          select: { id: true, fullName: true, profileImageUrl: true },
        },
        responder: {
          select: { id: true, fullName: true, profileImageUrl: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Message content is encrypted at rest — decrypt the preview for the client
    res.json(rooms.map(room => ({
      ...room,
      messages: room.messages.map(m => ({ ...m, content: decrypt(m.content) })),
    })));
  } catch (error: any) {
    logger.error(`Error fetching chat rooms: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user.userId;

    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });

    if (!room || !hasRoomAccess(room, userId)) {
      return res.status(403).json({ error: 'Access denied to this chat room' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    const decrypted = messages.map(m => ({ ...m, content: decrypt(m.content) }));
    res.json(decrypted);
  } catch (error: any) {
    logger.error(`Error fetching chat messages: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { roomId, messageType = 'TEXT', mediaUrl } = req.body;
    const content: string = typeof req.body.content === 'string' ? req.body.content : '';
    const senderId = (req as any).user.userId;

    if (!content.trim() && !mediaUrl) {
      return res.status(400).json({ error: 'Message content or media is required' });
    }

    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });

    if (!room || !hasRoomAccess(room, senderId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = await prisma.chatMessage.create({
      data: { roomId, senderId, content: encrypt(content), messageType, mediaUrl },
    });

    // Emit and respond with plaintext so clients don't need to decrypt
    const messageForClient = { ...message, content };

    // Update room timestamp
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    // Emit plaintext to connected clients
    getIo().to(`chat:${roomId}`).emit('message:new', messageForClient);

    // Identify all recipients (everyone in the room except sender)
    const recipientIds: string[] = [];
    if (room.patientId   && room.patientId   !== senderId) recipientIds.push(room.patientId);
    if (room.caregiverId && room.caregiverId  !== senderId) recipientIds.push(room.caregiverId);
    if (room.responderId && room.responderId  !== senderId) recipientIds.push(room.responderId);

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { fullName: true },
    });

    for (const recipientId of recipientIds) {
      sendNotification(recipientId, {
        type: NotificationType.CHAT_MESSAGE,
        title: `New Message from ${sender?.fullName || 'User'}`,
        body: content
          ? (content.length > 50 ? `${content.substring(0, 47)}...` : content)
          : ({ AUDIO: 'Voice message', IMAGE: 'Photo', DOCUMENT: 'Document' } as Record<string, string>)[messageType] || 'New attachment',
        channels: [
          NotificationChannel.IN_APP,
          NotificationChannel.PUSH,
          // EMAIL intentionally excluded: chat messages must not trigger emails
        ],
        priority: 'normal',
        data: { roomId, senderId, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      }).catch(err => logger.error(`Failed to send chat notification: ${err.message}`));
    }

    res.status(201).json(messageForClient);
  } catch (error: any) {
    logger.error(`Error sending message: ${error.message}`);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const createOrGetRoom = async (req: Request, res: Response) => {
  try {
    const { targetUserId, emergencyId } = req.body;
    const currentUserId = (req as any).user.userId;
    const role = (req as any).user.role;

    // ── Emergency chat room (Patient ↔ Responder) ──────────────────────────
    if (emergencyId) {
      const emergency = await prisma.emergency.findUnique({
        where: { id: emergencyId },
        select: { patientId: true },
      });
      if (!emergency) {
        return res.status(404).json({ error: 'Emergency not found' });
      }

      // The responder in the room must be the one assigned to this emergency
      const assignedRequest = await prisma.emergencyRequest.findFirst({
        where: { emergencyId, status: { in: ['ACCEPTED', 'COMPLETED'] } },
        orderBy: { acceptedAt: 'desc' },
      });
      if (!assignedRequest) {
        return res.status(404).json({ error: 'No assigned responder found for this emergency' });
      }

      if (role === 'PATIENT' && emergency.patientId !== currentUserId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (role === 'RESPONDER' && assignedRequest.responderId !== currentUserId) {
        return res.status(403).json({ error: 'Only the assigned responder can open this chat' });
      }
      if (role !== 'PATIENT' && role !== 'RESPONDER') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const patientId = emergency.patientId;
      const responderId = assignedRequest.responderId;

      // Find existing emergency room
      let room = await prisma.chatRoom.findFirst({
        where: {
          roomType:    'EMERGENCY_RESPONDER',
          patientId,
          responderId,
          emergencyId,
        },
      });

      if (!room) {
        room = await prisma.chatRoom.create({
          data: {
            roomType:    'EMERGENCY_RESPONDER',
            patientId,
            responderId,
            emergencyId,
            caregiverId: null,
          } as any,
        });
        logger.info(`Created emergency chat room ${room.id} for emergency ${emergencyId}`);
      }

      return res.json(room);
    }

    // ── Caregiver ↔ Patient room (original behaviour) ─────────────────────
    if (!targetUserId || !['PATIENT', 'CAREGIVER'].includes(role)) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }
    const patientId   = role === 'PATIENT' ? currentUserId : targetUserId;
    const caregiverId = role === 'PATIENT' ? targetUserId : currentUserId;

    const link = await prisma.caregiverLink.findFirst({
      where: { patientId, caregiverId, status: 'ACCEPTED' },
      select: { id: true },
    });
    if (!link) {
      return res.status(403).json({ error: 'You can only chat with linked caregivers or patients' });
    }

    let room = await prisma.chatRoom.findUnique({
      where: { patientId_caregiverId: { patientId, caregiverId } },
    });

    if (!room) {
      room = await prisma.chatRoom.create({
        data: {
          roomType:   'CAREGIVER_PATIENT',
          patientId,
          caregiverId,
        } as any,
      });
    }

    res.json(room);
  } catch (error: any) {
    logger.error(`Error creating chat room: ${error.message}`);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
};

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/chat/${req.file.filename}`;

    res.json({
      url: fileUrl,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error: any) {
    logger.error(`Error uploading chat file: ${error.message}`);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};
