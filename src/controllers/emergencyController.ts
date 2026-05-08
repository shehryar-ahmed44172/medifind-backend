import { Request, Response } from 'express';
import * as emergencyService from '../services/emergencyService';
import { sendSuccess, sendError } from '../utils/response';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/emergencies
 * Create a new SOS emergency
 */
export const createEmergency = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { emergencyType, latitude, longitude, accuracy, additionalInfo } = req.body;

    if (!latitude || !longitude) {
      return sendError(res, 'latitude and longitude are required', 400);
    }

    const emergency = await emergencyService.createEmergency({
      patientId: req.user.userId,
      emergencyType,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : undefined,
      additionalInfo,
    });

    sendSuccess(res, emergency, `Emergency created — you have ${emergency.cancellationWindowSeconds} seconds to cancel`, 201);
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * GET /api/emergencies/:id
 * Get emergency details
 */
export const getEmergency = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { id } = req.params;
    const emergency = await emergencyService.getEmergency(id);

    // HIPAA: Log access to PHI (Protected Health Information)
    if (req.user.role === 'ADMIN' || req.user.role === 'RESPONDER') {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'ACCESS_PHI',
          entity: 'Emergency',
          entityId: id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          newValues: { detailLevel: 'FULL_MEDICAL_PROFILE', patientId: emergency.patientId } as any
        }
      });
      console.log(`[HIPAA AUDIT] User ${req.user.userId} accessed PHI for emergency ${id}`);
    }

    sendSuccess(res, emergency, 'Emergency retrieved');
  } catch (error: any) {
    sendError(res, error.message, 404);
  }
};

/**
 * POST /api/emergencies/:id/cancel
 * Cancel an emergency within the 10-second window
 */
export const cancelEmergency = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { id } = req.params;
    const cancelled = await emergencyService.cancelEmergency(id, req.user.userId);
    sendSuccess(res, cancelled, 'Emergency cancelled successfully');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * GET /api/emergencies
 * Get all active emergencies (Responder/Admin only)
 */
export const getActiveEmergencies = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const emergencies = await emergencyService.getActiveEmergencies();
    sendSuccess(res, emergencies, 'Active emergencies retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * PATCH /api/emergencies/:id/status
 * Update emergency status (Arrived, Resolved, etc.)
 */
export const updateEmergencyStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { id } = req.params;
    const { status } = req.body;
    
    const updated = await emergencyService.updateEmergencyStatus(id, status);
    sendSuccess(res, updated, 'Emergency status updated');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};
