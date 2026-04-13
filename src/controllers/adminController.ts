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
