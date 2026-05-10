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
    // Include availability status for responders and flatten patientType
    const responseData = {
      ...profile,
      isActive: profile.role === 'RESPONDER' ? (profile as any).responder?.isAvailable : profile.isActive,
      patientType: (profile as any).medicalProfile?.patientType,
      organization: (profile as any).responder?.organization,
      licenseNumber: (profile as any).responder?.licenseNumber,
      responderType: (profile as any).responder?.responderType,
      vehicleType: (profile as any).responder?.vehicleType,
    };
    sendSuccess(res, responseData, 'Profile retrieved successfully');
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

    const allowedFields = [
      'fullName', 'phoneNumber', 'profileImageUrl', 
      'cnicImageUrl', 'cnicBackImageUrl', 
      'employeeCardImageUrl', 'employeeCardBackImageUrl',
      'organization', 'responderType', 'vehicleType'
    ];
    const updateData: any = {};
    let isDocUpdate = false;
    const docFields = ['cnicImageUrl', 'cnicBackImageUrl', 'employeeCardImageUrl', 'employeeCardBackImageUrl'];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
        if (docFields.includes(field)) isDocUpdate = true;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return sendError(res, 'No valid fields to update', 400);
    }

    const updated = await userService.updateUserProfile(req.user.userId, updateData);

    // If documents were updated, notify admin (Plan v4)
    if (isDocUpdate && req.user.role === 'RESPONDER') {
      const { getIo } = await import('../server');
      getIo().to('admin_notifications').emit('admin_notification', {
        id: `doc-upd-${req.user.userId}-${Date.now()}`,
        type: 'RESPONDER_DOCUMENT_UPDATE',
        title: 'Responder Documents Updated',
        body: `${updated.fullName} has updated their verification documents. Review required.`,
        timestamp: new Date().toISOString(),
        data: { userId: req.user.userId }
      });
      // Also emit to general channel if that's what's used
      getIo().emit('admin_notification', {
        id: `doc-upd-${req.user.userId}-${Date.now()}`,
        type: 'RESPONDER_DOCUMENT_UPDATE',
        title: 'Responder Documents Updated',
        body: `${updated.fullName} has updated their verification documents. Review required.`,
        timestamp: new Date().toISOString(),
        data: { userId: req.user.userId }
      });
    }

    sendSuccess(res, updated, 'Profile updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * POST /api/users/profile/image
 * Upload the authenticated user's profile image
 */
export const uploadProfileImage = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    
    if (!req.file) {
      return sendError(res, 'No image file provided', 400);
    }

    // Create the static URL for the image
    // The server serves 'uploads' folder as static /uploads
    // So if filename is image-123.jpg, url is /uploads/reports/image-123.jpg 
    // (since path.join(process.cwd(), 'uploads', 'reports') was used in middleware)
    const profileImageUrl = `/uploads/profile/${req.file.filename}`;

    const updated = await userService.updateUserProfile(req.user.userId, {
      profileImageUrl: profileImageUrl
    });

    sendSuccess(res, updated, 'Profile image uploaded successfully');
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

/**
 * GET /api/users/:id
 * Get a user's public profile details
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profile = await userService.getUserProfile(id);
    
    // Map backend User object to the UserProfile structure frontend expects
    const userProfile = {
      userId: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
      role: profile.role,
      profileImageUrl: profile.profileImageUrl,
      lastUpdated: (profile as any).updatedAt,
      // Include role-specific fields if available
      cnic: (profile as any).cnic,
      patientType: (profile as any).medicalProfile?.patientType,
      organization: (profile as any).responder?.organization,
      licenseNumber: (profile as any).responder?.licenseNumber,
      responderType: (profile as any).responder?.responderType,
      vehicleType: (profile as any).responder?.vehicleType,
      isActive: profile.role === 'RESPONDER' ? (profile as any).responder?.isAvailable : profile.isActive,
      isEmailVerified: profile.isEmailVerified
    };

    sendSuccess(res, userProfile, 'User profile retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message, 404);
  }
};

/**
 * GET /api/users/debug/:userId
 * Get internal user details for diagnostic purposes
 */
export const getDebugInfo = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { userRepository } = await import('../repositories/userRepository');
    const user = await userRepository.findById(userId);
    
    if (!user) return sendError(res, 'User not found', 404);

    const debugInfo = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      fcmTokens: (user as any).fcmTokens || [],
      responder: (user as any).responder ? {
        isAvailable: (user as any).responder.isAvailable,
        isVerified: (user as any).responder.isVerified,
        currentLatitude: (user as any).responder.currentLatitude,
        currentLongitude: (user as any).responder.currentLongitude,
        lastLocationUpdate: (user as any).responder.updatedAt
      } : null
    };

    sendSuccess(res, debugInfo, 'Diagnostic info retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * DELETE /api/users/me
 * Permanently delete the authenticated user's own account.
 * - Revokes all refresh tokens first
 * - Hard-deletes the user row (cascade removes all related data via Prisma schema)
 * - Admin accounts are protected and cannot self-delete
 */
export const deleteMyAccount = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const userId = req.user.userId;

    // Protect admin accounts from self-deletion
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return sendError(res, 'User not found', 404);
    if (user.role === 'ADMIN') {
      return sendError(res, 'Admin accounts cannot be self-deleted. Contact a system administrator.', 403);
    }

    // 1. Revoke all refresh tokens (invalidate all active sessions)
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });

    // 2. Hard-delete the user — Prisma cascade handles related records
    await prisma.user.delete({ where: { id: userId } });

    await prisma.$disconnect();

    sendSuccess(res, null, 'Account permanently deleted');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
