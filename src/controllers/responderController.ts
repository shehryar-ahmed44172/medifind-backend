import { Request, Response } from 'express';
import * as responderService from '../services/responderService';
import { sendSuccess, sendError } from '../utils/response';

/**
 * POST /api/responders/location
 * Update responder's current location
 */
export const updateLocation = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) return sendError(res, 'latitude and longitude required', 400);

    const updated = await responderService.updateResponderLocation(
      req.user.userId,
      parseFloat(latitude),
      parseFloat(longitude)
    );
    sendSuccess(res, updated, 'Location updated');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * PATCH /api/responders/availability
 * Toggle responder availability
 */
export const setAvailability = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { isAvailable } = req.body;
    if (isAvailable === undefined) return sendError(res, 'isAvailable is required', 400);

    const updated = await responderService.setResponderAvailability(req.user.userId, isAvailable);
    sendSuccess(res, updated, `Availability set to ${isAvailable}`);
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * POST /api/responders/emergencies/:emergencyId/accept
 * Accept an emergency request
 */
export const acceptEmergency = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { emergencyId } = req.params;
    const result = await responderService.acceptEmergencyRequest(emergencyId, req.user.userId);
    sendSuccess(res, result, 'Emergency accepted');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * POST /api/responders/emergencies/:emergencyId/reject
 * Reject an emergency request
 */
export const rejectEmergency = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { emergencyId } = req.params;
    const { reason } = req.body;
    const result = await responderService.rejectEmergencyRequest(emergencyId, req.user.userId, reason);
    sendSuccess(res, result, 'Emergency rejected');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * POST /api/responders/emergencies/:emergencyId/resolve
 * Mark emergency as resolved/completed
 */
export const resolveEmergency = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { emergencyId } = req.params;
    const result = await responderService.resolveEmergency(emergencyId, req.user.userId);
    sendSuccess(res, result, 'Emergency resolved and closed successfully');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * GET /api/responders/nearby
 * Get nearby available responders (Admin use)
 */
export const getNearbyResponders = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { latitude, longitude, radius } = req.query;
    if (!latitude || !longitude) return sendError(res, 'latitude and longitude required', 400);

    const responders = await responderService.getNearbyResponders(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      radius ? parseFloat(radius as string) : 5
    );
    sendSuccess(res, responders, 'Nearby responders retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
