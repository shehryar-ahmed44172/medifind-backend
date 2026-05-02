import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response';

const prisma = new PrismaClient();

/**
 * Admin: List all users
 * GET /api/admin/users
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    const users = await prisma.user.findMany({
      where: role ? { role: role as any } : {},
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    sendSuccess(res, users, 'Users retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Admin: Deactivate user
 * PATCH /api/admin/users/:id/deactivate
 */
export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });
    sendSuccess(res, null, 'User deactivated');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * Admin: Delete user (Hard delete)
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    sendSuccess(res, null, 'User deleted');
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * Admin: Get responders pending verification
 */
export const getPendingResponders = async (req: Request, res: Response) => {
  try {
    const pending = await prisma.responder.findMany({
      where: { verificationStatus: 'PENDING' } as any,
      include: {
        user: { select: { fullName: true, email: true, phoneNumber: true } }
      }
    });
    sendSuccess(res, pending, 'Pending responders retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Admin: Verify or Reject a responder
 */
export const processVerification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // responder userId
    const { action, reason } = req.body; // action: VERIFY | REJECT

    if (action === 'VERIFY') {
      const responder = await prisma.responder.update({
        where: { userId: id },
        data: {
          verificationStatus: 'VERIFIED' as any,
          isVerified: true
        } as any,
        include: { user: true }
      });

      // Send OTP after admin verification
      const { sendVerificationCode } = await import('../services/auth');
      await sendVerificationCode(responder.userId, responder.user.email, responder.user.fullName);

      sendSuccess(res, null, 'Responder verified and code sent');
    } else if (action === 'REJECT') {
      await prisma.responder.update({
        where: { userId: id },
        data: {
          verificationStatus: 'REJECTED' as any,
          isVerified: false,
          rejectionReason: reason
        } as any
      });
      sendSuccess(res, null, 'Responder rejected');
    } else {
      sendError(res, 'Invalid action. Use VERIFY or REJECT', 400);
    }
  } catch (error: any) {
    sendError(res, error.message, 400);
  }
};

/**
 * Admin: Dashboard Stats
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [userCount, emergencyCount, activeEmergencies, verifiedResponders] = await Promise.all([
      prisma.user.count(),
      prisma.emergency.count(),
      prisma.emergency.count({ where: { status: 'ACTIVE' } }),
      prisma.responder.count({ where: { isVerified: true } })
    ]);

    sendSuccess(res, {
      totalUsers: userCount,
      totalEmergencies: emergencyCount,
      activeEmergencies,
      onlineResponders: verifiedResponders
    }, 'Stats retrieved');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
