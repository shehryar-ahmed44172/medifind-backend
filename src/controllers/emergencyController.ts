import { Request, Response } from 'express';
import * as emergencyService from '../services/emergencyService';
import { sendSuccess, sendError } from '../utils/response';

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
