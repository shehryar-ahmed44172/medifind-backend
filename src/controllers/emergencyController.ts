import { Request, Response } from 'express';
import * as emergencyService from '../services/emergencyService';
import { sendSuccess, sendError } from '../utils/response';
import prisma from '../lib/prisma';
import { decryptJson } from '../utils/encryption';
import { toNameList } from '../utils/medical';
import { canAccessEmergency } from '../utils/accessControl';

/**
 * POST /api/emergencies
 * Create a new SOS emergency
 */
export const createEmergency = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { emergencyType, latitude, longitude, accuracy, additionalInfo, isMocked } = req.body;

    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      return sendError(res, 'latitude and longitude are required', 400);
    }

    const emergency = await emergencyService.createEmergency({
      patientId: req.user.userId,
      emergencyType,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : undefined,
      additionalInfo,
      locationMocked: isMocked === true || isMocked === 'true',
    });

    if ('alreadyActive' in emergency && emergency.alreadyActive) {
      return sendSuccess(res, emergency, 'You already have an active emergency — returning it', 200);
    }
    sendSuccess(res, emergency, `Emergency created — you have ${emergency.cancellationWindowSeconds} seconds to cancel`, 201);
  } catch (error: any) {
    sendError(res, error.message, error.statusCode || 400, error.code ? { code: error.code } : null);
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
    if (!(await canAccessEmergency(req.user, id))) {
      return sendError(res, 'You do not have access to this emergency', 403);
    }
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
    }

    sendSuccess(res, emergency, 'Emergency retrieved');
  } catch (error: any) {
    sendError(res, error.message, 404);
  }
};

/**
 * POST /api/emergencies/:id/cancel
 * Cancel an emergency within the cancellation window
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
 * - ADMIN: returns ALL emergencies across all statuses (for dashboard breakdown)
 * - RESPONDER: returns open emergencies this responder was dispatched to
 */
export const getActiveEmergencies = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    if (req.user.role === 'ADMIN') {
      // Admin needs all statuses so the dashboard can show Cancelled, Resolved, etc.
      const emergencies = await emergencyService.getAllEmergenciesForAdmin();
      return sendSuccess(res, emergencies, 'All emergencies retrieved');
    }

    // Responders only see emergencies they were dispatched to
    const { getActiveEmergencyRequests } = await import('../services/responderService');
    const emergencies = await getActiveEmergencyRequests(req.user.userId);
    sendSuccess(res, emergencies, 'Active emergencies retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * POST /api/emergencies/:id/quick-replies
 * AI-generated AAC quick-reply cards personalized to the patient's medical profile and emergency type.
 * Deaf patients use these to communicate instantly with their assigned responder.
 */
export const getQuickReplies = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { id } = req.params;

    const emergency = await prisma.emergency.findUnique({
      where: { id },
      include: { patient: { include: { medicalProfile: true } } },
    });
    if (!emergency) return sendError(res, 'Emergency not found', 404);
    if ((emergency as any).patientId !== req.user.userId) {
      return sendError(res, 'Forbidden', 403);
    }

    const mp = (emergency as any).patient?.medicalProfile;
    const { generateDeafQuickReplies } = await import('../services/aiService');
    const replies = await generateDeafQuickReplies({
      emergencyType: (emergency as any).emergencyType || 'OTHER',
      allergies: (decryptJson(mp?.allergies) as string[]) || [],
      chronicDiseases: (decryptJson(mp?.chronicDiseases) as string[]) || [],
      medications: toNameList(decryptJson(mp?.medications)),
      additionalInfo: (emergency as any).additionalInfo || '',
    });

    sendSuccess(res, replies, 'Quick replies generated');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * POST /api/emergencies/classify
 * AI-powered emergency type classification from free-text symptom description.
 */
export const classifyEmergency = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { symptoms } = req.body;
    if (!symptoms || typeof symptoms !== 'string' || !symptoms.trim()) {
      return sendError(res, 'symptoms text is required', 400);
    }
    const { classifyEmergencySymptoms } = await import('../services/aiService');
    const result = await classifyEmergencySymptoms(symptoms.trim());
    sendSuccess(res, result, 'Emergency type classified');
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
    const { status, latitude, longitude } = req.body;
    if (!status) return sendError(res, 'status is required', 400);

    const updated = await emergencyService.updateEmergencyStatus(id, status, req.user, {
      latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
      longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
    });
    sendSuccess(res, updated, 'Emergency status updated');
  } catch (error: any) {
    const status = /assigned responder/i.test(error.message) ? 403 : 400;
    sendError(res, error.message, status);
  }
};

/**
 * GET /api/emergencies/history
 * PATIENT: own emergencies. CAREGIVER: emergencies of linked patients.
 */
export const getEmergencyHistory = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const limit = parseInt(String(req.query.limit || '50'), 10) || 50;
    const history = await emergencyService.getEmergencyHistoryForUser(req.user.userId, req.user.role, limit);
    sendSuccess(res, history, 'Emergency history retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
