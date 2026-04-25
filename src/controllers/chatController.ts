import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { getIo } from '../server';

const prisma = new PrismaClient();

export const getRooms = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
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
    const userId = (req as any).user.id;

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
    const senderId = (req as any).user.id;

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

    res.status(201).json(message);
  } catch (error: any) {
    logger.error(`Error sending message: ${error.message}`);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const createOrGetRoom = async (req: Request, res: Response) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = (req as any).user.id;
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
