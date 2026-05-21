import { Request, Response } from 'express';
import * as medicalReportService from '../services/medicalReportService';
import { sendSuccess, sendError } from '../utils/response';
import { PLAN_LIMITS } from '../middleware/planMiddleware';
import prisma from '../lib/prisma';

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

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const report = await medicalReportService.uploadReport(req.user.userId, emergencyId, req.file, reportType || 'OTHER', baseUrl);
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

    // Enforce plan-based report limit
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { subscriptionPlan: true },
    });
    const plan = (user?.subscriptionPlan ?? 'FREE') as keyof typeof PLAN_LIMITS;
    const limit = PLAN_LIMITS[plan]?.maxMedicalReports ?? 5;

    if (limit !== -1) {
      const existingCount = await prisma.medicalReport.count({
        where: { userId: req.user.userId },
      });
      if (existingCount >= limit) {
        return sendError(
          res,
          `Report limit reached (${limit} max on ${plan} plan). Upgrade to upload more.`,
          403
        );
      }
    }

    const { reportType } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const report = await medicalReportService.uploadProfileReport(req.user.userId, req.file, reportType || 'OTHER', baseUrl);
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

/**
 * PATCH /api/reports/:id
 * Rename a medical report
 */
export const renameReport = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { id } = req.params;
    const { fileName } = req.body;

    if (!fileName) return sendError(res, 'File name is required', 400);

    const report = await medicalReportService.renameReport(id, req.user.userId, fileName);
    sendSuccess(res, report, 'Report renamed successfully');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};
