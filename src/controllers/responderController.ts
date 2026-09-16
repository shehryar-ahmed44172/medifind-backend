import { Request, Response } from 'express';
import * as responderService from '../services/responderService';
import { sendSuccess, sendError } from '../utils/response';
import { validatePakistanCoordinates } from '../utils/geoValidation';
import { responderLimits } from '../middleware/planMiddleware';
import prisma from '../lib/prisma';

/**
 * POST /api/responders/location
 * Update responder's current location
 */
export const updateLocation = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) return sendError(res, 'latitude and longitude required', 400);

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    const coordError = validatePakistanCoordinates(lat, lon);
    if (coordError) return sendError(res, coordError, 422);

    const updated = await responderService.updateResponderLocation(
      req.user.userId,
      lat,
      lon
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
    const outcome = String(req.body?.outcome || 'TREATED').toUpperCase();
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 300) : undefined;

    const { RESOLUTION_OUTCOMES } = await import('../services/sosSafeguards');
    if (!(RESOLUTION_OUTCOMES as readonly string[]).includes(outcome)) {
      return sendError(res, `outcome must be one of: ${RESOLUTION_OUTCOMES.join(', ')}`, 400);
    }
    if ((outcome === 'FALSE_ALARM' || outcome === 'PATIENT_NOT_FOUND') && !note) {
      return sendError(res, 'Please add a short note explaining this outcome', 400);
    }

    const result = await responderService.resolveEmergency(emergencyId, req.user.userId, { outcome: outcome as any, note });
    sendSuccess(res, result, 'Emergency resolved and closed successfully');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * POST /api/responders/emergencies/:emergencyId/cancel
 * Cancel an accepted emergency assignment
 */
export const cancelAssignment = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { emergencyId } = req.params;
    const result = await responderService.cancelAcceptedEmergency(emergencyId, req.user.userId);
    sendSuccess(res, result, 'Assignment cancelled successfully');
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

    const lat = parseFloat(latitude as string);
    const lon = parseFloat(longitude as string);

    const coordError = validatePakistanCoordinates(lat, lon);
    if (coordError) return sendError(res, coordError, 422);

    const responders = await responderService.getNearbyResponders(
      lat,
      lon,
      radius ? parseFloat(radius as string) : 5
    );
    sendSuccess(res, responders, 'Nearby responders retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * GET /api/responders/history
 * Get responder's emergency response history
 */
export const getHistory = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { subscriptionPlan: true },
    });
    const limits = responderLimits(user?.subscriptionPlan ?? 'FREE');
    const since = limits.caseHistoryDays === -1
      ? undefined
      : new Date(Date.now() - limits.caseHistoryDays * 24 * 60 * 60 * 1000);

    const history = await responderService.getResponderHistory(req.user.userId, since);
    sendSuccess(res, history, 'Responder history retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
/**
 * GET /api/responders/emergencies
 * Get responder's active (pending/accepted) emergency requests
 */
export const getActiveRequests = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const requests = await responderService.getActiveEmergencyRequests(req.user.userId);
    sendSuccess(res, requests, 'Active requests retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * POST /api/responders/:responderId/rate
 * Patient rates a responder after an emergency is resolved.
 * Body: { emergencyId, stars }  (stars: 1–5 integer)
 */
export const rateResponder = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { responderId } = req.params;
    const { emergencyId, stars } = req.body;

    if (!emergencyId) return sendError(res, 'emergencyId is required', 400);
    if (stars === undefined || stars === null) return sendError(res, 'stars is required (1–5)', 400);

    const result = await responderService.rateResponder(
      emergencyId,
      req.user.userId,
      responderId,
      parseInt(stars, 10),
    );

    sendSuccess(res, result, 'Rating submitted successfully');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};
