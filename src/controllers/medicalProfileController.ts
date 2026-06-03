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
      predefinedMessages,
      medicalHistory,
    } = req.body;

    const profile = await medicalProfileService.updateMedicalProfile(req.user.userId, {
      bloodType,
      chronicDiseases,
      allergies,
      medications,
      emergencyContacts,
      disabilities,
      predefinedMessages,
      medicalHistory,
    });

    sendSuccess(res, profile, 'Medical profile saved successfully');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * POST /api/medical-profile/emergency-contacts
 * Add a single emergency contact without touching the rest of the profile
 */
export const addEmergencyContact = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { name, phoneNumber, relationship } = req.body;
    if (!name || !phoneNumber) {
      return sendError(res, 'name and phoneNumber are required', 400);
    }

    const profile = await medicalProfileService.getMedicalProfile(req.user.userId);
    const existing: any[] = (profile as any).emergencyContacts || [];

    // Prevent duplicate by phone number
    if (existing.some((c: any) => c.phoneNumber === phoneNumber)) {
      return sendError(res, 'A contact with this phone number already exists', 409);
    }

    const updatedContacts = [
      ...existing,
      { name: name.trim(), phoneNumber: phoneNumber.trim(), relationship: relationship || 'Family' },
    ];

    const updated = await medicalProfileService.updateMedicalProfile(req.user.userId, {
      ...(profile as any),
      emergencyContacts: updatedContacts,
    });

    sendSuccess(res, { emergencyContacts: (updated as any).emergencyContacts }, 'Emergency contact added');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * DELETE /api/medical-profile/emergency-contacts/:phone
 * Remove a specific emergency contact by phone number
 */
export const removeEmergencyContact = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const phone = decodeURIComponent(req.params.phone);
    const profile = await medicalProfileService.getMedicalProfile(req.user.userId);
    const existing: any[] = (profile as any).emergencyContacts || [];

    const updatedContacts = existing.filter((c: any) => c.phoneNumber !== phone);

    if (updatedContacts.length === existing.length) {
      return sendError(res, 'Contact not found', 404);
    }

    const updated = await medicalProfileService.updateMedicalProfile(req.user.userId, {
      ...(profile as any),
      emergencyContacts: updatedContacts,
    });

    sendSuccess(res, { emergencyContacts: (updated as any).emergencyContacts }, 'Emergency contact removed');
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
