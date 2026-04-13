import { Request, Response } from 'express';
import * as caregiverService from '../services/caregiverService';
import { sendSuccess, sendError } from '../utils/response';

/**
 * POST /api/caregivers/link
 * Patient links a caregiver by email
 */
export const linkCaregiver = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'PATIENT') return sendError(res, 'Unauthorized - Only Patients can link caregivers', 403);
    const { caregiverEmail, relationship } = req.body;

    if (!caregiverEmail || !relationship) {
      return sendError(res, 'caregiverEmail and relationship are required', 400);
    }

    const link = await caregiverService.linkCaregiver(req.user.userId, caregiverEmail, relationship);
    sendSuccess(res, link, 'Caregiver linked successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * GET /api/caregivers
 * Get all linked caregivers (for patients) or patients (for caregivers)
 */
export const getLinks = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    if (req.user.role === 'PATIENT') {
      const caregivers = await caregiverService.getLinkedCaregivers(req.user.userId);
      sendSuccess(res, caregivers, 'Linked caregivers retrieved');
    } else if (req.user.role === 'CAREGIVER') {
      const patients = await caregiverService.getLinkedPatients(req.user.userId);
      sendSuccess(res, patients, 'Linked patients retrieved');
    } else {
      sendError(res, 'Invalid role to access caregiver links', 403);
    }
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * DELETE /api/caregivers/:caregiverId
 * Unlink a caregiver
 */
export const unlinkCaregiver = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'PATIENT') return sendError(res, 'Unauthorized', 403);
    const { caregiverId } = req.params;

    await caregiverService.unlinkCaregiver(req.user.userId, caregiverId);
    sendSuccess(res, null, 'Caregiver unlinked successfully');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};
