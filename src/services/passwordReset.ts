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

      // TODO: In real implementation, send email via Mailgun
      logger.info(`Password reset link generated for user: ${user.email}`);
      console.log(`\n🔗 Reset Link (for testing): ${resetLink}\n`);

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