import { canSeeContactDetails } from '../utils/accessControl';
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
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
      // Kept for older app builds: for responders this reflects availability
      isActive: profile.role === 'RESPONDER' ? (profile as any).responder?.isAvailable : profile.isActive,
      isAvailable: (profile as any).responder?.isAvailable ?? null,
      accountActive: profile.isActive,
      patientType: (profile as any).medicalProfile?.patientType,
      organization: (profile as any).responder?.organization,
      licenseNumber: (profile as any).responder?.licenseNumber,
      responderType: (profile as any).responder?.responderType,
      vehicleType: (profile as any).responder?.vehicleType,
      // Responder stats, so the app can tell a rated responder from a new one
      rating: (profile as any).responder?.rating ?? null,
      totalRatings: (profile as any).responder?.totalRatings ?? null,
      totalResponsesHandled: (profile as any).responder?.totalResponsesHandled ?? null,
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

    const responderFields = [
      'cnicImageUrl', 'cnicBackImageUrl', 'employeeCardImageUrl', 'employeeCardBackImageUrl',
      'organization', 'responderType', 'vehicleType',
    ];
    const userData: any = {};
    const responderData: any = {};
    for (const [key, value] of Object.entries(updateData)) {
      (responderFields.includes(key) ? responderData : userData)[key] = value;
    }

    if (Object.keys(responderData).length > 0) {
      if (req.user.role !== 'RESPONDER') {
        return sendError(res, 'Only responders can update responder details', 403);
      }
      await prisma.responder.update({
        where: { userId: req.user.userId },
        // Updated documents send the application back for admin review
        data: isDocUpdate ? { ...responderData, verificationStatus: 'PENDING' } : responderData,
      });
    }

    const updated = Object.keys(userData).length > 0
      ? await userService.updateUserProfile(req.user.userId, userData)
      : await userService.getUserProfile(req.user.userId);

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

    // Build absolute URL so any client (admin panel, mobile) can load it directly
    const profileImageUrl = `${req.protocol}://${req.get('host')}/uploads/profile/${req.file.filename}`;

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
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { plan, paymentIntentId } = req.body;

    if (!['FREE', 'PROFESSIONAL', 'EXECUTIVE'].includes(plan)) {
      return sendError(res, 'Invalid plan name. Use FREE, PROFESSIONAL, or EXECUTIVE', 400);
    }

    // Paid plans require a Stripe payment that actually succeeded for this user and plan.
    // Downgrading to FREE needs no payment.
    if (plan !== 'FREE') {
      if (!paymentIntentId || typeof paymentIntentId !== 'string') {
        return sendError(res, 'paymentIntentId is required to upgrade to a paid plan', 402);
      }
      const { verifyPlanPayment } = await import('../services/stripeService');
      const verification = await verifyPlanPayment(paymentIntentId, req.user.userId, plan);
      if (verification.ok === false) {
        return sendError(res, verification.reason, 402);
      }
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
    const canSeePrivate = req.user?.userId === id || req.user?.role === 'ADMIN';
    // Phone and email only for people with a care or emergency relationship to this user
    const canSeeContact = canSeePrivate || (!!req.user && (await canSeeContactDetails(req.user, id)));
    
    // Map backend User object to the UserProfile structure frontend expects
    const userProfile = {
      userId: profile.id,
      fullName: profile.fullName,
      email: canSeeContact ? profile.email : '', // app model requires the key
      phoneNumber: canSeeContact ? profile.phoneNumber : '',
      role: profile.role,
      profileImageUrl: profile.profileImageUrl,
      lastUpdated: (profile as any).updatedAt,
      subscriptionPlan: profile.subscriptionPlan,
      // Include role-specific fields if available
      cnic: canSeePrivate ? (profile as any).cnic : undefined,
      patientType: (profile as any).medicalProfile?.patientType,
      organization: (profile as any).responder?.organization,
      licenseNumber: canSeePrivate ? (profile as any).responder?.licenseNumber : undefined,
      responderType: (profile as any).responder?.responderType,
      vehicleType: (profile as any).responder?.vehicleType,
      verificationStatus: (profile as any).responder?.verificationStatus,
      // Kept for older app builds: for responders this reflects availability
      isActive: profile.role === 'RESPONDER' ? (profile as any).responder?.isAvailable : profile.isActive,
      isAvailable: (profile as any).responder?.isAvailable ?? null,
      accountActive: profile.isActive,
      isEmailVerified: profile.isEmailVerified,
      // Responder performance stats (live from DB)
      rating: (profile as any).responder?.rating ?? null,
      totalRatings: (profile as any).responder?.totalRatings ?? null,
      totalResponsesHandled: (profile as any).responder?.totalResponsesHandled ?? null,
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

    const userId = req.user.userId;
    console.log(`🗑️ [UserController] Delete account requested for user: ${userId}`);

    // Protect admin accounts from self-deletion
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, fullName: true, email: true },
    });
    if (!user) return sendError(res, 'User not found', 404);
    if (user.role === 'ADMIN') {
      return sendError(res, 'Admin accounts cannot be self-deleted. Contact a system administrator.', 403);
    }

    console.log(`🔄 [UserController] Revoking tokens and deleting records for ${userId}...`);

    // 1. Write audit log BEFORE deletion (so the record exists when written)
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SELF_DELETE_ACCOUNT',
        entity: 'User',
        entityId: userId,
        oldValues: {
          role: user.role,
          email: user.email,
          fullName: user.fullName,
          initiatedBy: 'user_self_service',
          deletedAt: new Date().toISOString(),
        },
        ipAddress: req.ip ?? req.socket?.remoteAddress ?? 'unknown',
        userAgent: req.headers['user-agent'] ?? 'unknown',
      },
    });

    // 2. Revoke all refresh tokens (invalidate all active sessions)
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });

    // 3. Hard-delete the user — Prisma cascade handles related records
    await prisma.user.delete({ where: { id: userId } });

    console.log(`✅ [UserController] Account ${userId} (${user.email}) permanently deleted.`);
    sendSuccess(res, null, 'Account permanently deleted');
  } catch (error: any) {
    console.error(`❌ [UserController] Delete account failed: ${error.message}`);
    sendError(res, error.message, 500);
  }
};
