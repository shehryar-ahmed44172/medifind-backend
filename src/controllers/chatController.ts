import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { getIo } from '../server';
import { sendNotification } from '../services/notification';
import { NotificationChannel, NotificationType } from '../types/notification';

const prisma = new PrismaClient();

export const getRooms = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const rooms = await prisma.chatRoom.findMany({
      where: {
        OR: [
          { patientId: userId },
          { caregiverId: userId }
        ]
      },
      include: {
        patient: {
          select: { id: true, fullName: true, profileImageUrl: true }
        },
        caregiver: {
          select: { id: true, fullName: true, profileImageUrl: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(rooms);
  } catch (error: any) {
    logger.error(`Error fetching chat rooms: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user.userId;

    // Verify user belongs to room
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    });

    if (!room || (room.patientId !== userId && room.caregiverId !== userId)) {
      return res.status(403).json({ error: 'Access denied to this chat room' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      take: 50
    });

    res.json(messages);
  } catch (error: any) {
    logger.error(`Error fetching chat messages: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { roomId, content, messageType = 'TEXT', mediaUrl } = req.body;
    const senderId = (req as any).user.userId;

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    });

    if (!room || (room.patientId !== senderId && room.caregiverId !== senderId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId,
        content,
        messageType,
        mediaUrl
      }
    });

    // Update room timestamp
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() }
    });

    // Emit via socket
    const io = getIo();
    io.to(`chat:${roomId}`).emit('message:new', message);

    // Identify recipient
    const recipientId = room.patientId === senderId ? room.caregiverId : room.patientId;
    
    // Fetch sender info for notification
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { fullName: true }
    });

    // Send Notification (Push, In-App, Email)
    sendNotification(recipientId, {
      type: NotificationType.CHAT_MESSAGE,
      title: `New Message from ${sender?.fullName || 'User'}`,
      body: content.length > 50 ? `${content.substring(0, 47)}...` : content,
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.PUSH,
        NotificationChannel.EMAIL
      ],
      priority: 'normal',
      data: {
        roomId,
        senderId,
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      }
    }).catch(err => logger.error(`Failed to send chat notification: ${err.message}`));

    res.status(201).json(message);
  } catch (error: any) {
    logger.error(`Error sending message: ${error.message}`);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const createOrGetRoom = async (req: Request, res: Response) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = (req as any).user.userId;
    const role = (req as any).user.role;

    let patientId, caregiverId;
    if (role === 'PATIENT') {
      patientId = currentUserId;
      caregiverId = targetUserId;
    } else {
      patientId = targetUserId;
      caregiverId = currentUserId;
    }

    let room = await prisma.chatRoom.findUnique({
      where: {
        patientId_caregiverId: { patientId, caregiverId }
      }
    });

    if (!room) {
      room = await prisma.chatRoom.create({
        data: { patientId, caregiverId }
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

    // In a real app, you would upload to S3/Cloudinary and get a URL
    // For now, we use the local path (served via /uploads)
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/chat/${req.file.filename}`;

    res.json({
      url: fileUrl,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (error: any) {
    logger.error(`Error uploading chat file: ${error.message}`);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};
