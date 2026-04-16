import { Request, Response } from 'express';
import * as userService from '../services/userService';
import { sendSuccess, sendError } from '../utils/response';

/**
 * GET /api/users/profile
 * Get the authenticated user's profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const profile = await userService.getUserProfile(req.user.userId);
    sendSuccess(res, profile, 'Profile retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message, 404);
  }
};

/**
 * PUT /api/users/profile
 * Update the authenticated user's profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const allowedFields = ['fullName', 'phoneNumber', 'profileImageUrl'];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return sendError(res, 'No valid fields to update', 400);
    }

    const updated = await userService.updateUserProfile(req.user.userId, updateData);
    sendSuccess(res, updated, 'Profile updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * PATCH /api/users/:id/verify
 * Administrator verification of responder identity (FR5.2)
 */
export const verifyResponder = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') return sendError(res, 'Unauthorized - Admin only', 403);
    const { id } = req.params;

    await userService.verifyResponder(id);
    sendSuccess(res, null, 'Responder verified successfully');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * PATCH /api/users/upgrade
 */
export const upgradePlan = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'PATIENT') return sendError(res, 'Unauthorized - Only Patients can upgrade plans', 403);
    const { plan } = req.body;

    if (!['FREE', 'PROFESSIONAL', 'EXECUTIVE'].includes(plan)) {
      return sendError(res, 'Invalid plan name. Use FREE, PROFESSIONAL, or EXECUTIVE', 400);
    }

    const result = await userService.upgradeSubscription(req.user.userId, plan as any);
    sendSuccess(res, result, `Subscription upgraded to ${plan}`);
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};
