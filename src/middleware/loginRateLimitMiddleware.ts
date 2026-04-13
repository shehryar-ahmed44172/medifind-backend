import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { userRepository } from '../repositories/userRepository';

/**
 * Rate limiting for login attempts
 * Prevents brute force attacks
 * Rules:
 * - Max 5 failed login attempts
 * - Lockout for 30 minutes after 5 failures
 * - Lock based on email (not IP, since users might share IPs)
 */

export async function loginRateLimitMiddleware(
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> {
	try {
		const { email } = req.body;

		if (!email) {
			next();
			return;
		}

		// Get user
		const user = await userRepository.findByEmail(email);

		if (!user) {
			// User not found, allow login attempt (will fail later with "invalid credentials")
			next();
			return;
		}

		// Check if account is locked
		if (user.accountLockedUntil) {
			const now = new Date();
			if (user.accountLockedUntil > now) {
				const minutesRemaining = Math.ceil(
					(user.accountLockedUntil.getTime() - now.getTime()) / 60000
				);
				logger.warn(
					`Login attempt for locked account: ${email} (${minutesRemaining} min remaining)`
				);
				sendError(
					res,
					`Account is temporarily locked. Try again in ${minutesRemaining} minutes.`,
					429
				);
				return;
			} else {
				// Lockout expired, reset failed attempts
				await userRepository.resetFailedLoginAttempts(user.id);
			}
		}

		// Attach user to request for next middleware
		(req as any).userForLogin = user;
		next();
	} catch (error) {
		logger.error('Rate limit middleware error:', error);
		// Don't block login on middleware error, just log it
		next();
	}
}

/**
 * Track failed login attempt
 * Call this after unsuccessful login
 */
export async function recordFailedLoginAttempt(
	userId: string
): Promise<void> {
	try {
		const user = await userRepository.findById(userId);
		if (!user) return;

		const failedAttempts = (user.failedLoginAttempts || 0) + 1;
		const MAX_ATTEMPTS = 5;

		let lockoutUntil = null;
		if (failedAttempts >= MAX_ATTEMPTS) {
			// Lock account for 30 minutes
			lockoutUntil = new Date(Date.now() + 30 * 60 * 1000);
			logger.warn(
				`Account locked due to too many failed login attempts: ${user.email}`
			);
		}

		await userRepository.updateLoginAttempts(
			userId,
			failedAttempts,
			new Date(), // lastFailedLoginAt
			lockoutUntil
		);
	} catch (error) {
		logger.error('Failed to record login attempt:', error);
	}
}

/**
 * Reset failed login attempts after successful login
 */
export async function recordSuccessfulLogin(
	userId: string,
	ipAddress: string
): Promise<void> {
	try {
		await userRepository.update(userId, {
			failedLoginAttempts: 0,
			accountLockedUntil: null,
			lastLoginAt: new Date(),
			lastLoginIp: ipAddress,
		});
	} catch (error) {
		logger.error('Failed to record successful login:', error);
	}
}