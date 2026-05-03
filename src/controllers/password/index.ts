import { Request, Response } from 'express';
import { passwordResetService } from '../../services/passwordReset';
import { sendError, sendSuccess } from '../../utils/response';
import { logger } from '../../utils/logger';

export class PasswordResetController {
	/**
	 * POST /api/password/forgot-password
	 * Start password reset flow - send reset email
	 */
	async forgotPassword(req: Request, res: Response): Promise<void> {
		try {
			const { email } = req.body;

			// Validate email
			if (!email || typeof email !== 'string') {
				sendError(res, 'Email is required', 400);
				return;
			}

			const result = await passwordResetService.requestPasswordReset(email);

			if (result.success) {
				sendSuccess(res, { resetTokenId: result.resetTokenId }, result.message, 200);
			} else {
				sendError(res, result.message, 429); // 429 Too Many Requests for abuse
			}
		} catch (error) {
			logger.error('Forgot password error:', error);
			sendError(res, 'Internal server error', 500);
		}
	}

	/**
	 * POST /api/password/reset
	 * Complete password reset flow - validate token and update password
	 */
	async resetPassword(req: Request, res: Response): Promise<void> {
		try {
			const { token, newPassword } = req.body;

			// Validate inputs
			if (!token || typeof token !== 'string') {
				sendError(res, 'Reset token is required', 400);
				return;
			}

			if (!newPassword || typeof newPassword !== 'string') {
				sendError(res, 'New password is required', 400);
				return;
			}

			const result = await passwordResetService.resetPassword(
				token,
				newPassword
			);

			if (result.success) {
				sendSuccess(res, { userId: result.userId }, result.message, 200);
			} else {
				sendError(res, result.message, 400);
			}
		} catch (error) {
			logger.error('Reset password error:', error);
			sendError(res, 'Internal server error', 500);
		}
	}

	/**
	 * POST /api/password/change-password
	 * Change password for logged-in user
	 * Requires: Authorization header
	 */
	async changePassword(req: Request, res: Response): Promise<void> {
		try {
			const userId = (req as any).user?.id;
			if (!userId) {
				sendError(res, 'Unauthorized', 401);
				return;
			}

			const { currentPassword, newPassword } = req.body;

			// Validate inputs
			if (!currentPassword || !newPassword) {
				sendError(res, 'Current and new passwords are required', 400);
				return;
			}

			const result = await passwordResetService.changePassword(
				userId,
				currentPassword,
				newPassword
			);

			if (result.success) {
				sendSuccess(res, null, result.message, 200);
			} else {
				sendError(res, result.message, 400);
			}
		} catch (error) {
			logger.error('Change password error:', error);
			sendError(res, 'Internal server error', 500);
		}
	}
}

export const passwordResetController = new PasswordResetController();
