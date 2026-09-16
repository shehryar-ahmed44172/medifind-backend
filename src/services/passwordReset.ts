import { userRepository } from '../repositories/userRepository';
import { passwordResetRepository } from '../repositories/passwordResetRepository';
import {
  generateResetToken,
  verifyResetToken,
  hashResetToken,
  generateResetLink,
} from '../utils/resetTokenUtils';
import { hashPassword, verifyPassword } from '../utils/password';
import { logger } from '../utils/logger';
import { sendEmail } from '../utils/email';

export class PasswordResetService {
  /**
   * Generate password reset request and send email
   * Step 1 of password reset flow
   */
  async requestPasswordReset(email: string): Promise<{
    success: boolean;
    message: string;
    resetTokenId?: string;
  }> {
    try {
      // Find user by email
      const user = await userRepository.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists (security best practice)
        // Return success message anyway
        logger.warn(`Password reset requested for non-existent email: ${email}`);
        return {
          success: true,
          message: 'If the email exists, a reset link has been sent.',
        };
      }

      // Check abuse: max 3 reset requests per 24 hours
      const recentRequests = await passwordResetRepository.getRecentResetRequests(
        user.id,
        24
      );
      if (recentRequests.length >= 3) {
        logger.warn(`Too many password reset requests for user: ${user.id}`);
        return {
          success: false,
          message: 'Too many reset requests. Please try again in 24 hours.',
        };
      }

      // Create reset token
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      const resetRecord = await passwordResetRepository.createResetToken(
        user.id,
        'placeholder', // Will be updated with hash
        expiresAt
      );

      // Generate JWT token
      const resetToken = generateResetToken(user.id, resetRecord.id);
      const tokenHash = hashResetToken(resetToken);

      // Update record with token hash
      // (In production, you'd do this atomically)
      await passwordResetRepository.markTokenAsUsed(resetRecord.id);
      const finalRecord = await passwordResetRepository.createResetToken(
        user.id,
        tokenHash,
        expiresAt
      );

      // Generate reset link
      const resetLink = generateResetLink(resetToken);

      // Send email via SMTP
      await sendEmail({
        to: user.email,
        subject: 'Reset Your MediFind Password',
        text: `You requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nThis link will expire in 30 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #2c3e50;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for your <strong>MediFind</strong> account.</p>
            <p>Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3498db;">${resetLink}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.8em; color: #777;">If you didn't request this, you can safely ignore this email. The link will expire in 30 minutes.</p>
          </div>
        `,
      });

      logger.info(`Password reset email sent to user: ${user.email}`);
      if (process.env.NODE_ENV !== 'production') {
        logger.debug(`[DEV ONLY] Password reset link for ${user.email}: ${resetLink}`);
      }

      return {
        success: true,
        message: 'Password reset email sent. Check your inbox.',
        resetTokenId: finalRecord.id,
      };
    } catch (error) {
      logger.error('Error requesting password reset:', error);
      throw error;
    }
  }

  /**
   * Reset password using token
   * Step 2 of password reset flow (called from reset link)
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{
    success: boolean;
    message: string;
    userId?: string;
  }> {
    try {
      // Verify JWT token
      const payload = verifyResetToken(token);
      if (!payload) {
        return {
          success: false,
          message: 'Invalid or expired reset token. Please request a new one.',
        };
      }

      // Verify token hash in database
      const resetRecord = await passwordResetRepository.findActiveToken(
        hashResetToken(token)
      );
      if (!resetRecord) {
        return {
          success: false,
          message: 'Reset token not found or already used.',
        };
      }

      // Validate new password
      if (!newPassword || newPassword.length < 8) {
        return {
          success: false,
          message: 'Password must be at least 8 characters long.',
        };
      }

      // Don't allow reusing recent passwords
      const user = resetRecord.user;
      const isSameAsCurrent = await verifyPassword(
        newPassword,
        user.passwordHash
      );
      if (isSameAsCurrent) {
        return {
          success: false,
          message: 'New password cannot be the same as current password.',
        };
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password
      await userRepository.updatePassword(user.id, hashedPassword);

      // Mark token as used
      await passwordResetRepository.markTokenAsUsed(resetRecord.id);

      logger.info(`Password reset successfully for user: ${user.id}`);

      return {
        success: true,
        message: 'Password reset successfully. Please log in with your new password.',
        userId: user.id,
      };
    } catch (error) {
      logger.error('Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Change password (for logged-in users)
   * Requires current password verification
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Get user
      const user = await userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found.',
        };
      }

      // Verify current password
      const isPasswordValid = await verifyPassword(
        currentPassword,
        user.passwordHash
      );
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect.',
        };
      }

      // Validate new password
      if (!newPassword || newPassword.length < 8) {
        return {
          success: false,
          message: 'New password must be at least 8 characters long.',
        };
      }

      if (currentPassword === newPassword) {
        return {
          success: false,
          message: 'New password must be different from current password.',
        };
      }

      // Hash and update
      const hashedPassword = await hashPassword(newPassword);
      await userRepository.updatePassword(userId, hashedPassword);

      logger.info(`Password changed successfully for user: ${userId}`);

      return {
        success: true,
        message: 'Password changed successfully.',
      };
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }
}

export const passwordResetService = new PasswordResetService();