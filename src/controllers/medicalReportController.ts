import { Request, Response } from 'express';
import * as medicalReportService from '../services/medicalReportService';
import { sendSuccess, sendError } from '../utils/response';

/**
 * POST /api/reports/:emergencyId
 * Upload a medical report
 */
export const uploadReport = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    if (!req.file) return sendError(res, 'No file uploaded', 400);

    const { emergencyId } = req.params;
    const { reportType } = req.body;

    const report = await medicalReportService.uploadReport(req.user.userId, emergencyId, req.file, reportType || 'OTHER');
    sendSuccess(res, report, 'Report uploaded successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * POST /api/reports/profile
 * Upload a medical report directly to user profile
 */
export const uploadProfileReport = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    if (!req.file) return sendError(res, 'No file uploaded', 400);

    const { reportType } = req.body;

    const report = await medicalReportService.uploadProfileReport(req.user.userId, req.file, reportType || 'OTHER');
    sendSuccess(res, report, 'Profile report uploaded successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * GET /api/reports/:emergencyId
 * Get all reports for an emergency
 */
export const getReports = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { emergencyId } = req.params;

    const reports = await medicalReportService.getReportsForEmergency(emergencyId, req.user.userId, req.user.role);
    sendSuccess(res, reports, 'Reports retrieved');
  } catch (error: any) {
    sendError(res, error.message, 403);
  }
};

/**
 * GET /api/reports/profile
 * Get all reports for a user's profile
 */
export const getProfileReports = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const reports = await medicalReportService.getProfileReports(req.user.userId);
    sendSuccess(res, reports, 'Profile reports retrieved');
  } catch (error: any) {
    sendError(res, error.message, 403);
  }
};

/**
 * DELETE /api/reports/:id
 * Delete a specific report
 */
export const deleteReport = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { id } = req.params;

    await medicalReportService.deleteReport(id, req.user.userId);
    sendSuccess(res, null, 'Report deleted successfully');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};
