import { Request, Response } from 'express';
import * as trackingService from '../services/trackingService';
import { sendSuccess, sendError } from '../utils/response';

/**
 * POST /api/tracking
 * Responder submits a live location update during an emergency
 */
export const submitLocation = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { emergencyId, latitude, longitude, accuracy, status } = req.body;
    if (!emergencyId || !latitude || !longitude || !status) {
      return sendError(res, 'emergencyId, latitude, longitude, and status are required', 400);
    }

    const validStatuses = ['EN_ROUTE', 'ARRIVED', 'TREATING', 'TRANSPORTED'];
    if (!validStatuses.includes(status)) {
      return sendError(res, `status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const tracking = await trackingService.submitLocationUpdate({
      emergencyId,
      responderId: req.user.userId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : undefined,
      status,
    });

    sendSuccess(res, tracking, 'Location update submitted');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * GET /api/tracking/:emergencyId
 * Get the full tracking history for an emergency
 */
export const getTrackingHistory = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { emergencyId } = req.params;
    const history = await trackingService.getTrackingHistory(emergencyId);
    sendSuccess(res, history, 'Tracking history retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * GET /api/tracking/:emergencyId/latest
 * Get only the most recent location (for map display)
 */
export const getLatestTracking = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { emergencyId } = req.params;
    const latest = await trackingService.getLatestTracking(emergencyId);
    sendSuccess(res, latest, 'Latest tracking retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
