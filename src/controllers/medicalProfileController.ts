import { Request, Response } from 'express';
import * as medicalProfileService from '../services/medicalProfileService';
import { sendSuccess, sendError } from '../utils/response';

/**
 * GET /api/medical-profile
 * Get the authenticated user's medical profile
 */
export const getMedicalProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const profile = await medicalProfileService.getMedicalProfile(req.user.userId);
    sendSuccess(res, profile, 'Medical profile retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message, 404);
  }
};

/**
 * PUT /api/medical-profile
 * Create or update the authenticated user's medical profile
 */
export const updateMedicalProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const {
      bloodType,
      chronicDiseases,
      allergies,
      medications,
      emergencyContacts,
      disabilities,
      medicalHistory,
    } = req.body;

    const profile = await medicalProfileService.updateMedicalProfile(req.user.userId, {
      bloodType,
      chronicDiseases,
      allergies,
      medications,
      emergencyContacts,
      disabilities,
      medicalHistory,
    });

    sendSuccess(res, profile, 'Medical profile saved successfully');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * GET /api/medical-profile/:userId
 * Get another user's medical profile (Responders only, during active emergency)
 */
export const getMedicalProfileByUserId = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { userId } = req.params;
    const profile = await medicalProfileService.getMedicalProfile(userId);
    sendSuccess(res, profile, 'Medical profile retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message, 404);
  }
};
