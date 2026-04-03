import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PasswordResetTokenPayload } from '../types/passwordReset';

const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || 'reset-secret-change-me';
const RESET_TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Generate password reset token
 * Token expires in 30 minutes
 */
export function generateResetToken(userId: string, tokenId: string): string {
	const payload: PasswordResetTokenPayload = {
		userId,
		tokenId,
		createdAt: Date.now(),
		expiresAt: Date.now() + RESET_TOKEN_EXPIRY,
	};

	return jwt.sign(payload, RESET_TOKEN_SECRET, {
		expiresIn: '30m',
		algorithm: 'HS256',
	});
}

/**
 * Verify password reset token
 */
export function verifyResetToken(token: string): PasswordResetTokenPayload | null {
	try {
		const decoded = jwt.verify(token, RESET_TOKEN_SECRET, {
			algorithms: ['HS256'],
		}) as PasswordResetTokenPayload;

		// Check expiry
		if (decoded.expiresAt < Date.now()) {
			return null; // Token expired
		}

		return decoded;
	} catch (error) {
		console.error('Reset token verification error:', error);
		return null;
	}
}

/**
 * Generate hash for storing reset token in database
 * Never store plain tokens - store hash like passwords
 */
export function hashResetToken(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify reset token hash
 */
export function verifyResetTokenHash(
	providedToken: string,
	storedHash: string
): boolean {
	const hash = hashResetToken(providedToken);
	return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

/**
 * Generate reset link for email
 */
export function generateResetLink(
	token: string,
	baseUrl: string = process.env.APP_URL || 'http://localhost:3100'
): string {
	return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}