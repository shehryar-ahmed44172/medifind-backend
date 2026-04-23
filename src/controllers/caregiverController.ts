import { Request, Response } from 'express';
import * as caregiverService from '../services/caregiverService';
import { sendSuccess, sendError } from '../utils/response';

/**
 * POST /api/caregivers/link
 * Patient links a caregiver by email
 */
export const linkCaregiver = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    
    // Allow both Patients (to invite caregivers) and Caregivers (to invite patients)
    if (req.user.role !== 'PATIENT' && req.user.role !== 'CAREGIVER') {
      return sendError(res, 'Unauthorized - Only Patients or Caregivers can create links', 403);
    }
    
    const { email, relationship, caregiverEmail, patientEmail } = req.body;
    const targetEmail = email || caregiverEmail || patientEmail;

    if (!targetEmail || !relationship) {
      return sendError(res, 'target email and relationship are required', 400);
    }

    const link = await caregiverService.linkCaregiver(req.user.userId, targetEmail, relationship, req.user.role);
    sendSuccess(res, link, 'Link invitation sent successfully', 201);
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
      const transformed = patients.map((l: any) => ({
        ...l,
        patientName: l.patient?.fullName,
        patientEmail: l.patient?.email,
      }));
      sendSuccess(res, transformed, 'Linked patients retrieved');
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

/**
 * GET /api/caregivers/invitations
 */
export const getPendingInvitations = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    if (req.user.role !== 'CAREGIVER' && req.user.role !== 'PATIENT') {
      return sendError(res, 'Unauthorized role', 403);
    }
    const invitations = await caregiverService.getPendingInvitations(req.user.userId);
    
    // Add synthetic ID for mobile app mapping (Flutter expects an 'id' field)
    const transformed = invitations.map((inv: any) => ({
      ...inv,
      id: req.user?.role === 'CAREGIVER' ? inv.patientId : inv.caregiverId,
      patientName: inv.patient?.fullName,
      patientEmail: inv.patient?.email,
      caregiverName: inv.caregiver?.fullName,
      caregiverEmail: inv.caregiver?.email
    }));

    sendSuccess(res, transformed, 'Pending invitations retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * POST /api/caregivers/invitations/:targetId/respond
 */
export const respondToInvitation = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { targetId } = req.params;
    const { accept } = req.body;

    if (accept === undefined) return sendError(res, 'accept (boolean) is required', 400);

    let caregiverId: string;
    let patientId: string;

    if (req.user.role === 'CAREGIVER') {
      caregiverId = req.user.userId;
      patientId = targetId;
    } else if (req.user.role === 'PATIENT') {
      caregiverId = targetId;
      patientId = req.user.userId;
    } else {
      return sendError(res, 'Unauthorized role', 403);
    }

    const result = await caregiverService.respondToInvitation(caregiverId, patientId, accept, req.user.userId);
    sendSuccess(res, result, accept ? 'Invitation accepted' : 'Invitation rejected');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * GET /api/caregivers/links/all
 */
export const getAllLinks = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    
    if (req.user.role === 'PATIENT') {
      const links = await caregiverService.getAllLinkedCaregivers(req.user.userId);
      sendSuccess(res, links, 'All caregiver links retrieved');
    } else if (req.user.role === 'CAREGIVER') {
      const links = await caregiverService.getAllLinkedPatients(req.user.userId);
      const transformed = links.map((l: any) => ({
        ...l,
        patientName: l.patient?.fullName,
        patientEmail: l.patient?.email,
      }));
      sendSuccess(res, transformed, 'All patient links retrieved');
    } else {
      sendError(res, 'Unauthorized role', 403);
    }
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * POST /api/caregivers/links/:patientId/resend
 */
export const resendInvitation = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'CAREGIVER') return sendError(res, 'Unauthorized', 403);
    const { patientId } = req.params;

    const result = await caregiverService.resendInvitation(req.user.userId, patientId);
    sendSuccess(res, result, 'Invitation resent successfully');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};
